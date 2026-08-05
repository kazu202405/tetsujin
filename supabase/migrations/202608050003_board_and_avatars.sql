-- ============================================================
-- 掲示板（チャンネル／投稿／コメント／いいね）＋ プロフィール写真
-- ============================================================
-- 前提：202608050001_members.sql / 202608050002_member_directory_roles.sql 適用済み。
--
-- 設計方針
--  - members は RLS で「自分の行」しか読めない。∴ 投稿者の氏名や職業を出すには
--    member_directory() と同じく SECURITY DEFINER 関数で安全な列だけを返す。
--    （email / phone / 金額 / admin_note は絶対に返さない）
--  - チャンネルはこれまで localStorage 管理だった＝会員ごとに違う一覧が見えていた。
--    運営が管理する1つの正本にするためテーブル化する。
--  - 退会者の投稿は消さない（既存方針＝履歴は構造保持・本人へのリンクだけ止める）。
--    そのため author_is_withdrawn を返して画面側で出し分ける。
-- ============================================================

-- ------------------------------------------------------------
-- 共通ヘルパー
-- ------------------------------------------------------------
-- ログイン中の在籍会員の members.id。未ログイン・未紐づけ・退会者は NULL。
CREATE OR REPLACE FUNCTION public.current_member_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT id
    FROM public.members
   WHERE auth_user_id = auth.uid()
     AND is_withdrawn = FALSE
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_member_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_member_id() TO authenticated;

-- 在籍会員としてログインしているか。掲示板の閲覧可否はすべてこれで判定する。
CREATE OR REPLACE FUNCTION public.is_active_member()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT public.current_member_id() IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.is_active_member() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_member() TO authenticated;

-- ------------------------------------------------------------
-- プロフィール写真（Storage 上のオブジェクトパスを保持）
-- ------------------------------------------------------------
-- 画像そのものは Storage の avatars バケットに置き、ここにはパスだけ持つ。
-- 例: "<member_id>/1754300000000.jpg"
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS avatar_path TEXT;

COMMENT ON COLUMN public.members.avatar_path IS 'Storage avatars バケット内のオブジェクトパス。NULLなら頭文字アイコンで表示する';

-- ------------------------------------------------------------
-- チャンネル
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.board_channels (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT        NOT NULL UNIQUE,
  name        TEXT        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 40),
  icon_key    TEXT        NOT NULL DEFAULT 'Star',
  color       TEXT        NOT NULL DEFAULT 'blue',
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  is_archived BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_board_channels_sort ON public.board_channels(sort_order, created_at);

DROP TRIGGER IF EXISTS trg_board_channels_set_updated_at ON public.board_channels;
CREATE TRIGGER trg_board_channels_set_updated_at
  BEFORE UPDATE ON public.board_channels
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 既存 mock の初期チャンネル。再実行しても増えないよう slug で冪等にする。
INSERT INTO public.board_channels (slug, name, icon_key, color, sort_order) VALUES
  ('welcome',  '新規ご入会挨拶',        'PartyPopper', 'pink',   10),
  ('chat',     'つぶやき・雑談',        'Coffee',      'amber',  20),
  ('gallery',  'みんなのギャラリー',    'ImagePlus',   'blue',   30),
  ('exchange', '○○さんと交流しました',  'Handshake',   'green',  40),
  ('club',     '部活動：全',            'Dumbbell',    'purple', 50),
  ('announce', '告知します！',          'Megaphone',   'red',    60),
  ('referral', '紹介と依頼',            'ArrowUpRight','indigo', 70)
ON CONFLICT (slug) DO NOTHING;

-- ------------------------------------------------------------
-- 投稿
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.posts (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID        NOT NULL REFERENCES public.board_channels(id) ON DELETE CASCADE,
  author_id  UUID        NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  content    TEXT        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 5000),
  image_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_channel_created ON public.posts(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author          ON public.posts(author_id);

DROP TRIGGER IF EXISTS trg_posts_set_updated_at ON public.posts;
CREATE TRIGGER trg_posts_set_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- コメント（返信は parent_comment_id で1階層のみ）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.post_comments (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id           UUID        NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  parent_comment_id UUID        REFERENCES public.post_comments(id) ON DELETE CASCADE,
  author_id         UUID        NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  content           TEXT        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_comments_post   ON public.post_comments(post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_post_comments_parent ON public.post_comments(parent_comment_id);

-- 返信の返信（2階層より深いネスト）は画面側に無いのでDBでも禁止する。
CREATE OR REPLACE FUNCTION public.enforce_comment_depth()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_parent_parent UUID;
  v_parent_post   UUID;
BEGIN
  IF NEW.parent_comment_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT parent_comment_id, post_id
    INTO v_parent_parent, v_parent_post
    FROM public.post_comments
   WHERE id = NEW.parent_comment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '返信先のコメントが見つかりません' USING ERRCODE = 'P0002';
  END IF;

  IF v_parent_parent IS NOT NULL THEN
    RAISE EXCEPTION '返信への返信はできません' USING ERRCODE = '23514';
  END IF;

  IF v_parent_post <> NEW.post_id THEN
    RAISE EXCEPTION '返信先が別の投稿のコメントです' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_post_comments_depth ON public.post_comments;
CREATE TRIGGER trg_post_comments_depth
  BEFORE INSERT ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_comment_depth();

-- ------------------------------------------------------------
-- いいね
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.post_likes (
  post_id    UUID        NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  member_id  UUID        NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_post_likes_member ON public.post_likes(member_id);

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
ALTER TABLE public.board_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes     ENABLE ROW LEVEL SECURITY;

-- チャンネル：在籍会員は閲覧のみ。作成・編集・削除は運営だけ。
DROP POLICY IF EXISTS board_channels_select ON public.board_channels;
CREATE POLICY board_channels_select ON public.board_channels
  FOR SELECT TO authenticated
  USING (public.is_active_member());

DROP POLICY IF EXISTS board_channels_admin_all ON public.board_channels;
CREATE POLICY board_channels_admin_all ON public.board_channels
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 投稿：在籍会員は全件閲覧。作成は自分名義のみ。編集・削除は本人か運営。
DROP POLICY IF EXISTS posts_select ON public.posts;
CREATE POLICY posts_select ON public.posts
  FOR SELECT TO authenticated
  USING (public.is_active_member());

DROP POLICY IF EXISTS posts_insert_own ON public.posts;
CREATE POLICY posts_insert_own ON public.posts
  FOR INSERT TO authenticated
  WITH CHECK (author_id = public.current_member_id());

DROP POLICY IF EXISTS posts_update_own ON public.posts;
CREATE POLICY posts_update_own ON public.posts
  FOR UPDATE TO authenticated
  USING (author_id = public.current_member_id() OR public.is_admin())
  WITH CHECK (author_id = public.current_member_id() OR public.is_admin());

DROP POLICY IF EXISTS posts_delete_own ON public.posts;
CREATE POLICY posts_delete_own ON public.posts
  FOR DELETE TO authenticated
  USING (author_id = public.current_member_id() OR public.is_admin());

-- コメント：同上
DROP POLICY IF EXISTS post_comments_select ON public.post_comments;
CREATE POLICY post_comments_select ON public.post_comments
  FOR SELECT TO authenticated
  USING (public.is_active_member());

DROP POLICY IF EXISTS post_comments_insert_own ON public.post_comments;
CREATE POLICY post_comments_insert_own ON public.post_comments
  FOR INSERT TO authenticated
  WITH CHECK (author_id = public.current_member_id());

DROP POLICY IF EXISTS post_comments_delete_own ON public.post_comments;
CREATE POLICY post_comments_delete_own ON public.post_comments
  FOR DELETE TO authenticated
  USING (author_id = public.current_member_id() OR public.is_admin());

-- いいね：自分の分だけ付け外しできる（他人のいいねは操作できない）
DROP POLICY IF EXISTS post_likes_select ON public.post_likes;
CREATE POLICY post_likes_select ON public.post_likes
  FOR SELECT TO authenticated
  USING (public.is_active_member());

DROP POLICY IF EXISTS post_likes_insert_own ON public.post_likes;
CREATE POLICY post_likes_insert_own ON public.post_likes
  FOR INSERT TO authenticated
  WITH CHECK (member_id = public.current_member_id());

DROP POLICY IF EXISTS post_likes_delete_own ON public.post_likes;
CREATE POLICY post_likes_delete_own ON public.post_likes
  FOR DELETE TO authenticated
  USING (member_id = public.current_member_id());

-- ------------------------------------------------------------
-- 読み取り用の関数（投稿者の安全な列だけを同梱して返す）
-- ------------------------------------------------------------
-- members は RLS で他人の行が読めないため、結合は SECURITY DEFINER 側で行う。
-- 返す投稿者情報は「氏名・呼び名・職業・写真・ロール・退会フラグ」だけ。

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
    a.id,
    a.name,
    a.nickname,
    a.job,
    a.avatar_path,
    a.role,
    a.is_withdrawn,
    (SELECT COUNT(*) FROM public.post_likes    pl WHERE pl.post_id = p.id),
    (SELECT COUNT(*) FROM public.post_comments pc WHERE pc.post_id = p.id),
    EXISTS (
      SELECT 1 FROM public.post_likes pl
       WHERE pl.post_id = p.id
         AND pl.member_id = public.current_member_id()
    ),
    p.author_id = public.current_member_id()
  FROM public.posts AS p
  JOIN public.members AS a ON a.id = p.author_id
  WHERE public.is_active_member()
    AND (p_channel_id IS NULL OR p.channel_id = p_channel_id)
  ORDER BY p.created_at DESC
  LIMIT  GREATEST(LEAST(COALESCE(p_limit, 50), 200), 1)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;

REVOKE ALL ON FUNCTION public.board_feed(UUID, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.board_feed(UUID, INTEGER, INTEGER) TO authenticated;

DROP FUNCTION IF EXISTS public.post_thread(UUID);
CREATE FUNCTION public.post_thread(p_post_id UUID)
RETURNS TABLE (
  id                  UUID,
  post_id             UUID,
  parent_comment_id   UUID,
  content             TEXT,
  created_at          TIMESTAMPTZ,
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

-- チャンネルごとの投稿件数（タブの数字用）
DROP FUNCTION IF EXISTS public.board_channel_counts();
CREATE FUNCTION public.board_channel_counts()
RETURNS TABLE (channel_id UUID, post_count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT ch.id, COUNT(p.id)
    FROM public.board_channels AS ch
    LEFT JOIN public.posts AS p ON p.channel_id = ch.id
   WHERE public.is_active_member()
   GROUP BY ch.id;
$$;

REVOKE ALL ON FUNCTION public.board_channel_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.board_channel_counts() TO authenticated;

-- 未読件数（最終閲覧より後に作られた自分以外の投稿数）
CREATE TABLE IF NOT EXISTS public.board_reads (
  member_id    UUID        PRIMARY KEY REFERENCES public.members(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.board_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS board_reads_own ON public.board_reads;
CREATE POLICY board_reads_own ON public.board_reads
  FOR ALL TO authenticated
  USING (member_id = public.current_member_id())
  WITH CHECK (member_id = public.current_member_id());

DROP FUNCTION IF EXISTS public.board_unread_count();
CREATE FUNCTION public.board_unread_count()
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COUNT(*)
    FROM public.posts AS p
   WHERE public.is_active_member()
     AND p.author_id <> public.current_member_id()
     AND p.created_at > COALESCE(
           (SELECT br.last_read_at FROM public.board_reads br
             WHERE br.member_id = public.current_member_id()),
           '-infinity'::TIMESTAMPTZ
         );
$$;

REVOKE ALL ON FUNCTION public.board_unread_count() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.board_unread_count() TO authenticated;

DROP FUNCTION IF EXISTS public.mark_board_read();
CREATE FUNCTION public.mark_board_read()
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

  INSERT INTO public.board_reads (member_id, last_read_at)
       VALUES (v_member, NOW())
  ON CONFLICT (member_id) DO UPDATE SET last_read_at = NOW();
END;
$$;

REVOKE ALL ON FUNCTION public.mark_board_read() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_board_read() TO authenticated;

-- ------------------------------------------------------------
-- member_directory() に写真パスを追加
-- ------------------------------------------------------------
-- 返す列を増やすため、CREATE OR REPLACE ではなく作り直す。
-- 返す範囲は従来どおり「安全な列」だけ（email / phone / 金額 / admin_note は含めない）。
DROP FUNCTION IF EXISTS public.member_directory();
CREATE FUNCTION public.member_directory()
RETURNS TABLE (
  id              UUID,
  member_no       INTEGER,
  name            TEXT,
  nickname        TEXT,
  job             TEXT,
  grip            TEXT,
  membership_type TEXT,
  role            TEXT,
  avatar_path     TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    m.id,
    m.member_no,
    m.name,
    m.nickname,
    m.job,
    m.grip,
    m.membership_type,
    m.role,
    m.avatar_path
  FROM public.members AS m
  WHERE auth.uid() IS NOT NULL
    AND m.is_withdrawn = FALSE
  ORDER BY m.member_no ASC NULLS LAST, m.name ASC;
$$;

REVOKE ALL ON FUNCTION public.member_directory() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.member_directory() TO authenticated;

-- ------------------------------------------------------------
-- Storage：プロフィール写真・投稿画像
-- ------------------------------------------------------------
-- 🔴 非公開バケットにする。会員626名の顔写真は個人情報であり、
--    公開バケットにするとURLを知る誰でも（未ログインでも）取得できてしまう。
--    表示はサーバー側で発行する署名URL経由にする。
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars',     'avatars',     FALSE, 5242880,  ARRAY['image/jpeg','image/png','image/webp']),
  ('post-images', 'post-images', FALSE, 10485760, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 置き場所は "<member_id>/<ファイル名>"。先頭フォルダ＝所有者として判定する。
DROP POLICY IF EXISTS avatars_select ON storage.objects;
CREATE POLICY avatars_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND public.is_active_member());

DROP POLICY IF EXISTS avatars_insert_own ON storage.objects;
CREATE POLICY avatars_insert_own ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = public.current_member_id()::TEXT
  );

DROP POLICY IF EXISTS avatars_update_own ON storage.objects;
CREATE POLICY avatars_update_own ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND ((storage.foldername(name))[1] = public.current_member_id()::TEXT OR public.is_admin())
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND ((storage.foldername(name))[1] = public.current_member_id()::TEXT OR public.is_admin())
  );

DROP POLICY IF EXISTS avatars_delete_own ON storage.objects;
CREATE POLICY avatars_delete_own ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND ((storage.foldername(name))[1] = public.current_member_id()::TEXT OR public.is_admin())
  );

DROP POLICY IF EXISTS post_images_select ON storage.objects;
CREATE POLICY post_images_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'post-images' AND public.is_active_member());

DROP POLICY IF EXISTS post_images_insert_own ON storage.objects;
CREATE POLICY post_images_insert_own ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'post-images'
    AND (storage.foldername(name))[1] = public.current_member_id()::TEXT
  );

DROP POLICY IF EXISTS post_images_delete_own ON storage.objects;
CREATE POLICY post_images_delete_own ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'post-images'
    AND ((storage.foldername(name))[1] = public.current_member_id()::TEXT OR public.is_admin())
  );

COMMENT ON TABLE public.board_channels IS '掲示板チャンネル。運営が管理する正本（旧: 会員ごとのlocalStorage）';
COMMENT ON TABLE public.posts          IS '掲示板の投稿。退会者の投稿も履歴として残す';
COMMENT ON TABLE public.post_comments  IS '投稿へのコメント。parent_comment_id で1階層の返信まで';
COMMENT ON TABLE public.board_reads    IS '会員ごとの掲示板の最終閲覧時刻。未読バッジの算出に使う';
