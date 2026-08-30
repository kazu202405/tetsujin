-- ============================================================
-- つながりの選択肢を運営が足せる・直せるようにする
-- ============================================================
-- 前提：202608190025_matching.sql / 202608200027_matching_engine.sql 適用済み。
--
-- 選択肢はもともと表で持っている（「コードに埋めると増減のたびに
-- デプロイが要るため」＝2026-08-19の設計）。足りないのは運営の入口だけ。
--
-- ------------------------------------------------------------
-- 🔴 code は会員のデータが指している名前
-- ------------------------------------------------------------
-- member_matching_profile と member_matching_wants は選択を
-- TEXT[] の code で持っている。∴
--   ・code は後から変えられない（変えると会員の選択が迷子になる。
--     外部キーが無いので、迷子になっても誰にも見えない）
--   ・使われている選択肢は消させない。消すなら先に無効化して、
--     使っている人が0になってからにする
--   ・label と並び順は表示だけなので自由に直してよい
--
-- ∴ この画面が本当に守るべきものは「消す操作」ひとつ。
--    数えるのは必ずDB側でやる。画面で数えて0だったから消す、では
--    数えた後に誰かが選んだ場合に取りこぼす。
--
-- 🔴 書き込みはRLSで直接させず、この関数だけに通す。
--    表への FOR ALL ポリシーを残すと、運営は PostgREST へ
--    PATCH /matching_options {"code":"別の名前"} を打てる＝
--    主キーを書き換えて会員の選択を一斉に迷子にできてしまう。
-- ============================================================

-- ------------------------------------------------------------
-- 1. 直接の書き込みを止める（読み取りは今までどおり）
-- ------------------------------------------------------------
DROP POLICY IF EXISTS matching_options_admin ON public.matching_options;
-- matching_options_select（在籍会員は読める）はそのまま残す。

COMMENT ON COLUMN public.matching_options.code IS
  '会員のデータ（member_matching_profile / _wants の配列）が指す名前。後から変えない';

-- ------------------------------------------------------------
-- 2. 一覧（使われている人数つき）
-- ------------------------------------------------------------
-- 🔴 code はカテゴリの中でだけ意味を持つ。全カテゴリの配列をまとめて
--    数えると、別カテゴリの同名コード（'other' など）を巻き込んで
--    「使われている」と誤判定する。∴ カテゴリごとに見る列を変える。
CREATE OR REPLACE FUNCTION public.matching_option_usage(p_category TEXT, p_code TEXT)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COUNT(*)::INTEGER FROM (
    SELECT p.member_id
      FROM public.member_matching_profile AS p
     WHERE CASE p_category
             WHEN 'position'  THEN p_code = ANY (p.positions)
             WHEN 'industry'  THEN p_code = ANY (p.industries)
             WHEN 'region'    THEN p_code = ANY (p.regions)
             WHEN 'lifestyle' THEN p_code = ANY (p.lifestyles)
             WHEN 'hobby'     THEN p_code = ANY (p.hobbies)
             WHEN 'interest'  THEN p_code = ANY (p.interests)
             ELSE FALSE
           END
    UNION
    SELECT w.member_id
      FROM public.member_matching_wants AS w
     WHERE CASE p_category
             WHEN 'purpose'   THEN p_code = ANY (w.purposes)
             WHEN 'position'  THEN p_code = ANY (w.positions)
             WHEN 'industry'  THEN p_code = ANY (w.industries)
             WHEN 'region'    THEN p_code = ANY (w.regions)
             WHEN 'lifestyle' THEN p_code = ANY (w.lifestyles)
             WHEN 'hobby'     THEN p_code = ANY (w.hobbies)
             WHEN 'interest'  THEN p_code = ANY (w.interests)
             WHEN 'age_range' THEN p_code = ANY (w.age_ranges)
             WHEN 'gender'    THEN p_code = ANY (w.genders)
             ELSE FALSE
           END
  ) AS t;
$$;

REVOKE ALL ON FUNCTION public.matching_option_usage(TEXT, TEXT) FROM PUBLIC, anon;

DROP FUNCTION IF EXISTS public.admin_matching_options();
CREATE FUNCTION public.admin_matching_options()
RETURNS TABLE (
  category   TEXT,
  code       TEXT,
  label      TEXT,
  is_sales   BOOLEAN,
  sort_order INTEGER,
  is_active  BOOLEAN,
  used_count INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT o.category, o.code, o.label, o.is_sales, o.sort_order, o.is_active,
         public.matching_option_usage(o.category, o.code)
    FROM public.matching_options AS o
   WHERE public.is_admin()
   ORDER BY o.category, o.sort_order, o.code;
$$;

REVOKE ALL ON FUNCTION public.admin_matching_options() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_matching_options() TO authenticated;

-- ------------------------------------------------------------
-- 3. 追加・編集
-- ------------------------------------------------------------
-- code を指定するのは新規のときだけ。既存の行では主キーとして使い、
-- 中身（label / 並び / 有効 / 営業目的）だけを差し替える。
CREATE OR REPLACE FUNCTION public.admin_save_matching_option(
  p_category   TEXT,
  p_code       TEXT,
  p_label      TEXT,
  p_is_sales   BOOLEAN DEFAULT FALSE,
  p_sort_order INTEGER DEFAULT 0,
  p_is_active  BOOLEAN DEFAULT TRUE
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_code  TEXT := NULLIF(TRIM(p_code), '');
  v_label TEXT := NULLIF(TRIM(p_label), '');
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'この操作には運営の権限が必要です' USING ERRCODE = '42501';
  END IF;
  IF v_code IS NULL OR v_label IS NULL THEN
    RAISE EXCEPTION 'コードと表示名は必須です' USING ERRCODE = '22023';
  END IF;
  IF char_length(v_code) > 40 OR char_length(v_label) > 60 THEN
    RAISE EXCEPTION 'コードは40文字、表示名は60文字までです' USING ERRCODE = '22023';
  END IF;

  -- 🔴 code は会員のデータが指す名前なので、空白やカンマを混ぜさせない。
  --    配列に入る値なので、区切り文字が混ざると読みにくい事故のもとになる。
  IF v_code ~ '[\s,]' THEN
    RAISE EXCEPTION 'コードに空白やカンマは使えません' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.matching_options (category, code, label, is_sales, sort_order, is_active)
  VALUES (p_category, v_code, v_label, COALESCE(p_is_sales, FALSE),
          COALESCE(p_sort_order, 0), COALESCE(p_is_active, TRUE))
  ON CONFLICT (category, code) DO UPDATE
     SET label      = EXCLUDED.label,
         is_sales   = EXCLUDED.is_sales,
         sort_order = EXCLUDED.sort_order,
         is_active  = EXCLUDED.is_active;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_save_matching_option(TEXT, TEXT, TEXT, BOOLEAN, INTEGER, BOOLEAN)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_matching_option(TEXT, TEXT, TEXT, BOOLEAN, INTEGER, BOOLEAN)
  TO authenticated;

-- ------------------------------------------------------------
-- 4. 削除（使われていないときだけ）
-- ------------------------------------------------------------
-- 🔴 数えるのはここ。画面で数えて0だったから消す、では
--    数えた後に誰かが選んだ場合を取りこぼす。
--    使われている選択肢は、無効化（is_active=false）で新規の選択から
--    外せる。既に選んでいる人の表示は保たれる。
CREATE OR REPLACE FUNCTION public.admin_delete_matching_option(
  p_category TEXT,
  p_code     TEXT
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_used INTEGER;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'この操作には運営の権限が必要です' USING ERRCODE = '42501';
  END IF;

  v_used := public.matching_option_usage(p_category, p_code);
  IF v_used > 0 THEN
    RAISE EXCEPTION
      '% 名の方が選んでいるため削除できません。「使わない」にすると新しく選ばれなくなります', v_used
      USING ERRCODE = '23503';
  END IF;

  DELETE FROM public.matching_options
   WHERE category = p_category AND code = p_code;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_matching_option(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_matching_option(TEXT, TEXT) TO authenticated;
