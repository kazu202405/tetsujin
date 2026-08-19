-- ============================================================
-- 会費プランの並び順をそろえる
-- ============================================================
-- 0018 の並びは「新規の標準を先頭」にしていたが、金額が
-- 2,750 → 30,000 → 1,650 → 2,500 と飛んで読みにくかった（依頼主指摘）。
--
-- 月額を安い順に並べ、最後に年額を置く。
-- 管理画面のプラン設定と、会員詳細の会費プラン選択の両方がこの順で出る。
--
-- ※ 本番DBには 2026-08-19 に直接反映済み。
--   このファイルは migration から作り直したときに同じ並びになるようにするためのもの。
--   何度実行しても同じ結果になる。
-- ============================================================

UPDATE public.billing_plans SET sort_order = 10 WHERE code = 'monthly_1650';
UPDATE public.billing_plans SET sort_order = 20 WHERE code = 'monthly_2500';
UPDATE public.billing_plans SET sort_order = 30 WHERE code = 'monthly_2750';
UPDATE public.billing_plans SET sort_order = 40 WHERE code = 'yearly_30000';
