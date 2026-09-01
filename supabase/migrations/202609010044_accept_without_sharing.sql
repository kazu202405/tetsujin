-- ============================================================
-- 受けても何も見せていないときに「教えてくれました」と言わない
-- ============================================================
-- 前提：202608310037_rename_to_contact_disclosure.sql 適用済み。
--
-- ------------------------------------------------------------
-- 🔴 承認画面の「教えずに受ける」が嘘の通知を出していた
-- ------------------------------------------------------------
-- 連絡先を1つも選ばずに受けると、申請した人には
-- 「◯◯さんが連絡先を教えてくれました／プロフィールから確認できます」
-- が届く。見に行っても何も無い。
--
-- 「受けるが何も見せない」自体は要る（教えられる連絡先が無い人、
-- すでに全部公開している人がいる）。無くすのではなく、
-- 実際に見せた件数で文面を分ける。
--
-- 🔴 複製元は最後にこの関数を定義した 202608310037。
--    手で書き直すと、対象を「自分のリンク」「visibility='approved'」に
--    絞る条件や、期限切れの判定を落とす。
-- ============================================================

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
  v_req    public.connection_requests%ROWTYPE;
  v_name   TEXT;
  v_shared INTEGER := 0;
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

    -- 実際に何件見せたか。0件なら「教えてくれました」とは言えない。
    GET DIAGNOSTICS v_shared = ROW_COUNT;
  END IF;

  SELECT name INTO v_name FROM public.members WHERE id = v_me;

  -- 🔴 断ったことは申請者に伝えるが、通知の文面では理由を出さない。
  --    「今は必要ない」がそのまま届くと角が立つ。画面で本人が開いたときだけ見せる。
  INSERT INTO public.notifications (recipient_id, actor_id, type, title, message, href)
  VALUES (
    v_req.from_member_id, v_me,
    CASE WHEN p_accept THEN 'connection_accepted' ELSE 'connection_declined' END,
    -- 🔴 受けても何も見せていないことがある（教えられる連絡先が無い、
    --    全部すでに公開している、あえて教えない）。それを「教えてくれました」
    --    と伝えると、探しに行っても何も無くて嘘になる。実際の件数で分ける。
    CASE
      WHEN p_accept AND v_shared > 0 THEN v_name || 'さんが連絡先を教えてくれました'
      WHEN p_accept                  THEN v_name || 'さんが申請を受けてくれました'
      ELSE v_name || 'さんからお返事が届きました'
    END,
    CASE
      WHEN p_accept AND v_shared > 0
        THEN '相手のプロフィールの「SNS・リンク」から確認できます。'
      WHEN p_accept
        THEN '今回は連絡先の共有はありませんでした。公開されている連絡先があれば、プロフィールからご覧いただけます。'
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
