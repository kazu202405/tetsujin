-- ============================================================
-- 本番公開前のセキュリティ修正
-- ============================================================
-- 発見（2026-08-25 リリース前監査）:
--
-- 🔴 誰でも会員になれる状態だった。
--    handle_new_auth_user は「メールが一致する会員行が無ければ新しい行を作る」
--    作りになっており、作られた行は is_withdrawn = FALSE なので
--    current_member_id() が返る ＝ is_active_member() が true になる。
--    ∴ 任意のメールアドレスでサインアップするだけで、
--      名簿439名・掲示板の全投稿・会の一覧・全員の顔写真にアクセスできた。
--
--    /signup のページを消しても塞がらない。anon キーはクライアントバンドルに
--    入っているので auth/v1/signup を直接叩けば同じことができる。
--    ∴ 塞ぐ場所はここ（DB）でなければならない。
--
-- 🟡 member_directory だけガードが弱かった（他の62関数は is_active_member()）。
--
-- 方針:
--   Auth 側の公開サインアップは止めない。441名が自分でアカウントを
--   作れなくなり、オンボーディングが止まるため。
--   「アカウントは誰でも作れるが、名簿に載っている人だけが会員になる」
--   という形にして、会員かどうかの判定を1か所（members 行の有無）に集約する。
-- ============================================================

-- ------------------------------------------------------------
-- ① サインアップでは会員行を作らない（名簿にある行への紐づけのみ）
-- ------------------------------------------------------------
-- 変更点は「一致する行が無かったときに INSERT していたのをやめる」ことだけ。
-- 一致したときの紐づけ処理は元のまま維持する。
--
-- 会員行が無いまま残った auth ユーザーは current_member_id() が NULL になり、
-- RLS ポリシーと SECURITY DEFINER 関数のすべてで弾かれる。
-- 画面側は app/app/layout.tsx が「会員として登録されていません」を出す。
--
-- 入会の正規ルート（/register → 運営が承認 → approve_application が
-- members 行を作る → 本人がそのメールでサインアップ → ここで紐づく）は
-- そのまま動く。承認済みの人は members 行が先にあるため。
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email  TEXT := LOWER(TRIM(NEW.email));
  v_target UUID;
BEGIN
  IF v_email IS NULL OR v_email = '' THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_target
    FROM public.members
   WHERE auth_user_id IS NULL
     AND LOWER(TRIM(email)) = v_email
   ORDER BY is_withdrawn ASC, member_no ASC NULLS LAST, created_at ASC
   LIMIT 1;

  IF v_target IS NOT NULL THEN
    UPDATE public.members SET auth_user_id = NEW.id WHERE id = v_target;
  END IF;

  -- 🔴 一致する会員行が無い場合はここで終わる。会員行は作らない。
  --    作ると「入金していない人が会員として全機能に入れる」状態に戻る。
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_auth_user() IS
  'サインアップ時に、名簿にある同じメールの会員行へ紐づける。'
  '一致する行が無ければ何もしない（会員行を新規作成しない）。'
  '会員を増やせるのは運営の承認（approve_application）だけ。';

-- ------------------------------------------------------------
-- ② メンバー一覧のガードを他の関数と揃える
-- ------------------------------------------------------------
-- 旧: WHERE auth.uid() IS NOT NULL
--     → 会員行を持たない auth ユーザーでも439名の名簿が取れた
-- 新: WHERE public.is_active_member()
--     → 在籍会員だけ。他の62関数と同じ判定に統一する
--
-- ①だけでも実害は消えるが、判定がここだけ違うと次に触る人が踏む。
CREATE OR REPLACE FUNCTION public.member_directory()
RETURNS TABLE (
  id              UUID,
  member_no       INTEGER,
  name            TEXT,
  nickname        TEXT,
  job             TEXT,
  grip            TEXT,
  membership_type TEXT,
  role            TEXT,
  avatar_path     TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    m.id,
    m.member_no,
    m.name,
    m.nickname,
    m.job,
    m.grip,
    m.membership_type,
    m.role,
    m.avatar_path
  FROM public.members AS m
  WHERE public.is_active_member()
    AND m.is_withdrawn = FALSE
  ORDER BY m.member_no ASC NULLS LAST, m.name ASC;
$$;

REVOKE ALL ON FUNCTION public.member_directory() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.member_directory() TO authenticated;
