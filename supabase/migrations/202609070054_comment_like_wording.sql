-- ============================================================
-- 返信へのいいねは「返信に」と書く
-- ============================================================
-- 前提：202609070053_comment_likes.sql 適用済み。
--
-- notify_comment_like() の文言が「あなたのコメントにいいねしました」で
-- 固定だったため、返信にいいねされた人にも「コメント」と出ていた。
-- 既存の返信通知（notify_post_comment）は「〇〇さんが返信しました」と
-- 書き分けているので、そちらに揃える。
--
-- 返信は独立した表ではなく post_comments の中で parent_comment_id が
-- 入っている行なので、同じ問い合わせで判定できる（往復は増えない）。
--
-- 🔴 変えたのは「parent_comment_id を一緒に取る」と「文言のCASE」だけ。
--    CREATE OR REPLACE は全文置換なので、前の版から他の行を落としていない
--    ことを目で確かめてから流す（本番で5日間、決済列の保護が外れた前例がある）。
-- 🔴 トリガは作り直さない。関数を置き換えれば既存のトリガはそのまま
--    新しい中身を呼ぶ。
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_comment_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_comment_author UUID;
  v_is_reply       BOOLEAN;
  v_actor_name     TEXT;
BEGIN
  SELECT author_id, parent_comment_id IS NOT NULL
    INTO v_comment_author, v_is_reply
    FROM public.post_comments WHERE id = NEW.comment_id;
  SELECT name INTO v_actor_name
    FROM public.members WHERE id = NEW.member_id;

  PERFORM public.push_notification(
    v_comment_author, NEW.member_id, 'board_unread',
    COALESCE(v_actor_name, 'メンバー') || 'さんがあなたの'
      || CASE WHEN v_is_reply THEN '返信' ELSE 'コメント' END
      || 'にいいねしました',
    NULL, '/app/board'
  );

  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- 適用の確認（このまま流して結果を見る）
-- ------------------------------------------------------------
-- 期待する結果:
--   ① 返信の書き分けが入っている（reply_wording = t）
--   ② 通知そのものは今までどおり出る（push_notification を呼んでいる = t）
--   ③ トリガは1本のまま（trg_notify_comment_like）
SELECT
  prosrc LIKE '%返信%'            AS reply_wording,
  prosrc LIKE '%push_notification%' AS still_notifies
FROM pg_proc
WHERE proname = 'notify_comment_like';

SELECT tgname FROM pg_trigger
 WHERE tgrelid = 'public.comment_likes'::regclass AND NOT tgisinternal;
