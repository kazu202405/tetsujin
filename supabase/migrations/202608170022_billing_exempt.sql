-- ============================================================
-- 会費の免除（無料会員）＋ 決済列の保護漏れの修復
-- ============================================================
-- 前提：202608080018_billing.sql / 202608130019_owner_role.sql 適用済み。
--
-- ------------------------------------------------------------
-- ① 会費免除（依頼主決定 2026-08-17）
-- ------------------------------------------------------------
-- 川原さん・五島さんは会費が無料。これを表現する手段が今は無く、
-- billing_plan_code を NULL にするしかない。
--
-- 🔴 だが NULL は「まだ運営が金額を決めていない343名」と同じ状態で、
--    「無料と決めた人」と「設定し忘れ」が区別できなくなる。
--    あとで「まだ払っていない人」を出したいときに必ず混ざる。
--    ∴ 免除は独立したフラグで持つ。
--
-- 免除者は Stripe に顧客もサブスクも作らない。
-- 無料の人をわざわざ決済経路に乗せる意味が無く、
-- 乗せない方が誤請求の経路そのものが存在しなくなる。
-- （100%割引クーポンを当てる手もあるが、契約を作る必要が出るので採らない）
--
-- ------------------------------------------------------------
-- ② 🔴 決済列の保護が外れていたのを直す
-- ------------------------------------------------------------
-- 0018 が protect_member_admin_fields() に
--   stripe_customer_id / billing_plan_code / billing_starts_on
-- の3行を足していたが、0019 が同じ関数を CREATE OR REPLACE で
-- 作り直したときにこの3行が引き継がれず消えていた。
--
-- members には members_update_own（本人が自分の行をUPDATEできる）が
-- あるため、画面とAPIを塞いでいても PostgREST を直接叩けば
--   PATCH /members {"billing_starts_on":"2099-01-01"}  → 永久に請求されない
--   PATCH /members {"billing_plan_code":"monthly_1650"} → 安いプランに乗り換え
-- が通ってしまう状態だった。会費の取りっぱぐれに直結するので同時に塞ぐ。
--
-- 教訓：CREATE OR REPLACE で関数を作り直すときは、
--       前の版が足した行を必ず全部持ってくること。
--       消しても何のエラーも出ないので、消えたことに気づけない。
-- ============================================================

-- ------------------------------------------------------------
-- 免除フラグ
-- ------------------------------------------------------------
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS billing_exempt BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.members.billing_exempt IS
  '会費免除（無料会員）。TRUE の人は決済に進ませず、Stripeに顧客も契約も作らない。'
  'billing_plan_code の NULL（＝運営が未設定）とは別物。';

-- 免除者を探しやすくする（未払い一覧から除くときに毎回使う）
CREATE INDEX IF NOT EXISTS idx_members_billing_exempt
  ON public.members (billing_exempt)
  WHERE billing_exempt = TRUE;

-- ------------------------------------------------------------
-- 本人に書き換えさせない列（0019版に決済列を戻す）
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_member_admin_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- migration や service_role（サーバー側の仕込み）は対象外
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- ロールを変えられるのは管理者だけ。
  -- set_member_role() も最終的にこの UPDATE を通るので、判定はここが最後の砦になる。
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_owner() THEN
    NEW.role := OLD.role;
  END IF;

  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- 権限・在籍・お金まわり
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

  -- 契約の事実（運営が台帳として管理する）
  NEW.membership_type    := OLD.membership_type;
  NEW.start_year         := OLD.start_year;
  NEW.start_month        := OLD.start_month;
  NEW.referrer           := OLD.referrer;
  NEW.source             := OLD.source;
  NEW.import_sheet       := OLD.import_sheet;

  -- 🔴 決済まわり（0018で追加 → 0019で消えていたのを復旧）
  --    ここが空いていると、本人がPostgRESTを直接叩いて
  --    請求日を先送りしたり安いプランに移れてしまう。
  NEW.stripe_customer_id := OLD.stripe_customer_id;
  NEW.billing_plan_code  := OLD.billing_plan_code;
  NEW.billing_starts_on  := OLD.billing_starts_on;
  NEW.billing_exempt     := OLD.billing_exempt;

  -- ここには name / name_normalized / email / phone を入れない。
  -- nickname / job / grip / avatar_path と同じく本人が変更できる。

  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- 自分の支払い状況に「免除」を足す
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
  billing_exempt       BOOLEAN,
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
    m.billing_exempt,
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
