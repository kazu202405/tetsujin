-- ============================================================
-- 会を探す：参加承認フロー ／ 副管理者・オーナー委譲 ／ シリーズのフォロー
-- ============================================================
-- 前提：202608050007_connections_and_social_links.sql 適用済み。
--
-- 参加承認は「イベントごとに承認制にするか選ぶ」方式にする。
-- 通常の交流会まで承認待ちにすると運営の手間が増えるだけなので、
-- 定員のある部活動や少人数会だけ承認制にできればよい。
-- ============================================================

-- ------------------------------------------------------------
-- イベント側：承認制フラグ
-- ------------------------------------------------------------
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.events.requires_approval IS '参加に主催者の承認を必要とするか';

-- ------------------------------------------------------------
-- 参加側：状態とイベント内の役割
-- ------------------------------------------------------------
ALTER TABLE public.event_participants
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved'
    CHECK (status IN ('pending', 'approved', 'declined'));

ALTER TABLE public.event_participants
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner', 'admin', 'member'));

ALTER TABLE public.event_participants
  ADD COLUMN IF NOT EXISTS message TEXT;

CREATE INDEX IF NOT EXISTS idx_event_participants_status
  ON public.event_participants(event_id, status);

-- 既存の主催者は owner として揃えておく
UPDATE public.event_participants AS p
   SET role = 'owner'
  FROM public.events AS e
 WHERE e.id = p.event_id
   AND e.host_id = p.member_id
   AND p.role <> 'owner';

-- ------------------------------------------------------------
-- そのイベントを管理できるか（主催者 or 副管理者 or 運営）
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_event_manager(p_event_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.events e
       WHERE e.id = p_event_id AND e.host_id = public.current_member_id()
    )
    OR EXISTS (
      SELECT 1 FROM public.event_participants p
       WHERE p.event_id = p_event_id
         AND p.member_id = public.current_member_id()
         AND p.role IN ('owner', 'admin')
    );
$$;

REVOKE ALL ON FUNCTION public.is_event_manager(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_event_manager(UUID) TO authenticated;

-- ------------------------------------------------------------
-- 🔴 参加状態は本人に決めさせない
-- ------------------------------------------------------------
-- 承認制のイベントでも、INSERT時に status='approved' を送れば
-- 自己承認できてしまう。∴ トリガ側で必ず上書きする。
CREATE OR REPLACE FUNCTION public.enforce_participation_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_requires BOOLEAN;
  v_host     UUID;
BEGIN
  SELECT requires_approval, host_id INTO v_requires, v_host
    FROM public.events WHERE id = NEW.event_id;

  -- 主催者自身と、管理権限を持つ人が入れた参加は承認済み扱い
  IF NEW.member_id = v_host OR public.is_event_manager(NEW.event_id) THEN
    NEW.status := 'approved';
  ELSE
    NEW.status := CASE WHEN v_requires THEN 'pending' ELSE 'approved' END;
    NEW.role   := 'member';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_participation_status ON public.event_participants;
CREATE TRIGGER trg_enforce_participation_status
  BEFORE INSERT ON public.event_participants
  FOR EACH ROW EXECUTE FUNCTION public.enforce_participation_status();

-- 承認・却下・役割変更は管理できる人だけ
DROP POLICY IF EXISTS event_participants_manage ON public.event_participants;
CREATE POLICY event_participants_manage ON public.event_participants
  FOR UPDATE TO authenticated
  USING (public.is_event_manager(event_id))
  WITH CHECK (public.is_event_manager(event_id));

-- 参加取消は本人、参加者の削除は管理できる人
DROP POLICY IF EXISTS event_participants_delete_own ON public.event_participants;
CREATE POLICY event_participants_delete_own ON public.event_participants
  FOR DELETE TO authenticated
  USING (member_id = public.current_member_id() OR public.is_event_manager(event_id));

-- 承認されたら申請者へ通知する
CREATE OR REPLACE FUNCTION public.notify_participation_approved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_title TEXT;
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    SELECT title INTO v_title FROM public.events WHERE id = NEW.event_id;
    PERFORM public.push_notification(
      NEW.member_id, NULL, 'event_reminder',
      '参加が承認されました', v_title, '/app/post'
    );
  ELSIF NEW.status = 'declined' AND OLD.status = 'pending' THEN
    SELECT title INTO v_title FROM public.events WHERE id = NEW.event_id;
    PERFORM public.push_notification(
      NEW.member_id, NULL, 'event_reminder',
      '参加を承認できませんでした', v_title, '/app/post'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_participation_approved ON public.event_participants;
CREATE TRIGGER trg_notify_participation_approved
  AFTER UPDATE ON public.event_participants
  FOR EACH ROW EXECUTE FUNCTION public.notify_participation_approved();

-- 主催者への「参加しました」通知は、承認待ちのときは文面を変える
CREATE OR REPLACE FUNCTION public.notify_event_join()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_host       UUID;
  v_title      TEXT;
  v_actor_name TEXT;
BEGIN
  SELECT host_id, title INTO v_host, v_title FROM public.events WHERE id = NEW.event_id;
  SELECT name INTO v_actor_name FROM public.members WHERE id = NEW.member_id;

  PERFORM public.push_notification(
    v_host, NEW.member_id, 'event_reminder',
    COALESCE(v_actor_name, 'メンバー') || 'さんが'
      || CASE WHEN NEW.status = 'pending' THEN '参加を申請しました' ELSE '参加しました' END,
    v_title, '/app/post'
  );

  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- 役割の変更とオーナー委譲
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS public.set_event_participant_role(UUID, UUID, TEXT);
CREATE FUNCTION public.set_event_participant_role(
  p_event_id  UUID,
  p_member_id UUID,
  p_role      TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_event_manager(p_event_id) THEN
    RAISE EXCEPTION 'このイベントを管理する権限がありません' USING ERRCODE = '42501';
  END IF;
  -- owner は委譲でしか変えられない（主催者が2人になるのを防ぐ）
  IF p_role NOT IN ('admin', 'member') THEN
    RAISE EXCEPTION '指定できるのは副管理者か一般メンバーです' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.events WHERE id = p_event_id AND host_id = p_member_id) THEN
    RAISE EXCEPTION '主催者の役割は変更できません（委譲してください）' USING ERRCODE = '23514';
  END IF;

  UPDATE public.event_participants
     SET role = p_role
   WHERE event_id = p_event_id AND member_id = p_member_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_event_participant_role(UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_event_participant_role(UUID, UUID, TEXT) TO authenticated;

DROP FUNCTION IF EXISTS public.transfer_event_ownership(UUID, UUID);
CREATE FUNCTION public.transfer_event_ownership(p_event_id UUID, p_new_owner UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_old_host UUID;
BEGIN
  SELECT host_id INTO v_old_host FROM public.events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'イベントが見つかりません' USING ERRCODE = 'P0002';
  END IF;
  -- 委譲できるのは今の主催者か運営だけ（副管理者には許さない）
  IF NOT (v_old_host = public.current_member_id() OR public.is_admin()) THEN
    RAISE EXCEPTION '主催者だけが委譲できます' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.event_participants
     WHERE event_id = p_event_id AND member_id = p_new_owner AND status = 'approved'
  ) THEN
    RAISE EXCEPTION '参加者の中から選んでください' USING ERRCODE = '23514';
  END IF;

  UPDATE public.events SET host_id = p_new_owner WHERE id = p_event_id;
  UPDATE public.event_participants SET role = 'owner'
   WHERE event_id = p_event_id AND member_id = p_new_owner;
  UPDATE public.event_participants SET role = 'admin'
   WHERE event_id = p_event_id AND member_id = v_old_host AND member_id <> p_new_owner;

  PERFORM public.push_notification(
    p_new_owner, v_old_host, 'event_reminder',
    'イベントの主催者になりました',
    (SELECT title FROM public.events WHERE id = p_event_id), '/app/post'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.transfer_event_ownership(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transfer_event_ownership(UUID, UUID) TO authenticated;

-- ------------------------------------------------------------
-- シリーズのフォロー
-- ------------------------------------------------------------
-- シリーズは events.series_name の自由入力なので、名前で紐づける。
CREATE TABLE IF NOT EXISTS public.event_series_follows (
  member_id   UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  series_name TEXT NOT NULL CHECK (char_length(series_name) BETWEEN 1 AND 120),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (member_id, series_name)
);

ALTER TABLE public.event_series_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS event_series_follows_own ON public.event_series_follows;
CREATE POLICY event_series_follows_own ON public.event_series_follows
  FOR ALL TO authenticated
  USING (member_id = public.current_member_id())
  WITH CHECK (member_id = public.current_member_id());

-- フォロー中のシリーズに新しい会ができたら知らせる
CREATE OR REPLACE FUNCTION public.notify_series_followers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_member UUID;
BEGIN
  IF NEW.series_name IS NULL OR btrim(NEW.series_name) = '' THEN
    RETURN NEW;
  END IF;

  FOR v_member IN
    SELECT f.member_id FROM public.event_series_follows f
     WHERE f.series_name = NEW.series_name
  LOOP
    PERFORM public.push_notification(
      v_member, NEW.host_id, 'event_reminder',
      NEW.series_name || 'の新しい会が公開されました',
      NEW.title, '/app/post'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_series_followers ON public.events;
CREATE TRIGGER trg_notify_series_followers
  AFTER INSERT ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.notify_series_followers();

-- ------------------------------------------------------------
-- 一覧の作り直し（承認制・役割・フォローを含める）
-- ------------------------------------------------------------
-- participant_count は承認済みだけを数える。
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
  requires_approval BOOLEAN,
  host_id           UUID,
  host_name         TEXT,
  participant_count BIGINT,
  pending_count     BIGINT,
  my_status         TEXT,
  my_role           TEXT,
  is_manager        BOOLEAN,
  is_mine           BOOLEAN,
  following_series  BOOLEAN
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
    e.requires_approval,
    e.host_id,
    h.name,
    (SELECT COUNT(*) FROM public.event_participants p
      WHERE p.event_id = e.id AND p.status = 'approved'),
    (SELECT COUNT(*) FROM public.event_participants p
      WHERE p.event_id = e.id AND p.status = 'pending'),
    (SELECT p.status FROM public.event_participants p
      WHERE p.event_id = e.id AND p.member_id = public.current_member_id()),
    (SELECT p.role FROM public.event_participants p
      WHERE p.event_id = e.id AND p.member_id = public.current_member_id()),
    public.is_event_manager(e.id),
    e.host_id = public.current_member_id(),
    EXISTS (
      SELECT 1 FROM public.event_series_follows f
       WHERE f.member_id = public.current_member_id()
         AND f.series_name = e.series_name
    )
  FROM public.events AS e
  LEFT JOIN public.members AS h ON h.id = e.host_id
  WHERE public.is_active_member()
    AND (p_include_past OR e.event_date >= CURRENT_DATE)
  ORDER BY e.event_date DESC;
$$;

REVOKE ALL ON FUNCTION public.event_list(BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.event_list(BOOLEAN) TO authenticated;

-- 参加者一覧に状態と役割を含める
DROP FUNCTION IF EXISTS public.event_participant_list(UUID);
CREATE FUNCTION public.event_participant_list(p_event_id UUID DEFAULT NULL)
RETURNS TABLE (
  event_id    UUID,
  member_id   UUID,
  name        TEXT,
  job         TEXT,
  avatar_path TEXT,
  status      TEXT,
  role        TEXT,
  message     TEXT,
  joined_at   TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT p.event_id, m.id, m.name, m.job, m.avatar_path, p.status, p.role, p.message, p.joined_at
    FROM public.event_participants AS p
    JOIN public.members AS m ON m.id = p.member_id
   WHERE public.is_active_member()
     AND (p_event_id IS NULL OR p.event_id = p_event_id)
   ORDER BY p.joined_at ASC;
$$;

REVOKE ALL ON FUNCTION public.event_participant_list(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.event_participant_list(UUID) TO authenticated;

-- 参加状況（管理画面）は承認済みだけを数える
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
    m.id, m.name, m.job, m.avatar_path, m.is_withdrawn,
    COUNT(p.event_id), MAX(e.event_date)
  FROM public.members AS m
  LEFT JOIN public.event_participants AS p
    ON p.member_id = m.id AND p.status = 'approved'
  LEFT JOIN public.events AS e ON e.id = p.event_id
  WHERE public.is_admin()
  GROUP BY m.id, m.name, m.job, m.avatar_path, m.is_withdrawn
  ORDER BY COUNT(p.event_id) DESC, m.name ASC;
$$;

REVOKE ALL ON FUNCTION public.member_participation_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.member_participation_stats() TO authenticated;

COMMENT ON TABLE public.event_series_follows IS 'シリーズのフォロー。新しい会が公開されたら通知する';
