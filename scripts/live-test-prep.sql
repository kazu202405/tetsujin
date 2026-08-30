-- ============================================================
-- 本番¥50決済テストの前準備と後始末
-- ============================================================
-- 五島さん（global.information.academy@gmail.com）のアカウントで
-- 本番の実カード決済を1件通し、鍵・Webhook・入金先が繋がっているかを確認する。
--
-- 🔴 なぜ準備が要るか
--   1. 五島さんは billing_exempt = TRUE（会費免除）。
--      /api/stripe/checkout は免除者を 409 で断るので、そのままでは決済に進めない。
--   2. billing_starts_on に未来日が入っていると Stripe の trial_end に渡され、
--      **今日は ¥0 で決済が通る**。契約行は active で入るため画面上は成功に見えるが、
--      課金も入金も発生しておらず、本番口座の疎通確認になっていない。
--      ＝「成功したように見えて何も確かめられていない」状態になる。
--
-- 手順: ① 現状を控える → ② 準備 → ③ 画面から¥50を決済 → ④ 確認 → ⑤ 後始末
-- ============================================================


-- ------------------------------------------------------------
-- ① 現状を控える（後で元に戻すため。結果をメモしておくこと）
-- ------------------------------------------------------------
SELECT id, name, email, billing_exempt, billing_plan_code, billing_starts_on, stripe_customer_id
  FROM public.members
 WHERE email = 'global.information.academy@gmail.com';


-- ------------------------------------------------------------
-- ② 準備：免除を外し、課金開始日を空にし、検証用プランに寄せる
-- ------------------------------------------------------------
-- 🔴 billing_plans の monthly_3000 の価格IDを、一時的に¥50のものへ差し替える。
--    Stripe の Price は金額を変更できないので、テストするにはこの方法しかない。
--    monthly_3000 の割当は現在0名なので、誰の請求にも影響しない。
--    （405名の monthly_1650 や 31名の monthly_2500 は絶対に触らないこと）
UPDATE public.billing_plans
   SET stripe_price_id = 'price_1U8TxXJGmI7EGdy1w2pd2evJ'   -- 検証用 ¥50
 WHERE code = 'monthly_3000';

UPDATE public.members
   SET billing_exempt     = FALSE,
       billing_starts_on  = NULL,      -- 未来日だと¥0で通ってしまう
       billing_plan_code  = 'monthly_3000'
 WHERE email = 'global.information.academy@gmail.com';

-- 確認
SELECT m.email, m.billing_exempt, m.billing_plan_code, m.billing_starts_on,
       p.amount, p.stripe_price_id
  FROM public.members m
  JOIN public.billing_plans p ON p.code = m.billing_plan_code
 WHERE m.email = 'global.information.academy@gmail.com';
-- amount が 3000 と出るが、実際に請求されるのは stripe_price_id の ¥50。
-- （amount は表示用の値で、課金額は Stripe 側の Price が決める）


-- ------------------------------------------------------------
-- ③ ここでアプリの設定画面から実際に決済する
-- ------------------------------------------------------------
-- https://tetsujin.vercel.app/app/settings → 会費 → お支払いの登録
-- 実物のカードで ¥50 を支払う。


-- ------------------------------------------------------------
-- ④ 確認：Webhookが届いて契約行が入ったか
-- ------------------------------------------------------------
SELECT s.status, s.stripe_subscription_id, s.stripe_customer_id,
       s.price_id, s.current_period_end, s.cancel_at_period_end
  FROM public.member_subscriptions s
  JOIN public.members m ON m.id = s.member_id
 WHERE m.email = 'global.information.academy@gmail.com';
-- status = 'active' で、price_id が ¥50 のものなら成功。
-- 行が入らない場合は Webhook が届いていない（whsec_ かURLを疑う）。

-- 解約方向も確認する場合:
--   Stripeのダッシュボードでこのサブスクリプションを解約する
--   → 上のクエリで status が 'canceled' に変わることを確認
--   → 管理画面に「◯◯さんが会費のお支払いを解約しました」の通知が出ることを確認


-- ------------------------------------------------------------
-- ⑤ 後始末（🔴 必ず全部やる）
-- ------------------------------------------------------------
-- Stripe側で先に: サブスクリプションを解約 → ¥50を返金 → ¥50の商品をアーカイブ

-- 価格IDを本物（月3,000円）へ戻す
UPDATE public.billing_plans
   SET stripe_price_id = 'price_1U8TwPJGmI7EGdy1zrwtUZ5U'   -- 月3,000円
 WHERE code = 'monthly_3000';

-- テストで付いた契約行を消す
DELETE FROM public.member_subscriptions
 WHERE member_id = (SELECT id FROM public.members
                     WHERE email = 'global.information.academy@gmail.com');

-- 五島さんを元の状態に戻す
-- 🔴 ①で実際に控えた値（2026-08-28 時点）:
--      billing_exempt = true / billing_plan_code = null
--      billing_starts_on = '2027-02-01' / stripe_customer_id = null
--    billing_starts_on を NULL のままにしないこと。元は未来日が入っていた。
--    （免除者なので実害は出にくいが、テスト前後で状態が変わったまま残るのは避ける）
-- 🔴 stripe_customer_id を消さないと、次に本番で決済しようとしたとき
--    「No such customer」で決済画面が開かない事故につながる
UPDATE public.members
   SET billing_exempt      = TRUE,
       billing_plan_code   = NULL,
       billing_starts_on   = DATE '2027-02-01',
       stripe_customer_id  = NULL
 WHERE email = 'global.information.academy@gmail.com';

-- 最終確認：戻っているか、他の会員に影響が出ていないか
SELECT code, amount, stripe_price_id, is_active FROM public.billing_plans ORDER BY sort_order;

SELECT COALESCE(billing_plan_code, '(未割当)') AS plan, billing_exempt AS 免除, COUNT(*)
  FROM public.members WHERE is_withdrawn = FALSE GROUP BY 1, 2 ORDER BY 3 DESC;
-- monthly_1650:405 / monthly_2500:31 / yearly_33000:3 / 未割当かつ免除:2 に戻っていること
