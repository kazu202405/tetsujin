-- ============================================================
-- 掲示板の @メンション（@all を含む）と、その通知
-- ============================================================
-- 前提：202608050003_board_and_avatars.sql（掲示板）
--       202608050006_notifications.sql（通知）
--       202608060012_notification_prefs.sql（通知設定）適用済み。
--
-- ------------------------------------------------------------
-- 🔴 いま起きていること
-- ------------------------------------------------------------
-- 画面では @ に続く文字が既に山吹色の太字になっている（rich-text.tsx）。
-- ところが宛先の解決も通知も無い。∴ 書いた人は届いたと思い、
-- 書かれた人は気づかない。「色が付く＝届く」という誤解が先にできている。
--
-- ------------------------------------------------------------
-- 宛先の決め方
-- ------------------------------------------------------------
-- 本文そのものを唯一の正とする。入力欄の候補選択はあくまで入力の補助で、
-- 「候補を選ばず手で打った人には届かない」を作らない（過去に同じ穴を踏んだ）。
--
-- 宛先は「ログインできる会員」に限る（auth_user_id IS NOT NULL）。
-- 2026-09-05時点で会員レコード630に対しログインできるのは6名。
-- 全レコードに配ると621名が一生見ない行を作り、通知INSERTごとに走る
-- プッシュ配信（Database Webhook → /api/push/dispatch）が空振りする。
--
-- ------------------------------------------------------------
-- 依頼主の判断（2026-09-05）
-- ------------------------------------------------------------
-- ・@all は全員が使える（権限で絞らない）
-- ・通知設定で掲示板をOFFにしている人にも、指名も @all も届ける
--   → notification_allowed で 'mention' は常に TRUE
-- ============================================================

-- ------------------------------------------------------------
-- 通知の種類に mention を足す
-- ------------------------------------------------------------
-- 🔴 DBの制約と画面の対応表は必ず両方直す。0012 で weekly_digest を
--    足したとき画面を直し忘れ、受け取った人のお知らせ一覧が落ちた。
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
    'weekly_digest',
    'billing_alert',
    'connection_request',
    'connection_accepted',
    'connection_declined',
    'mention'
  ));

-- ------------------------------------------------------------
-- メンションは掲示板OFFでも届ける（依頼主判断）
-- ------------------------------------------------------------
-- 🔴 CREATE OR REPLACE は全文置換。前の版の行を1行でも落とすと、
--    その種類の通知が黙って止まる（エラーは出ない）。
--    ∴ 0012 の本文をそのまま持ってきて mention だけ足している。
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
    -- 名指し・全員宛ては「自分に用がある話」なので掲示板OFFでも届ける
    WHEN 'mention'       THEN TRUE
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

-- ------------------------------------------------------------
-- 本文から宛先を解決する
-- ------------------------------------------------------------
-- 日本語の氏名は空白で区切られない（「@五島一将さん、よろしく」）。
-- ∴ 区切りで切り出すのではなく、会員の名前が本文に「@名前」の形で
--   現れるかを見る。名前とニックネームの両方を手がかりにする。
--
-- 🔴 短い名前が長い名前の先頭に含まれる場合（@田中 と @田中太郎）、
--    「@田中太郎」と書いただけで田中さんにも飛ぶ。∴ より長い手がかりが
--    当たっているものは落とす。starts_with を使う（LIKE だと名前に
--    含まれる % や _ がワイルドカードとして効いてしまう）。
CREATE OR REPLACE FUNCTION public.resolve_mentions(p_text TEXT)
RETURNS TABLE (member_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH handles AS (
    SELECT m.id, m.name AS handle
      FROM public.members AS m
     WHERE m.withdrawn_at IS NULL
       AND m.auth_user_id IS NOT NULL
       AND COALESCE(m.name, '') <> ''
    UNION ALL
    SELECT m.id, m.nickname
      FROM public.members AS m
     WHERE m.withdrawn_at IS NULL
       AND m.auth_user_id IS NOT NULL
       AND COALESCE(m.nickname, '') <> ''
  ),
  hit AS (
    SELECT h.id, h.handle
      FROM handles AS h
     WHERE strpos(COALESCE(p_text, ''), '@' || h.handle) > 0
  )
  SELECT DISTINCT h.id
    FROM hit AS h
   WHERE NOT EXISTS (
     SELECT 1
       FROM hit AS longer
      WHERE longer.handle <> h.handle
        AND starts_with(longer.handle, h.handle)
   );
$$;

REVOKE ALL ON FUNCTION public.resolve_mentions(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_mentions(TEXT) TO authenticated;

-- ------------------------------------------------------------
-- 全員宛てか
-- ------------------------------------------------------------
-- 🔴 「@allen さん」で全員に飛ばさない。all の直後が英数字・下線でない
--    ことを必ず見る（文末で終わる場合も許す）。
CREATE OR REPLACE FUNCTION public.mentions_everyone(p_text TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(p_text, '') ~* '@all([^a-z0-9_]|$)'
      OR strpos(COALESCE(p_text, ''), '@全員') > 0;
$$;

REVOKE ALL ON FUNCTION public.mentions_everyone(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mentions_everyone(TEXT) TO authenticated;

-- ------------------------------------------------------------
-- 解決した宛先を残す
-- ------------------------------------------------------------
-- 残す理由は2つ。
--  1. 画面で「解決したメンションだけ」色を付けるため。届かないものが
--     光っている状態をなくす（それが今の不具合そのもの）。
--  2. 二重通知を防ぐため。本文を編集して足したメンションには通知を出すが、
--     同じ相手に何度も出さない＝この表にあるかどうかで判断する。
--
-- via_all は「@all で入った人」。画面の色付けは名指し（FALSE）だけを見る。
CREATE TABLE IF NOT EXISTS public.post_mentions (
  post_id    UUID        NOT NULL REFERENCES public.posts(id)   ON DELETE CASCADE,
  member_id  UUID        NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  via_all    BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, member_id)
);

CREATE TABLE IF NOT EXISTS public.comment_mentions (
  comment_id UUID        NOT NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
  member_id  UUID        NOT NULL REFERENCES public.members(id)       ON DELETE CASCADE,
  via_all    BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (comment_id, member_id)
);

ALTER TABLE public.post_mentions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_mentions ENABLE ROW LEVEL SECURITY;

-- 読むのは在籍会員。書くのはトリガ（SECURITY DEFINER）だけ＝INSERTポリシーは置かない。
-- 🔴 FOR ALL にしない。会員が自分で行を足せると、誰にでも通知を作れてしまう。
DROP POLICY IF EXISTS post_mentions_select ON public.post_mentions;
CREATE POLICY post_mentions_select ON public.post_mentions
  FOR SELECT TO authenticated
  USING (public.is_active_member());

DROP POLICY IF EXISTS comment_mentions_select ON public.comment_mentions;
CREATE POLICY comment_mentions_select ON public.comment_mentions
  FOR SELECT TO authenticated
  USING (public.is_active_member());

CREATE INDEX IF NOT EXISTS idx_post_mentions_member
  ON public.post_mentions(member_id);
CREATE INDEX IF NOT EXISTS idx_comment_mentions_member
  ON public.comment_mentions(member_id);

-- ------------------------------------------------------------
-- 投稿のメンション通知
-- ------------------------------------------------------------
-- INSERT だけでなく UPDATE でも動かす。あとから本文を直してメンションを
-- 足すのは普通の使い方で、そこで届かないと「打ったのに来ない」になる。
-- 二重通知は post_mentions の主キー衝突で防ぐ（既にいる人には出さない）。
CREATE OR REPLACE FUNCTION public.notify_post_mentions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_name TEXT;
  v_excerpt    TEXT;
  v_rec        RECORD;
BEGIN
  SELECT name INTO v_actor_name FROM public.members WHERE id = NEW.author_id;
  v_excerpt := LEFT(NEW.content, 60);

  -- 名指し
  FOR v_rec IN
    WITH ins AS (
      INSERT INTO public.post_mentions (post_id, member_id, via_all)
      SELECT NEW.id, r.member_id, FALSE
        FROM public.resolve_mentions(NEW.content) AS r
       WHERE r.member_id <> NEW.author_id
      ON CONFLICT (post_id, member_id) DO NOTHING
      RETURNING member_id
    )
    SELECT ins.member_id FROM ins
  LOOP
    PERFORM public.push_notification(
      v_rec.member_id, NEW.author_id, 'mention',
      COALESCE(v_actor_name, 'メンバー') || 'さんが掲示板であなたにメンションしました',
      v_excerpt, '/app/board'
    );
  END LOOP;

  -- 全員宛て
  IF public.mentions_everyone(NEW.content) THEN
    FOR v_rec IN
      WITH ins AS (
        INSERT INTO public.post_mentions (post_id, member_id, via_all)
        SELECT NEW.id, m.id, TRUE
          FROM public.members AS m
         WHERE m.withdrawn_at IS NULL
           AND m.auth_user_id IS NOT NULL
           AND m.id <> NEW.author_id
        ON CONFLICT (post_id, member_id) DO NOTHING
        RETURNING member_id
      )
      SELECT ins.member_id FROM ins
    LOOP
      PERFORM public.push_notification(
        v_rec.member_id, NEW.author_id, 'mention',
        COALESCE(v_actor_name, 'メンバー') || 'さんが掲示板で全員に呼びかけました',
        v_excerpt, '/app/board'
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_post_mentions ON public.posts;
CREATE TRIGGER trg_notify_post_mentions
  AFTER INSERT OR UPDATE OF content ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.notify_post_mentions();

-- ------------------------------------------------------------
-- コメントのメンション通知
-- ------------------------------------------------------------
-- 🔴 既存の notify_post_comment() には触らない。別のトリガとして足す。
--    CREATE OR REPLACE で作り直すと、前の版が足した行を落としても
--    エラーが出ないため（実際に本番で5日間、決済列の保護が外れた前例）。
CREATE OR REPLACE FUNCTION public.notify_comment_mentions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_name TEXT;
  v_excerpt    TEXT;
  v_rec        RECORD;
BEGIN
  SELECT name INTO v_actor_name FROM public.members WHERE id = NEW.author_id;
  v_excerpt := LEFT(NEW.content, 60);

  FOR v_rec IN
    WITH ins AS (
      INSERT INTO public.comment_mentions (comment_id, member_id, via_all)
      SELECT NEW.id, r.member_id, FALSE
        FROM public.resolve_mentions(NEW.content) AS r
       WHERE r.member_id <> NEW.author_id
      ON CONFLICT (comment_id, member_id) DO NOTHING
      RETURNING member_id
    )
    SELECT ins.member_id FROM ins
  LOOP
    PERFORM public.push_notification(
      v_rec.member_id, NEW.author_id, 'mention',
      COALESCE(v_actor_name, 'メンバー') || 'さんがコメントであなたにメンションしました',
      v_excerpt, '/app/board'
    );
  END LOOP;

  IF public.mentions_everyone(NEW.content) THEN
    FOR v_rec IN
      WITH ins AS (
        INSERT INTO public.comment_mentions (comment_id, member_id, via_all)
        SELECT NEW.id, m.id, TRUE
          FROM public.members AS m
         WHERE m.withdrawn_at IS NULL
           AND m.auth_user_id IS NOT NULL
           AND m.id <> NEW.author_id
        ON CONFLICT (comment_id, member_id) DO NOTHING
        RETURNING member_id
      )
      SELECT ins.member_id FROM ins
    LOOP
      PERFORM public.push_notification(
        v_rec.member_id, NEW.author_id, 'mention',
        COALESCE(v_actor_name, 'メンバー') || 'さんがコメントで全員に呼びかけました',
        v_excerpt, '/app/board'
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_comment_mentions ON public.post_comments;
CREATE TRIGGER trg_notify_comment_mentions
  AFTER INSERT OR UPDATE OF content ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_comment_mentions();

COMMENT ON TABLE public.post_mentions IS
  '投稿で解決したメンションの宛先。via_all=TRUE は @all で入った人';
COMMENT ON TABLE public.comment_mentions IS
  'コメントで解決したメンションの宛先。via_all=TRUE は @all で入った人';

-- ------------------------------------------------------------
-- 入力欄に出す宛先候補
-- ------------------------------------------------------------
-- 🔴 メンバー一覧（member_directory）を流用しない。あちらは会員レコード
--    630件すべてを返すが、そのうちログインできるのは6名。候補に出して
--    しまうと、選べるのに届かない人が621名並ぶ。
--    「見えるのに届かない」を作らないため、宛先になれる人だけを返す。
CREATE OR REPLACE FUNCTION public.mentionable_members()
RETURNS TABLE (id UUID, name TEXT, nickname TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT m.id, m.name, m.nickname
    FROM public.members AS m
   WHERE public.is_active_member()
     AND m.withdrawn_at IS NULL
     AND m.auth_user_id IS NOT NULL
     AND COALESCE(m.name, '') <> ''
   ORDER BY m.name;
$$;

REVOKE ALL ON FUNCTION public.mentionable_members() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mentionable_members() TO authenticated;
