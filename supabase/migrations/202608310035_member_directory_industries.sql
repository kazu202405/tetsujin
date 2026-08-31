-- ============================================================
-- メンバー一覧に業種を出せるようにする
-- ============================================================
-- 前提：202608250029_close_open_signup.sql / 202608190025_matching.sql 適用済み。
--
-- 業種は member_matching_profile.industries（会員の「自分のこと」）に入る。
-- この表は在籍会員なら誰でも読める＝会員に見せてよい情報なので、
-- 一覧に出しても公開範囲は変わらない。
--
-- 🔴 コードではなく表示名で返す。画面側で labels を引き直すと、
--    一覧の全員ぶんの照合を毎回やることになるし、選択肢の表示名を
--    運営が変えたときに片方だけ古いまま残る経路が増える。
--
-- 🔴 無効にした選択肢も名前は返す。「もう使わない業種」を選んでいる人の
--    カードだけコードが剥き出しで出る、という壊れ方を防ぐ。
--
-- 並びは選択肢の sort_order。会員が選んだ順ではなく、
-- 一覧のどのカードでも同じ順で並ぶようにする。
-- ============================================================

-- 🔴 戻り値の列が増えるので CREATE OR REPLACE では作り直せない
--    （42P13 cannot change return type of existing function）。
--    先に落とす。GRANT も作り直しになるので下で付け直している。
DROP FUNCTION IF EXISTS public.member_directory();

CREATE FUNCTION public.member_directory()
RETURNS TABLE (
  id              UUID,
  member_no       INTEGER,
  name            TEXT,
  nickname        TEXT,
  job             TEXT,
  grip            TEXT,
  membership_type TEXT,
  role            TEXT,
  avatar_path     TEXT,
  industries      TEXT[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    m.id,
    m.member_no,
    m.name,
    m.nickname,
    m.job,
    m.grip,
    m.membership_type,
    m.role,
    m.avatar_path,
    COALESCE(
      (
        SELECT ARRAY_AGG(o.label ORDER BY o.sort_order, o.code)
          FROM public.member_matching_profile AS p
          JOIN public.matching_options AS o
            ON o.category = 'industry'
           AND o.code = ANY (p.industries)
         WHERE p.member_id = m.id
      ),
      '{}'::TEXT[]
    ) AS industries
  FROM public.members AS m
  WHERE public.is_active_member()
    AND m.is_withdrawn = FALSE
  ORDER BY m.member_no ASC NULLS LAST, m.name ASC;
$$;

REVOKE ALL ON FUNCTION public.member_directory() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.member_directory() TO authenticated;

COMMENT ON FUNCTION public.member_directory() IS
  'メンバー一覧。industries は会員が「つながりの設定」で選んだ業種の表示名';
