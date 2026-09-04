-- ============================================================
-- はじめてガイド「掲示板を見る」が永久に完了しないのを直す
-- ============================================================
-- 前提：202608300031_onboarding_social_link.sql
--       202608130020_board_channel_reads.sql 適用済み。
--
-- ------------------------------------------------------------
-- 🔴 何が起きていたか
-- ------------------------------------------------------------
-- 202608130020 で「掲示板を開いた」の記録先が board_reads から
-- board_channel_reads に移った。掲示板ページは必ずチャンネルIDを付けて
-- mark_board_channel_read を呼ぶため、board_reads にはもう1行も書かれない。
--
-- ところが、このガイドの判定だけが board_reads を見たままだった。
-- ∴ 2026-08-13 以降にはじめて掲示板を開いた人は、何度読んでも
--   ステップ4が未完了のまま埋まらない。
--
-- 実測（2026-09-04）：
--   board_reads          5行 / 最終 2026-08-13 で停止
--   board_channel_reads 37行 / 2026-09-04 まで更新中
--   → 8/31に掲示板を7回開いた会員が、未完了のままだった。
--
-- ------------------------------------------------------------
-- なぜ判定側を直すか（board_reads を書き足さない理由）
-- ------------------------------------------------------------
-- board_channel_counts は「そのチャンネルを一度も開いていない人」の
-- 基準時刻として board_reads を使っている。チャンネルを開くたびに
-- board_reads を NOW() にすると、後から作られたチャンネルの未読が
-- 最初から消えてしまう。バッジを壊さずに済むのは判定側の変更だけ。
--
-- has_connection は列として返し続ける（画面のステップからは外したが、
-- 戻り値を減らすと API の型と DROP/CREATE がもう一往復必要になるため）。
-- ============================================================

DROP FUNCTION IF EXISTS public.onboarding_progress();

CREATE FUNCTION public.onboarding_progress()
RETURNS TABLE (
  has_avatar      BOOLEAN,
  has_sheet       BOOLEAN,
  has_social_link BOOLEAN,
  visited_board   BOOLEAN,
  has_post        BOOLEAN,
  joined_event    BOOLEAN,
  has_connection  BOOLEAN,
  dismissed       BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    m.avatar_path IS NOT NULL,
    EXISTS (SELECT 1 FROM public.profile_sheets s WHERE s.member_id = m.id),
    EXISTS (SELECT 1 FROM public.member_social_links l WHERE l.member_id = m.id),
    -- 旧（〜2026-08-13）と新（チャンネル別）の両方を見る。
    -- 旧だけの人・新だけの人がどちらもいるので、片方では取りこぼす。
    (
      EXISTS (SELECT 1 FROM public.board_reads         b WHERE b.member_id = m.id)
      OR
      EXISTS (SELECT 1 FROM public.board_channel_reads r WHERE r.member_id = m.id)
    ),
    EXISTS (SELECT 1 FROM public.posts p WHERE p.author_id = m.id),
    EXISTS (
      SELECT 1 FROM public.event_participants e
       WHERE e.member_id = m.id AND e.status = 'approved'
    ),
    EXISTS (SELECT 1 FROM public.connections c WHERE c.owner_id = m.id),
    m.onboarding_dismissed_at IS NOT NULL
  FROM public.members AS m
  WHERE m.id = public.current_member_id();
$$;

REVOKE ALL ON FUNCTION public.onboarding_progress() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.onboarding_progress() TO authenticated;
