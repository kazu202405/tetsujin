import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import { isStripeConfigured, stripe } from "@/lib/stripe";

// ============================================================
// 退会したら会費の引き落としも止める
// ============================================================
// 🔴 これが無いと「退会させたのに毎月引き落とされ続ける」が起きる。
//    会員台帳（is_withdrawn）とStripeの契約は別の場所にあり、
//    片方を変えてももう片方は何も知らない。
//    2026-04-27に「退会フラグと課金解約の連動は後回し」と決めたまま
//    残っていたものを、本番でカード決済を開ける前に塞ぐ。
//
// 逆方向（会員がStripeのポータルで解約した場合）は webhook 側で運営に通知する。
// そちらは自動で退会にはしない——支払いを止めただけで、
// コミュニティを抜けるかどうかは運営が本人に確認して決めることだから。

/** 解約の理由。webhook 側で「運営の退会操作によるものか」を判別するために使う */
export const CANCEL_REASON_WITHDRAWAL = "admin_withdrawal";

export type CancelOutcome =
  | { status: "canceled"; subscriptionId: string }
  | { status: "nothing_to_cancel" }
  | { status: "skipped"; reason: string }
  | { status: "failed"; reason: string };

/**
 * 会員の生きている契約を解約する。退会処理から呼ぶ。
 *
 * 🔴 失敗しても退会そのものは止めない（呼び出し側で結果を見て伝える）。
 *    Stripeが一時的に落ちているだけで運営が退会させられなくなる方が困る。
 *    ただし「黙って成功したことにする」のは最悪なので、必ず結果を返して
 *    画面に出す。運営がStripeの画面で手で止められるようにするため。
 */
export async function cancelSubscriptionForWithdrawal(
  memberId: string,
): Promise<CancelOutcome> {
  if (!isStripeConfigured || !isServiceRoleConfigured) {
    return { status: "skipped", reason: "決済が未設定" };
  }

  const admin = createAdminClient();

  const { data: sub, error } = await admin
    .from("member_subscriptions")
    .select("stripe_subscription_id, status")
    .eq("member_id", memberId)
    .maybeSingle();

  if (error) {
    console.error("withdrawal: 契約の取得に失敗", { code: error.code });
    return { status: "failed", reason: "契約を確認できませんでした" };
  }

  // 契約が無い、または既に終わっているなら何もしない
  if (!sub || !["trialing", "active", "past_due", "unpaid"].includes(sub.status)) {
    return { status: "nothing_to_cancel" };
  }

  try {
    // 🔴 即時解約（cancel_at_period_end ではない）。
    //    期末解約にすると、退会した人がその期間ずっと会員機能を使える状態が残り、
    //    「退会したのに入れる」という別の食い違いを生む。
    //    日割り返金はしない＝規約どおり（途中解約の返金なし）。
    await stripe().subscriptions.cancel(sub.stripe_subscription_id, {
      cancellation_details: { comment: CANCEL_REASON_WITHDRAWAL },
    });

    // Stripe から customer.subscription.deleted が届いて
    // member_subscriptions.status は canceled に更新される。
    // ここでは書き換えない（2か所から書くと食い違うため、書くのは webhook だけ）。
    return { status: "canceled", subscriptionId: sub.stripe_subscription_id };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("withdrawal: Stripe解約に失敗", message);
    return { status: "failed", reason: "決済の解約に失敗しました" };
  }
}
