-- ============================================================
-- 掲示板の未読をチャンネルごとに数える
-- ============================================================
-- 前提：202608050003_board_and_avatars.sql 適用済み。
--
-- チャンネル名の右に出ていた数字は「そのチャンネルの総投稿数」で、
-- 見ても減らないため何の数字か分からなかった。依頼主の希望で未読数に変える。
--
-- 【なぜテーブルが要るか】
-- board_reads は会員ごとに last_read_at を1つしか持っていない＝掲示板全体で1つ。
-- この1つだけでチャンネル別の未読を出すと、どれか1つのチャンネルを開いた時点で
-- 全チャンネルの未読が同時に消える。それでは未読の意味が無いので、
-- 「どのチャンネルをいつまで読んだか」を持つ。
--
-- 既存の board_reads は消さない。サイドバーの合計バッジが使っており、
-- 移行時の初期値としても要るため。
-- ============================================================

CREATE TABLE IF NOT EXISTS public.board_channel_reads (
  member_id    UUID        NOT NULL REFERENCES public.members(id)        ON DELETE CASCADE,
  channel_id   UUID        NOT NULL REFERENCES public.board_channels(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (member_id, channel_id)
);

ALTER TABLE public.board_channel_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS board_channel_reads_own ON public.board_channel_reads;
CREATE POLICY board_channel_reads_own ON public.board_channel_reads
  FOR ALL TO authenticated
  USING (member_id = public.current_member_id())
  WITH CHECK (member_id = public.current_member_id());

-- ------------------------------------------------------------
-- 既存の「掲示板全体の最終閲覧時刻」を初期値として配る
-- ------------------------------------------------------------
-- これをしないと、今まで読んでいた人の全チャンネルが移行の瞬間に
-- 「未読だらけ」になって、実態と違う数字が出る。
INSERT INTO public.board_channel_reads (member_id, channel_id, last_read_at)
SELECT br.member_id, ch.id, br.last_read_at
  FROM public.board_reads AS br
 CROSS JOIN public.board_channels AS ch
ON CONFLICT (member_id, channel_id) DO NOTHING;

-- ------------------------------------------------------------
-- チャンネルごとの投稿数と未読数
-- ------------------------------------------------------------
-- post_count も返し続ける（チャンネル一覧の「◯件」表示が使っている）。
-- 自分の投稿は未読に数えない。読んでいない相手の発言だけがバッジに出る。
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
    LEFT JOIN public.posts AS p ON p.channel_id = ch.id
   WHERE public.is_active_member()
   GROUP BY ch.id;
$$;

REVOKE ALL ON FUNCTION public.board_channel_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.board_channel_counts() TO authenticated;

-- ------------------------------------------------------------
-- チャンネルを開いたら、そのチャンネルだけ既読にする
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS public.mark_board_channel_read(UUID);
CREATE FUNCTION public.mark_board_channel_read(p_channel_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_member UUID := public.current_member_id();
BEGIN
  IF v_member IS NULL OR p_channel_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.board_channel_reads (member_id, channel_id, last_read_at)
       VALUES (v_member, p_channel_id, NOW())
  ON CONFLICT (member_id, channel_id)
    DO UPDATE SET last_read_at = NOW();
END;
$$;

REVOKE ALL ON FUNCTION public.mark_board_channel_read(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_board_channel_read(UUID) TO authenticated;

-- ------------------------------------------------------------
-- サイドバーの合計バッジをチャンネル別の合計に合わせる
-- ------------------------------------------------------------
-- 🔴 ここを直さないと、サイドバーは「3」なのに各チャンネルの合計は「0」
--    のような食い違いが起きる。数字の出どころは1つにする。
DROP FUNCTION IF EXISTS public.board_unread_count();
CREATE FUNCTION public.board_unread_count()
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(SUM(c.unread_count), 0)
    FROM public.board_channel_counts() AS c;
$$;

REVOKE ALL ON FUNCTION public.board_unread_count() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.board_unread_count() TO authenticated;
