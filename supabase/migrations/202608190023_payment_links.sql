-- ============================================================
-- 継続会員の更新を「支払いリンク」で受ける
-- ============================================================
-- 前提：202608080018_billing.sql / 202608170022_billing_exempt.sql 適用済み。
--
-- 運用（依頼主決定 2026-08-19）：
--   ・新規会員 … アプリ内の決済（/api/stripe/checkout）
--   ・継続会員 … 期限が来たら運営が金額に合った支払いリンクを送る
--                → 支払われたらそのまま自動更新に乗る
--
-- ------------------------------------------------------------
-- 🔴 なぜ列を足すのか
-- ------------------------------------------------------------
-- 支払いリンクは Stripe 側で「新しい匿名の顧客」を作る。
-- webhook の会員特定は ①サブスクの metadata.member_id
-- ②members.stripe_customer_id の2段だが、支払いリンク経由では
-- どちらにも当たらない ＝ 決済は成立するのにアプリには何も残らない。
--
-- ∴ URL に `?client_reference_id=<会員のID>` を付けて送る。
--    Stripe がその値を checkout.session.completed に載せて返すので、
--    そこで会員を特定できる。
--
-- 運営が会員のUUIDを手で調べるのは無理なので、リンクの土台を
-- ここに持ち、管理画面が会員ごとのURLを組み立てて渡す。
--
-- 価格IDと同じく「プラン1つにつき1本」。本番へ移すときは
-- 本番モードで作り直したリンクに差し替える（テスト用は buy.stripe.com/test_… ）。
-- ============================================================

ALTER TABLE public.billing_plans
  ADD COLUMN IF NOT EXISTS stripe_payment_link_url TEXT;

COMMENT ON COLUMN public.billing_plans.stripe_payment_link_url IS
  '継続会員へ送る支払いリンク。使うときは ?client_reference_id=<members.id> を付ける。'
  '付けないと誰の支払いか特定できず、契約テーブルに何も入らない。';

-- ------------------------------------------------------------
-- 二重契約の警告を運営へ送れるようにする
-- ------------------------------------------------------------
-- 🔴 支払いリンクにはアプリ内決済のような「すでに契約がある人を弾く」
--    門番がいない。会員が2回押すと Stripe に契約が2本でき、
--    二重に引き落とされる。リンクはLINE等で転送されるので実際に起こりうる。
--
-- 完全には防げないので、起きたことを運営が必ず気づけるようにする。
-- （契約テーブルは member_id が主キーなので2本目が1本目を上書きし、
--   放っておくと1本目の存在ごと見えなくなる）
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
    'billing_alert'
  ));

-- notification_allowed() は未知の種類を ELSE TRUE で通すので、
-- billing_alert は会員の通知設定に関係なく必ず届く（運営への警告のため）。

-- ------------------------------------------------------------
-- 運営全員へ会費の警告を送る
-- ------------------------------------------------------------
-- webhook（service_role）から呼ぶ。宛先は owner と admin の両方。
-- 🔴 role を直接見る場所を増やすと段を増やしたときに漏れるので、
--    ここでも is_admin() と同じ範囲（owner, admin）を明示して揃える。
CREATE OR REPLACE FUNCTION public.notify_admins_billing(
  p_title   TEXT,
  p_message TEXT,
  p_href    TEXT DEFAULT '/app/admin'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin UUID;
  v_count INTEGER := 0;
BEGIN
  FOR v_admin IN
    SELECT id FROM public.members
     WHERE role IN ('owner', 'admin')
       AND is_withdrawn = FALSE
  LOOP
    INSERT INTO public.notifications (recipient_id, type, title, message, href)
    VALUES (v_admin, 'billing_alert', p_title, p_message, p_href);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_admins_billing(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
