-- ============================================================
-- 出会い記録 ＋ SNSリンク ＋ 開示申請
-- ============================================================
-- 前提：202608050006_notifications.sql 適用済み。
--
-- この3つは依存している：
--   出会い記録  … 誰と誰が会ったか
--     ↓ これが「つながり済み」の判定になる
--   SNSリンク   … 公開 / つながり済みのみ / 非公開
--     ↓ 「つながり済みのみ」を個別に開けてもらう
--   開示申請    … 申請 → 通知 → 承認 → 開示
--
-- 🔴 URLの守り方
--   見えない相手にURLを返さないことを「画面で隠す」のではなく
--   DB側（関数）で NULL にして返す。APIの戻り値に載らなければ漏れようがない。
-- ============================================================

-- ------------------------------------------------------------
-- 出会い記録
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.connections (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 記録した人
  owner_id   UUID        NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  -- 会った相手
  person_id  UUID        NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  occasion   TEXT,
  met_on     DATE,
  location   TEXT,
  note       TEXT,
  tags       TEXT[]      NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT connections_not_self CHECK (owner_id <> person_id)
);

-- 同じ相手と複数回会うことはあるので UNIQUE にはしない
CREATE INDEX IF NOT EXISTS idx_connections_owner  ON public.connections(owner_id, met_on DESC);
CREATE INDEX IF NOT EXISTS idx_connections_person ON public.connections(person_id);

DROP TRIGGER IF EXISTS trg_connections_set_updated_at ON public.connections;
CREATE TRIGGER trg_connections_set_updated_at
  BEFORE UPDATE ON public.connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

-- 出会いのメモは本人だけのもの。相手にも他人にも見せない。
-- （相手側には「つながっている」事実だけが SNS の公開範囲判定として効く）
DROP POLICY IF EXISTS connections_own ON public.connections;
CREATE POLICY connections_own ON public.connections
  FOR ALL TO authenticated
  USING (owner_id = public.current_member_id())
  WITH CHECK (owner_id = public.current_member_id());

-- 会員ごとの自由タグ（まだ使っていないタグも残せるように）
CREATE TABLE IF NOT EXISTS public.connection_tags (
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  tag       TEXT NOT NULL CHECK (char_length(tag) BETWEEN 1 AND 30),
  PRIMARY KEY (member_id, tag)
);

ALTER TABLE public.connection_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS connection_tags_own ON public.connection_tags;
CREATE POLICY connection_tags_own ON public.connection_tags
  FOR ALL TO authenticated
  USING (member_id = public.current_member_id())
  WITH CHECK (member_id = public.current_member_id());

-- どちらかが記録していれば「つながっている」とみなす。
-- 片方だけが記録している状態は普通に起きるため、両方の記録は求めない。
CREATE OR REPLACE FUNCTION public.are_connected(p_a UUID, p_b UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.connections c
     WHERE (c.owner_id = p_a AND c.person_id = p_b)
        OR (c.owner_id = p_b AND c.person_id = p_a)
  );
$$;

REVOKE ALL ON FUNCTION public.are_connected(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.are_connected(UUID, UUID) TO authenticated;

-- 自分の出会い記録（相手の表示用の列を同梱して返す）
DROP FUNCTION IF EXISTS public.my_connections();
CREATE FUNCTION public.my_connections()
RETURNS TABLE (
  id                  UUID,
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
  SELECT
    c.id, p.id, p.name, p.job, p.avatar_path, p.is_withdrawn,
    c.occasion, c.met_on, c.location, c.note, c.tags, c.created_at
  FROM public.connections AS c
  JOIN public.members AS p ON p.id = c.person_id
  WHERE c.owner_id = public.current_member_id()
  ORDER BY c.met_on DESC NULLS LAST, c.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.my_connections() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_connections() TO authenticated;

-- 出会いを記録されたら相手にも知らせる（「○○さんと会いました」の相互確認になる）
CREATE OR REPLACE FUNCTION public.notify_connection_added()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_name TEXT;
BEGIN
  SELECT name INTO v_actor_name FROM public.members WHERE id = NEW.owner_id;

  PERFORM public.push_notification(
    NEW.person_id, NEW.owner_id, 'connection_new',
    COALESCE(v_actor_name, 'メンバー') || 'さんが出会いを記録しました',
    NEW.occasion, '/app/connections'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_connection_added ON public.connections;
CREATE TRIGGER trg_notify_connection_added
  AFTER INSERT ON public.connections
  FOR EACH ROW EXECUTE FUNCTION public.notify_connection_added();

-- ------------------------------------------------------------
-- SNSリンク
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.member_social_links (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id  UUID        NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  platform   TEXT        NOT NULL
                         CHECK (platform IN ('line','instagram','x','facebook','website','other')),
  label      TEXT,
  url        TEXT        NOT NULL CHECK (char_length(url) BETWEEN 1 AND 500),
  visibility TEXT        NOT NULL DEFAULT 'connections'
                         CHECK (visibility IN ('public','connections','private')),
  sort_order INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_member_social_links_member
  ON public.member_social_links(member_id, sort_order);

DROP TRIGGER IF EXISTS trg_member_social_links_set_updated_at ON public.member_social_links;
CREATE TRIGGER trg_member_social_links_set_updated_at
  BEFORE UPDATE ON public.member_social_links
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.member_social_links ENABLE ROW LEVEL SECURITY;

-- 🔴 テーブルを直接読ませない。読み取りは下の関数だけを通す。
--    RLSは行単位でしか守れず、「つながり済みのみ」の判定や開示申請の反映を
--    ポリシーで書くと URL が漏れる経路が増えるため。
DROP POLICY IF EXISTS member_social_links_own ON public.member_social_links;
CREATE POLICY member_social_links_own ON public.member_social_links
  FOR ALL TO authenticated
  USING (member_id = public.current_member_id())
  WITH CHECK (member_id = public.current_member_id());

-- ------------------------------------------------------------
-- 開示申請
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.disclosure_requests (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  from_member_id UUID        NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  to_member_id   UUID        NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  link_id        UUID        NOT NULL REFERENCES public.member_social_links(id) ON DELETE CASCADE,
  status         TEXT        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','approved','declined')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at   TIMESTAMPTZ,
  CONSTRAINT disclosure_not_self CHECK (from_member_id <> to_member_id),
  -- 同じ相手の同じリンクに対する申請は1件だけ（再申請は既存行を作り直す）
  CONSTRAINT disclosure_unique UNIQUE (from_member_id, link_id)
);

CREATE INDEX IF NOT EXISTS idx_disclosure_to   ON public.disclosure_requests(to_member_id, status);
CREATE INDEX IF NOT EXISTS idx_disclosure_from ON public.disclosure_requests(from_member_id, status);

ALTER TABLE public.disclosure_requests ENABLE ROW LEVEL SECURITY;

-- 自分が出した申請と、自分宛に来た申請だけが見える
DROP POLICY IF EXISTS disclosure_select_mine ON public.disclosure_requests;
CREATE POLICY disclosure_select_mine ON public.disclosure_requests
  FOR SELECT TO authenticated
  USING (
    from_member_id = public.current_member_id()
    OR to_member_id = public.current_member_id()
  );

-- 申請できるのは自分名義のみ。宛先とリンクの持ち主が一致していることも要求する。
DROP POLICY IF EXISTS disclosure_insert_own ON public.disclosure_requests;
CREATE POLICY disclosure_insert_own ON public.disclosure_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    from_member_id = public.current_member_id()
    AND status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.member_social_links l
       WHERE l.id = link_id
         AND l.member_id = to_member_id
         AND l.visibility = 'connections'
    )
  );

-- 承認・却下できるのは求められた本人だけ
DROP POLICY IF EXISTS disclosure_update_to ON public.disclosure_requests;
CREATE POLICY disclosure_update_to ON public.disclosure_requests
  FOR UPDATE TO authenticated
  USING (to_member_id = public.current_member_id())
  WITH CHECK (to_member_id = public.current_member_id());

-- 取り下げは申請者本人（保留中のみ）
DROP POLICY IF EXISTS disclosure_delete_from ON public.disclosure_requests;
CREATE POLICY disclosure_delete_from ON public.disclosure_requests
  FOR DELETE TO authenticated
  USING (from_member_id = public.current_member_id() AND status = 'pending');

-- 申請が来たら相手へ、承認されたら申請者へ通知する
CREATE OR REPLACE FUNCTION public.notify_disclosure()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_platform  TEXT;
  v_from_name TEXT;
  v_to_name   TEXT;
  v_label     TEXT;
BEGIN
  SELECT platform INTO v_platform FROM public.member_social_links WHERE id = NEW.link_id;
  v_label := CASE v_platform
    WHEN 'line' THEN 'LINE'
    WHEN 'instagram' THEN 'Instagram'
    WHEN 'x' THEN 'X'
    WHEN 'facebook' THEN 'Facebook'
    WHEN 'website' THEN 'ウェブサイト'
    ELSE 'リンク'
  END;

  SELECT name INTO v_from_name FROM public.members WHERE id = NEW.from_member_id;
  SELECT name INTO v_to_name   FROM public.members WHERE id = NEW.to_member_id;

  IF TG_OP = 'INSERT' THEN
    PERFORM public.push_notification(
      NEW.to_member_id, NEW.from_member_id, 'disclosure_request',
      COALESCE(v_from_name, 'メンバー') || 'さんが' || v_label || 'の開示を申請しました',
      '承認すると' || COALESCE(v_from_name, 'その方') || 'さんに表示されます。',
      '/app/requests'
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'approved' AND OLD.status <> 'approved' THEN
    PERFORM public.push_notification(
      NEW.from_member_id, NEW.to_member_id, 'disclosure_approved',
      COALESCE(v_to_name, 'メンバー') || 'さんが' || v_label || 'を開示しました',
      '承認されました。プロフィールから確認できます。',
      '/app/profile/' || NEW.to_member_id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_disclosure_insert ON public.disclosure_requests;
CREATE TRIGGER trg_notify_disclosure_insert
  AFTER INSERT ON public.disclosure_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_disclosure();

DROP TRIGGER IF EXISTS trg_notify_disclosure_update ON public.disclosure_requests;
CREATE TRIGGER trg_notify_disclosure_update
  AFTER UPDATE ON public.disclosure_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_disclosure();

-- ------------------------------------------------------------
-- 閲覧用：ある会員のSNSリンクを、見る人の権限に応じて返す
-- ------------------------------------------------------------
-- 🔴 見えないリンクの url は NULL にして返す。
--    「画面で隠す」のではなくAPIの戻り値に載せないことで、漏れる経路をなくす。
DROP FUNCTION IF EXISTS public.social_links_for(UUID);
CREATE FUNCTION public.social_links_for(p_owner_id UUID)
RETURNS TABLE (
  id                UUID,
  platform          TEXT,
  label             TEXT,
  url               TEXT,
  visibility        TEXT,
  is_owner          BOOLEAN,
  visible           BOOLEAN,
  disclosure_status TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH viewer AS (SELECT public.current_member_id() AS id),
  base AS (
    SELECT
      l.id,
      l.platform,
      l.label,
      l.url,
      l.visibility,
      (v.id = p_owner_id) AS is_owner,
      public.are_connected(v.id, p_owner_id) AS connected,
      (SELECT d.status FROM public.disclosure_requests d
        WHERE d.link_id = l.id AND d.from_member_id = v.id) AS disclosure_status
    FROM public.member_social_links AS l
    CROSS JOIN viewer AS v
    WHERE v.id IS NOT NULL
      AND l.member_id = p_owner_id
  )
  SELECT
    b.id,
    b.platform,
    b.label,
    -- 見える条件を満たさないときは URL 自体を返さない
    CASE
      WHEN b.is_owner THEN b.url
      WHEN b.visibility = 'public' THEN b.url
      WHEN b.visibility = 'connections'
           AND (b.connected OR b.disclosure_status = 'approved') THEN b.url
      ELSE NULL
    END,
    b.visibility,
    b.is_owner,
    (
      b.is_owner
      OR b.visibility = 'public'
      OR (b.visibility = 'connections' AND (b.connected OR b.disclosure_status = 'approved'))
    ),
    b.disclosure_status
  FROM base AS b
  -- 非公開は持ち主以外には存在ごと見せない
  WHERE b.is_owner OR b.visibility <> 'private'
  ORDER BY b.platform;
$$;

REVOKE ALL ON FUNCTION public.social_links_for(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.social_links_for(UUID) TO authenticated;

-- 開示申請の一覧（受信・送信の両方。相手の名前とリンク種別を同梱）
DROP FUNCTION IF EXISTS public.my_disclosure_requests();
CREATE FUNCTION public.my_disclosure_requests()
RETURNS TABLE (
  id             UUID,
  direction      TEXT,
  status         TEXT,
  platform       TEXT,
  link_label     TEXT,
  other_id       UUID,
  other_name     TEXT,
  other_job      TEXT,
  other_avatar   TEXT,
  created_at     TIMESTAMPTZ,
  responded_at   TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    d.id,
    CASE WHEN d.to_member_id = public.current_member_id() THEN 'incoming' ELSE 'outgoing' END,
    d.status,
    l.platform,
    l.label,
    o.id, o.name, o.job, o.avatar_path,
    d.created_at,
    d.responded_at
  FROM public.disclosure_requests AS d
  JOIN public.member_social_links AS l ON l.id = d.link_id
  JOIN public.members AS o
    ON o.id = CASE
                WHEN d.to_member_id = public.current_member_id() THEN d.from_member_id
                ELSE d.to_member_id
              END
  WHERE public.current_member_id() IS NOT NULL
    AND (d.from_member_id = public.current_member_id()
         OR d.to_member_id = public.current_member_id())
  ORDER BY d.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.my_disclosure_requests() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_disclosure_requests() TO authenticated;

COMMENT ON TABLE public.connections IS '出会い記録。本人のメモであり相手には見せない（つながっている事実だけがSNS公開範囲に効く）';
COMMENT ON TABLE public.member_social_links IS 'SNSリンク。閲覧は social_links_for() 経由のみ（見えない相手にはURLを返さない）';
COMMENT ON TABLE public.disclosure_requests IS 'SNS個別の開示申請。対象は「つながり済みのみ」公開のリンク';
