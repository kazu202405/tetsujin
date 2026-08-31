-- ============================================================
-- 「メンバーの状況」に記入状況を足す
-- ============================================================
-- 前提：202608050005_applications_and_events.sql 適用済み。
--
-- 運営が「ひとこと・プロフィールシート・つながりの設定を
-- まだ埋めていない人」を見つけて声を掛けられるようにする（依頼主判断 2026-08-31）。
--
-- 🔴 会員向けのメンバー一覧には出さない。本人に「未記入」の印が付くのは
--    気分が悪い。運営だけが見える場所に置く。
--
-- 🔴 戻り値の列が増えるので DROP してから作り直す。
--    複製元は最後にこの関数を定義した 202608050005。
--    手で書き直すと、参加数や紹介数の集計を落とす。
-- ============================================================

DROP FUNCTION IF EXISTS public.member_activity_stats();
CREATE FUNCTION public.member_activity_stats()
RETURNS TABLE (
  member_id        UUID,
  name             TEXT,
  job              TEXT,
  avatar_path      TEXT,
  is_withdrawn     BOOLEAN,
  has_login        BOOLEAN,
  last_sign_in_at  TIMESTAMPTZ,
  last_visit_date  DATE,
  visit_days_30d   BIGINT,
  last_post_at     TIMESTAMPTZ,
  post_count_30d   BIGINT,
  last_event_date  DATE,
  event_count_90d  BIGINT,
  referral_count   BIGINT,
  renewal_status   TEXT,
  start_year       SMALLINT,
  start_month      SMALLINT,
  has_grip         BOOLEAN,
  has_sheet        BOOLEAN,
  has_matching     BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp, auth
AS $$
  SELECT
    m.id,
    m.name,
    m.job,
    m.avatar_path,
    m.is_withdrawn,
    m.auth_user_id IS NOT NULL,
    u.last_sign_in_at,
    (SELECT MAX(v.visit_date) FROM public.member_visits v WHERE v.member_id = m.id),
    (SELECT COUNT(*) FROM public.member_visits v
      WHERE v.member_id = m.id AND v.visit_date >= CURRENT_DATE - 30),
    (SELECT MAX(p.created_at) FROM public.posts p WHERE p.author_id = m.id),
    (SELECT COUNT(*) FROM public.posts p
      WHERE p.author_id = m.id AND p.created_at >= NOW() - INTERVAL '30 days'),
    (SELECT MAX(e.event_date)
       FROM public.event_participants ep
       JOIN public.events e ON e.id = ep.event_id
      WHERE ep.member_id = m.id),
    (SELECT COUNT(*)
       FROM public.event_participants ep
       JOIN public.events e ON e.id = ep.event_id
      WHERE ep.member_id = m.id AND e.event_date >= CURRENT_DATE - INTERVAL '90 days'),
    (SELECT COUNT(*) FROM public.members r
      WHERE r.referrer_member_id = m.id AND r.is_withdrawn = FALSE),
    m.renewal_status,
    m.start_year,
    m.start_month,
    -- 記入状況。運営が「まだ埋めていない人」に声を掛けるために使う。
    -- 会員向けの一覧には出さない（本人に「未記入」の印が付くのは気分が悪い）。
    COALESCE(TRIM(m.grip), '') <> '',
    EXISTS (SELECT 1 FROM public.profile_sheets s WHERE s.member_id = m.id),
    EXISTS (
      SELECT 1 FROM public.member_matching_profile p
       WHERE p.member_id = m.id
         AND (COALESCE(array_length(p.industries, 1), 0) > 0
           OR COALESCE(array_length(p.positions,  1), 0) > 0
           OR COALESCE(array_length(p.regions,    1), 0) > 0)
    )
  FROM public.members AS m
  LEFT JOIN auth.users AS u ON u.id = m.auth_user_id
  WHERE public.is_admin()
  ORDER BY m.name ASC;
$$;

REVOKE ALL ON FUNCTION public.member_activity_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.member_activity_stats() TO authenticated;

