-- ============================================================
-- ログイン前の会員にも権限を設定できるようにする
-- ============================================================
-- 前提：202608050002_member_directory_roles.sql 適用済み。
--
-- 「運営を先に決めておいて、その人がログインしたらすぐ運営として入れる」
-- という使い方ができないと、招く側が毎回あとから設定し直すことになる。
--
-- 変更点は最後の運営を守る判定だけ。
-- これまで「元が運営なら降格を止める」判定を、ログインしていない会員にも
-- かけていた。ログインしていない運営は誰も締め出さないので、
-- 止める理由が無い（むしろ、間違って運営にした人を戻せなくなる）。
--
-- 守るべきは「ログインできる運営が居なくなること」だけ。
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_member_role(
  p_member_id UUID,
  p_role TEXT
)
RETURNS TABLE (id UUID, role TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_old_role             TEXT;
  v_is_linked            BOOLEAN;
  v_active_linked_admins INTEGER;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin権限が必要です' USING ERRCODE = '42501';
  END IF;

  IF p_role NOT IN ('admin', 'manager', 'user') THEN
    RAISE EXCEPTION '不正なロールです' USING ERRCODE = '22023';
  END IF;

  SELECT m.role, m.auth_user_id IS NOT NULL
    INTO v_old_role, v_is_linked
    FROM public.members AS m
   WHERE m.id = p_member_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '会員が見つかりません' USING ERRCODE = 'P0002';
  END IF;

  -- ログイン可能な最後の運営を降格させると復旧不能になるため禁止する。
  -- ログインしていない運営は誰も締め出さないので、この判定の対象外。
  IF v_is_linked AND v_old_role = 'admin' AND p_role <> 'admin' THEN
    SELECT COUNT(*)
      INTO v_active_linked_admins
      FROM public.members AS m
     WHERE m.role = 'admin'
       AND m.is_withdrawn = FALSE
       AND m.auth_user_id IS NOT NULL;

    IF v_active_linked_admins <= 1 THEN
      RAISE EXCEPTION '最後の運営アカウントは降格できません' USING ERRCODE = '23514';
    END IF;
  END IF;

  UPDATE public.members AS m
     SET role = p_role
   WHERE m.id = p_member_id;

  RETURN QUERY
  SELECT m.id, m.role
    FROM public.members AS m
   WHERE m.id = p_member_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_member_role(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_member_role(UUID, TEXT) TO authenticated;
