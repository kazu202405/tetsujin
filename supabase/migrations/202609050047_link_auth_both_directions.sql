-- ============================================================
-- 承認とアカウント作成が「どちらの順でも」ログインが成立するようにする
-- ============================================================
-- 前提：202608050001_members.sql
--       202608250029_close_open_signup.sql
--       202608190023_payment_links.sql 適用済み。
--
-- ------------------------------------------------------------
-- 🔴 いま起きていること（2026-09-05 実測）
-- ------------------------------------------------------------
-- 承認したのに入れていない人が3名いる。
--   泉勇輝 / 石原光子 / 丸尾有希
--   いずれも 申請 → 本人がアカウント作成 → その後で運営が承認、の順。
--
-- 紐づけを行う handle_new_auth_user は auth.users への INSERT トリガで、
-- 「サインアップの瞬間」にしか走らない。その時点で名簿に行が無ければ
-- 何もせず終わる。あとから承認して members 行ができても、
-- すでに存在する auth ユーザーには二度と紐づかない。
--
-- ∴ 今の作りは「名簿が先、アカウントが後」の順でしか成立しない。
--    逆順だと、承認しても本人の画面は「会員として登録されていません」の
--    まま。エラーは出ず、運営側にも何も見えない。
--
-- 同じ理由で、メール未記入の188名は、あとから運営がメールを入れても
-- 自動では開通しない（名簿を直す作業が実を結ばない）。
--
-- ------------------------------------------------------------
-- 直し方
-- ------------------------------------------------------------
-- 紐づけを両方向にする。反対向き（名簿側が動いたときに auth を探す）を
-- members のトリガとして足す。
--
--   handle_new_auth_user  … アカウントが後（既存のまま・触らない）
--   link_member_auth_user … 名簿が後（ここで新設）
--
-- 🔴 既存の approve_application は書き換えない。CREATE OR REPLACE は
--    全文置換で、前の版が足した行を落としてもエラーが出ないため
--    （本番で5日間、決済列の保護が外れた前例がある）。
--    members へのトリガにすれば、承認・メール補完・Excel取り込みの
--    どの経路から行が動いても同じ1か所を通る。
--
-- ------------------------------------------------------------
-- 依頼主の判断（2026-09-05）
-- ------------------------------------------------------------
-- ・名簿に載っている＝運営が承認済み、とみなす（会員ごとの許可印は付けない）
-- ・ただし「誰が新しく入れるようになったか」は運営に知らせる
-- ============================================================

-- ------------------------------------------------------------
-- 開通を運営に知らせる
-- ------------------------------------------------------------
-- 承認印を付けない代わりに、開通したことは必ず運営の目に入るようにする。
-- 種類は announcement（notification_allowed で切れない種類）。
-- 新しい type を足すとDBの制約と画面の対応表を両方直す必要があり、
-- 片方を忘れると受け取った人の一覧が落ちる。ここは既存の種類で足りる。
CREATE OR REPLACE FUNCTION public.notify_admins_member_linked(
  p_member_id UUID,
  p_name      TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin UUID;
BEGIN
  FOR v_admin IN
    SELECT id FROM public.members
     WHERE role IN ('owner', 'admin')
       AND is_withdrawn = FALSE
  LOOP
    INSERT INTO public.notifications (recipient_id, type, title, message, href)
    VALUES (
      v_admin,
      'announcement',
      COALESCE(p_name, 'メンバー') || 'さんがログインできるようになりました',
      'アカウントと名簿が紐づきました。',
      '/app/admin'
    );
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_admins_member_linked(UUID, TEXT)
  FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------
-- 名簿側が動いたら、待っているアカウントを探して繋ぐ
-- ------------------------------------------------------------
-- 走る場面は3つ。
--   ・承認で members 行ができたとき（INSERT）
--   ・運営がメールを入れた／直したとき（UPDATE OF email）
--   ・handle_new_auth_user が紐づけたとき（UPDATE OF auth_user_id）
--     → こちらは通知だけを担当する（紐づけ自体は向こうで済んでいる）
--
-- 🔴 メール確認が済んだアカウントだけを対象にする。
--    Supabase の設定は mailer_autoconfirm=false なので、確認が済んで
--    いる＝そのメールを実際に受け取れる本人である、と言える。
--    未確認まで拾うと、他人のメールで作られた宙ぶらりんのアカウントに
--    会員の権限が渡る。
--
-- 🔴 すでに他の会員が使っているアカウントは拾わない。
--    auth_user_id は UNIQUE なので衝突すれば失敗するが、失敗させると
--    運営のメール修正が「保存できません」になって理由が伝わらない。
CREATE OR REPLACE FUNCTION public.link_member_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.auth_user_id IS NULL
     AND COALESCE(NEW.email, '') <> ''
     AND NEW.is_withdrawn = FALSE THEN
    SELECT u.id
      INTO NEW.auth_user_id
      FROM auth.users AS u
     WHERE LOWER(TRIM(u.email)) = LOWER(TRIM(NEW.email))
       AND u.email_confirmed_at IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM public.members AS m2 WHERE m2.auth_user_id = u.id
       )
     ORDER BY u.created_at ASC
     LIMIT 1;
  END IF;

  -- 新しく繋がったときだけ知らせる（もともと繋がっている行の更新では出さない）
  IF NEW.auth_user_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.auth_user_id IS DISTINCT FROM NEW.auth_user_id) THEN
    PERFORM public.notify_admins_member_linked(NEW.id, NEW.name);
  END IF;

  RETURN NEW;
END;
$$;

-- 🔴 名前を zz で始める。BEFORE トリガは名前順に走るため、
--    protect_member_admin_fields（NEW.auth_user_id := OLD.auth_user_id で
--    書き換えを戻す）より後に走らせないと、ここで入れた値が消える。
--    既存は trg_members_email_unique / trg_members_protect_admin_fields /
--    trg_members_set_updated_at の3本。
DROP TRIGGER IF EXISTS trg_members_zz_link_auth_user ON public.members;
CREATE TRIGGER trg_members_zz_link_auth_user
  BEFORE INSERT OR UPDATE OF email, auth_user_id, is_withdrawn ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.link_member_auth_user();

-- ------------------------------------------------------------
-- いま詰まっている人を開通させる
-- ------------------------------------------------------------
-- 実測（2026-09-05）：アカウントを作ってメール確認まで済ませたのに
-- 名簿と繋がっていない人が4名。うち3名は名簿にメールがあるので、
-- 繋ぐだけで入れる。残り1名は名簿にメールが無いため対象外
-- （画面から入会申込へ案内する）。
--
-- この UPDATE も上のトリガを通るが、NEW.auth_user_id が既に入っている
-- ので探し直しは走らず、通知だけが出る＝運営が誰が開通したか分かる。
UPDATE public.members AS m
   SET auth_user_id = u.id
  FROM auth.users AS u
 WHERE m.auth_user_id IS NULL
   AND m.is_withdrawn = FALSE
   AND COALESCE(m.email, '') <> ''
   AND LOWER(TRIM(u.email)) = LOWER(TRIM(m.email))
   AND u.email_confirmed_at IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM public.members AS m2 WHERE m2.auth_user_id = u.id
   );

COMMENT ON FUNCTION public.link_member_auth_user() IS
  '名簿側が動いたときに、同じメールの確認済みアカウントへ紐づける。'
  'handle_new_auth_user（アカウント側が動いたとき）と対になっていて、'
  '承認とアカウント作成がどちらの順でもログインが成立する。';
