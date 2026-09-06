-- ============================================================
-- 承認したのにログインできない穴を塞ぐ（申請メール ≠ 名簿メール）
-- ============================================================
-- 前提：202608200026_application_matching.sql（approve_application）
--       202609050047_link_auth_both_directions.sql 適用済み。
--
-- ------------------------------------------------------------
-- 🔴 何が起きていたか（2026-09-06 実測）
-- ------------------------------------------------------------
-- 林　佑ニさん：
--   名簿の行      email = odlcrew@icloud.com
--   本人が登録    email = bar.kukuru@gmail.com（確認済みアカウントあり）
--   運営は「既存の会員に紐づけて承認」で正しく処理した。
--   それでもログインできない。
--
-- approve_application の紐づけ側はこう書かれている：
--     SET email = COALESCE(email, v_app.email)
-- ＝ **名簿にメールが入っていれば、申請のメールは入らない**。
-- 一方 current_member_id() は auth_user_id で判定し、その auth_user_id は
-- 「名簿のメールと一致するアカウント」からしか入らない。
-- ∴ 2つのメールが違う限り、何度承認しても永久に繋がらない。
--
-- ⚠️ エラーは出ない。運営の画面では「承認済み」と表示され、本人の画面は
--    「会員として登録されていません」のまま。どちらからも見えない。
--
-- ⚠️ この経路は 202609050049 で「直接アカウントを作った人を申請に上げる」
--    ようにしてから頻繁に通るようになった。仕様自体は前からあった穴。
--
-- ------------------------------------------------------------
-- 直し方
-- ------------------------------------------------------------
-- 🔴 名簿のメールを申請のメールで上書きしない。名簿の連絡先は運営が
--    管理しているもので、本人がログインに使うメールとは役割が違う
--    （会社のメールで連絡し、個人のメールでログインする、は普通にある）。
--
-- ∴ メールはそのままに、auth_user_id だけを直接繋ぐ。
--    ログインの判定は auth_user_id なので、これで入れるようになる。
--
-- 🔴 approve_application 本体は書き換えない。CREATE OR REPLACE は全文置換で、
--    前の版の行を落としてもエラーが出ない（本番で5日間、決済列の保護が
--    外れた前例がある）。applications 側のトリガとして足す。
-- ============================================================

CREATE OR REPLACE FUNCTION public.link_auth_on_application_approved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_auth UUID;
  v_name TEXT;
BEGIN
  IF NEW.status <> 'approved' OR NEW.member_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- すでに繋がっているなら何もしない
  IF EXISTS (
    SELECT 1 FROM public.members
     WHERE id = NEW.member_id AND auth_user_id IS NOT NULL
  ) THEN
    RETURN NEW;
  END IF;

  -- 🔴 メール確認が済んだアカウントだけを繋ぐ。未確認まで拾うと、
  --    他人のメールで作られたアカウントに会員の権限が渡る。
  -- 🔴 すでに他の会員が使っているアカウントは拾わない（auth_user_id は
  --    UNIQUE なので、拾うと承認そのものが落ちて理由が伝わらない）。
  SELECT u.id INTO v_auth
    FROM auth.users AS u
   WHERE LOWER(TRIM(u.email)) = LOWER(TRIM(NEW.email))
     AND u.email_confirmed_at IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.members AS m WHERE m.auth_user_id = u.id
     )
   ORDER BY u.created_at ASC
   LIMIT 1;

  IF v_auth IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.members
     SET auth_user_id = v_auth
   WHERE id = NEW.member_id
     AND auth_user_id IS NULL
     AND is_withdrawn = FALSE
  RETURNING name INTO v_name;

  IF v_name IS NOT NULL THEN
    PERFORM public.notify_admins_member_linked(NEW.member_id, v_name);
  END IF;

  RETURN NEW;
END;
$$;

-- AFTER にする。承認の本体（approve_application）が members を作り終えた
-- あとでないと、紐づけ先の行がまだ無い。
DROP TRIGGER IF EXISTS trg_applications_link_auth ON public.applications;
CREATE TRIGGER trg_applications_link_auth
  AFTER INSERT OR UPDATE OF status ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.link_auth_on_application_approved();

-- ------------------------------------------------------------
-- いま詰まっている人を繋ぐ
-- ------------------------------------------------------------
-- 承認済みの申請のうち、紐づけ先の会員がまだアカウントを持っておらず、
-- 申請のメールに確認済みアカウントがあるものを繋ぐ。
-- 実測（2026-09-06）では林　佑ニさん1名が該当する。
UPDATE public.members AS m
   SET auth_user_id = u.id
  FROM public.applications AS a
  JOIN auth.users AS u
    ON LOWER(TRIM(u.email)) = LOWER(TRIM(a.email))
   AND u.email_confirmed_at IS NOT NULL
 WHERE a.status = 'approved'
   AND a.member_id = m.id
   AND m.auth_user_id IS NULL
   AND m.is_withdrawn = FALSE
   AND NOT EXISTS (
     SELECT 1 FROM public.members AS m2 WHERE m2.auth_user_id = u.id
   );

COMMENT ON FUNCTION public.link_auth_on_application_approved() IS
  '申請を承認したとき、申請のメールで作られた確認済みアカウントを会員に繋ぐ。'
  '名簿のメールは書き換えない（連絡先とログイン用アドレスは別物のため）。';
