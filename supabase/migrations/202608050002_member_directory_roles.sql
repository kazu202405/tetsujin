-- 会員向け安全な名簿と、運営向けロール変更API
-- PII（email/phone/金額/運営メモ）は一般会員へ返さない。

CREATE OR REPLACE FUNCTION public.member_directory()
RETURNS TABLE (
  id              UUID,
  member_no       INTEGER,
  name            TEXT,
  nickname        TEXT,
  job             TEXT,
  grip            TEXT,
  membership_type TEXT,
  role            TEXT
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
    m.role
  FROM public.members AS m
  WHERE auth.uid() IS NOT NULL
    AND m.is_withdrawn = FALSE
  ORDER BY m.member_no ASC NULLS LAST, m.name ASC;
$$;

REVOKE ALL ON FUNCTION public.member_directory() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.member_directory() TO authenticated;

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
  v_old_role TEXT;
  v_active_linked_admins INTEGER;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin権限が必要です' USING ERRCODE = '42501';
  END IF;

  IF p_role NOT IN ('admin', 'manager', 'user') THEN
    RAISE EXCEPTION '不正なロールです' USING ERRCODE = '22023';
  END IF;

  SELECT m.role
    INTO v_old_role
    FROM public.members AS m
   WHERE m.id = p_member_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '会員が見つかりません' USING ERRCODE = 'P0002';
  END IF;

  -- ログイン可能な最後の運営を降格させると復旧不能になるため禁止する。
  IF v_old_role = 'admin' AND p_role <> 'admin' THEN
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
