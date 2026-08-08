-- ============================================================
-- 会費の決済（Stripe）
-- ============================================================
-- 方針（依頼主決定 2026-08-08）：
--   ・これからは自動更新（サブスク）
--   ・新規会員は登録時から課金を開始
--   ・既存会員は「次の更新日」から課金を開始する
--     （いま年払い済みなので、その期間が終わるまでは請求しない）
--
-- 料金は月額1,650 / 2,500 / 2,750 と 年額30,000 の4本立て。
-- ∴ 価格を環境変数に2つ持つ形では足りないので、プランを表で持つ。
--   運営が会員ごとにプランを選べるようにするため（台帳は会員種別が
--   85%未登録で、種別から機械的に決められない）。
--
-- 🔴 決済の状態は Stripe が正本。ここに持つのは写しであり、
--    Webhook で受け取った内容をそのまま書くだけにする。
--    アプリ側で状態を作ると、Stripeと食い違ったときに
--    「払ったのに入れない／払っていないのに入れる」が起きる。
-- ============================================================

-- ------------------------------------------------------------
-- 料金プラン
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.billing_plans (
  code            TEXT        PRIMARY KEY,
  label           TEXT        NOT NULL,
  -- 表示用の金額（円）。請求の正本は Stripe 側の価格。
  amount          INTEGER     NOT NULL CHECK (amount > 0),
  -- 'month' | 'year'
  interval        TEXT        NOT NULL CHECK (interval IN ('month', 'year')),
  -- Stripe で価格を作ってから入れる。入るまでこのプランは選べない。
  stripe_price_id TEXT        UNIQUE,
  note            TEXT,
  sort_order      INTEGER     NOT NULL DEFAULT 0,
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_billing_plans_set_updated_at ON public.billing_plans;
CREATE TRIGGER trg_billing_plans_set_updated_at
  BEFORE UPDATE ON public.billing_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 金額だけ先に入れておく。label は依頼主に確認して直す。
-- stripe_price_id は Stripe で価格を作ってから入れる。
INSERT INTO public.billing_plans (code, label, amount, interval, sort_order, note)
VALUES
  ('monthly_1650', '月額 1,650円', 1650, 'month', 10, '対象は要確認'),
  ('monthly_2500', '月額 2,500円', 2500, 'month', 20, '対象は要確認'),
  ('monthly_2750', '月額 2,750円', 2750, 'month', 30, '対象は要確認'),
  ('yearly_30000', '年額 30,000円', 30000, 'year', 40, '対象は要確認')
ON CONFLICT (code) DO NOTHING;

ALTER TABLE public.billing_plans ENABLE ROW LEVEL SECURITY;

-- 料金は会員に見せてよい。書き換えは運営のみ。
DROP POLICY IF EXISTS billing_plans_select ON public.billing_plans;
CREATE POLICY billing_plans_select ON public.billing_plans
  FOR SELECT TO authenticated
  USING (public.is_active_member());

DROP POLICY IF EXISTS billing_plans_admin ON public.billing_plans;
CREATE POLICY billing_plans_admin ON public.billing_plans
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ------------------------------------------------------------
-- 会員側の決済情報
-- ------------------------------------------------------------
-- Stripe上の顧客。会員1人につき1つ。
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_members_stripe_customer
  ON public.members (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- どのプランで請求するか。運営が選ぶ。
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS billing_plan_code TEXT REFERENCES public.billing_plans(code);

-- 課金を始める日。既存会員は「次の更新日」＝ここまでは請求しない。
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS billing_starts_on DATE;

COMMENT ON COLUMN public.members.billing_starts_on IS
  '課金を開始する日。既存会員は次の更新日（それまでは年払い済みの期間）';

-- ------------------------------------------------------------
-- 契約の写し（正本は Stripe）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.member_subscriptions (
  member_id              UUID        PRIMARY KEY REFERENCES public.members(id) ON DELETE CASCADE,
  stripe_customer_id     TEXT        NOT NULL,
  stripe_subscription_id TEXT        NOT NULL UNIQUE,
  -- Stripe の status をそのまま入れる（trialing / active / past_due / canceled ...）
  status                 TEXT        NOT NULL,
  price_id               TEXT,
  -- 次回の請求日。課金開始待ち（trialing）の間は開始日が入る
  current_period_end     TIMESTAMPTZ,
  cancel_at_period_end   BOOLEAN     NOT NULL DEFAULT FALSE,
  -- 最後に決済が失敗した日時（運営が声を掛けるため）
  last_payment_failed_at TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_member_subscriptions_status
  ON public.member_subscriptions(status);

DROP TRIGGER IF EXISTS trg_member_subscriptions_set_updated_at ON public.member_subscriptions;
CREATE TRIGGER trg_member_subscriptions_set_updated_at
  BEFORE UPDATE ON public.member_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.member_subscriptions ENABLE ROW LEVEL SECURITY;

-- 自分の契約は見られる。運営は全員分を見られる。
-- 🔴 書き込みのポリシーは作らない＝Webhook（service_role）だけが書く。
--    会員が自分で「支払い済み」にできてしまうと決済の意味が無くなる。
DROP POLICY IF EXISTS member_subscriptions_select ON public.member_subscriptions;
CREATE POLICY member_subscriptions_select ON public.member_subscriptions
  FOR SELECT TO authenticated
  USING (member_id = public.current_member_id() OR public.is_admin());

-- ------------------------------------------------------------
-- 課金開始日を台帳から埋める
-- ------------------------------------------------------------
-- 開始月の「次に来る同じ月の1日」。今月が開始月なら来年。
-- 開始月が入っていない会員は NULL のまま＝運営が入れる。
CREATE OR REPLACE FUNCTION public.next_renewal_date(p_start_month INTEGER, p_from DATE)
RETURNS DATE
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_start_month IS NULL OR p_start_month < 1 OR p_start_month > 12 THEN NULL
    ELSE MAKE_DATE(
      EXTRACT(YEAR FROM p_from)::INT
        + CASE WHEN p_start_month > EXTRACT(MONTH FROM p_from)::INT THEN 0 ELSE 1 END,
      p_start_month,
      1
    )
  END;
$$;

UPDATE public.members
   SET billing_starts_on = public.next_renewal_date(start_month, CURRENT_DATE)
 WHERE billing_starts_on IS NULL
   AND is_withdrawn = FALSE
   AND start_month IS NOT NULL;

-- ------------------------------------------------------------
-- 自分の支払い状況（設定画面）
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS public.my_billing_status();

CREATE FUNCTION public.my_billing_status()
RETURNS TABLE (
  plan_code            TEXT,
  plan_label           TEXT,
  plan_amount          INTEGER,
  plan_interval        TEXT,
  plan_ready           BOOLEAN,
  billing_starts_on    DATE,
  status               TEXT,
  current_period_end   TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    p.code,
    p.label,
    p.amount,
    p.interval,
    p.stripe_price_id IS NOT NULL,
    m.billing_starts_on,
    s.status,
    s.current_period_end,
    COALESCE(s.cancel_at_period_end, FALSE)
  FROM public.members AS m
  LEFT JOIN public.billing_plans        AS p ON p.code      = m.billing_plan_code
  LEFT JOIN public.member_subscriptions AS s ON s.member_id = m.id
  WHERE m.id = public.current_member_id();
$$;

REVOKE ALL ON FUNCTION public.my_billing_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_billing_status() TO authenticated;

-- ------------------------------------------------------------
-- 決済まわりは本人に書き換えさせない（契約の事実）
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_member_admin_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin() OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  NEW.role               := OLD.role;
  NEW.member_no          := OLD.member_no;
  NEW.auth_user_id       := OLD.auth_user_id;
  NEW.is_withdrawn       := OLD.is_withdrawn;
  NEW.withdrawn_at       := OLD.withdrawn_at;
  NEW.withdrawal_reason  := OLD.withdrawal_reason;
  NEW.admin_note         := OLD.admin_note;
  NEW.price              := OLD.price;
  NEW.renewal_status     := OLD.renewal_status;
  NEW.renewal_fee        := OLD.renewal_fee;
  NEW.renewal_note       := OLD.renewal_note;
  NEW.referral_fee       := OLD.referral_fee;
  NEW.referrer_member_id := OLD.referrer_member_id;

  NEW.membership_type    := OLD.membership_type;
  NEW.start_year         := OLD.start_year;
  NEW.start_month        := OLD.start_month;
  NEW.referrer           := OLD.referrer;
  NEW.source             := OLD.source;
  NEW.import_sheet       := OLD.import_sheet;

  -- 決済まわり（今回追加）
  NEW.stripe_customer_id := OLD.stripe_customer_id;
  NEW.billing_plan_code  := OLD.billing_plan_code;
  NEW.billing_starts_on  := OLD.billing_starts_on;

  RETURN NEW;
END;
$$;
