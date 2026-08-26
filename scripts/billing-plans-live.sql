-- ============================================================
-- 本番Stripeの価格IDを billing_plans に反映する（2026-08-26）
-- ============================================================
-- 依頼主（川原さん 2026-08-26）の料金確定:
--   ・年払いがベース。半年（6か月継続）は無し
--   ・過去の支払いの人はそのまま = 月1,650 / 月2,500 を維持（年払いは作らない）
--   ・新規は年33,000円。月払いを選ぶなら月3,000円（新規のみ）
--
-- ∴ 変わるのは新規向けの2つだけ:
--     yearly_30000  (年30,000) → yearly_33000  (年33,000)
--     monthly_2750  (月 2,750) → monthly_3000  (月 3,000)
--   既存会員の monthly_1650(405名) / monthly_2500(31名) は割当ごと据え置き。
--
-- 🔴 Stripe の Price は金額を後から変更できない（unit_amount は immutable）。
--    ∴ 「2,750を3,000に変更」という操作は存在せず、新しい Price を作って
--      古い方をアーカイブするしかない。下のIDはすべて本番モードで新規作成したもの。
--
-- 🔴 本番モードの価格ID。テストモードのIDで上書きしないこと。
--    （billing_plans は本番Supabaseにあり、ローカル開発もここを見ている）
--
-- 実行順: ① 確認 → ② 反映 → ③ 検算
-- ============================================================


-- ------------------------------------------------------------
-- ① 実行前の確認
-- ------------------------------------------------------------
SELECT code, label, amount, interval, stripe_price_id, is_active, sort_order
  FROM public.billing_plans
 ORDER BY sort_order;

-- 各プランに何人ぶら下がっているか
SELECT COALESCE(billing_plan_code, '(未割当)') AS plan, billing_exempt AS 免除, COUNT(*)
  FROM public.members
 WHERE is_withdrawn = FALSE
 GROUP BY 1, 2
 ORDER BY 3 DESC;


-- ------------------------------------------------------------
-- ② 反映
-- ------------------------------------------------------------

-- 据え置きの2つ（金額・割当は変えない。本番の価格IDを入れるだけ）
UPDATE public.billing_plans
   SET stripe_price_id = 'price_1U8TwmJGmI7EGdy14aAmm5ae'
 WHERE code = 'monthly_1650';

UPDATE public.billing_plans
   SET stripe_price_id = 'price_1U8TxAJGmI7EGdy1gPkFucJB'
 WHERE code = 'monthly_2500';

-- 新規向けの2つ（新設）
INSERT INTO public.billing_plans (code, label, amount, interval, sort_order, note, stripe_price_id, is_active)
VALUES
  ('yearly_33000', '年額 33,000円', 33000, 'year',  10,
   '新規の標準。1年契約',
   'price_1U8TvwJGmI7EGdy1ho236Yx4', TRUE),
  ('monthly_3000', '月額 3,000円',   3000, 'month', 20,
   '新規で月払いを選ぶ場合',
   'price_1U8TwPJGmI7EGdy1zrwtUZ5U', TRUE)
ON CONFLICT (code) DO UPDATE
   SET label           = EXCLUDED.label,
       amount          = EXCLUDED.amount,
       interval        = EXCLUDED.interval,
       sort_order      = EXCLUDED.sort_order,
       note            = EXCLUDED.note,
       stripe_price_id = EXCLUDED.stripe_price_id,
       is_active       = TRUE;

-- 旧・新規向けの2つを無効化（割当0名なので誰にも影響しない）
-- 🔴 削除ではなく無効化。過去にこのコードを参照した記録が残っているため。
UPDATE public.billing_plans
   SET is_active = FALSE,
       note      = note || '（2026-08-26 廃止。年33,000／月3,000へ）'
 WHERE code IN ('yearly_30000', 'monthly_2750');

-- monthly_2750 が割り当たっている3名を新しい年額へ寄せる
-- 🔴 この3名は新規会員。年払いがベースなので yearly_33000 にする。
--    月払い希望と分かっている人がいれば、あとで管理画面から monthly_3000 に変更する。
UPDATE public.members
   SET billing_plan_code = 'yearly_33000'
 WHERE billing_plan_code = 'monthly_2750'
   AND is_withdrawn = FALSE;


-- ------------------------------------------------------------
-- ③ 検算
-- ------------------------------------------------------------
-- 有効なプランが4つ（yearly_33000 / monthly_3000 / monthly_1650 / monthly_2500）で、
-- すべてに本番の価格IDが入っていること。
SELECT code, label, amount, interval, stripe_price_id, is_active
  FROM public.billing_plans
 ORDER BY is_active DESC, sort_order;

-- 割当は monthly_1650=405 / monthly_2500=31 / yearly_33000=3 / 免除2 になるはず。
-- monthly_2750 が0件になっていること。
SELECT COALESCE(billing_plan_code, '(未割当)') AS plan, billing_exempt AS 免除, COUNT(*)
  FROM public.members
 WHERE is_withdrawn = FALSE
 GROUP BY 1, 2
 ORDER BY 3 DESC;
