-- ============================================================
-- 「メンバーの状況」で会員番号・メール・電話でも探せるようにする
-- ============================================================
-- 前提：202608310040_activity_profile_completeness.sql 適用済み。
--
-- 運営は「3番の人」「この電話番号の人」で探す。いまは名前と職種しか
-- 引けなかった。
--
-- 🔴 戻り値の列が増えるので DROP してから作り直す。複製元は
--    最後にこの関数を定義した 202608310040。0005 から取ると
--    記入状況（has_grip / has_sheet / has_matching）が消える。
-- ============================================================

DROP FUNCTION IF EXISTS public.member_activity_stats();
CREATE FUNCTION public.member_activity_stats()
RETURNS TABLE (
  member_id        UUID,
  member_no        INTEGER,
  name             TEXT,
  email            TEXT,
  phone            TEXT,
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
    m.member_no,
    m.name,
    m.email,
    m.phone,
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

