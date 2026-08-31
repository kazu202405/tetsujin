-- ============================================================
-- 「出会い」を参加した会から自動で並べる
-- ============================================================
-- 前提：202608050005_applications_and_events.sql
--       202608050007_connections_and_social_links.sql 適用済み。
--
-- ------------------------------------------------------------
-- 🔴 なぜ変えるか（2026-08-31 依頼主判断）
-- ------------------------------------------------------------
-- 出会い記録は手入力だけで、441名で3件しか使われていない。
-- もともと「SNSを見せる鍵」を兼ねていたのが唯一の実利で、
-- 2026-08-30にその役目を外したため、いまは誰にも見えない
-- 自分専用メモが残っているだけになっていた。
--
-- 一方で「同じ会に出た」という事実はアプリが既に持っている
-- （event_participants）。同じことを会員に手で入力させていた。
-- ∴ 参加した会から自動で並べ、手入力は会の外で会った人のための
--    補助に降ろす。
--
-- ------------------------------------------------------------
-- 🔴 自動ぶんは行を作らない（保存しない）
-- ------------------------------------------------------------
-- connections に自動で INSERT すると、
--   ・参加を取り消した会の出会いが残り続ける
--   ・本人が消しても次の実行でまた生える
--   ・手で書いたメモと自動ぶんが同じ表に混ざり、区別できなくなる
-- ∴ 読むときに毎回組み立てる。元（参加記録）が消えれば自然に消える。
--
-- 🔴 重なりは手入力を優先する。同じ人と同じ日の記録が両方あるとき、
--    手で書いたほうにはメモや場所が入っているので、そちらを残す。
-- ============================================================

DROP FUNCTION IF EXISTS public.my_meetings();

CREATE FUNCTION public.my_meetings()
RETURNS TABLE (
  id                  TEXT,
  source              TEXT,          -- 'manual' = 自分で記録 / 'event' = 会から
  person_id           UUID,
  person_name         TEXT,
  person_job          TEXT,
  person_avatar_path  TEXT,
  person_is_withdrawn BOOLEAN,
  occasion            TEXT,
  met_on              DATE,
  location            TEXT,
  note                TEXT,
  tags                TEXT[],
  created_at          TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH me AS (SELECT public.current_member_id() AS id),
  -- 自分が参加した会
  mine AS (
    SELECT ep.event_id
      FROM public.event_participants AS ep, me
     WHERE ep.member_id = me.id
       AND ep.status = 'approved'
  ),
  -- その会に居合わせた他の人
  from_events AS (
    SELECT DISTINCT ON (ep.member_id, e.event_date)
      ep.member_id            AS person_id,
      e.title                 AS occasion,
      e.event_date            AS met_on,
      e.location              AS location,
      e.id                    AS event_id
    FROM public.event_participants AS ep
    JOIN mine        ON mine.event_id = ep.event_id
    JOIN public.events AS e ON e.id = ep.event_id
    CROSS JOIN me
    WHERE ep.status = 'approved'
      AND ep.member_id <> me.id
    ORDER BY ep.member_id, e.event_date DESC, e.id
  ),
  manual AS (
    SELECT c.id, c.person_id, c.occasion, c.met_on, c.location, c.note, c.tags, c.created_at
      FROM public.connections AS c, me
     WHERE c.owner_id = me.id
  )
  -- 🔴 UNION の出力列名は最初の枝から取られる。最後の ORDER BY が
  --    met_on / created_at を名前で参照するので、ここで必ず別名を付ける。
  SELECT
    m.id::TEXT          AS id,
    'manual'            AS source,
    p.id                AS person_id,
    p.name              AS person_name,
    p.job               AS person_job,
    p.avatar_path       AS person_avatar_path,
    p.is_withdrawn      AS person_is_withdrawn,
    m.occasion          AS occasion,
    m.met_on            AS met_on,
    m.location          AS location,
    m.note              AS note,
    m.tags              AS tags,
    m.created_at        AS created_at
  FROM manual AS m
  JOIN public.members AS p ON p.id = m.person_id

  UNION ALL

  SELECT
    'event:' || f.event_id::TEXT || ':' || f.person_id::TEXT,
    'event', p.id, p.name, p.job, p.avatar_path, p.is_withdrawn,
    f.occasion, f.met_on, f.location, NULL, '{}'::TEXT[],
    (f.met_on::TIMESTAMPTZ)
  FROM from_events AS f
  JOIN public.members AS p ON p.id = f.person_id
  -- 手で書いた記録が同じ人・同じ日にあるなら、そちらを残す
  WHERE NOT EXISTS (
    SELECT 1 FROM manual AS m2
     WHERE m2.person_id = f.person_id
       AND m2.met_on IS NOT DISTINCT FROM f.met_on
  )

  ORDER BY met_on DESC NULLS LAST, created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.my_meetings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_meetings() TO authenticated;

COMMENT ON FUNCTION public.my_meetings() IS
  '自分の出会い。参加した会から自動で作る分と、自分で記録した分をまとめて返す。自動ぶんは保存しない';
