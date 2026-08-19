-- ============================================================
-- マッチング判定（フェーズ2）
-- ============================================================
-- 前提：202608190025_matching.sql 適用済み。
--
-- 依頼主決定：AIは使わない。必須条件で絞り、残りの一致数で並べるだけ。
-- 「なぜこの人が出たか」が説明でき、毎月結果が揺れない。
--
-- ------------------------------------------------------------
-- 🔴 年代の表記が2つある
-- ------------------------------------------------------------
-- 台帳の age_range は「４０代前半」「３０代後半」（全角＋前半/後半で10種）。
-- 資料の探す側は「40代」の5段階。そのまま突き合わせると必ず0件になる。
-- ∴ age_bucket() で寄せてから比べる。
-- ============================================================

-- ------------------------------------------------------------
-- 年代・性別を探す条件としても使えるようにする
-- ------------------------------------------------------------
ALTER TABLE public.matching_options DROP CONSTRAINT IF EXISTS matching_options_category_check;
ALTER TABLE public.matching_options ADD CONSTRAINT matching_options_category_check
  CHECK (category IN (
    'purpose','position','industry','region','lifestyle','hobby','interest',
    'age_range','gender'
  ));

-- 年代は5段階（台帳の10種を寄せた形）。codeは表示と同じにして読めるようにする。
INSERT INTO public.matching_options (category, code, label, sort_order) VALUES
('age_range','20代','20代',10),
('age_range','30代','30代',20),
('age_range','40代','40代',30),
('age_range','50代','50代',40),
('age_range','60代以上','60代以上',50),
-- 🔴 性別のcodeは台帳の値（男/女）と同じにする。
--    ラベルだけ「男性/女性」にして、突き合わせで変換が要らないようにする。
--    変換を挟むと、どちらかを直したときにもう片方を直し忘れる。
('gender','男','男性',10),
('gender','女','女性',20)
ON CONFLICT (category, code) DO UPDATE
  SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order;

-- ------------------------------------------------------------
-- 台帳の年代表記を5段階に寄せる
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.age_bucket(p_age TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_age IS NULL THEN NULL
    WHEN p_age LIKE '２０%' OR p_age LIKE '20%' THEN '20代'
    WHEN p_age LIKE '３０%' OR p_age LIKE '30%' THEN '30代'
    WHEN p_age LIKE '４０%' OR p_age LIKE '40%' THEN '40代'
    WHEN p_age LIKE '５０%' OR p_age LIKE '50%' THEN '50代'
    -- 70代以上も「60代以上」に含める（探す側の選択肢が5段階のため）
    WHEN p_age LIKE '６０%' OR p_age LIKE '60%'
      OR p_age LIKE '７０%' OR p_age LIKE '70%' THEN '60代以上'
    ELSE NULL
  END;
$$;

-- ------------------------------------------------------------
-- 候補を出す
-- ------------------------------------------------------------
-- 使い方：探している人(p_seeker)から見た候補を、点数の高い順に返す。
--
-- 点数＝「探している条件」と「相手の自分のこと」で重なった項目の数。
-- 必須に指定したカテゴリは、重なりが無い相手をそもそも候補から外す。
--
-- 🔴 退会者・免除者は除かない（免除は会費の話でマッチングとは無関係）。
--    除くのは退会者と、自分自身と、設定が無い人だけ。
CREATE OR REPLACE FUNCTION public.matching_candidates(
  p_seeker UUID,
  p_limit  INTEGER DEFAULT 20
)
RETURNS TABLE (
  member_id     UUID,
  score         INTEGER,
  matched       TEXT[],   -- どのカテゴリで重なったか（画面に理由を出すため）
  is_required_ok BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH w AS (
    SELECT * FROM public.member_matching_wants WHERE member_id = p_seeker
  ),
  cand AS (
    SELECT
      m.id,
      p.positions, p.industries, p.regions, p.lifestyles, p.hobbies, p.interests,
      public.age_bucket(m.age_range) AS age_bucket,
      m.gender
    FROM public.members AS m
    JOIN public.member_matching_profile AS p ON p.member_id = m.id
    WHERE m.is_withdrawn = FALSE
      AND m.id <> p_seeker
  ),
  scored AS (
    SELECT
      c.id,
      -- 重なった個数を数える（探す側が空のカテゴリは0点＝条件にしていない）
      (SELECT COUNT(*) FROM unnest(w.positions)  AS x WHERE x = ANY(c.positions))  +
      (SELECT COUNT(*) FROM unnest(w.industries) AS x WHERE x = ANY(c.industries)) +
      (SELECT COUNT(*) FROM unnest(w.regions)    AS x WHERE x = ANY(c.regions))    +
      (SELECT COUNT(*) FROM unnest(w.lifestyles) AS x WHERE x = ANY(c.lifestyles)) +
      (SELECT COUNT(*) FROM unnest(w.hobbies)    AS x WHERE x = ANY(c.hobbies))    +
      (SELECT COUNT(*) FROM unnest(w.interests)  AS x WHERE x = ANY(c.interests))  +
      (CASE WHEN c.age_bucket = ANY(w.age_ranges) THEN 1 ELSE 0 END) +
      (CASE WHEN c.gender     = ANY(w.genders)    THEN 1 ELSE 0 END)
        AS score,
      ARRAY_REMOVE(ARRAY[
        CASE WHEN w.positions  && c.positions  THEN '立場'   END,
        CASE WHEN w.industries && c.industries THEN '業種'   END,
        CASE WHEN w.regions    && c.regions    THEN '地域'   END,
        CASE WHEN w.lifestyles && c.lifestyles THEN '属性'   END,
        CASE WHEN w.hobbies    && c.hobbies    THEN '趣味'   END,
        CASE WHEN w.interests  && c.interests  THEN '興味'   END,
        CASE WHEN c.age_bucket = ANY(w.age_ranges) THEN '年代' END,
        CASE WHEN c.gender     = ANY(w.genders)    THEN '性別' END
      ], NULL) AS matched,
      -- 必須に指定したカテゴリは、重なりが無ければ落とす
      (
        (NOT ('position'  = ANY(w.required)) OR w.positions  && c.positions)  AND
        (NOT ('industry'  = ANY(w.required)) OR w.industries && c.industries) AND
        (NOT ('region'    = ANY(w.required)) OR w.regions    && c.regions)    AND
        (NOT ('lifestyle' = ANY(w.required)) OR w.lifestyles && c.lifestyles) AND
        (NOT ('hobby'     = ANY(w.required)) OR w.hobbies    && c.hobbies)    AND
        (NOT ('interest'  = ANY(w.required)) OR w.interests  && c.interests)  AND
        (NOT ('age_range' = ANY(w.required)) OR c.age_bucket = ANY(w.age_ranges)) AND
        (NOT ('gender'    = ANY(w.required)) OR c.gender     = ANY(w.genders))
      ) AS required_ok
    FROM cand AS c CROSS JOIN w
    WHERE w.is_active
  )
  SELECT id, score::INTEGER, matched, required_ok
  FROM scored
  WHERE required_ok AND score > 0
  ORDER BY score DESC, id
  LIMIT GREATEST(p_limit, 0);
$$;

REVOKE ALL ON FUNCTION public.matching_candidates(UUID, INTEGER) FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------
-- 自分の候補（会員向け）
-- ------------------------------------------------------------
-- 🔴 自分の p_seeker しか渡せないようにする。
--    matching_candidates を会員から直接呼べると、他人が誰を探しているかを
--    総当たりで調べられてしまう（探している条件は本人と運営だけのはずだった）。
CREATE OR REPLACE FUNCTION public.my_matching_candidates(p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  member_id   UUID,
  name        TEXT,
  job         TEXT,
  avatar_path TEXT,
  score       INTEGER,
  matched     TEXT[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT c.member_id, m.name, m.job, m.avatar_path, c.score, c.matched
  FROM public.matching_candidates(public.current_member_id(), p_limit) AS c
  JOIN public.members AS m ON m.id = c.member_id;
$$;

REVOKE ALL ON FUNCTION public.my_matching_candidates(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_matching_candidates(INTEGER) TO authenticated;

-- ------------------------------------------------------------
-- 今月のおすすめ（月3人まで）
-- ------------------------------------------------------------
-- 🔴 出した相手を保存する。毎回その場で計算すると
--    ページを開くたびに顔ぶれが変わり「さっきの人がいない」になる。
--    月内は固定し、翌月に入れ替える。
CREATE TABLE IF NOT EXISTS public.matching_suggestions (
  member_id           UUID        NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  suggested_member_id UUID        NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  -- 'YYYY-MM'
  period              TEXT        NOT NULL,
  score               INTEGER     NOT NULL DEFAULT 0,
  matched             TEXT[]      NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (member_id, period, suggested_member_id)
);

ALTER TABLE public.matching_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS matching_suggestions_own ON public.matching_suggestions;
CREATE POLICY matching_suggestions_own ON public.matching_suggestions
  FOR SELECT TO authenticated
  USING (member_id = public.current_member_id() OR public.is_admin());

-- 今月分が無ければ作って返す。あればそのまま返す。
CREATE OR REPLACE FUNCTION public.my_monthly_suggestions()
RETURNS TABLE (
  member_id   UUID,
  name        TEXT,
  job         TEXT,
  avatar_path TEXT,
  score       INTEGER,
  matched     TEXT[]
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_me     UUID := public.current_member_id();
  v_period TEXT := TO_CHAR(NOW() AT TIME ZONE 'Asia/Tokyo', 'YYYY-MM');
BEGIN
  IF v_me IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.matching_suggestions AS s
     WHERE s.member_id = v_me AND s.period = v_period
  ) THEN
    -- 先月までに出した人は今月は出さない（同じ人ばかり提案されるのを防ぐ）
    INSERT INTO public.matching_suggestions (member_id, period, suggested_member_id, score, matched)
    SELECT v_me, v_period, c.member_id, c.score, c.matched
    FROM public.matching_candidates(v_me, 50) AS c
    WHERE NOT EXISTS (
      SELECT 1 FROM public.matching_suggestions AS past
       WHERE past.member_id = v_me AND past.suggested_member_id = c.member_id
    )
    ORDER BY c.score DESC
    LIMIT 3
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN QUERY
  SELECT s.suggested_member_id, m.name, m.job, m.avatar_path, s.score, s.matched
  FROM public.matching_suggestions AS s
  JOIN public.members AS m ON m.id = s.suggested_member_id
  WHERE s.member_id = v_me AND s.period = v_period
    AND m.is_withdrawn = FALSE
  ORDER BY s.score DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.my_monthly_suggestions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_monthly_suggestions() TO authenticated;

-- ------------------------------------------------------------
-- 運営：誰と誰がマッチしそうか
-- ------------------------------------------------------------
-- 「探している人」ごとに上位の候補を返す。
-- 会を企画するときの材料にもなる（どの組み合わせが多いか）。
CREATE OR REPLACE FUNCTION public.admin_matching_overview(p_per_seeker INTEGER DEFAULT 3)
RETURNS TABLE (
  seeker_id     UUID,
  seeker_name   TEXT,
  candidate_id  UUID,
  candidate_name TEXT,
  score         INTEGER,
  matched       TEXT[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin権限が必要です' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT s.id, s.name, c.member_id, cm.name, c.score, c.matched
  FROM public.members AS s
  JOIN public.member_matching_wants AS w ON w.member_id = s.id AND w.is_active
  CROSS JOIN LATERAL public.matching_candidates(s.id, p_per_seeker) AS c
  JOIN public.members AS cm ON cm.id = c.member_id
  WHERE s.is_withdrawn = FALSE
  ORDER BY c.score DESC, s.name;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_matching_overview(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_matching_overview(INTEGER) TO authenticated;

-- ------------------------------------------------------------
-- 運営：設定の埋まり具合
-- ------------------------------------------------------------
-- マッチングが動くかどうかはコードでなくデータで決まる。
-- 「誰がまだ入れていないか」を運営が見られるようにする。
CREATE OR REPLACE FUNCTION public.admin_matching_stats()
RETURNS TABLE (
  total_members   INTEGER,
  with_profile    INTEGER,
  with_wants      INTEGER,
  with_region     INTEGER,
  with_industry   INTEGER,
  with_position   INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin権限が必要です' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER,
    COUNT(p.member_id)::INTEGER,
    COUNT(w.member_id)::INTEGER,
    COUNT(*) FILTER (WHERE COALESCE(array_length(p.regions,1),0)    > 0)::INTEGER,
    COUNT(*) FILTER (WHERE COALESCE(array_length(p.industries,1),0) > 0)::INTEGER,
    COUNT(*) FILTER (WHERE COALESCE(array_length(p.positions,1),0)  > 0)::INTEGER
  FROM public.members AS m
  LEFT JOIN public.member_matching_profile AS p ON p.member_id = m.id
  LEFT JOIN public.member_matching_wants   AS w ON w.member_id = m.id
  WHERE m.is_withdrawn = FALSE;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_matching_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_matching_stats() TO authenticated;
