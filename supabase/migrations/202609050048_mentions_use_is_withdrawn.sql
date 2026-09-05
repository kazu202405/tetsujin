-- ============================================================
-- メンションの在籍判定を、ログインと同じ列に揃える
-- ============================================================
-- 前提：202609050046_board_mentions.sql 適用済み。
--
-- ------------------------------------------------------------
-- 🔴 退会を表す列が2つあり、中身が食い違っている（2026-09-05 実測）
-- ------------------------------------------------------------
--   全631件のうち
--     is_withdrawn = TRUE ......... 190件
--     withdrawn_at IS NOT NULL ...... 3件
--     → is_withdrawn = TRUE なのに withdrawn_at が空 ... 187件
--
-- Excel から取り込んだ退会者には withdrawn_at が入っていない。
-- ログインの判定（current_member_id）が見ているのは is_withdrawn なので、
-- 在籍かどうかの正は is_withdrawn。
--
-- 0046 のメンション系4関数は withdrawn_at で判定していた。
-- ∴ 退会した人が宛先候補に出たり、@all の宛先に入ったりする。
--
-- 今日の時点では実害が出ていない（退会済みでログインできる人は0名で、
-- どの関数も auth_user_id IS NOT NULL を併せて見ているため）。
-- ただしこれは偶然で、退会処理を通った人は auth_user_id を持ったまま
-- 退会するので、次に誰かが退会した瞬間に効き始める。
--
-- 🔴 本文は 0046 の定義をそのまま持ってきて、判定列だけを差し替えている。
--    CREATE OR REPLACE は全文置換で、手で打ち直すと前の版の行を
--    黙って落とす（過去に再申請のクールダウンを丸ごと落とした）。
-- ============================================================

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
     WHERE m.is_withdrawn = FALSE
       AND m.auth_user_id IS NOT NULL
       AND COALESCE(m.name, '') <> ''
    UNION ALL
    SELECT m.id, m.nickname
      FROM public.members AS m
     WHERE m.is_withdrawn = FALSE
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
         WHERE m.is_withdrawn = FALSE
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
         WHERE m.is_withdrawn = FALSE
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
     AND m.is_withdrawn = FALSE
     AND m.auth_user_id IS NOT NULL
     AND COALESCE(m.name, '') <> ''
   ORDER BY m.name;
$$;

REVOKE ALL ON FUNCTION public.resolve_mentions(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_mentions(TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.mentionable_members() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mentionable_members() TO authenticated;
