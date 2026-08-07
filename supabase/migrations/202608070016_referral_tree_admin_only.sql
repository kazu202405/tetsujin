-- ============================================================
-- 紹介ツリーを運営のみにする
-- ============================================================
-- 前提：202608060009_referral_tree_and_stats.sql 適用済み。
--
-- 依頼主の意図＝紹介ツリーは運営が見るもの。
--
-- 誰が誰の紹介で入ったかは会員どうしの力関係が見えてしまう情報で、
-- 会員全員に見せるものではない。画面のリンクを消すだけでは
-- APIを直接叩けば取れてしまうため、データの出口で止める。
-- ============================================================

CREATE OR REPLACE FUNCTION public.referral_tree()
RETURNS TABLE (
  id                 UUID,
  name               TEXT,
  job                TEXT,
  avatar_path        TEXT,
  is_withdrawn       BOOLEAN,
  member_no          INTEGER,
  referrer_member_id UUID,
  referrer_text      TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    m.id,
    m.name,
    m.job,
    m.avatar_path,
    m.is_withdrawn,
    m.member_no,
    m.referrer_member_id,
    m.referrer
  FROM public.members AS m
  WHERE public.is_admin()
  ORDER BY m.member_no ASC NULLS LAST, m.name ASC;
$$;

REVOKE ALL ON FUNCTION public.referral_tree() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.referral_tree() TO authenticated;
