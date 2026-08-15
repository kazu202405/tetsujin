-- ============================================================
-- 会の主催者の顔写真を返す
-- ============================================================
-- 前提：202608060008_event_approval_roles_series.sql 適用済み。
--
-- 「会を探す」の主催者アイコンは photoUrl が空文字で固定されており、
-- 画像が壊れた状態で出ていた。写真を出すには主催者の avatar_path が要るが、
-- event_list() が host_name しか返していなかったため画面側では作れなかった。
--
-- 参加者一覧から主催者の写真を拾うことはできない。
-- 主催者は event_participants に行を持たない運用になっており、
-- 実データでも owner の行は存在しなかった。
--
-- 変更は host_avatar_path を1列足すだけ。既存の列と並び順は変えない。
-- ============================================================

DROP FUNCTION IF EXISTS public.event_list(BOOLEAN);
CREATE FUNCTION public.event_list(p_include_past BOOLEAN DEFAULT TRUE)
RETURNS TABLE (
  id                UUID,
  title             TEXT,
  series_name       TEXT,
  event_date        DATE,
  start_time        TEXT,
  location          TEXT,
  description       TEXT,
  capacity          INTEGER,
  is_canceled       BOOLEAN,
  requires_approval BOOLEAN,
  host_id           UUID,
  host_name         TEXT,
  host_avatar_path  TEXT,
  participant_count BIGINT,
  pending_count     BIGINT,
  my_status         TEXT,
  my_role           TEXT,
  is_manager        BOOLEAN,
  is_mine           BOOLEAN,
  following_series  BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    e.id,
    e.title,
    e.series_name,
    e.event_date,
    e.start_time,
    e.location,
    e.description,
    e.capacity,
    e.is_canceled,
    e.requires_approval,
    e.host_id,
    h.name,
    h.avatar_path,
    (SELECT COUNT(*) FROM public.event_participants p
      WHERE p.event_id = e.id AND p.status = 'approved'),
    (SELECT COUNT(*) FROM public.event_participants p
      WHERE p.event_id = e.id AND p.status = 'pending'),
    (SELECT p.status FROM public.event_participants p
      WHERE p.event_id = e.id AND p.member_id = public.current_member_id()),
    (SELECT p.role FROM public.event_participants p
      WHERE p.event_id = e.id AND p.member_id = public.current_member_id()),
    public.is_event_manager(e.id),
    e.host_id = public.current_member_id(),
    EXISTS (
      SELECT 1 FROM public.event_series_follows f
       WHERE f.member_id = public.current_member_id()
         AND f.series_name = e.series_name
    )
  FROM public.events AS e
  LEFT JOIN public.members AS h ON h.id = e.host_id
  WHERE public.is_active_member()
    AND (p_include_past OR e.event_date >= CURRENT_DATE)
  ORDER BY e.event_date DESC;
$$;

REVOKE ALL ON FUNCTION public.event_list(BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.event_list(BOOLEAN) TO authenticated;
