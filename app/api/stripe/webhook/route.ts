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
import { CANCEL_REASON_WITHDRAWAL } from "@/lib/billing-withdrawal";

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

/**
 * 会員とStripeの紐づけを残す。
 *
 * 🔴 支払いリンク経由の初回はここでしか紐づけを作れない。
 *    残さないと、翌年の更新・解約・決済失敗の通知が全部
 *    「誰か分からない」に戻る（決済失敗に運営が気づけないのが特に痛い）。
 *
 * 顧客とサブスクの両方に印を付けるのは、片方だけだと
 * 顧客を作り直されたときに追えなくなるため。
 */
async function rememberLink(
  admin: ReturnType<typeof createAdminClient>,
  memberId: string,
  sub: Stripe.Subscription,
) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;

  if (customerId) {
    const { error } = await admin
      .from("members")
      .update({ stripe_customer_id: customerId })
      .eq("id", memberId)
      .is("stripe_customer_id", null); // 既にある顧客IDは上書きしない
    if (error) console.error("stripe webhook: 顧客IDの保存に失敗", { code: error.code });
  }

  // Stripe側にも印を書き戻す（以後の通知はこれだけで特定できる）
  if (!sub.metadata?.member_id) {
    try {
      await stripe().subscriptions.update(sub.id, { metadata: { ...sub.metadata, member_id: memberId } });
      if (customerId) {
        await stripe().customers.update(customerId, { metadata: { member_id: memberId } });
      }
    } catch (e) {
      // 印が付かなくても顧客IDから引けるので、失敗しても止めない
      console.error("stripe webhook: 印の書き戻しに失敗", e instanceof Error ? e.message : e);
    }
  }
}

/**
 * 二重契約を運営に知らせる。
 * 支払いリンクにはアプリ内決済のような「契約済みの人を弾く」門番が無く、
 * 2回押されるとStripeに契約が2本できて二重に引き落とされる。
 * 契約テーブルは member_id が主キーなので2本目が1本目を上書きし、
 * 放っておくと1本目の存在ごと見えなくなる。
 */
async function warnDuplicate(
  admin: ReturnType<typeof createAdminClient>,
  memberId: string,
  newSubId: string,
  oldSubId: string,
) {
  const { data: member } = await admin.from("members").select("name").eq("id", memberId).maybeSingle();
  const name = member?.name ?? "会員";

  const { error } = await admin.rpc("notify_admins_billing", {
    p_title: `${name}さんの会費が二重契約になっています`,
    p_message:
      `お支払いの登録が2件あります（既存 ${oldSubId} / 新規 ${newSubId}）。` +
      `そのままだと二重に引き落とされます。Stripeでどちらかを解約してください。`,
    p_href: "/app/admin",
  });
  if (error) console.error("stripe webhook: 二重契約の通知に失敗", { code: error.code });
}

/**
 * 会員が自分で解約したことを運営に知らせる。
 *
 * 🔴 自動で退会にはしない。支払いを止めたことと、コミュニティを抜けることは別。
 *    勝手に退会させると、カードを変えたいだけの人まで締め出す。
 *    ∴ 運営が本人に確認して判断できるよう、通知だけ出す。
 *
 * 運営の退会操作による解約は除く（自分がやった操作の通知は雑音にしかならない）。
 * 判別には解約時に入れた cancellation_details.comment を使う。
 */
async function notifySelfCancel(
  admin: ReturnType<typeof createAdminClient>,
  memberId: string,
  sub: Stripe.Subscription,
) {
  if (sub.cancellation_details?.comment === CANCEL_REASON_WITHDRAWAL) return;

  const { data: member } = await admin
    .from("members")
    .select("name, is_withdrawn")
    .eq("id", memberId)
    .maybeSingle();

  // 既に退会している人の解約は想定内なので通知しない
  if (member?.is_withdrawn) return;

  const name = member?.name ?? "会員";
  const { error } = await admin.rpc("notify_admins_billing", {
    p_title: `${name}さんが会費のお支払いを解約しました`,
    p_message:
      "ご本人がお支払い画面から解約されました。会員のままなので、" +
      "退会にするか継続いただくか、ご本人に確認してください。",
    p_href: "/app/admin",
  });
  if (error) console.error("stripe webhook: 解約通知に失敗", { code: error.code });
}

async function saveSubscription(sub: Stripe.Subscription, hintedMemberId?: string | null) {
  const admin = createAdminClient();
  const memberId = hintedMemberId ?? (await memberIdFor(admin, sub));
  if (!memberId) {
    // 誰の契約か分からないまま書くと別人に紐づく。書かずに気づけるようにする。
    // 支払いリンク経由では customer.subscription.created が先に届くことがあり、
    // その場合は直後の checkout.session.completed で正しく保存される（一時的なもの）。
    console.error("stripe webhook: 会員を特定できません", { subscription: sub.id });
    return;
  }

  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;

  // 既にこの会員の契約があり、それが別の契約で、まだ生きているなら二重契約。
  const { data: existing } = await admin
    .from("member_subscriptions")
    .select("stripe_subscription_id, status")
    .eq("member_id", memberId)
    .maybeSingle();

  const isDuplicate =
    existing != null &&
    existing.stripe_subscription_id !== sub.id &&
    ["trialing", "active", "past_due"].includes(existing.status) &&
    ["trialing", "active", "past_due"].includes(sub.status);

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

  if (error) {
    console.error("stripe webhook: 保存に失敗", { code: error.code });
    return;
  }

  await rememberLink(admin, memberId, sub);

  if (isDuplicate) {
    await warnDuplicate(admin, memberId, sub.id, existing.stripe_subscription_id);
  }

  // 会員が自分で解約した場合は運営へ通知（運営の退会操作によるものは除く）
  if (sub.status === "canceled") {
    await notifySelfCancel(admin, memberId, sub);
  }
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

          // 誰の支払いかを示す印は3か所のどれかに入る。
          //   ① サブスクのmetadata … アプリ内決済（subscription_dataで付けている）
          //   ② セッションのmetadata … 同上の保険
          //   ③ client_reference_id … 🔴 支払いリンク経由はここにしか入らない。
          //      運営が送るURLの末尾 ?client_reference_id=<会員のID> がこれ。
          //      見落とすと、決済は成立するのにアプリには何も残らない。
          const hinted =
            sub.metadata?.member_id ||
            session.metadata?.member_id ||
            session.client_reference_id ||
            null;

          await saveSubscription(sub, hinted);
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
        // 🔴 契約IDの置き場所がAPIバージョンで変わる。
        //    古い版: invoice.subscription
        //    新しい版: invoice.parent.subscription_details.subscription
        //    どちらの版で設定されても拾えるように両方見る。
        const invoice = event.data.object as Stripe.Invoice & {
          subscription?: string | { id: string } | null;
          parent?: { subscription_details?: { subscription?: string | { id: string } | null } };
        };
        const pick = (v: unknown): string | null =>
          typeof v === "string" ? v : (v as { id?: string })?.id ?? null;
        const subId =
          pick(invoice.subscription) ??
          pick(invoice.parent?.subscription_details?.subscription);

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
