// ============================================================
// 料金プランの管理（運営のみ）
// ============================================================
// Stripe で作った価格ID（price_...）をここで入れる。
// 入るまでそのプランでは決済に進めない＝間違った金額を請求しない。
//
// 金額そのものは Stripe 側が正本。ここの amount は画面表示用なので、
// 価格IDを付け替えたら金額も直す必要がある（画面と請求がずれるため）。
// ============================================================
import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, requireAdminMember } from "@/lib/supabase/api";
import { isStripeConfigured, isStripeLive } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const PRICE_ID = /^price_[A-Za-z0-9]+$/;

export async function GET() {
  const guard = await requireAdminMember();
  if (!guard.ok) return guard.response;

  const { data, error } = await guard.supabase
    .from("billing_plans")
    .select("code, label, amount, interval, stripe_price_id, note, is_active, sort_order")
    .order("sort_order");

  if (error) {
    console.error("billing_plans list failed", { code: error.code });
    return NextResponse.json(
      { error: "料金プランを取得できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json(
    {
      plans: data ?? [],
      stripeReady: isStripeConfigured,
      testMode: isStripeConfigured && !isStripeLive,
    },
    { headers: NO_STORE_HEADERS },
  );
}

export async function PATCH(request: Request) {
  const guard = await requireAdminMember();
  if (!guard.ok) return guard.response;

  const body = (await request.json().catch(() => null)) as {
    code?: string;
    stripePriceId?: string | null;
    isActive?: boolean;
  } | null;

  if (!body?.code) {
    return NextResponse.json(
      { error: "プランが指定されていません" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const patch: Record<string, unknown> = {};

  if (body.stripePriceId !== undefined) {
    const priceId = (body.stripePriceId ?? "").trim();
    if (priceId && !PRICE_ID.test(priceId)) {
      return NextResponse.json(
        { error: "価格IDの形式が違います（price_ で始まる文字列です）" },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }
    patch.stripe_price_id = priceId || null;
  }

  if (typeof body.isActive === "boolean") patch.is_active = body.isActive;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: "更新する項目がありません" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const { data, error } = await guard.supabase
    .from("billing_plans")
    .update(patch)
    .eq("code", body.code)
    .select("code, label, amount, interval, stripe_price_id, note, is_active, sort_order")
    .maybeSingle();

  if (error) {
    // 23505 = 同じ価格IDを2つのプランに入れた
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "その価格IDは別のプランで使われています" },
        { status: 409, headers: NO_STORE_HEADERS },
      );
    }
    console.error("billing_plans update failed", { code: error.code });
    return NextResponse.json(
      { error: "保存できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json(data, { headers: NO_STORE_HEADERS });
}
