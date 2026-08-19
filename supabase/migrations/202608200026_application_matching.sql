-- ============================================================
-- 入会申込みでマッチング項目を受け取る
-- ============================================================
-- 前提：202608190025_matching.sql / 202608070014_member_editable_contact_and_link.sql 適用済み。
--
-- ------------------------------------------------------------
-- なぜ入会時に聞くのか
-- ------------------------------------------------------------
-- 既存441名で今いちばん欠けているのがこの3つだから。
--   立場（法人/個人）… 67名(15%)しか入っていない
--   業種            … job が自由文で361名分あるが分類されていない
--   地域            … 列そのものが無く、データはゼロ
-- 新規はフォームで100%埋まる。ここを外すと、新しく入った人も
-- 「候補に出てこない会員」になってしまう。
--
-- 🔴 趣味(29項目)・興味(11項目)・つながりたい目的 は入会フォームに入れない。
--    申込みフォームが長くなるほど途中で離脱する。
--    この3つは後からマイページで足せるし、目的は時期で変わるので
--    入会時に固定しても意味が薄い。
--
-- ------------------------------------------------------------
-- 🔴 approve_application は全文を持ってくること
-- ------------------------------------------------------------
-- CREATE OR REPLACE は差分ではなく全文置換なので、
-- 前の版（0014）の中身を1行でも落とすと黙って消える。
-- 0019 が 0018 の決済列の保護を消した事故と同じ形。
-- ここでは 0014 の本体をそのまま写し、末尾に引き継ぎだけ足している。
-- ============================================================

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS positions  TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS industries TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS regions    TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.applications.positions IS
  'matching_options(category=position) のcode。承認時に member_matching_profile へ引き継ぐ。';

-- ------------------------------------------------------------
-- 選択肢を入会フォーム（未ログイン）からも読めるようにする
-- ------------------------------------------------------------
-- 🔴 これが無いと /register で選択肢が1つも出ない。
--    しかもエラーにならず「空の一覧」になるだけなので気づきにくい。
--
-- 出るのは選択肢の名前だけで、会員のデータは一切含まない。
-- 入会フォームで使う3カテゴリに限定する（趣味・興味・目的は会員だけ）。
DROP POLICY IF EXISTS matching_options_public ON public.matching_options;
CREATE POLICY matching_options_public ON public.matching_options
  FOR SELECT TO anon
  USING (is_active = TRUE AND category IN ('position', 'industry', 'region'));

-- ------------------------------------------------------------
-- 承認：会員行を作り、マッチング設定も一緒に用意する
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS public.approve_application(UUID, UUID);

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

  -- ---- ここから今回の追加 ----------------------------------
  -- 申込みで選んでもらった立場・業種・地域をマッチング設定に移す。
  -- 🔴 既に本人が設定している場合は上書きしない。
  --    申請より本人が後から入れた内容の方が新しいため
  --    （再申請や、運営が代理で申請を作り直した場合に本人の入力が消える）。
  IF COALESCE(array_length(v_app.positions, 1), 0) > 0
     OR COALESCE(array_length(v_app.industries, 1), 0) > 0
     OR COALESCE(array_length(v_app.regions, 1), 0) > 0
  THEN
    INSERT INTO public.member_matching_profile (member_id, positions, industries, regions)
    VALUES (v_member, v_app.positions, v_app.industries, v_app.regions)
    ON CONFLICT (member_id) DO UPDATE
      SET positions  = CASE WHEN COALESCE(array_length(public.member_matching_profile.positions, 1), 0) = 0
                            THEN EXCLUDED.positions  ELSE public.member_matching_profile.positions  END,
          industries = CASE WHEN COALESCE(array_length(public.member_matching_profile.industries, 1), 0) = 0
                            THEN EXCLUDED.industries ELSE public.member_matching_profile.industries END,
          regions    = CASE WHEN COALESCE(array_length(public.member_matching_profile.regions, 1), 0) = 0
                            THEN EXCLUDED.regions    ELSE public.member_matching_profile.regions    END;
  END IF;
  -- ---- 追加ここまで ----------------------------------------

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
