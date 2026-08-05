-- ============================================================
-- 入会申請 ＋ イベント（開催と参加）
-- ============================================================
-- 前提：202608050004_profile_sheets.sql 適用済み。
--
-- 入会申請
--   公開ページ /register の申込は、これまでどこにも保存されていなかった
--   （画面に「送信しました」と出るだけ）。実際に受け取れるようにする。
--   未ログインの人が書き込む唯一のテーブルになるため、
--   anon には INSERT だけを許し、SELECT は一切許可しない（＝申請内容を他人が読めない）。
--
-- イベント
--   参加実績が localStorage にあり、会員ごとにバラバラで運営から見えなかった。
--   管理画面の「参加状況」もこの表を集計して出す。
-- ============================================================

-- ------------------------------------------------------------
-- 入会申請
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.applications (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  name_furigana  TEXT,
  gender         TEXT,
  age_range      TEXT,
  email          TEXT        NOT NULL CHECK (char_length(email) BETWEEN 3 AND 200),
  phone          TEXT,
  job            TEXT,
  referrer       TEXT,
  start_month    TEXT,
  membership_type TEXT       CHECK (membership_type IN ('個人', '法人') OR membership_type IS NULL),
  payment_method TEXT,
  note           TEXT,
  terms_agreed   BOOLEAN     NOT NULL DEFAULT FALSE,
  status         TEXT        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'approved', 'rejected')),
  -- 承認時に作成した会員行（あとから申請と会員を突き合わせられるように）
  member_id      UUID        REFERENCES public.members(id) ON DELETE SET NULL,
  reviewed_by    UUID        REFERENCES public.members(id) ON DELETE SET NULL,
  reviewed_at    TIMESTAMPTZ,
  review_note    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_applications_status  ON public.applications(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_email   ON public.applications(email);

DROP TRIGGER IF EXISTS trg_applications_set_updated_at ON public.applications;
CREATE TRIGGER trg_applications_set_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- 🔴 未ログインからの書き込みを許す唯一のテーブル。
--    INSERT のみ許可し、SELECT / UPDATE / DELETE は与えない。
--    ∴ 申込はできるが、他人の申込内容を読むことはできない。
DROP POLICY IF EXISTS applications_insert_public ON public.applications;
CREATE POLICY applications_insert_public ON public.applications
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    status = 'pending'
    AND member_id IS NULL
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
  );

DROP POLICY IF EXISTS applications_admin_all ON public.applications;
CREATE POLICY applications_admin_all ON public.applications
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 申請を承認して会員台帳に載せる。
-- 申請の内容をそのまま members へ写し、申請側にも作成した会員IDを残す。
DROP FUNCTION IF EXISTS public.approve_application(UUID);
CREATE FUNCTION public.approve_application(p_application_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_app     public.applications%ROWTYPE;
  v_member  UUID;
  v_admin   UUID := public.current_member_id();
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

  UPDATE public.applications
     SET status      = 'approved',
         member_id   = v_member,
         reviewed_by = v_admin,
         reviewed_at = NOW()
   WHERE id = p_application_id;

  RETURN v_member;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_application(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_application(UUID) TO authenticated;

-- ------------------------------------------------------------
-- イベント
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT        NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  series_name TEXT,
  event_date  DATE        NOT NULL,
  start_time  TEXT,
  location    TEXT,
  description TEXT,
  capacity    INTEGER     CHECK (capacity IS NULL OR capacity > 0),
  host_id     UUID        REFERENCES public.members(id) ON DELETE SET NULL,
  is_canceled BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_date   ON public.events(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_events_series ON public.events(series_name);
CREATE INDEX IF NOT EXISTS idx_events_host   ON public.events(host_id);

DROP TRIGGER IF EXISTS trg_events_set_updated_at ON public.events;
CREATE TRIGGER trg_events_set_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.event_participants (
  event_id   UUID        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  member_id  UUID        NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_event_participants_member ON public.event_participants(member_id);

ALTER TABLE public.events             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

-- イベント：在籍会員は閲覧できる。作成は誰でも（部活動を会員が主催するため）、
-- 編集・削除は主催者本人か運営に限る。
DROP POLICY IF EXISTS events_select ON public.events;
CREATE POLICY events_select ON public.events
  FOR SELECT TO authenticated
  USING (public.is_active_member());

DROP POLICY IF EXISTS events_insert ON public.events;
CREATE POLICY events_insert ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (host_id = public.current_member_id());

DROP POLICY IF EXISTS events_update_own ON public.events;
CREATE POLICY events_update_own ON public.events
  FOR UPDATE TO authenticated
  USING (host_id = public.current_member_id() OR public.is_admin())
  WITH CHECK (host_id = public.current_member_id() OR public.is_admin());

DROP POLICY IF EXISTS events_delete_own ON public.events;
CREATE POLICY events_delete_own ON public.events
  FOR DELETE TO authenticated
  USING (host_id = public.current_member_id() OR public.is_admin());

-- 参加：自分の参加だけ付け外しできる。運営は代理で操作できる（当日欠席の反映など）。
DROP POLICY IF EXISTS event_participants_select ON public.event_participants;
CREATE POLICY event_participants_select ON public.event_participants
  FOR SELECT TO authenticated
  USING (public.is_active_member());

DROP POLICY IF EXISTS event_participants_insert_own ON public.event_participants;
CREATE POLICY event_participants_insert_own ON public.event_participants
  FOR INSERT TO authenticated
  WITH CHECK (member_id = public.current_member_id() OR public.is_admin());

DROP POLICY IF EXISTS event_participants_delete_own ON public.event_participants;
CREATE POLICY event_participants_delete_own ON public.event_participants
  FOR DELETE TO authenticated
  USING (member_id = public.current_member_id() OR public.is_admin());

-- ------------------------------------------------------------
-- 一覧・集計（members の他人の行を読むため SECURITY DEFINER）
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS public.event_list(BOOLEAN);
CREATE FUNCTION public.event_list(p_include_past BOOLEAN DEFAULT TRUE)
RETURNS TABLE (
  id                UUID,
  title             TEXT,
  series_name       TEXT,
  event_date        DATE,
  start_time        TEXT,
  location          TEXT,
  description       TEXT,
  capacity          INTEGER,
  is_canceled       BOOLEAN,
  host_id           UUID,
  host_name         TEXT,
  participant_count BIGINT,
  joined_by_me      BOOLEAN,
  is_mine           BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    e.id,
    e.title,
    e.series_name,
    e.event_date,
    e.start_time,
    e.location,
    e.description,
    e.capacity,
    e.is_canceled,
    e.host_id,
    h.name,
    (SELECT COUNT(*) FROM public.event_participants p WHERE p.event_id = e.id),
    EXISTS (
      SELECT 1 FROM public.event_participants p
       WHERE p.event_id = e.id AND p.member_id = public.current_member_id()
    ),
    e.host_id = public.current_member_id()
  FROM public.events AS e
  LEFT JOIN public.members AS h ON h.id = e.host_id
  WHERE public.is_active_member()
    AND (p_include_past OR e.event_date >= CURRENT_DATE)
  ORDER BY e.event_date DESC;
$$;

REVOKE ALL ON FUNCTION public.event_list(BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.event_list(BOOLEAN) TO authenticated;

-- 参加者一覧。p_event_id を省略すると全イベント分をまとめて返す
-- （一覧画面で1件ずつ問い合わせると往復が増えるため）。
DROP FUNCTION IF EXISTS public.event_participant_list(UUID);
CREATE FUNCTION public.event_participant_list(p_event_id UUID DEFAULT NULL)
RETURNS TABLE (
  event_id    UUID,
  member_id   UUID,
  name        TEXT,
  job         TEXT,
  avatar_path TEXT,
  joined_at   TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT p.event_id, m.id, m.name, m.job, m.avatar_path, p.joined_at
    FROM public.event_participants AS p
    JOIN public.members AS m ON m.id = p.member_id
   WHERE public.is_active_member()
     AND (p_event_id IS NULL OR p.event_id = p_event_id)
   ORDER BY p.joined_at ASC;
$$;

REVOKE ALL ON FUNCTION public.event_participant_list(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.event_participant_list(UUID) TO authenticated;

-- 管理画面「参加状況」用。会員ごとの参加実績（運営のみ）。
DROP FUNCTION IF EXISTS public.member_participation_stats();
CREATE FUNCTION public.member_participation_stats()
RETURNS TABLE (
  member_id       UUID,
  name            TEXT,
  job             TEXT,
  avatar_path     TEXT,
  is_withdrawn    BOOLEAN,
  total_events    BIGINT,
  last_event_date DATE
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
    COUNT(p.event_id),
    MAX(e.event_date)
  FROM public.members AS m
  LEFT JOIN public.event_participants AS p ON p.member_id = m.id
  LEFT JOIN public.events AS e ON e.id = p.event_id
  WHERE public.is_admin()
  GROUP BY m.id, m.name, m.job, m.avatar_path, m.is_withdrawn
  ORDER BY COUNT(p.event_id) DESC, m.name ASC;
$$;

REVOKE ALL ON FUNCTION public.member_participation_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.member_participation_stats() TO authenticated;

-- ------------------------------------------------------------
-- アクセス記録（「メンバーの状況」のログイン日数用）
-- ------------------------------------------------------------
-- 🔴 「ログイン回数」は測れない。セッションが継続するため、毎日使っている人でも
--    サインイン操作は月に1回程度しか発生せず、実態より低く出てしまう。
--    ∴ 記録するのは「その日アプリを開いたか」＝会員×日付で1行。
--    これなら 30日のうち何日来たか を正しく数えられる。
CREATE TABLE IF NOT EXISTS public.member_visits (
  member_id  UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  PRIMARY KEY (member_id, visit_date)
);

CREATE INDEX IF NOT EXISTS idx_member_visits_date ON public.member_visits(visit_date DESC);

ALTER TABLE public.member_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS member_visits_own ON public.member_visits;
CREATE POLICY member_visits_own ON public.member_visits
  FOR ALL TO authenticated
  USING (member_id = public.current_member_id() OR public.is_admin())
  WITH CHECK (member_id = public.current_member_id());

-- その日の分がなければ記録する（1日に何度呼ばれても1行）
DROP FUNCTION IF EXISTS public.record_visit();
CREATE FUNCTION public.record_visit()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_member UUID := public.current_member_id();
BEGIN
  IF v_member IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.member_visits (member_id, visit_date)
       VALUES (v_member, CURRENT_DATE)
  ON CONFLICT (member_id, visit_date) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.record_visit() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_visit() TO authenticated;

-- ------------------------------------------------------------
-- 紹介者の会員への紐づけ（紹介数を数えるため）
-- ------------------------------------------------------------
-- 🔴 台帳の referrer は「紹介してくれた人の名前」のテキストで、会員と繋がっていない
--    （2026-05-22の解析：455件中、会員名と一致したのは10件のみ。あだ名・敬称・「SNS」混在）。
--    ∴ 名前から機械的に紐づけることはできない。運営が1件ずつ選ぶための列を用意する。
--    紐づけが済んだ分だけが「紹介数」に数えられる。
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS referrer_member_id UUID REFERENCES public.members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_members_referrer_member ON public.members(referrer_member_id);

COMMENT ON COLUMN public.members.referrer_member_id IS '紹介者を会員として特定できた場合の紐づけ。referrer（テキスト）は原文として残す';

-- 自分で自分の紹介者を書き換えられないよう、運営専用列として保護する
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
  RETURN NEW;
END;
$$;

-- 紹介者の紐づけ（運営のみ）。自分自身を紹介者にはできない。
DROP FUNCTION IF EXISTS public.set_referrer_link(UUID, UUID);
CREATE FUNCTION public.set_referrer_link(p_member_id UUID, p_referrer_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin権限が必要です' USING ERRCODE = '42501';
  END IF;
  IF p_referrer_id IS NOT NULL AND p_referrer_id = p_member_id THEN
    RAISE EXCEPTION '自分自身を紹介者にはできません' USING ERRCODE = '23514';
  END IF;

  UPDATE public.members SET referrer_member_id = p_referrer_id WHERE id = p_member_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_referrer_link(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_referrer_link(UUID, UUID) TO authenticated;

-- 管理画面「メンバーの状況」用。投稿・イベント・アクセス・紹介・継続をまとめる（運営のみ）。
-- ログイン日時は auth スキーマにあるため、ここで一緒に返す。
DROP FUNCTION IF EXISTS public.member_activity_stats();
CREATE FUNCTION public.member_activity_stats()
RETURNS TABLE (
  member_id        UUID,
  name             TEXT,
  job              TEXT,
  avatar_path      TEXT,
  is_withdrawn     BOOLEAN,
  has_login        BOOLEAN,
  last_sign_in_at  TIMESTAMPTZ,
  last_visit_date  DATE,
  visit_days_30d   BIGINT,
  last_post_at     TIMESTAMPTZ,
  post_count_30d   BIGINT,
  last_event_date  DATE,
  event_count_90d  BIGINT,
  referral_count   BIGINT,
  renewal_status   TEXT,
  start_year       SMALLINT,
  start_month      SMALLINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp, auth
AS $$
  SELECT
    m.id,
    m.name,
    m.job,
    m.avatar_path,
    m.is_withdrawn,
    m.auth_user_id IS NOT NULL,
    u.last_sign_in_at,
    (SELECT MAX(v.visit_date) FROM public.member_visits v WHERE v.member_id = m.id),
    (SELECT COUNT(*) FROM public.member_visits v
      WHERE v.member_id = m.id AND v.visit_date >= CURRENT_DATE - 30),
    (SELECT MAX(p.created_at) FROM public.posts p WHERE p.author_id = m.id),
    (SELECT COUNT(*) FROM public.posts p
      WHERE p.author_id = m.id AND p.created_at >= NOW() - INTERVAL '30 days'),
    (SELECT MAX(e.event_date)
       FROM public.event_participants ep
       JOIN public.events e ON e.id = ep.event_id
      WHERE ep.member_id = m.id),
    (SELECT COUNT(*)
       FROM public.event_participants ep
       JOIN public.events e ON e.id = ep.event_id
      WHERE ep.member_id = m.id AND e.event_date >= CURRENT_DATE - INTERVAL '90 days'),
    (SELECT COUNT(*) FROM public.members r
      WHERE r.referrer_member_id = m.id AND r.is_withdrawn = FALSE),
    m.renewal_status,
    m.start_year,
    m.start_month
  FROM public.members AS m
  LEFT JOIN auth.users AS u ON u.id = m.auth_user_id
  WHERE public.is_admin()
  ORDER BY m.name ASC;
$$;

REVOKE ALL ON FUNCTION public.member_activity_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.member_activity_stats() TO authenticated;

COMMENT ON TABLE public.applications IS '入会申請。公開フォーム /register からの申込。anonはINSERTのみ可';
COMMENT ON TABLE public.events IS 'イベント（交流会・部活動など）';
COMMENT ON TABLE public.event_participants IS 'イベント参加。管理画面の参加状況もここを集計する';
