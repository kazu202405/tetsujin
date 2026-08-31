-- ============================================================
-- 「つながる」ではなく「連絡先を教えてもらう」に言い換える
-- ============================================================
-- 前提：202608200028_connection_requests.sql
--       202608300030_sns_disclosure_by_approval.sql 適用済み。
--
-- ------------------------------------------------------------
-- 🔴 なぜ言い換えるか（2026-08-31 依頼主判断）
-- ------------------------------------------------------------
-- 「アプリの中だけのつながり」には意味が無い。実際、8/30に
-- are_connected() を消して以来、この申請が本当にやっているのは
-- 「自分のSNSのどれを、この人に教えるか」を決めることだけになった。
--
-- ところが文言が「つながり申請」「つながりました」のままで、
-- 承認した人は何が起きたのか分からない。仕組みは直したのに
-- 言葉が古いまま残っていて、そこだけが意図とずれていた。
--
-- 動きは何も変えない。文言だけを実態に合わせる。
-- （テーブル名・関数名・通知の type は変えない。中身が同じものの
--   名前を変えると、過去の通知や参照が指す先が分からなくなるため）
-- ============================================================

-- ------------------------------------------------------------
-- 申請が届いたときの通知
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
    v_name || 'さんが連絡先を知りたがっています',
    CASE WHEN v_is_sales
      THEN '商品・サービスのご提案が目的に含まれています。内容を見て決めてください。'
      ELSE '内容を見て、どの連絡先を教えるか選べます。教えないという返事もできます。'
    END,
    '/app/requests'
  );

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.send_connection_request(UUID, TEXT[], TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_connection_request(UUID, TEXT[], TEXT) TO authenticated;

-- ------------------------------------------------------------
-- 承認・見送りの返事の通知
-- ------------------------------------------------------------
-- 「つながりました」では何が起きたのか伝わらない。
-- 実際に起きたのは「相手が連絡先を教えてくれた」なので、そう書く。
-- 引数も中身も 202608300030 のまま。文言だけ差し替える。
CREATE OR REPLACE FUNCTION public.respond_connection_request(
  p_id       UUID,
  p_accept   BOOLEAN,
  p_reason   TEXT   DEFAULT NULL,
  p_message  TEXT   DEFAULT NULL,
  p_link_ids UUID[] DEFAULT '{}'
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
  -- 承諾＝選んだ連絡先だけを、申請してきた相手に見せる
  -- ------------------------------------------------------------
  -- 🔴 対象を必ず「自分のリンク」「visibility='approved'」に絞る。
  --    ここを絞らないと、他人のリンクIDを混ぜて送れば
  --    その人の連絡先を勝手に開けられる（引数は会員が送ってくる値）。
  --    'public' はもともと見えており、'private' は誰にも見せないと
  --    決めたものなので、どちらもここでは触らない。
  --
  -- 相手のリンクには一切触らない＝開示は一方向。
  -- 申請した側の連絡先を渡すかどうかは、その人が自分で決める。
  IF p_accept AND COALESCE(array_length(p_link_ids, 1), 0) > 0 THEN
    INSERT INTO public.disclosure_requests (from_member_id, to_member_id, link_id, status, responded_at)
    SELECT v_req.from_member_id, v_me, l.id, 'approved', NOW()
      FROM public.member_social_links AS l
     WHERE l.member_id = v_me
       AND l.visibility = 'approved'
       AND l.id = ANY (p_link_ids)
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
      THEN v_name || 'さんが連絡先を教えてくれました'
      ELSE v_name || 'さんからお返事が届きました'
    END,
    CASE WHEN p_accept
      THEN '相手のプロフィールの「SNS・リンク」から確認できます。'
      ELSE NULL
    END,
    '/app/requests'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.respond_connection_request(UUID, BOOLEAN, TEXT, TEXT, UUID[])
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_connection_request(UUID, BOOLEAN, TEXT, TEXT, UUID[])
  TO authenticated;
