-- ============================================================
-- 名簿に無いメールで登録した人を、入会申請として運営に上げる
-- ============================================================
-- 前提：202608050005_applications_and_events.sql
--       202608050006_notifications.sql
--       202609050047_link_auth_both_directions.sql 適用済み。
--
-- ------------------------------------------------------------
-- 🔴 いま起きていること
-- ------------------------------------------------------------
-- 名簿に無いメールでアカウントを作った人は、どこにも現れない。
-- 会員一覧は members を見ているので、members 行が無い人は表示されず、
-- 運営には「誰が詰まっているか」が分からない。
--
-- 実例：wolfandfamily01@gmail.com は 2026-08-31 にアカウントを作り、
--       9/5 現在まで5日間そのまま。本人が問い合わせない限り気づけない。
--
-- ------------------------------------------------------------
-- 直し方
-- ------------------------------------------------------------
-- 画面は足さない。入会申請（applications）として立てれば、既存の
-- 「入会申請」タブがそのまま使える。あそこには
--   ・新規として承認（会員行を作る）
--   ・既存の会員に紐づけて承認（member-picker で選ぶ）
--   ・同じ名前の在籍会員がいたら承認前に見せる
-- が既に揃っている。作り直す理由がない。
--
-- 承認されると approve_application が members 行を作る／既存行に
-- メールを入れる → 0047 のトリガが auth_user_id を繋ぐ、と自動でつながる。
-- 却下すれば queue から消える（この表に行が残るので二度と上がらない）
-- ＝「無視する」操作も既存のボタンで足りる。
-- ============================================================

-- ------------------------------------------------------------
-- ① 入会申請の通知が管理者(owner)に届いていなかったのを直す
-- ------------------------------------------------------------
-- 🔴 notify_new_application は role = 'admin' しか見ていない。
--    在籍する運営は owner 2名・admin 1名なので、3人中2人
--    （五島さん・川原さん）に入会申請の通知が届いていなかった。
--    他の通知関数はすべて role IN ('owner','admin') で揃っている。
--
--    今回の仕組みは「運営が気づけること」が要なので、ここを直さないと
--    申請を積んでも半分以上の運営に見えないままになる。
--
-- 🔴 本文は 0006 の定義をそのまま持ってきて、role の条件だけ変えている。
--    CREATE OR REPLACE は全文置換で、打ち直すと前の版の行を黙って落とす。
CREATE OR REPLACE FUNCTION public.notify_new_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin UUID;
BEGIN
  FOR v_admin IN
    SELECT id FROM public.members
     WHERE role IN ('owner', 'admin') AND is_withdrawn = FALSE AND auth_user_id IS NOT NULL
  LOOP
    PERFORM public.push_notification(
      v_admin, NULL, 'connection_new',
      '入会申請が届きました',
      NEW.name || 'さん（' || COALESCE(NEW.job, '職業未記入') || '）',
      '/app/admin'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- ② 申請の出どころを持つ
-- ------------------------------------------------------------
-- 直接サインアップから立てた申請は、氏名とメールしか入っていない
-- （電話・職業・会員種別は空、規約同意も取れていない）。
-- 印が無いと、運営は「入会フォームが壊れている」と読む。
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'form';

ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_source_check;
ALTER TABLE public.applications ADD CONSTRAINT applications_source_check
  CHECK (source IN ('form', 'signup'));

COMMENT ON COLUMN public.applications.source IS
  'form = 入会申込フォーム / signup = アプリで直接アカウントを作った人';

-- ------------------------------------------------------------
-- ③ 名簿と繋がらなかったアカウントを申請として立てる
-- ------------------------------------------------------------
-- 🔴 メール確認が済んだ人だけを対象にする。サインアップ直後に立てると、
--    確認せず放置されたアカウントが運営の処理待ちに積み上がる。
--
-- 🔴 同じメールの申請が既にあれば立てない。フォームから申し込んだ人が
--    そのままアカウントも作る流れが普通にあり、二重に並ぶと
--    どちらを処理したのか分からなくなる。
--    却下済みの行も「ある」と数えるので、断った人が再び上がることもない。
CREATE OR REPLACE FUNCTION public.queue_account_for_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email TEXT := LOWER(TRIM(NEW.email));
  v_name  TEXT;
BEGIN
  IF NEW.email_confirmed_at IS NULL OR v_email IS NULL OR v_email = '' THEN
    RETURN NEW;
  END IF;

  -- 名簿と繋がっているなら用は無い
  IF EXISTS (SELECT 1 FROM public.members WHERE auth_user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- 既に申請がある（審査中・承認済み・却下済みのいずれでも）なら立てない
  IF EXISTS (
    SELECT 1 FROM public.applications WHERE LOWER(TRIM(email)) = v_email
  ) THEN
    RETURN NEW;
  END IF;

  -- 登録画面で入れてもらった氏名。無ければメールの前半で仮に置く
  -- （applications.name は NOT NULL かつ1文字以上）。
  v_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'name', '')), '');
  IF v_name IS NULL THEN
    v_name := split_part(v_email, '@', 1);
  END IF;
  v_name := LEFT(v_name, 100);

  INSERT INTO public.applications (name, email, status, source, note)
  VALUES (
    v_name,
    NEW.email,
    'pending',
    'signup',
    'アプリで直接アカウントを作られた方です。入会申込フォームは未提出のため、'
    || '氏名とメールアドレス以外の情報はありません（規約同意も取得していません）。'
  );

  RETURN NEW;
END;
$$;

-- 🔴 名前を zz で始める。AFTER トリガは名前順に走るので、
--    trg_auth_user_created（handle_new_auth_user が名簿と繋ぐ）より
--    後に走らせないと、繋がった直後の人まで申請として立ててしまう。
DROP TRIGGER IF EXISTS trg_auth_user_zz_needs_review ON auth.users;
CREATE TRIGGER trg_auth_user_zz_needs_review
  AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.queue_account_for_review();

-- ------------------------------------------------------------
-- ④ いま宙に浮いているアカウントを申請として立てる
-- ------------------------------------------------------------
INSERT INTO public.applications (name, email, status, source, note)
SELECT
  LEFT(
    COALESCE(
      NULLIF(TRIM(COALESCE(u.raw_user_meta_data->>'name', '')), ''),
      split_part(LOWER(TRIM(u.email)), '@', 1)
    ),
    100
  ),
  u.email,
  'pending',
  'signup',
  'アプリで直接アカウントを作られた方です。入会申込フォームは未提出のため、'
  || '氏名とメールアドレス以外の情報はありません（規約同意も取得していません）。'
FROM auth.users AS u
WHERE u.email_confirmed_at IS NOT NULL
  AND COALESCE(TRIM(u.email), '') <> ''
  AND NOT EXISTS (SELECT 1 FROM public.members     m WHERE m.auth_user_id = u.id)
  AND NOT EXISTS (
    SELECT 1 FROM public.applications a
     WHERE LOWER(TRIM(a.email)) = LOWER(TRIM(u.email))
  );
