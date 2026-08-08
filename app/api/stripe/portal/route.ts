// ============================================================
// お支払い方法の変更・解約（Stripe のカスタマーポータル）
// ============================================================
// 自動更新にする以上、会員が自分で解約できる場所が要る。
// カード変更・請求書の確認・解約はすべて Stripe 側の画面に任せる
// （自前で作ると、解約したのに請求が続くといった食い違いが起きる）。
// ============================================================
import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, requireMember } from "@/lib/supabase/api";
import { appUrl, isStripeConfigured, stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!isStripeConfigured) {
    return NextResponse.json(
      { error: "決済はまだ準備中です" },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }

  const guard = await requireMember();
  if (!guard.ok) return guard.response;
  const { supabase, member } = guard;

  const { data } = await supabase
    .from("members")
    .select("stripe_customer_id")
    .eq("id", member.id)
    .maybeSingle();

  if (!data?.stripe_customer_id) {
    return NextResponse.json(
      { error: "お支払いの登録がまだありません" },
      { status: 409, headers: NO_STORE_HEADERS },
    );
  }

  try {
    const session = await stripe().billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: `${appUrl()}/app/settings`,
      locale: "ja",
    });
    return NextResponse.json({ url: session.url }, { headers: NO_STORE_HEADERS });
  } catch (e) {
    console.error("stripe portal failed", e instanceof Error ? e.message : e);
    return NextResponse.json(
      { error: "お支払い画面を開けませんでした" },
      { status: 502, headers: NO_STORE_HEADERS },
    );
  }
}
