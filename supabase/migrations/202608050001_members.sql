-- TETSUJIN会 会員マスタ初期migration
-- 個人情報の実データはこのファイルへ含めない。
-- migration適用後、gitignore対象の data/processed/members.json を
-- scripts/import-members-to-supabase.mjs で投入する。

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.members (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_no             INTEGER     UNIQUE,
  name                  TEXT        NOT NULL,
  name_normalized       TEXT        NOT NULL,
  nickname              TEXT,
  referrer              TEXT,
  start_year            SMALLINT    CHECK (start_year BETWEEN 2000 AND 2100),
  start_month           SMALLINT    CHECK (start_month BETWEEN 1 AND 12),
  renewal_status        TEXT        NOT NULL
                                  CHECK (renewal_status IN ('未更新', '退会', '更新済', '返事待ち', '入金待ち')),
  renewal_fee           INTEGER,
  renewal_note          TEXT,
  price                 INTEGER,
  referral_fee          INTEGER,
  job                   TEXT,
  grip                  TEXT,
  frequency             TEXT,
  email                 TEXT,
  phone                 TEXT,
  gender                TEXT,
  age_range             TEXT,
  membership_type       TEXT,
  payment_method        TEXT,
  contact_submitted_at  TIMESTAMPTZ,
  is_withdrawn          BOOLEAN     NOT NULL DEFAULT FALSE,
  withdrawn_at          TIMESTAMPTZ,
  withdrawal_reason     TEXT,
  auth_user_id          UUID        UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  role                  TEXT        NOT NULL DEFAULT 'user'
                                  CHECK (role IN ('admin', 'manager', 'user')),
  admin_note            TEXT,
  source                TEXT        NOT NULL
                                  CHECK (source IN ('both', 'member_only', 'contact_only')),
  import_sheet          TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_members_name_normalized ON public.members(name_normalized);
CREATE INDEX IF NOT EXISTS idx_members_email           ON public.members(email);
CREATE INDEX IF NOT EXISTS idx_members_phone           ON public.members(phone);
CREATE INDEX IF NOT EXISTS idx_members_source          ON public.members(source);
CREATE INDEX IF NOT EXISTS idx_members_is_withdrawn    ON public.members(is_withdrawn);
CREATE INDEX IF NOT EXISTS idx_members_member_no       ON public.members(member_no);
CREATE INDEX IF NOT EXISTS idx_members_renewal_status  ON public.members(renewal_status);
CREATE INDEX IF NOT EXISTS idx_members_auth_user_id    ON public.members(auth_user_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_members_set_updated_at ON public.members;
CREATE TRIGGER trg_members_set_updated_at
  BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.members
     WHERE auth_user_id = auth.uid()
       AND role = 'admin'
       AND is_withdrawn = FALSE
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

DROP POLICY IF EXISTS members_select_own ON public.members;
DROP POLICY IF EXISTS members_admin_all ON public.members;
DROP POLICY IF EXISTS members_update_own ON public.members;

CREATE POLICY members_select_own ON public.members
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY members_admin_all ON public.members
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY members_update_own ON public.members
  FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.protect_member_admin_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin() OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  NEW.role              := OLD.role;
  NEW.member_no         := OLD.member_no;
  NEW.auth_user_id      := OLD.auth_user_id;
  NEW.is_withdrawn      := OLD.is_withdrawn;
  NEW.withdrawn_at      := OLD.withdrawn_at;
  NEW.withdrawal_reason := OLD.withdrawal_reason;
  NEW.admin_note        := OLD.admin_note;
  NEW.price             := OLD.price;
  NEW.renewal_status    := OLD.renewal_status;
  NEW.renewal_fee       := OLD.renewal_fee;
  NEW.renewal_note      := OLD.renewal_note;
  NEW.referral_fee      := OLD.referral_fee;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_members_protect_admin_fields ON public.members;
CREATE TRIGGER trg_members_protect_admin_fields
  BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.protect_member_admin_fields();

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email  TEXT := LOWER(TRIM(NEW.email));
  v_name   TEXT;
  v_target UUID;
BEGIN
  IF v_email IS NULL OR v_email = '' THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_target
    FROM public.members
   WHERE auth_user_id IS NULL
     AND LOWER(TRIM(email)) = v_email
   ORDER BY is_withdrawn ASC, member_no ASC NULLS LAST, created_at ASC
   LIMIT 1;

  IF v_target IS NOT NULL THEN
    UPDATE public.members SET auth_user_id = NEW.id WHERE id = v_target;
    RETURN NEW;
  END IF;

  v_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'name'), ''),
    SPLIT_PART(v_email, '@', 1)
  );

  INSERT INTO public.members (
    name, name_normalized, email, renewal_status, source, auth_user_id
  ) VALUES (
    v_name,
    LOWER(REGEXP_REPLACE(v_name, '[\s　]+', '', 'g')),
    v_email,
    '未更新',
    'contact_only',
    NEW.id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auth_user_created ON auth.users;
CREATE TRIGGER trg_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

COMMENT ON TABLE public.members IS 'TETSUJIN会 会員マスタ（入会者名簿＋連絡先情報の統合）';
COMMENT ON COLUMN public.members.renewal_note IS '更新欄の自由記述を失わないための原文メモ';
COMMENT ON COLUMN public.members.admin_note IS '運営メモ。会員本人には非表示';
