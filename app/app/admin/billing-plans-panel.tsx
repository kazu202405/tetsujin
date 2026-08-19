"use client";

// ============================================================
// 料金プランの設定（運営のみ）
// ============================================================
// Stripe で作った価格ID（price_...）をここに入れる。
// 入るまでそのプランでは決済に進めない＝間違った金額を請求しない。
//
// 支払いリンク（buy.stripe.com/...）は、継続会員へ運営が送るURL。
// 新規はアプリ内で決済し、継続は期限が来たらこのリンクを送る運用。
// ============================================================

import { useEffect, useState } from "react";
import { CreditCard, Check, ChevronDown, ChevronUp } from "lucide-react";

interface Plan {
  code: string;
  label: string;
  amount: number;
  interval: "month" | "year";
  stripe_price_id: string | null;
  stripe_payment_link_url: string | null;
  note: string | null;
  is_active: boolean;
}

export function BillingPlansPanel() {
  const [open, setOpen] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [linkDrafts, setLinkDrafts] = useState<Record<string, string>>({});
  const [savingCode, setSavingCode] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [meta, setMeta] = useState({ stripeReady: false, testMode: false });

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/admin/billing-plans", { cache: "no-store" })
      .then(async (res) => (res.ok ? await res.json() : null))
      .then((body) => {
        if (cancelled || !body) return;
        setPlans(body.plans as Plan[]);
        setMeta({ stripeReady: body.stripeReady, testMode: body.testMode });
        setDrafts(
          Object.fromEntries(
            (body.plans as Plan[]).map((p) => [p.code, p.stripe_price_id ?? ""]),
          ),
        );
        setLinkDrafts(
          Object.fromEntries(
            (body.plans as Plan[]).map((p) => [p.code, p.stripe_payment_link_url ?? ""]),
          ),
        );
      })
      .catch(() => setMessage({ type: "error", text: "料金プランを取得できませんでした" }));
    return () => {
      cancelled = true;
    };
  }, [open]);

  const save = async (code: string) => {
    setSavingCode(code);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/billing-plans", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          stripePriceId: drafts[code] ?? "",
          stripePaymentLinkUrl: linkDrafts[code] ?? "",
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | (Plan & { error?: string })
        | null;
      if (!response.ok || !body) {
        setMessage({ type: "error", text: body?.error || "保存できませんでした" });
      } else {
        setPlans((prev) => prev.map((p) => (p.code === code ? body : p)));
        setMessage({ type: "success", text: `${body.label} を保存しました` });
      }
    } catch {
      setMessage({ type: "error", text: "保存できませんでした（通信エラー）" });
    }
    setSavingCode(null);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 px-4 py-3 mb-4 rounded-2xl border border-gray-200 bg-white text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <CreditCard className="w-4 h-4 text-gray-400" />
        会費プランの設定
        <ChevronDown className="w-4 h-4 text-gray-300 ml-auto" />
      </button>
    );
  }

  return (
    <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-5">
      <button
        onClick={() => setOpen(false)}
        className="w-full flex items-center gap-2 text-sm font-bold text-gray-900 mb-3"
      >
        <CreditCard className="w-4 h-4 text-gray-400" />
        会費プランの設定
        {meta.testMode && (
          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px]">
            テストモード
          </span>
        )}
        <ChevronUp className="w-4 h-4 text-gray-300 ml-auto" />
      </button>

      <p className="text-[11px] text-gray-500 leading-relaxed mb-4">
        Stripeで作った価格ID（<span className="font-mono">price_…</span>）を入れてください。
        入るまでそのプランでは決済に進めません（間違った金額を請求しないためです）。
        支払いリンクは、継続の方へ運営が送るURLです。入れておくと会員ごとのリンクを
        会員一覧からコピーできるようになります。
        {!meta.stripeReady && (
          <span className="block mt-1 text-amber-600">
            Stripeの鍵がまだ設定されていないため、価格IDを入れても決済は動きません。
          </span>
        )}
      </p>

      {message && (
        <p
          className={`mb-3 text-xs rounded-lg px-3 py-2 ${
            message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </p>
      )}

      <div className="space-y-3">
        {plans.map((plan) => (
          <div key={plan.code} className="rounded-xl border border-gray-100 p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-bold text-gray-900 whitespace-nowrap">
                {plan.label}
              </span>
              {plan.stripe_price_id ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-600">
                  <Check className="w-3 h-3" />
                  設定済み
                </span>
              ) : (
                <span className="text-[10px] font-bold text-amber-600">未設定</span>
              )}
            </div>
            {plan.note && <p className="text-[11px] text-gray-400 mb-2">{plan.note}</p>}

            <label className="block text-[10px] text-gray-500 mb-1">価格ID（アプリ内の決済に使う）</label>
            <input
              value={drafts[plan.code] ?? ""}
              onChange={(e) => setDrafts((d) => ({ ...d, [plan.code]: e.target.value }))}
              placeholder="price_..."
              className="w-full px-3 py-2 mb-2 border border-gray-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-gray-900"
            />

            <label className="block text-[10px] text-gray-500 mb-1">
              支払いリンク（継続の方へ送るURL）
            </label>
            <input
              value={linkDrafts[plan.code] ?? ""}
              onChange={(e) => setLinkDrafts((d) => ({ ...d, [plan.code]: e.target.value }))}
              placeholder="https://buy.stripe.com/..."
              className="w-full px-3 py-2 mb-2 border border-gray-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-gray-900"
            />

            <div className="flex justify-end">
              <button
                onClick={() => save(plan.code)}
                disabled={savingCode === plan.code}
                className="px-4 py-2 rounded-lg bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 disabled:opacity-40"
              >
                保存
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
