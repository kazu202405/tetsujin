// 自分の支払い状況（設定画面の会費セクション）
import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, requireMember } from "@/lib/supabase/api";
import { isStripeConfigured, isStripeLive } from "@/lib/stripe";

export const dynamic = "force-dynamic";

interface Row {
  plan_code: string | null;
  plan_label: string | null;
  plan_amount: number | null;
  plan_interval: string | null;
  plan_ready: boolean | null;
  billing_starts_on: string | null;
  status: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

export async function GET() {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;
  const { supabase } = guard;

  const { data, error } = await supabase.rpc("my_billing_status");
  if (error) {
    console.error("my_billing_status failed", { code: error.code });
    return NextResponse.json(
      { error: "支払い状況を取得できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  const row = (data as Row[] | null)?.[0] ?? null;

  return NextResponse.json(
    {
      stripeReady: isStripeConfigured,
      // テスト鍵のときは画面に出して取り違えを防ぐ
      testMode: isStripeConfigured && !isStripeLive,
      plan: row?.plan_code
        ? {
            code: row.plan_code,
            label: row.plan_label,
            amount: row.plan_amount,
            interval: row.plan_interval,
            ready: Boolean(row.plan_ready),
          }
        : null,
      billingStartsOn: row?.billing_starts_on ?? null,
      status: row?.status ?? null,
      currentPeriodEnd: row?.current_period_end ?? null,
      cancelAtPeriodEnd: Boolean(row?.cancel_at_period_end),
    },
    { headers: NO_STORE_HEADERS },
  );
}
