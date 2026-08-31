-- ============================================================
-- 申請と同じ名前の在籍会員を、承認する前に見せる
-- ============================================================
-- 前提：202608050005_applications_and_events.sql
--       202608200026_application_matching.sql 適用済み。
--
-- ------------------------------------------------------------
-- 🔴 なぜ要るか（2026-08-31 実例）
-- ------------------------------------------------------------
-- approve_application() は、運営が既存会員を指定しなければ
-- 「申請のメールと同じメールの会員行」を探し、無ければ新しい行を作る。
--
-- ところが名簿から取り込んだ行にはメールが入っていない（在籍439名中100名、
-- うち87名は会員番号あり）。∴ 照合するものが無く必ず空振りして、
-- 既存会員なのに番号なし・新料金の別行ができる。
-- 池田裕哉さん（会員番号3）で実際に起き、年33,000円で登録されていた。
--
-- ∴ メールが一致しなくても「同じ名前の在籍会員」がいたら承認前に見せる。
--    自動で紐づけはしない——同姓同名は実在する（朝倉輝さんは連絡先が
--    全く違う2行があり、別人か二重登録かデータからは判断できない）。
--    機械は気づかせるだけにして、判断は運営に残す。
--
-- 突き合わせは members.name_normalized（空白を除いて小文字化した名前）と
-- 同じ作り方で申請の名前を正規化して比べる。
-- ============================================================

-- 申請ごとに1回ずつ呼ぶと、一覧を開くたびに件数分の問い合わせになる。
-- 審査中のぶんをまとめて1回で返す。
DROP FUNCTION IF EXISTS public.application_same_name_members(UUID);
DROP FUNCTION IF EXISTS public.pending_application_same_name_members();

CREATE FUNCTION public.pending_application_same_name_members()
RETURNS TABLE (
  application_id  UUID,
  member_id       UUID,
  member_no       INTEGER,
  name            TEXT,
  job             TEXT,
  email           TEXT,
  phone           TEXT,
  start_year      SMALLINT,
  start_month     SMALLINT,
  has_login       BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    a.id,
    m.id, m.member_no, m.name, m.job, m.email, m.phone,
    m.start_year, m.start_month,
    m.auth_user_id IS NOT NULL
  FROM public.applications AS a
  JOIN public.members AS m
    ON m.name_normalized = LOWER(REGEXP_REPLACE(a.name, '[\s　]+', '', 'g'))
  WHERE public.is_admin()
    AND a.status = 'pending'
    AND m.is_withdrawn = FALSE
    -- 既にこの申請から作られた行は「同名の既存会員」ではないので出さない
    AND (a.member_id IS NULL OR m.id <> a.member_id)
  ORDER BY a.created_at DESC, m.member_no ASC NULLS LAST;
$$;

REVOKE ALL ON FUNCTION public.pending_application_same_name_members() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pending_application_same_name_members() TO authenticated;

COMMENT ON FUNCTION public.pending_application_same_name_members() IS
  '申請と同じ名前の在籍会員。メールが無い名簿行と突き合わせられないための保険。自動では紐づけない';
