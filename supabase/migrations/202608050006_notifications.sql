-- ============================================================
-- お知らせ（通知）
-- ============================================================
-- 前提：202608050005_applications_and_events.sql 適用済み。
--
-- これまで通知は固定のmock＋既読はlocalStorageで、
--  ・誰かが実際に行動しても通知は出ない
--  ・端末を変えると既読が消える
-- 状態だった。参加承認も開示申請も「相手が気づける」ことが前提の機能なので、
-- 先にここを実データにする。
--
-- 生成はアプリ側ではなくDBのトリガで行う。
-- コメント・いいね・イベント参加・入会申請のどの経路から書き込まれても
-- 取りこぼさないため。
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID        NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  -- 誰の行動がきっかけか（運営からのお知らせなど、無い場合もある）
  actor_id     UUID        REFERENCES public.members(id) ON DELETE SET NULL,
  type         TEXT        NOT NULL
                           CHECK (type IN (
                             'comment_reply',
                             'board_unread',
                             'event_reminder',
                             'connection_new',
                             'plan_renewal',
                             'disclosure_request',
                             'disclosure_approved',
                             'announcement'
                           )),
  title        TEXT        NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  message      TEXT,
  href         TEXT,
  read_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient
  ON public.notifications(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON public.notifications(recipient_id) WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 自分宛だけ見える。既読にするのも自分だけ。
-- 作成はトリガと運営用の関数（SECURITY DEFINER）からのみ＝INSERTポリシーは置かない。
DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT TO authenticated
  USING (recipient_id = public.current_member_id());

DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE TO authenticated
  USING (recipient_id = public.current_member_id())
  WITH CHECK (recipient_id = public.current_member_id());

DROP POLICY IF EXISTS notifications_delete_own ON public.notifications;
CREATE POLICY notifications_delete_own ON public.notifications
  FOR DELETE TO authenticated
  USING (recipient_id = public.current_member_id());

-- ------------------------------------------------------------
-- 生成の共通処理
-- ------------------------------------------------------------
-- 宛先が居ない／自分自身が相手のときは何もしない（自分の行動で自分に通知しない）。
CREATE OR REPLACE FUNCTION public.push_notification(
  p_recipient UUID,
  p_actor     UUID,
  p_type      TEXT,
  p_title     TEXT,
  p_message   TEXT,
  p_href      TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_recipient IS NULL THEN RETURN; END IF;
  IF p_actor IS NOT NULL AND p_actor = p_recipient THEN RETURN; END IF;

  INSERT INTO public.notifications (recipient_id, actor_id, type, title, message, href)
  VALUES (p_recipient, p_actor, p_type, p_title, p_message, p_href);
END;
$$;

REVOKE ALL ON FUNCTION public.push_notification(UUID, UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------
-- 掲示板：コメントと返信
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_post_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_post_author   UUID;
  v_parent_author UUID;
  v_actor_name    TEXT;
  v_excerpt       TEXT;
BEGIN
  SELECT author_id INTO v_post_author FROM public.posts WHERE id = NEW.post_id;
  SELECT name INTO v_actor_name FROM public.members WHERE id = NEW.author_id;
  v_excerpt := LEFT(NEW.content, 60);

  -- 投稿主へ
  PERFORM public.push_notification(
    v_post_author, NEW.author_id, 'comment_reply',
    COALESCE(v_actor_name, 'メンバー') || 'さんがあなたの投稿にコメントしました',
    v_excerpt, '/app/board'
  );

  -- 返信なら、返信された本人へも（投稿主と同じ人なら二重に出さない）
  IF NEW.parent_comment_id IS NOT NULL THEN
    SELECT author_id INTO v_parent_author
      FROM public.post_comments WHERE id = NEW.parent_comment_id;

    IF v_parent_author IS DISTINCT FROM v_post_author THEN
      PERFORM public.push_notification(
        v_parent_author, NEW.author_id, 'comment_reply',
        COALESCE(v_actor_name, 'メンバー') || 'さんが返信しました',
        v_excerpt, '/app/board'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_post_comment ON public.post_comments;
CREATE TRIGGER trg_notify_post_comment
  AFTER INSERT ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_post_comment();

-- ------------------------------------------------------------
-- 掲示板：いいね
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_post_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_post_author UUID;
  v_actor_name  TEXT;
BEGIN
  SELECT author_id INTO v_post_author FROM public.posts WHERE id = NEW.post_id;
  SELECT name INTO v_actor_name FROM public.members WHERE id = NEW.member_id;

  PERFORM public.push_notification(
    v_post_author, NEW.member_id, 'board_unread',
    COALESCE(v_actor_name, 'メンバー') || 'さんがあなたの投稿にいいねしました',
    NULL, '/app/board'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_post_like ON public.post_likes;
CREATE TRIGGER trg_notify_post_like
  AFTER INSERT ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_post_like();

-- ------------------------------------------------------------
-- イベント：参加があったら主催者へ
-- ------------------------------------------------------------
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
    COALESCE(v_actor_name, 'メンバー') || 'さんが参加しました',
    v_title, '/app/post'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_event_join ON public.event_participants;
CREATE TRIGGER trg_notify_event_join
  AFTER INSERT ON public.event_participants
  FOR EACH ROW EXECUTE FUNCTION public.notify_event_join();

-- ------------------------------------------------------------
-- 入会申請が届いたら運営全員へ
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_new_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin UUID;
BEGIN
  FOR v_admin IN
    SELECT id FROM public.members
     WHERE role = 'admin' AND is_withdrawn = FALSE AND auth_user_id IS NOT NULL
  LOOP
    PERFORM public.push_notification(
      v_admin, NULL, 'connection_new',
      '入会申請が届きました',
      NEW.name || 'さん（' || COALESCE(NEW.job, '職業未記入') || '）',
      '/app/admin'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_application ON public.applications;
CREATE TRIGGER trg_notify_new_application
  AFTER INSERT ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_application();

-- ------------------------------------------------------------
-- 運営からのお知らせ（一斉）
-- ------------------------------------------------------------
-- ログインアカウントを持つ在籍会員だけに配る。
-- アカウントが無い人には読む手段が無く、行だけ増えてしまうため。
DROP FUNCTION IF EXISTS public.broadcast_notification(TEXT, TEXT, TEXT);
CREATE FUNCTION public.broadcast_notification(
  p_title   TEXT,
  p_message TEXT,
  p_href    TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor UUID := public.current_member_id();
  v_count BIGINT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin権限が必要です' USING ERRCODE = '42501';
  END IF;
  IF p_title IS NULL OR btrim(p_title) = '' THEN
    RAISE EXCEPTION 'お知らせのタイトルが空です' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.notifications (recipient_id, actor_id, type, title, message, href)
  SELECT m.id, v_actor, 'announcement', p_title, p_message, p_href
    FROM public.members AS m
   WHERE m.is_withdrawn = FALSE
     AND m.auth_user_id IS NOT NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.broadcast_notification(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.broadcast_notification(TEXT, TEXT, TEXT) TO authenticated;

-- ------------------------------------------------------------
-- 既読
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS public.mark_all_notifications_read();
CREATE FUNCTION public.mark_all_notifications_read()
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE public.notifications
     SET read_at = NOW()
   WHERE recipient_id = public.current_member_id()
     AND read_at IS NULL;
$$;

REVOKE ALL ON FUNCTION public.mark_all_notifications_read() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;

COMMENT ON TABLE public.notifications IS 'お知らせ。生成はDBトリガと運営の一斉送信のみ（アプリから直接INSERTさせない）';
