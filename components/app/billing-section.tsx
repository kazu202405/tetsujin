"use client";

// ============================================================
// 会費（設定画面）
// ============================================================
// 自動更新にする以上、会員が自分で「いつ・いくら引き落とされるか」と
// 「やめ方」を確認できないといけない。ここが唯一のその場所。
//
// カード情報はこのアプリを通らない。入力も変更も解約も Stripe の画面で行う。
// ============================================================

import { useState } from "react";
import { CreditCard, ExternalLink, AlertCircle, Loader2 } from "lucide-react";
import { useCachedResource } from "@/lib/client-cache";

interface Billing {
  stripeReady: boolean;
  testMode: boolean;
  plan: { code: string; label: string; amount: number; interval: string; ready: boolean } | null;
  billingStartsOn: string | null;
  billingExempt: boolean;
  status: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

const EMPTY: Billing = {
  stripeReady: false,
  testMode: false,
  plan: null,
  billingStartsOn: null,
  billingExempt: false,
  status: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
};

/** Stripeの状態を会員に分かる言葉にする */
const STATUS_TEXT: Record<string, { label: string; tone: string }> = {
  trialing: { label: "お支払い開始待ち", tone: "bg-blue-50 text-blue-700" },
  active: { label: "お支払い中", tone: "bg-green-50 text-green-700" },
  past_due: { label: "お支払いに失敗しています", tone: "bg-red-50 text-red-700" },
  unpaid: { label: "お支払いに失敗しています", tone: "bg-red-50 text-red-700" },
  incomplete: { label: "手続きの途中です", tone: "bg-amber-50 text-amber-700" },
  canceled: { label: "解約済み", tone: "bg-gray-100 text-gray-600" },
};

function fmtDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export function BillingSection({ withdrawn }: { withdrawn: boolean }) {
  const { data, status: loadStatus, reload } = useCachedResource<Billing>(
    "billing",
    "/api/me/billing",
    EMPTY,
  );
  const [busy, setBusy] = useState<"checkout" | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const go = async (kind: "checkout" | "portal") => {
    setBusy(kind);
    setError(null);
    try {
      const response = await fetch(`/api/stripe/${kind}`, { method: "POST" });
      const body = (await response.json().catch(() => null)) as
        | { url?: string; error?: string }
        | null;
      if (!response.ok || !body?.url) {
        setError(body?.error || "画面を開けませんでした");
        setBusy(null);
        return;
      }
      // Stripeの画面へ移る
      window.location.href = body.url;
    } catch {
      setError("画面を開けませんでした（通信エラー）");
      setBusy(null);
    }
  };

  const statusInfo = data.status ? STATUS_TEXT[data.status] : null;
  const paying = data.status ? ["trialing", "active", "past_due"].includes(data.status) : false;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
      <h2 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
        <CreditCard className="w-5 h-5 text-gray-400" />
        会費
        {data.testMode && (
          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
            テストモード
          </span>
        )}
      </h2>

      {loadStatus === "loading" ? (
        <div className="h-24 rounded-xl bg-gray-100 animate-pulse" />
      ) : (
        <>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl mb-4 gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 whitespace-nowrap">
                {data.billingExempt
                  ? "会費免除"
                  : data.plan
                    ? data.plan.label
                    : "料金プラン未設定"}
              </p>
              <p className="text-xs text-gray-500">
                {data.billingExempt
                  ? "会費のお支払いは不要です"
                  : data.plan
                    ? `¥${data.plan.amount.toLocaleString()}（${
                        data.plan.interval === "year" ? "年額" : "月額"
                      }）`
                    : "運営が設定するとここに表示されます"}
              </p>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-bold flex-shrink-0 whitespace-nowrap ${
                data.billingExempt
                  ? "bg-emerald-50 text-emerald-700"
                  : (statusInfo?.tone ??
                    (withdrawn ? "bg-gray-100 text-gray-500" : "bg-gray-100 text-gray-600"))
              }`}
            >
              {withdrawn ? "退会済み" : data.billingExempt ? "免除" : (statusInfo?.label ?? "未登録")}
            </span>
          </div>

          <dl className="space-y-1.5 text-xs text-gray-500 mb-4">
            {data.status === "trialing" && data.currentPeriodEnd && (
              <div className="flex justify-between gap-3">
                <dt>お支払い開始</dt>
                <dd className="text-gray-700">{fmtDate(data.currentPeriodEnd)}</dd>
              </div>
            )}
            {data.status === "active" && data.currentPeriodEnd && (
              <div className="flex justify-between gap-3">
                <dt>{data.cancelAtPeriodEnd ? "ご利用終了" : "次回のお支払い"}</dt>
                <dd className="text-gray-700">{fmtDate(data.currentPeriodEnd)}</dd>
              </div>
            )}
            {!data.status && !data.billingExempt && data.billingStartsOn && (
              <div className="flex justify-between gap-3">
                <dt>お支払い開始予定</dt>
                <dd className="text-gray-700">{fmtDate(data.billingStartsOn)}</dd>
              </div>
            )}
          </dl>

          {error && (
            <p className="flex items-start gap-2 mb-3 text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              {error}
            </p>
          )}

          {!data.stripeReady ? (
            <p className="text-[11px] text-gray-400 leading-relaxed">
              カードでのお支払いは現在準備中です。お支払い方法のご相談は運営までご連絡ください。
            </p>
          ) : withdrawn ? (
            <p className="text-[11px] text-gray-400">退会済みのため操作できません。</p>
          ) : data.billingExempt ? (
            /* 免除の方。決済に進む口を出さない。
               ただし免除より前に登録した契約が残っている場合だけは、
               自分で解約できるよう導線を残す（放置すると請求され続けるため）。 */
            <>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                運営の判断により、会費のお支払いは免除されています。カードの登録は不要です。
              </p>
              {paying && (
                <>
                  <p className="flex items-start gap-2 mt-3 mb-3 text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    免除になる前のお支払い登録が残っています。解約しないと引き落としが続きます。
                  </p>
                  <button
                    onClick={() => go("portal")}
                    disabled={busy !== null}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
                  >
                    {busy === "portal" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ExternalLink className="w-4 h-4" />
                    )}
                    お支払いの解約
                  </button>
                </>
              )}
            </>
          ) : paying ? (
            <>
              <button
                onClick={() => go("portal")}
                disabled={busy !== null}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                {busy === "portal" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ExternalLink className="w-4 h-4" />
                )}
                お支払い方法の変更・解約
              </button>
              <p className="mt-3 text-[11px] text-gray-400 leading-relaxed">
                カードの変更、領収書の確認、解約はこちらから行えます。
                解約すると、お支払い済みの期間が終わったところでご利用が終了します。
              </p>
            </>
          ) : (
            <>
              <button
                onClick={() => go("checkout")}
                disabled={busy !== null || !data.plan?.ready}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--tetsu-pink)] text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {busy === "checkout" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CreditCard className="w-4 h-4" />
                )}
                お支払いを登録する
              </button>
              <p className="mt-3 text-[11px] text-gray-400 leading-relaxed">
                {!data.plan
                  ? "料金プランが未設定のため、まだ登録できません。運営にお問い合わせください。"
                  : !data.plan.ready
                    ? "このプランはまだお支払いを受け付けられません。運営にお問い合わせください。"
                    : data.billingStartsOn
                      ? `カード情報の登録だけ先に済ませられます。実際のお引き落としは ${fmtDate(
                          data.billingStartsOn,
                        )} からです。`
                      : "カード情報はTETSUJIN会では保管しません（Stripeの画面でお預かりします）。"}
              </p>
            </>
          )}

          <button
            onClick={() => void reload()}
            className="mt-4 text-[11px] text-gray-400 underline hover:text-gray-600"
          >
            表示を更新する
          </button>
        </>
      )}
    </div>
  );
}
