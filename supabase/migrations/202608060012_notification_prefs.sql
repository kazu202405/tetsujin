-- ============================================================
-- 通知の受け取り設定（会員ごと）
-- ============================================================
-- 前提：202608060011_push_subscriptions.sql 適用済み。
--
-- 設定画面のトグルは表示だけで保存されていなかった。実際に効くようにする。
--
-- 🔴 判定は push_notification() の中で行う。
--    通知の作成経路はコメント・いいね・イベント参加・出会い記録・開示申請…と
--    複数あり、呼び出し側それぞれで見ると必ず見落としが出るため、
--    「作る直前の1か所」に寄せる。
--
-- 運営からのお知らせ（announcement）と会費まわり（plan_renewal）は
-- 切れないようにする。届かないと困る種類のため。
-- ============================================================

-- 週次ダイジェスト用の種別を追加
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'comment_reply',
    'board_unread',
    'event_reminder',
    'connection_new',
    'plan_renewal',
    'disclosure_request',
    'disclosure_approved',
    'announcement',
    'weekly_digest'
  ));

CREATE TABLE IF NOT EXISTS public.member_notification_prefs (
  member_id     UUID        PRIMARY KEY REFERENCES public.members(id) ON DELETE CASCADE,
  -- 掲示板（コメント・返信・いいね）
  board         BOOLEAN     NOT NULL DEFAULT TRUE,
  -- イベント（参加申請・承認・シリーズの新着）
  events        BOOLEAN     NOT NULL DEFAULT TRUE,
  -- つながり（出会いの記録・SNS開示の申請と承認）
  connections   BOOLEAN     NOT NULL DEFAULT TRUE,
  -- 週に1回のまとめ
  weekly_digest BOOLEAN     NOT NULL DEFAULT FALSE,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_notification_prefs_set_updated_at ON public.member_notification_prefs;
CREATE TRIGGER trg_notification_prefs_set_updated_at
  BEFORE UPDATE ON public.member_notification_prefs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.member_notification_prefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notification_prefs_own ON public.member_notification_prefs;
CREATE POLICY notification_prefs_own ON public.member_notification_prefs
  FOR ALL TO authenticated
  USING (member_id = public.current_member_id())
  WITH CHECK (member_id = public.current_member_id());

-- 種別ごとに受け取る設定になっているか。
-- 設定行がまだ無い会員は既定（全部オン）とみなす。
CREATE OR REPLACE FUNCTION public.notification_allowed(p_member_id UUID, p_type TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT CASE p_type
    -- 切れない種類
    WHEN 'announcement'  THEN TRUE
    WHEN 'plan_renewal'  THEN TRUE
    WHEN 'weekly_digest' THEN COALESCE((SELECT weekly_digest FROM public.member_notification_prefs WHERE member_id = p_member_id), FALSE)
    WHEN 'comment_reply' THEN COALESCE((SELECT board       FROM public.member_notification_prefs WHERE member_id = p_member_id), TRUE)
    WHEN 'board_unread'  THEN COALESCE((SELECT board       FROM public.member_notification_prefs WHERE member_id = p_member_id), TRUE)
    WHEN 'event_reminder' THEN COALESCE((SELECT events     FROM public.member_notification_prefs WHERE member_id = p_member_id), TRUE)
    WHEN 'connection_new' THEN COALESCE((SELECT connections FROM public.member_notification_prefs WHERE member_id = p_member_id), TRUE)
    WHEN 'disclosure_request'  THEN COALESCE((SELECT connections FROM public.member_notification_prefs WHERE member_id = p_member_id), TRUE)
    WHEN 'disclosure_approved' THEN COALESCE((SELECT connections FROM public.member_notification_prefs WHERE member_id = p_member_id), TRUE)
    ELSE TRUE
  END;
$$;

REVOKE ALL ON FUNCTION public.notification_allowed(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notification_allowed(UUID, TEXT) TO authenticated;

-- 作成の直前で設定を見る（呼び出し側は今までどおりで良い）
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
  IF NOT public.notification_allowed(p_recipient, p_type) THEN RETURN; END IF;

  INSERT INTO public.notifications (recipient_id, actor_id, type, title, message, href)
  VALUES (p_recipient, p_actor, p_type, p_title, p_message, p_href);
END;
$$;

REVOKE ALL ON FUNCTION public.push_notification(UUID, UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------
-- 週次ダイジェスト
-- ------------------------------------------------------------
-- 受け取る設定にしている会員へ、直近7日の動きをまとめて1件送る。
-- 実行は Vercel Cron から /api/cron/weekly-digest 経由で呼ぶ。
DROP FUNCTION IF EXISTS public.send_weekly_digest();
CREATE FUNCTION public.send_weekly_digest()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_posts    BIGINT;
  v_events   BIGINT;
  v_member   UUID;
  v_count    BIGINT := 0;
  v_message  TEXT;
BEGIN
  SELECT COUNT(*) INTO v_posts
    FROM public.posts WHERE created_at >= NOW() - INTERVAL '7 days';

  SELECT COUNT(*) INTO v_events
    FROM public.events
   WHERE is_canceled = FALSE
     AND event_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 14;

  -- 動きが何も無い週は送らない（中身の無い通知を配らない）
  IF v_posts = 0 AND v_events = 0 THEN
    RETURN 0;
  END IF;

  v_message := '掲示板の新しい投稿 ' || v_posts || '件／これから2週間の会 ' || v_events || '件';

  FOR v_member IN
    SELECT p.member_id
      FROM public.member_notification_prefs p
      JOIN public.members m ON m.id = p.member_id
     WHERE p.weekly_digest = TRUE
       AND m.is_withdrawn = FALSE
       AND m.auth_user_id IS NOT NULL
  LOOP
    INSERT INTO public.notifications (recipient_id, type, title, message, href)
    VALUES (v_member, 'weekly_digest', '今週のTETSUJIN会', v_message, '/app/mypage');
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.send_weekly_digest() FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE public.member_notification_prefs IS '通知の受け取り設定。判定は push_notification() の中で行う';
