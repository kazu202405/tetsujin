-- ============================================================
-- 掲示板の投稿・コメントを編集／削除できるようにする
-- ============================================================
-- 前提：202608050003_board_and_avatars.sql 適用済み。
--
-- ------------------------------------------------------------
-- 🔴 これまで誰も何も直せず、消せなかった
-- ------------------------------------------------------------
-- 投稿にもコメントにも編集・削除のAPIが無く、書いた本人はもちろん
-- 運営でも、誤字を直すことも、間違って出した投稿を取り消すこともできなかった。
--
-- ------------------------------------------------------------
-- 🔴 消さずに印を立てる（soft delete）
-- ------------------------------------------------------------
-- post_comments.parent_comment_id は ON DELETE CASCADE。
-- ∴ 親コメントを本当に消すと、ぶら下がっている返信も道連れで消える。
--    「削除されました」と出して会話を残すには、行を消してはいけない。
--
-- 退会も選択肢の無効化も同じ方針（消さずに印を立てる）なので揃える。
-- 運営が他人の投稿を消す場面があり、取り消せないと事故が戻せない。
--
-- ------------------------------------------------------------
-- 🔴 編集できるのは本人だけ。運営でも他人の文章は書き換えられない
-- ------------------------------------------------------------
-- 運営に消す権限は要る（荒らし対応）が、書き換える権限は要らない。
-- 他人の名前で違う内容が残るほうが、消えるより始末が悪い。
-- ============================================================

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS edited_at  TIMESTAMPTZ;

ALTER TABLE public.post_comments
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS edited_at  TIMESTAMPTZ;

COMMENT ON COLUMN public.posts.deleted_at IS '削除した日時。行は消さない（コメントや画像を道連れにしないため）';
COMMENT ON COLUMN public.posts.edited_at IS '編集した日時。画面に「編集済み」と出す';

CREATE INDEX IF NOT EXISTS idx_posts_not_deleted
  ON public.posts (channel_id, created_at DESC) WHERE deleted_at IS NULL;

-- ------------------------------------------------------------
-- 投稿を編集する（本人のみ）
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.edit_post(p_id UUID, p_content TEXT)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_me   UUID := public.current_member_id();
  v_body TEXT := NULLIF(TRIM(COALESCE(p_content, '')), '');
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'ログインが必要です' USING ERRCODE = '42501';
  END IF;
  IF v_body IS NULL OR char_length(v_body) > 5000 THEN
    RAISE EXCEPTION '本文は1〜5000文字で入力してください' USING ERRCODE = '22023';
  END IF;

  UPDATE public.posts
     SET content = v_body, edited_at = NOW()
   WHERE id = p_id
     AND author_id = v_me
     AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION '編集できるのは自分の投稿だけです' USING ERRCODE = '42501';
  END IF;
END;
$$;

-- ------------------------------------------------------------
-- 投稿を削除する（本人または運営）
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_post(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_me UUID := public.current_member_id();
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'ログインが必要です' USING ERRCODE = '42501';
  END IF;

  UPDATE public.posts
     SET deleted_at = NOW()
   WHERE id = p_id
     AND deleted_at IS NULL
     AND (author_id = v_me OR public.is_admin());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'この投稿は削除できません' USING ERRCODE = '42501';
  END IF;
END;
$$;

-- ------------------------------------------------------------
-- コメントを編集する（本人のみ）
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.edit_comment(p_id UUID, p_content TEXT)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_me   UUID := public.current_member_id();
  v_body TEXT := NULLIF(TRIM(COALESCE(p_content, '')), '');
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'ログインが必要です' USING ERRCODE = '42501';
  END IF;
  IF v_body IS NULL OR char_length(v_body) > 2000 THEN
    RAISE EXCEPTION 'コメントは1〜2000文字で入力してください' USING ERRCODE = '22023';
  END IF;

  UPDATE public.post_comments
     SET content = v_body, edited_at = NOW()
   WHERE id = p_id
     AND author_id = v_me
     AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION '編集できるのは自分のコメントだけです' USING ERRCODE = '42501';
  END IF;
END;
$$;

-- ------------------------------------------------------------
-- コメントを削除する（本人または運営）
-- ------------------------------------------------------------
-- 🔴 行は消さない。返信がぶら下がっていると CASCADE で会話ごと消えるため。
--    本文も消す＝残しておくと、DBを見られる人には読めてしまう。
--    「削除されました」と出すのに本文は要らない。
CREATE OR REPLACE FUNCTION public.delete_comment(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_me UUID := public.current_member_id();
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'ログインが必要です' USING ERRCODE = '42501';
  END IF;

  UPDATE public.post_comments
     SET deleted_at = NOW(), content = ''
   WHERE id = p_id
     AND deleted_at IS NULL
     AND (author_id = v_me OR public.is_admin());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'このコメントは削除できません' USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.edit_post(UUID, TEXT)      FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_post(UUID)          FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.edit_comment(UUID, TEXT)   FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_comment(UUID)       FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.edit_post(UUID, TEXT)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_post(UUID)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.edit_comment(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_comment(UUID)     TO authenticated;

-- ============================================================
-- 読み取り側を、削除済みと編集済みに対応させる
-- ============================================================
-- 🔴 いずれも戻り値の列が増えるので CREATE OR REPLACE では作り直せない。
--    元の定義（202608050003_board_and_avatars.sql）を複製して、
--    ・deleted_at の除外
--    ・edited_at の追加
--    だけを足している。手で書き直すと他の条件を落とす。

-- ------------------------------------------------------------
-- 投稿一覧：削除済みは出さない
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS public.board_feed(UUID, INTEGER, INTEGER);
CREATE FUNCTION public.board_feed(
  p_channel_id UUID DEFAULT NULL,
  p_limit      INTEGER DEFAULT 50,
  p_offset     INTEGER DEFAULT 0
)
RETURNS TABLE (
  id                  UUID,
  channel_id          UUID,
  content             TEXT,
  image_path          TEXT,
  created_at          TIMESTAMPTZ,
  edited_at           TIMESTAMPTZ,
  author_id           UUID,
  author_name         TEXT,
  author_nickname     TEXT,
  author_job          TEXT,
  author_avatar_path  TEXT,
  author_role         TEXT,
  author_is_withdrawn BOOLEAN,
  like_count          BIGINT,
  comment_count       BIGINT,
  liked_by_me         BOOLEAN,
  is_mine             BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    p.id,
    p.channel_id,
    p.content,
    p.image_path,
    p.created_at,
    p.edited_at,
    a.id,
    a.name,
    a.nickname,
    a.job,
    a.avatar_path,
    a.role,
    a.is_withdrawn,
    (SELECT COUNT(*) FROM public.post_likes    pl WHERE pl.post_id = p.id),
    -- 削除したコメントは件数にも入れない（0件なのに「3件」と出ると開いて驚く）
    (SELECT COUNT(*) FROM public.post_comments pc
      WHERE pc.post_id = p.id AND pc.deleted_at IS NULL),
    EXISTS (
      SELECT 1 FROM public.post_likes pl
       WHERE pl.post_id = p.id
         AND pl.member_id = public.current_member_id()
    ),
    p.author_id = public.current_member_id()
  FROM public.posts AS p
  JOIN public.members AS a ON a.id = p.author_id
  WHERE public.is_active_member()
    AND p.deleted_at IS NULL
    AND (p_channel_id IS NULL OR p.channel_id = p_channel_id)
  ORDER BY p.created_at DESC
  LIMIT  GREATEST(LEAST(COALESCE(p_limit, 50), 200), 1)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;
REVOKE ALL ON FUNCTION public.board_feed(UUID, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.board_feed(UUID, INTEGER, INTEGER) TO authenticated;

-- ------------------------------------------------------------
-- コメント：削除済みも返す（返信がぶら下がっていると会話が読めなくなるため）
-- ------------------------------------------------------------
-- 🔴 本文は削除時に空にしてあるので、ここで漏れることはない。
--    返信が無い削除済みコメントを消すかどうかは画面側で決める
--    （DBは事実を返し、見せ方は画面が決める）。
DROP FUNCTION IF EXISTS public.post_thread(UUID);
CREATE FUNCTION public.post_thread(p_post_id UUID)
RETURNS TABLE (
  id                  UUID,
  post_id             UUID,
  parent_comment_id   UUID,
  content             TEXT,
  created_at          TIMESTAMPTZ,
  edited_at           TIMESTAMPTZ,
  is_deleted          BOOLEAN,
  author_id           UUID,
  author_name         TEXT,
  author_nickname     TEXT,
  author_job          TEXT,
  author_avatar_path  TEXT,
  author_is_withdrawn BOOLEAN,
  is_mine             BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    c.id,
    c.post_id,
    c.parent_comment_id,
    c.content,
    c.created_at,
    c.edited_at,
    c.deleted_at IS NOT NULL,
    a.id,
    a.name,
    a.nickname,
    a.job,
    a.avatar_path,
    a.is_withdrawn,
    c.author_id = public.current_member_id()
  FROM public.post_comments AS c
  JOIN public.members AS a ON a.id = c.author_id
  WHERE public.is_active_member()
    AND c.post_id = p_post_id
  ORDER BY c.created_at ASC;
$$;
REVOKE ALL ON FUNCTION public.post_thread(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.post_thread(UUID) TO authenticated;

-- ------------------------------------------------------------
-- チャンネルごとの件数：削除済みを数えない
-- ------------------------------------------------------------
-- 🔴 この関数は 202608130020_board_channel_reads.sql で未読数つきに
--    作り直されている。古い方（202608050003）から複製すると
--    unread_count が消えて、board_unread_count() と未読バッジが壊れる。
--    ∴ 最後にこの関数を定義したファイルから複製し、
--    投稿の結合条件に deleted_at IS NULL を足すだけにする。
DROP FUNCTION IF EXISTS public.board_channel_counts();
CREATE FUNCTION public.board_channel_counts()
RETURNS TABLE (channel_id UUID, post_count BIGINT, unread_count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    ch.id,
    COUNT(p.id),
    COUNT(p.id) FILTER (
      WHERE p.author_id <> public.current_member_id()
        AND p.created_at > COALESCE(
              (SELECT r.last_read_at
                 FROM public.board_channel_reads AS r
                WHERE r.member_id = public.current_member_id()
                  AND r.channel_id = ch.id),
              -- そのチャンネルを一度も開いていない人は、掲示板全体の
              -- 最終閲覧時刻を使う（新設チャンネルが即「全部未読」にならないように）
              (SELECT br.last_read_at
                 FROM public.board_reads AS br
                WHERE br.member_id = public.current_member_id()),
              '-infinity'::TIMESTAMPTZ
            )
    )
    FROM public.board_channels AS ch
    LEFT JOIN public.posts AS p
      ON p.channel_id = ch.id AND p.deleted_at IS NULL
   WHERE public.is_active_member()
   GROUP BY ch.id;
$$;

REVOKE ALL ON FUNCTION public.board_channel_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.board_channel_counts() TO authenticated;
