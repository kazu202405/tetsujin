-- ============================================================
-- つながり申請（目的を伝えて、相手が選ぶ）
-- ============================================================
-- 前提：202608190025_matching.sql / 202608200027_matching_engine.sql 適用済み。
--
-- 方針書6番「営業は禁止しない。ただし押し売りは禁止」の実装。
-- 「目的を隠した接触の禁止」は規約に書いても守られないが、
-- 目的欄を必須にすれば隠すこと自体が構造的にできなくなる。
--
-- 依頼主決定（2026-08-19）：
--   ・申請＝目的を選択＋自由入力
--   ・返答＝受ける／今は必要ない／タイミングではない ＋自由入力
--   ・やりとりは一往復まで。YESなら既存のLINEなどで直接続ける
--   ・1週間反応が無ければ自動で消える
--
-- ------------------------------------------------------------
-- 🔴 なぜ1週間で消すのか
-- ------------------------------------------------------------
-- 断られたのか、見ていないのかを曖昧にするため（依頼主の意図）。
-- 「既読無視されている」が見えると、申請した側も受けた側も気まずい。
-- 期限が来たら申請そのものが取り下げられた形にして、どちらの顔も立てる。
--
-- ∴ 期限切れは「読むときに判定する」。定期実行に頼ると、
--    cronが止まった日から全員が気まずい状態に置かれる。
--    行の status は pending のままでも、画面には出さない。
-- ============================================================

CREATE TABLE IF NOT EXISTS public.connection_requests (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  from_member_id UUID        NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  to_member_id   UUID        NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,

  -- ① つながりたい目的（matching_options の purpose）。1つ以上必須。
  purposes       TEXT[]      NOT NULL DEFAULT '{}',
  -- 「なぜつながりたいか」
  message        TEXT        CHECK (message IS NULL OR char_length(message) <= 1000),

  status         TEXT        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','accepted','declined')),
  -- 断り方。柔らかい言い方を選べるようにする（理由を書かせない）
  decline_reason TEXT        CHECK (decline_reason IS NULL OR decline_reason IN ('not_now','timing','other')),
  reply_message  TEXT        CHECK (reply_message IS NULL OR char_length(reply_message) <= 1000),

  -- ここを過ぎた pending は画面に出さない（＝取り下げ扱い）
  expires_at     TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at   TIMESTAMPTZ,

  CONSTRAINT connection_request_not_self CHECK (from_member_id <> to_member_id),
  CONSTRAINT connection_request_has_purpose CHECK (COALESCE(array_length(purposes, 1), 0) > 0)
);

CREATE INDEX IF NOT EXISTS idx_connection_requests_to
  ON public.connection_requests (to_member_id, status);
CREATE INDEX IF NOT EXISTS idx_connection_requests_from
  ON public.connection_requests (from_member_id, status);

-- 同じ相手に生きた申請が2件あるとどちらに返せばいいか分からない。
-- 期限切れ・返答済みは残す（履歴と、再申請のクールダウン判定に使う）。
CREATE UNIQUE INDEX IF NOT EXISTS idx_connection_requests_one_pending
  ON public.connection_requests (from_member_id, to_member_id)
  WHERE status = 'pending';

ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;

-- 当事者と運営だけが見られる
DROP POLICY IF EXISTS connection_requests_select ON public.connection_requests;
CREATE POLICY connection_requests_select ON public.connection_requests
  FOR SELECT TO authenticated
  USING (
    from_member_id = public.current_member_id()
    OR to_member_id = public.current_member_id()
    OR public.is_admin()
  );

-- 🔴 書き込みポリシーは作らない。作成も返答も下のRPC経由にする。
--    直接INSERTできると、目的を空にしたり、他人になりすまして
--    申請を作れてしまう（from_member_id を詐称できる）。

-- ------------------------------------------------------------
-- 申請を出す
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.send_connection_request(
  p_to       UUID,
  p_purposes TEXT[],
  p_message  TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_me       UUID := public.current_member_id();
  v_id       UUID;
  v_name     TEXT;
  v_is_sales BOOLEAN;
  v_last     TIMESTAMPTZ;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'ログインが必要です' USING ERRCODE = '42501';
  END IF;
  IF p_to = v_me THEN
    RAISE EXCEPTION '自分には申請できません' USING ERRCODE = '22023';
  END IF;
  IF COALESCE(array_length(p_purposes, 1), 0) = 0 THEN
    RAISE EXCEPTION 'つながりたい目的を選んでください' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.members WHERE id = p_to AND is_withdrawn = FALSE) THEN
    RAISE EXCEPTION 'この方には申請できません' USING ERRCODE = 'P0002';
  END IF;

  -- 生きている申請があるなら二重に出させない
  IF EXISTS (
    SELECT 1 FROM public.connection_requests
     WHERE from_member_id = v_me AND to_member_id = p_to
       AND status = 'pending' AND expires_at > NOW()
  ) THEN
    RAISE EXCEPTION 'すでに申請中です' USING ERRCODE = '23505';
  END IF;

  -- 🔴 断られた直後の再申請を止める（方針書の「断られたら追わない」）。
  --    止めないと、この機能が一方的な営業の道具になる。
  SELECT MAX(responded_at) INTO v_last
    FROM public.connection_requests
   WHERE from_member_id = v_me AND to_member_id = p_to AND status = 'declined';

  IF v_last IS NOT NULL AND v_last > NOW() - INTERVAL '90 days' THEN
    RAISE EXCEPTION 'この方には、しばらく経ってからもう一度お試しください' USING ERRCODE = '22023';
  END IF;

  -- 期限切れの pending が残っていると一意制約に当たるので畳んでおく
  UPDATE public.connection_requests
     SET status = 'declined', responded_at = COALESCE(responded_at, expires_at)
   WHERE from_member_id = v_me AND to_member_id = p_to
     AND status = 'pending' AND expires_at <= NOW();

  INSERT INTO public.connection_requests (from_member_id, to_member_id, purposes, message)
  VALUES (v_me, p_to, p_purposes, NULLIF(TRIM(COALESCE(p_message, '')), ''))
  RETURNING id INTO v_id;

  SELECT name INTO v_name FROM public.members WHERE id = v_me;

  -- 営業目的が含まれるなら、お知らせの時点で伝える（方針書6番）
  SELECT EXISTS (
    SELECT 1 FROM public.matching_options
     WHERE category = 'purpose' AND is_sales AND code = ANY(p_purposes)
  ) INTO v_is_sales;

  INSERT INTO public.notifications (recipient_id, actor_id, type, title, message, href)
  VALUES (
    p_to, v_me, 'connection_request',
    v_name || 'さんからつながりの申請が届いています',
    CASE WHEN v_is_sales
      THEN '商品・サービスのご提案が目的に含まれています。内容を見て決めてください。'
      ELSE '内容を見て、つながるかどうかを選べます。'
    END,
    '/app/requests'
  );

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.send_connection_request(UUID, TEXT[], TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_connection_request(UUID, TEXT[], TEXT) TO authenticated;

-- ------------------------------------------------------------
-- 申請に返答する（一往復まで＝ここで終わり）
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.respond_connection_request(
  p_id      UUID,
  p_accept  BOOLEAN,
  p_reason  TEXT DEFAULT NULL,
  p_message TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_me   UUID := public.current_member_id();
  v_req  public.connection_requests%ROWTYPE;
  v_name TEXT;
BEGIN
  SELECT * INTO v_req FROM public.connection_requests WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION '申請が見つかりません' USING ERRCODE = 'P0002';
  END IF;
  IF v_req.to_member_id <> v_me THEN
    RAISE EXCEPTION 'この申請には返答できません' USING ERRCODE = '42501';
  END IF;
  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'この申請はすでに返答済みです' USING ERRCODE = '23505';
  END IF;
  -- 期限切れに返答させない（申請した側にはもう見えていないため）
  IF v_req.expires_at <= NOW() THEN
    RAISE EXCEPTION 'この申請は期限が過ぎています' USING ERRCODE = '22023';
  END IF;

  UPDATE public.connection_requests
     SET status         = CASE WHEN p_accept THEN 'accepted' ELSE 'declined' END,
         decline_reason = CASE WHEN p_accept THEN NULL ELSE COALESCE(p_reason, 'other') END,
         reply_message  = NULLIF(TRIM(COALESCE(p_message, '')), ''),
         responded_at   = NOW()
   WHERE id = p_id;

  -- ------------------------------------------------------------
  -- 承諾＝連絡先を見せてよい（依頼主決定 2026-08-19）
  -- ------------------------------------------------------------
  -- 承諾したのに「LINEはもう一度申請してください」では、
  -- つながった意味が薄い。∴ 承諾で開示まで済ませる。
  --
  -- 🔴 ただし visibility='private' は開示しない。
  --    本人が「誰にも見せない」と決めたものを、
  --    つながりの承諾で覆してよい理由が無い。
  --    'public' はもともと見えているので何もしなくてよい。
  --    ∴ 対象は 'connections'（つながり済みのみ）だけ。
  --
  -- 両方向に開示する。申請した側は申請を出した時点で、
  -- 受けた側は承諾した時点で、つながる意思を示しているため。
  IF p_accept THEN
    INSERT INTO public.disclosure_requests (from_member_id, to_member_id, link_id, status, responded_at)
    SELECT v_req.from_member_id, v_req.to_member_id, l.id, 'approved', NOW()
      FROM public.member_social_links AS l
     WHERE l.member_id = v_req.to_member_id AND l.visibility = 'connections'
    ON CONFLICT (from_member_id, link_id) DO UPDATE
      SET status = 'approved', responded_at = NOW();

    INSERT INTO public.disclosure_requests (from_member_id, to_member_id, link_id, status, responded_at)
    SELECT v_req.to_member_id, v_req.from_member_id, l.id, 'approved', NOW()
      FROM public.member_social_links AS l
     WHERE l.member_id = v_req.from_member_id AND l.visibility = 'connections'
    ON CONFLICT (from_member_id, link_id) DO UPDATE
      SET status = 'approved', responded_at = NOW();
  END IF;

  SELECT name INTO v_name FROM public.members WHERE id = v_me;

  -- 🔴 断ったことは申請者に伝えるが、通知の文面では理由を出さない。
  --    「今は必要ない」がそのまま届くと角が立つ。画面で本人が開いたときだけ見せる。
  INSERT INTO public.notifications (recipient_id, actor_id, type, title, message, href)
  VALUES (
    v_req.from_member_id, v_me,
    CASE WHEN p_accept THEN 'connection_accepted' ELSE 'connection_declined' END,
    CASE WHEN p_accept
      THEN v_name || 'さんとつながりました'
      ELSE v_name || 'さんからお返事が届きました'
    END,
    CASE WHEN p_accept
      THEN 'プロフィールから連絡先をご確認ください。'
      ELSE NULL
    END,
    '/app/requests'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.respond_connection_request(UUID, BOOLEAN, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_connection_request(UUID, BOOLEAN, TEXT, TEXT) TO authenticated;

-- ------------------------------------------------------------
-- 自分の申請（送った分・受けた分）
-- ------------------------------------------------------------
-- 🔴 期限切れの扱いがここの肝。
--    受けた側 … 期限切れは出さない（もう返答できない）
--    送った側 … 「一定期間が過ぎたため取り下げました」と出す
--               断られたのか見られていないのかは分からないままにする
CREATE OR REPLACE FUNCTION public.my_connection_requests()
RETURNS TABLE (
  id             UUID,
  direction      TEXT,     -- 'sent' | 'received'
  other_id       UUID,
  other_name     TEXT,
  other_job      TEXT,
  other_avatar   TEXT,
  purposes       TEXT[],
  message        TEXT,
  status         TEXT,     -- pending / accepted / declined / expired（送った側のみ）
  decline_reason TEXT,
  reply_message  TEXT,
  is_sales       BOOLEAN,
  created_at     TIMESTAMPTZ,
  responded_at   TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH me AS (SELECT public.current_member_id() AS id)
  SELECT
    r.id,
    CASE WHEN r.from_member_id = me.id THEN 'sent' ELSE 'received' END,
    other.id, other.name, other.job, other.avatar_path,
    r.purposes,
    r.message,
    CASE
      WHEN r.status = 'pending' AND r.expires_at <= NOW() THEN 'expired'
      ELSE r.status
    END,
    -- 断った理由は申請者にも見せる（柔らかい言い方を選んでもらっているため）
    r.decline_reason,
    r.reply_message,
    EXISTS (
      SELECT 1 FROM public.matching_options AS o
       WHERE o.category = 'purpose' AND o.is_sales AND o.code = ANY(r.purposes)
    ),
    r.created_at,
    r.responded_at
  FROM public.connection_requests AS r
  CROSS JOIN me
  JOIN public.members AS other
    ON other.id = CASE WHEN r.from_member_id = me.id THEN r.to_member_id ELSE r.from_member_id END
  WHERE (r.from_member_id = me.id OR r.to_member_id = me.id)
    -- 受けた側は期限切れを出さない（返答できないものを見せても気まずいだけ）
    AND NOT (r.to_member_id = me.id AND r.status = 'pending' AND r.expires_at <= NOW())
  ORDER BY r.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.my_connection_requests() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_connection_requests() TO authenticated;

-- ------------------------------------------------------------
-- お知らせの種類を追加
-- ------------------------------------------------------------
-- 🔴 画面側の対応表にも必ず足すこと。
--    0012 で weekly_digest を足したとき画面を直し忘れ、
--    受け取った人だけお知らせ一覧が真っ白に落ちた。
--    いまは知らない種類でも既定アイコンで出る作りにしてあるが、
--    ラベルが「お知らせ」のままだと何の通知か伝わらない。
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
    'connection_declined'
  ));
