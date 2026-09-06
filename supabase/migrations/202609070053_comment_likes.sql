-- ============================================================
-- コメントにも「いいね」を付けられるようにする
-- ============================================================
-- 前提：202608050003_board_and_avatars.sql（post_comments / post_likes）
--       202608050006_notifications.sql（notify_post_like / push_notification）
--       202608060012_notification_prefs.sql（push_notification 現行版）適用済み。
--
-- 投稿には最初からいいねがあるのに、コメントには無かった。
-- 会話の枝（返信）で「読んだよ」を返す手段が返信しかなく、
-- 一言だけ返したい場面で何も押せない。
--
-- 🔴 post_likes と同じ形にする（複合主キー＋本人だけ書ける）。
--    形を揃えておくと、片方だけ壊れる書き方が入りにくい。
-- 🔴 通知は notify_post_like と同じ作り。push_notification が
--    「自分の投稿への自分の操作」と通知設定オフを弾くので、ここでは見ない。
-- 🔴 post_thread() は書き換えない。CREATE OR REPLACE は全文置換で、
--    前の版が足した行を黙って落とす（本番で5日間、決済列の保護が
--    外れた前例がある）。いいねの件数はAPI側で1回引く。
-- ============================================================

CREATE TABLE IF NOT EXISTS public.comment_likes (
  comment_id UUID        NOT NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
  member_id  UUID        NOT NULL REFERENCES public.members(id)       ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (comment_id, member_id)
);

-- 1つのコメントに付いたいいねをまとめて数える用
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment ON public.comment_likes(comment_id);

ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

-- 見られるのは在籍会員だけ。押せる／外せるのは自分の分だけ。
DROP POLICY IF EXISTS comment_likes_select ON public.comment_likes;
CREATE POLICY comment_likes_select ON public.comment_likes
  FOR SELECT TO authenticated
  USING (public.is_active_member());

DROP POLICY IF EXISTS comment_likes_insert_own ON public.comment_likes;
CREATE POLICY comment_likes_insert_own ON public.comment_likes
  FOR INSERT TO authenticated
  WITH CHECK (member_id = public.current_member_id());

DROP POLICY IF EXISTS comment_likes_delete_own ON public.comment_likes;
CREATE POLICY comment_likes_delete_own ON public.comment_likes
  FOR DELETE TO authenticated
  USING (member_id = public.current_member_id());

-- ------------------------------------------------------------
-- 通知（notify_post_like と同じ形）
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_comment_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_comment_author UUID;
  v_actor_name     TEXT;
BEGIN
  SELECT author_id INTO v_comment_author
    FROM public.post_comments WHERE id = NEW.comment_id;
  SELECT name INTO v_actor_name
    FROM public.members WHERE id = NEW.member_id;

  PERFORM public.push_notification(
    v_comment_author, NEW.member_id, 'board_unread',
    COALESCE(v_actor_name, 'メンバー') || 'さんがあなたのコメントにいいねしました',
    NULL, '/app/board'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_comment_like ON public.comment_likes;
CREATE TRIGGER trg_notify_comment_like
  AFTER INSERT ON public.comment_likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_comment_like();

COMMENT ON TABLE public.comment_likes IS 'コメントへのいいね。post_likes と同じ形（複合主キー・本人だけ書ける）';

-- ------------------------------------------------------------
-- 適用の確認
-- ------------------------------------------------------------
-- 期待する結果:
--   ① 3行（select / insert / delete のポリシー）
--   ② 1行（AFTER INSERT の通知トリガ）
SELECT policyname, cmd FROM pg_policies
 WHERE schemaname = 'public' AND tablename = 'comment_likes'
 ORDER BY policyname;

SELECT tgname FROM pg_trigger
 WHERE tgrelid = 'public.comment_likes'::regclass AND NOT tgisinternal;
