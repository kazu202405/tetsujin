-- ============================================================
-- はじめてガイドを実データに合わせる
-- ============================================================
-- 前提：0003（掲示板・写真）〜0010（出会い）適用済み。
--
-- これまでの問題：
--   ・進捗の一部（掲示板を見たか／ガイドを閉じたか）が端末の localStorage だった
--     → スマホとPCで進み方が違い、機種変で最初から出てくる
--   ・ステップの中身が、いまのアプリと合っていない
--     （下タブ・出会い・写真登録ができる前に書かれたもの）
--
-- 直し方：
--   ・「閉じた」だけを会員の行に持つ（会員ごと＝どの端末でも同じ）
--   ・各ステップの完了は実データから毎回数える。フラグは持たない。
--     持つと「やったのに消えた」「やってないのに完了」がすぐ起きる。
-- ============================================================

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS onboarding_dismissed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.members.onboarding_dismissed_at IS
  'はじめてガイドを閉じた日時。本人が閉じる／もう一度見るで操作する';

-- ------------------------------------------------------------
-- 自分の進捗（1回の問い合わせで全部返す）
-- ------------------------------------------------------------
-- 画面から4つ5つ叩くと、そのぶん往復が増えて遅くなる。
DROP FUNCTION IF EXISTS public.onboarding_progress();

CREATE FUNCTION public.onboarding_progress()
RETURNS TABLE (
  has_avatar     BOOLEAN,
  has_sheet      BOOLEAN,
  visited_board  BOOLEAN,
  has_post       BOOLEAN,
  joined_event   BOOLEAN,
  has_connection BOOLEAN,
  dismissed      BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    m.avatar_path IS NOT NULL,
    EXISTS (SELECT 1 FROM public.profile_sheets s WHERE s.member_id = m.id),
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

-- ------------------------------------------------------------
-- 閉じる／もう一度見る
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS public.set_onboarding_dismissed(BOOLEAN);

CREATE FUNCTION public.set_onboarding_dismissed(p_dismissed BOOLEAN)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE public.members
     SET onboarding_dismissed_at = CASE WHEN p_dismissed THEN NOW() ELSE NULL END
   WHERE id = public.current_member_id();
$$;

REVOKE ALL ON FUNCTION public.set_onboarding_dismissed(BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_onboarding_dismissed(BOOLEAN) TO authenticated;
