-- ============================================================
-- 削除したコメントの本文を空にできるようにする
-- ============================================================
-- 前提：202608310038_board_edit_delete.sql 適用済み。
--
-- ------------------------------------------------------------
-- 🔴 delete_comment() が必ず失敗していた
-- ------------------------------------------------------------
-- post_comments.content には CHECK (char_length BETWEEN 1 AND 2000) がある。
-- 削除時に content = '' を書こうとして 23514 で弾かれ、
-- 画面には 400 だけが返っていた（編集は通るのに削除だけ失敗する形）。
--
-- 本文を消すのは、行を残す（返信を道連れにしないため）以上、
-- DBを見られる人に読めたままにしないため。∴ 制約のほうを直す。
--
-- 削除済みのときだけ空を許す。生きているコメントは今までどおり
-- 1文字以上を必須にする（空のコメントを投稿できるようにはしない）。
--
-- 🔴 制約名を決め打ちにしない。名前が違うと DROP IF EXISTS が
--    素通りして古い制約が残り、新しい制約と両方効いて
--    「直したのに直っていない」になる。実際に掛かっている物を探して落とす。
-- ============================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT con.conname
      FROM pg_constraint AS con
      JOIN pg_class      AS rel ON rel.oid = con.conrelid
      JOIN pg_namespace  AS nsp ON nsp.oid = rel.relnamespace
     WHERE nsp.nspname = 'public'
       AND rel.relname = 'post_comments'
       AND con.contype = 'c'
       AND pg_get_constraintdef(con.oid) ILIKE '%content%'
  LOOP
    EXECUTE format('ALTER TABLE public.post_comments DROP CONSTRAINT %I', r.conname);
  END LOOP;
END;
$$;

ALTER TABLE public.post_comments
  ADD CONSTRAINT post_comments_content_check
  CHECK (
    char_length(content) <= 2000
    AND (deleted_at IS NOT NULL OR char_length(content) >= 1)
  );

COMMENT ON COLUMN public.post_comments.content IS
  '本文。削除すると空にする（行は返信を道連れにしないために残す）';
