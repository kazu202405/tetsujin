-- ============================================================
-- おすすめ（会員が投稿するお店）＋ 運営向けのつながり一覧
-- ============================================================
-- 前提：202608060009_referral_tree_and_stats.sql 適用済み。
-- ============================================================

-- ------------------------------------------------------------
-- おすすめのお店
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recommendations (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id       UUID        NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  restaurant_name TEXT        NOT NULL CHECK (char_length(restaurant_name) BETWEEN 1 AND 120),
  area            TEXT,
  genre           TEXT,
  story           TEXT,
  tags            TEXT[]      NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recommendations_member ON public.recommendations(member_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_created ON public.recommendations(created_at DESC);

DROP TRIGGER IF EXISTS trg_recommendations_set_updated_at ON public.recommendations;
CREATE TRIGGER trg_recommendations_set_updated_at
  BEFORE UPDATE ON public.recommendations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS recommendations_select ON public.recommendations;
CREATE POLICY recommendations_select ON public.recommendations
  FOR SELECT TO authenticated
  USING (public.is_active_member());

DROP POLICY IF EXISTS recommendations_write_own ON public.recommendations;
CREATE POLICY recommendations_write_own ON public.recommendations
  FOR ALL TO authenticated
  USING (member_id = public.current_member_id() OR public.is_admin())
  WITH CHECK (member_id = public.current_member_id() OR public.is_admin());

-- 投稿者の表示用の列を同梱して返す（members は他人の行が読めないため）
DROP FUNCTION IF EXISTS public.recommendation_list();
CREATE FUNCTION public.recommendation_list()
RETURNS TABLE (
  id                  UUID,
  restaurant_name     TEXT,
  area                TEXT,
  genre               TEXT,
  story               TEXT,
  tags                TEXT[],
  created_at          TIMESTAMPTZ,
  member_id           UUID,
  member_name         TEXT,
  member_job          TEXT,
  member_avatar_path  TEXT,
  member_is_withdrawn BOOLEAN,
  is_mine             BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    r.id, r.restaurant_name, r.area, r.genre, r.story, r.tags, r.created_at,
    m.id, m.name, m.job, m.avatar_path, m.is_withdrawn,
    r.member_id = public.current_member_id()
  FROM public.recommendations AS r
  JOIN public.members AS m ON m.id = r.member_id
  WHERE public.is_active_member()
  ORDER BY r.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.recommendation_list() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recommendation_list() TO authenticated;

-- ------------------------------------------------------------
-- 運営向け：誰と誰がつながっているか
-- ------------------------------------------------------------
-- 🔴 出会い記録のメモ本文は返さない。
--    記録は「本人のメモであり相手にも他人にも見せない」設計で作っており、
--    運営であっても中身は見せない。運営に必要なのは
--    「誰と誰が、何回会っているか」という関係の把握までなので、
--    ペアと回数・最終日だけを返す。
DROP FUNCTION IF EXISTS public.member_meeting_pairs();
CREATE FUNCTION public.member_meeting_pairs()
RETURNS TABLE (
  member_a_id     UUID,
  member_a_name   TEXT,
  member_a_avatar TEXT,
  member_b_id     UUID,
  member_b_name   TEXT,
  member_b_avatar TEXT,
  meeting_count   BIGINT,
  last_met_on     DATE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH pairs AS (
    -- 向きを揃えて（小さいID, 大きいID）同じ組み合わせをまとめる
    SELECT
      LEAST(c.owner_id, c.person_id)    AS a_id,
      GREATEST(c.owner_id, c.person_id) AS b_id,
      c.met_on
    FROM public.connections AS c
    WHERE public.is_admin()
  )
  SELECT
    p.a_id, a.name, a.avatar_path,
    p.b_id, b.name, b.avatar_path,
    COUNT(*),
    MAX(p.met_on)
  FROM pairs AS p
  JOIN public.members AS a ON a.id = p.a_id
  JOIN public.members AS b ON b.id = p.b_id
  GROUP BY p.a_id, a.name, a.avatar_path, p.b_id, b.name, b.avatar_path
  ORDER BY COUNT(*) DESC, MAX(p.met_on) DESC NULLS LAST;
$$;

REVOKE ALL ON FUNCTION public.member_meeting_pairs() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.member_meeting_pairs() TO authenticated;

COMMENT ON TABLE public.recommendations IS '会員が投稿するおすすめのお店';
COMMENT ON FUNCTION public.member_meeting_pairs() IS '運営向け。出会いのペアと回数のみ返す（メモ本文は返さない）';
