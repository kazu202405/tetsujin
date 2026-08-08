// ============================================================
// Stripe からの通知を受ける
// ============================================================
// 🔴 支払いの状態はここでしか書かない。
//    画面やアプリの都合で「払った」ことにすると、Stripeと食い違って
//    「払ったのに入れない／払っていないのに入れる」が起きる。
//
// 🔴 署名を必ず検証する。検証しないと、このURLを知った誰でも
//    「支払い済み」を送り込めてしまう。
//
// 会員台帳の更新状況（renewal_status）は書き換えない。
// あれは運営が手で管理している欄で、自動で上書きすると
// 運営が把握している状態が消える。支払いの状態は別の表で持つ。
// ============================================================
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { WEBHOOK_SECRET, isStripeConfigured, stripe } from "@/lib/stripe";
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Stripeの版によって置き場所が変わるため、両方から拾う */
function periodEnd(sub: Stripe.Subscription): string | null {
  const fromItem = sub.items?.data?.[0] as { current_period_end?: number } | undefined;
  const seconds =
    fromItem?.current_period_end ??
    (sub as unknown as { current_period_end?: number }).current_period_end;
  return typeof seconds === "number" ? new Date(seconds * 1000).toISOString() : null;
}

async function memberIdFor(
  admin: ReturnType<typeof createAdminClient>,
  sub: Stripe.Subscription,
): Promise<string | null> {
  const tagged = sub.metadata?.member_id;
  if (tagged) return tagged;

  // 印が付いていないときは顧客から引く（Stripe側で手動作成された場合など）
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  if (!customerId) return null;

  const { data } = await admin
    .from("members")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  return data?.id ?? null;
}

async function saveSubscription(sub: Stripe.Subscription) {
  const admin = createAdminClient();
  const memberId = await memberIdFor(admin, sub);
  if (!memberId) {
    // 誰の契約か分からないまま書くと別人に紐づく。書かずに気づけるようにする。
    console.error("stripe webhook: 会員を特定できません", { subscription: sub.id });
    return;
  }

  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;

  const { error } = await admin.from("member_subscriptions").upsert(
    {
      member_id: memberId,
      stripe_customer_id: customerId ?? "",
      stripe_subscription_id: sub.id,
      status: sub.status,
      price_id: sub.items?.data?.[0]?.price?.id ?? null,
      current_period_end: periodEnd(sub),
      cancel_at_period_end: Boolean(sub.cancel_at_period_end),
    },
    { onConflict: "member_id" },
  );

  if (error) console.error("stripe webhook: 保存に失敗", { code: error.code });
}

export async function POST(request: Request) {
  if (!isStripeConfigured || !WEBHOOK_SECRET || !isServiceRoleConfigured) {
    return NextResponse.json({ error: "決済は準備中です" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "署名がありません" }, { status: 400 });
  }

  // 署名の検証には加工前の本文が要る
  const raw = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, signature, WEBHOOK_SECRET);
  } catch (e) {
    console.error("stripe webhook: 署名を検証できません", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "署名が不正です" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const subId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;
        if (subId) {
          const sub = await stripe().subscriptions.retrieve(subId);
          // Checkoutのmetadataにしか印が無い場合に備えて補う
          if (!sub.metadata?.member_id && session.metadata?.member_id) {
            sub.metadata = { ...sub.metadata, member_id: session.metadata.member_id };
          }
          await saveSubscription(sub);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await saveSubscription(event.data.object);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string | null };
        const subId =
          typeof invoice.subscription === "string" ? invoice.subscription : null;
        if (subId) {
          const admin = createAdminClient();
          await admin
            .from("member_subscriptions")
            .update({ last_payment_failed_at: new Date().toISOString() })
            .eq("stripe_subscription_id", subId);
        }
        break;
      }

      default:
        // 受け取るだけ受け取って何もしない（200を返さないとStripeが再送し続ける）
        break;
    }
  } catch (e) {
    console.error("stripe webhook: 処理に失敗", event.type, e instanceof Error ? e.message : e);
    // 500を返すとStripeが再送してくれる。取りこぼすより再送の方がよい。
    return NextResponse.json({ error: "処理に失敗しました" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
