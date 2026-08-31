-- ============================================================
-- メンバー一覧を「新しい順」に並べられるようにする
-- ============================================================
-- 前提：202608310035_member_directory_industries.sql 適用済み。
--
-- 新規ご入会挨拶チャンネルを畳み、代わりにメンバー一覧で
-- 「最近入った人」を見られるようにする（依頼主判断 2026-08-31）。
--
-- ------------------------------------------------------------
-- 🔴 created_at は入会日ではない
-- ------------------------------------------------------------
-- 在籍439名のうち436名が 2026-08-05＝名簿を取り込んだ日で同着になる。
-- これから承認で入る人には正しく効くが、既存会員の中では順序を作れない。
-- ∴ 画面側では created_at の降順、同着のときは会員番号の降順にする。
--    （会員番号は313名にしか無いので、これも順序の完全な根拠にはならない。
--      「だいたい新しい順」であることを画面にも書く）
--
-- 🔴 戻り値の列が増えるので DROP してから作り直す。
--    複製元は最新の定義（202608310035）。古い方から取ると industries が消える。
-- ============================================================

DROP FUNCTION IF EXISTS public.member_directory();

CREATE FUNCTION public.member_directory()
RETURNS TABLE (
  id              UUID,
  member_no       INTEGER,
  name            TEXT,
  nickname        TEXT,
  job             TEXT,
  grip            TEXT,
  membership_type TEXT,
  role            TEXT,
  avatar_path     TEXT,
  industries      TEXT[],
  created_at      TIMESTAMPTZ
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
    m.avatar_path,
    COALESCE(
      (
        SELECT ARRAY_AGG(o.label ORDER BY o.sort_order, o.code)
          FROM public.member_matching_profile AS p
          JOIN public.matching_options AS o
            ON o.category = 'industry'
           AND o.code = ANY (p.industries)
         WHERE p.member_id = m.id
      ),
      '{}'::TEXT[]
    ) AS industries,
    m.created_at
  FROM public.members AS m
  WHERE public.is_active_member()
    AND m.is_withdrawn = FALSE
  ORDER BY m.member_no ASC NULLS LAST, m.name ASC;
$$;

REVOKE ALL ON FUNCTION public.member_directory() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.member_directory() TO authenticated;

COMMENT ON FUNCTION public.member_directory() IS
  'メンバー一覧。industries は本人が選んだ業種の表示名。created_at は取込日を含むので入会日そのものではない';
