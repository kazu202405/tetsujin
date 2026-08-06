-- ============================================================
-- 紹介ツリー ＋ コミュニティ統計
-- ============================================================
-- 前提：202608060008_event_approval_roles_series.sql 適用済み。
--
-- 紹介ツリーは members.referrer_member_id（運営が紐づける列）から作る。
-- 台帳の referrer は名前のテキストで会員と繋がっていないため、
-- 紐づけが済んだ分だけがツリーに現れる。
-- ============================================================

-- 紹介の親子関係。名刺に出してよい列だけを返す。
DROP FUNCTION IF EXISTS public.referral_tree();
CREATE FUNCTION public.referral_tree()
RETURNS TABLE (
  id                 UUID,
  name               TEXT,
  job                TEXT,
  avatar_path        TEXT,
  is_withdrawn       BOOLEAN,
  member_no          INTEGER,
  referrer_member_id UUID,
  referrer_text      TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    m.id,
    m.name,
    m.job,
    m.avatar_path,
    m.is_withdrawn,
    m.member_no,
    m.referrer_member_id,
    m.referrer
  FROM public.members AS m
  WHERE public.is_active_member()
  ORDER BY m.member_no ASC NULLS LAST, m.name ASC;
$$;

REVOKE ALL ON FUNCTION public.referral_tree() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.referral_tree() TO authenticated;

-- サイドバーに出す実数（固定値をやめる）
DROP FUNCTION IF EXISTS public.community_stats();
CREATE FUNCTION public.community_stats()
RETURNS TABLE (
  member_count      BIGINT,
  events_this_month BIGINT,
  posts_this_month  BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    (SELECT COUNT(*) FROM public.members WHERE is_withdrawn = FALSE),
    (SELECT COUNT(*) FROM public.events
      WHERE is_canceled = FALSE
        AND event_date >= date_trunc('month', CURRENT_DATE)::date
        AND event_date <  (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::date),
    (SELECT COUNT(*) FROM public.posts
      WHERE created_at >= date_trunc('month', NOW()))
  WHERE public.is_active_member();
$$;

REVOKE ALL ON FUNCTION public.community_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_stats() TO authenticated;
