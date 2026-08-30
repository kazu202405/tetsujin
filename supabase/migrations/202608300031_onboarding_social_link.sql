-- ============================================================
-- はじめてガイドに「連絡先を登録する」を足す
-- ============================================================
-- 前提：202608080017_onboarding_progress.sql
--       202608300030_sns_disclosure_by_approval.sql 適用済み。
--
-- ------------------------------------------------------------
-- 🔴 なぜ足すか
-- ------------------------------------------------------------
-- 441名のうち SNSリンクを登録しているのは1名（2行）だけ。
-- 入口が「マイページ→プロフィールシート→ページ下部」としか無く、
-- そこまで潜る理由が無いため、事実上ゼロ稼働になっている。
--
-- これは飾りの機能ではない。つながりマッチングで相手を見つけても、
-- 連絡先が登録されていなければ**その先に進む手段が無い**。
-- 申請を受けた側も、承認画面で「教えられるものがありません」になる。
-- ∴ 出口が空のままでは、マッチングも申請も動かない。
--
-- 完了は実データから数える（フラグを持たない）＝元の設計のまま。
-- 公開範囲は問わない。'private' でも「登録した」ことには変わりなく、
-- ここで公開範囲まで条件にすると、非公開で持っている人に
-- 永遠に未完了の印が付く。
-- ============================================================

-- 戻り値の列が増えるので CREATE OR REPLACE では作り直せない
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
    EXISTS (SELECT 1 FROM public.board_reads   b WHERE b.member_id = m.id),
    EXISTS (SELECT 1 FROM public.posts         p WHERE p.author_id = m.id),
    EXISTS (
      SELECT 1 FROM public.event_participants e
       WHERE e.member_id = m.id AND e.status = 'approved'
    ),
    EXISTS (SELECT 1 FROM public.connections   c WHERE c.owner_id = m.id),
    m.onboarding_dismissed_at IS NOT NULL
  FROM public.members AS m
  WHERE m.id = public.current_member_id();
$$;

REVOKE ALL ON FUNCTION public.onboarding_progress() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.onboarding_progress() TO authenticated;
