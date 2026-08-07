-- ============================================================
-- 本人が変更してよい範囲を戻す ＋ 入会申請を既存会員に紐づけられるようにする
-- ============================================================
-- 前提：202608070013_protect_ledger_fields.sql（適用済みでも未適用でもよい。
--       protect_member_admin_fields() を最終形で上書きするため）。
--
-- 【方針の修正】
-- 0013 で氏名・メール・電話まで運営専用にしたが、これは締めすぎだった。
-- 自分の連絡先は本人が直せるのが自然で、運営の手も減る。
--
-- メールを本人に触らせても紐づけは壊れない。
-- サインアップ時の紐づけは「まだアカウントが無い会員行」だけを対象にしており、
-- ログインできている人の行は既に auth_user_id で繋がっているため、
-- その人がメールを書き換えても自分の紐づけは外れない。
--
-- 運営が管理するのは「契約の事実」だけに絞る：
--   会員番号・権限・在籍・入会年月・会員種別・金額・更新状況・紹介者・取込元
-- ============================================================

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

  -- 権限・在籍・お金まわり
  NEW.role               := OLD.role;
  NEW.member_no          := OLD.member_no;
  NEW.auth_user_id       := OLD.auth_user_id;
  NEW.is_withdrawn       := OLD.is_withdrawn;
  NEW.withdrawn_at       := OLD.withdrawn_at;
  NEW.withdrawal_reason  := OLD.withdrawal_reason;
  NEW.admin_note         := OLD.admin_note;
  NEW.price              := OLD.price;
  NEW.renewal_status     := OLD.renewal_status;
  NEW.renewal_fee        := OLD.renewal_fee;
  NEW.renewal_note       := OLD.renewal_note;
  NEW.referral_fee       := OLD.referral_fee;
  NEW.referrer_member_id := OLD.referrer_member_id;

  -- 契約の事実（運営が台帳として管理する）
  NEW.membership_type    := OLD.membership_type;
  NEW.start_year         := OLD.start_year;
  NEW.start_month        := OLD.start_month;
  NEW.referrer           := OLD.referrer;
  NEW.source             := OLD.source;
  NEW.import_sheet       := OLD.import_sheet;

  -- ここには name / name_normalized / email / phone を入れない。
  -- nickname / job / grip / avatar_path と同じく本人が変更できる。

  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- メールの重複を防ぐ
-- ------------------------------------------------------------
-- 同じメールが2つの会員行に入ると、その方がサインアップしたときに
-- どちらへ紐づくかが決まらない。運営も「どっちが本物か」を追えなくなる。
--
-- 変更したときだけ見る。既に重複している行（漢字とカナで二重登録されている
-- 吉識さん）が、他の項目すら直せなくなるのを避けるため。
--
-- INSERT では止めない。新規作成はサインアップと入会申請の承認だけで、
-- どちらも重複しないように書かれている。ここで例外を投げると
-- 「メールが被ったので新規登録そのものが失敗する」事故になる。
CREATE OR REPLACE FUNCTION public.enforce_member_email_unique()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_other TEXT;
BEGIN
  IF NEW.email IS NULL OR NEW.email IS NOT DISTINCT FROM OLD.email THEN
    RETURN NEW;
  END IF;

  SELECT m.name || COALESCE('（No.' || m.member_no || '）', '')
    INTO v_other
    FROM public.members AS m
   WHERE m.id <> NEW.id
     AND LOWER(TRIM(m.email)) = LOWER(TRIM(NEW.email))
   LIMIT 1;

  IF v_other IS NOT NULL THEN
    RAISE EXCEPTION 'このメールアドレスは既に「%」に登録されています', v_other
      USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_members_email_unique ON public.members;
CREATE TRIGGER trg_members_email_unique
  BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.enforce_member_email_unique();

CREATE INDEX IF NOT EXISTS idx_members_email_lower
  ON public.members (LOWER(TRIM(email)))
  WHERE email IS NOT NULL;

COMMENT ON COLUMN public.members.email IS
  '連絡先。アカウントが無い会員はこれがサインアップ時の紐づけの鍵になる';

-- ------------------------------------------------------------
-- 入会申請を「既存の会員」に紐づけて承認できるようにする
-- ------------------------------------------------------------
-- メールが一致すれば自動で紐づくが、台帳にメールが入っていない会員は
-- 一致しようがない。その場合に運営が会員番号と氏名を見て手で選べるようにする。
--
-- 選んだ会員の空欄だけを申請の内容で埋める。
-- 既に入っている台帳の値は、申請書の記入より運営の管理値の方が確かなので上書きしない。
DROP FUNCTION IF EXISTS public.approve_application(UUID);

CREATE FUNCTION public.approve_application(
  p_application_id UUID,
  p_member_id      UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_app     public.applications%ROWTYPE;
  v_member  UUID;
  v_admin   UUID := public.current_member_id();
  v_taken   TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin権限が必要です' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_app FROM public.applications WHERE id = p_application_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION '申請が見つかりません' USING ERRCODE = 'P0002';
  END IF;
  IF v_app.status = 'approved' THEN
    RAISE EXCEPTION 'この申請はすでに承認済みです' USING ERRCODE = '23505';
  END IF;

  IF p_member_id IS NOT NULL THEN
    -- 運営が「この人です」と指定した場合
    SELECT id INTO v_member FROM public.members WHERE id = p_member_id FOR UPDATE;
    IF v_member IS NULL THEN
      RAISE EXCEPTION '紐づけ先の会員が見つかりません' USING ERRCODE = 'P0002';
    END IF;

    -- 申請のメールが別の会員のものだと、後で紐づけが取り合いになる
    SELECT m.name || COALESCE('（No.' || m.member_no || '）', '')
      INTO v_taken
      FROM public.members AS m
     WHERE m.id <> v_member
       AND LOWER(TRIM(m.email)) = LOWER(TRIM(v_app.email))
     LIMIT 1;
    IF v_taken IS NOT NULL THEN
      RAISE EXCEPTION 'このメールアドレスは既に「%」に登録されています', v_taken
        USING ERRCODE = '23505';
    END IF;

    UPDATE public.members
       SET email           = COALESCE(email, v_app.email),
           phone           = COALESCE(phone, v_app.phone),
           job             = COALESCE(job, v_app.job),
           gender          = COALESCE(gender, v_app.gender),
           age_range       = COALESCE(age_range, v_app.age_range),
           membership_type = COALESCE(membership_type, v_app.membership_type),
           payment_method  = COALESCE(payment_method, v_app.payment_method),
           referrer        = COALESCE(referrer, v_app.referrer)
     WHERE id = v_member;
  ELSE
    -- 同じメールの会員がすでに居れば新規作成せずその人に紐づける（台帳の二重登録防止）
    SELECT id INTO v_member
      FROM public.members
     WHERE LOWER(TRIM(email)) = LOWER(TRIM(v_app.email))
     ORDER BY is_withdrawn ASC, member_no ASC NULLS LAST, created_at ASC
     LIMIT 1;

    IF v_member IS NULL THEN
      INSERT INTO public.members (
        name, name_normalized, email, phone, job, gender, age_range,
        membership_type, payment_method, referrer, renewal_status, source
      ) VALUES (
        v_app.name,
        LOWER(REGEXP_REPLACE(v_app.name, '[\s　]+', '', 'g')),
        v_app.email,
        v_app.phone,
        v_app.job,
        v_app.gender,
        v_app.age_range,
        v_app.membership_type,
        v_app.payment_method,
        v_app.referrer,
        '未更新',
        'contact_only'
      )
      RETURNING id INTO v_member;
    END IF;
  END IF;

  UPDATE public.applications
     SET status      = 'approved',
         member_id   = v_member,
         reviewed_by = v_admin,
         reviewed_at = NOW()
   WHERE id = p_application_id;

  RETURN v_member;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_application(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_application(UUID, UUID) TO authenticated;

-- ------------------------------------------------------------
-- 紐づけ先を探すための検索（運営のみ）
-- ------------------------------------------------------------
-- 「番号と名前が出れば分かる」ため、その2つを軸に返す。
-- アカウントの有無も返す。既にログインしている人に紐づけるのは通常おかしいので、
-- 画面側で注意を出すために使う。
DROP FUNCTION IF EXISTS public.admin_member_search(TEXT);

CREATE FUNCTION public.admin_member_search(p_query TEXT)
RETURNS TABLE (
  id           UUID,
  member_no    INTEGER,
  name         TEXT,
  email        TEXT,
  phone        TEXT,
  job          TEXT,
  is_withdrawn BOOLEAN,
  has_account  BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    m.id, m.member_no, m.name, m.email, m.phone, m.job,
    m.is_withdrawn, m.auth_user_id IS NOT NULL
  FROM public.members AS m
  WHERE public.is_admin()
    AND (
      m.name_normalized LIKE '%' || LOWER(REGEXP_REPLACE(COALESCE(p_query, ''), '[\s　]+', '', 'g')) || '%'
      OR m.name LIKE '%' || COALESCE(p_query, '') || '%'
      OR (p_query ~ '^\d+$' AND m.member_no = p_query::INTEGER)
      OR (m.email IS NOT NULL AND LOWER(m.email) LIKE '%' || LOWER(COALESCE(p_query, '')) || '%')
    )
  ORDER BY m.auth_user_id IS NOT NULL, m.member_no NULLS LAST
  LIMIT 20;
$$;

REVOKE ALL ON FUNCTION public.admin_member_search(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_member_search(TEXT) TO authenticated;
