// ============================================================
// 会費の支払いを始める（Stripe Checkout へ送る）
// ============================================================
// カード番号はこのアプリを通さない。Stripe の画面で入力してもらい、
// アプリは「どの会員が」「どのプランで」始めるかだけを渡す。
//
// 既存会員は年払い済みの期間が残っているので、
// その終わり（billing_starts_on）まで請求しない。
// Stripe の trial_end に渡すと、その日から最初の請求が始まる。
// ============================================================
import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, requireMember } from "@/lib/supabase/api";
import { appUrl, isStripeConfigured, stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

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

  // プランと課金開始日を取る（RLSで自分の行しか見えない）
  const { data: row, error } = await supabase
    .from("members")
    .select("id, name, email, stripe_customer_id, billing_plan_code, billing_starts_on, billing_exempt")
    .eq("id", member.id)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json(
      { error: "会員情報を取得できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  // 会費免除の方は決済に進ませない。
  // Stripeに顧客も契約も作らない＝誤請求の経路そのものを作らない。
  if (row.billing_exempt) {
    return NextResponse.json(
      { error: "会費は免除されています。お支払いの登録は不要です" },
      { status: 409, headers: NO_STORE_HEADERS },
    );
  }

  if (!row.billing_plan_code) {
    return NextResponse.json(
      { error: "料金プランがまだ設定されていません。運営にお問い合わせください" },
      { status: 409, headers: NO_STORE_HEADERS },
    );
  }

  const { data: plan } = await supabase
    .from("billing_plans")
    .select("code, label, stripe_price_id, is_active")
    .eq("code", row.billing_plan_code)
    .maybeSingle();

  if (!plan?.stripe_price_id || !plan.is_active) {
    return NextResponse.json(
      { error: "この料金プランはまだお支払いを受け付けられません。運営にお問い合わせください" },
      { status: 409, headers: NO_STORE_HEADERS },
    );
  }

  // すでに契約があるなら二重に作らせない
  const { data: existing } = await supabase
    .from("member_subscriptions")
    .select("status")
    .eq("member_id", member.id)
    .maybeSingle();

  if (existing && ["trialing", "active", "past_due"].includes(existing.status)) {
    return NextResponse.json(
      { error: "すでにお支払いの登録が済んでいます" },
      { status: 409, headers: NO_STORE_HEADERS },
    );
  }

  const client = stripe();

  try {
    // Stripe上の顧客を用意する（作り直すと履歴が分かれるので必ず使い回す）
    let customerId = row.stripe_customer_id as string | null;
    if (!customerId) {
      const customer = await client.customers.create({
        name: row.name ?? undefined,
        email: row.email ?? undefined,
        metadata: { member_id: member.id },
      });
      customerId = customer.id;

      // 保存は service_role で行う（本人には書き換えさせない列のため）
      const admin = createAdminClient();
      const { error: saveError } = await admin
        .from("members")
        .update({ stripe_customer_id: customerId })
        .eq("id", member.id);

      if (saveError) {
        console.error("stripe customer save failed", { code: saveError.code });
        return NextResponse.json(
          { error: "お支払いの準備に失敗しました" },
          { status: 500, headers: NO_STORE_HEADERS },
        );
      }
    }

    // 年払い済みの期間が残っているなら、その終わりまで請求しない
    const startsOn = row.billing_starts_on ? new Date(`${row.billing_starts_on}T00:00:00+09:00`) : null;
    const trialEnd =
      startsOn && startsOn.getTime() > Date.now()
        ? Math.floor(startsOn.getTime() / 1000)
        : undefined;

    const session = await client.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
      subscription_data: {
        ...(trialEnd ? { trial_end: trialEnd } : {}),
        metadata: { member_id: member.id },
      },
      // 誰の支払いかを取り違えないよう、Webhookで使う印を必ず付ける
      metadata: { member_id: member.id, plan_code: plan.code },
      success_url: `${appUrl()}/app/settings?billing=done`,
      cancel_url: `${appUrl()}/app/settings?billing=canceled`,
      locale: "ja",
    });

    return NextResponse.json({ url: session.url }, { headers: NO_STORE_HEADERS });
  } catch (e) {
    console.error("stripe checkout failed", e instanceof Error ? e.message : e);
    return NextResponse.json(
      { error: "お支払い画面を開けませんでした。時間をおいてお試しください" },
      { status: 502, headers: NO_STORE_HEADERS },
    );
  }
}
