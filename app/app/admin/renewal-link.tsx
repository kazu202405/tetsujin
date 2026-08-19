"use client";

// ============================================================
// 更新リンク（継続会員へ運営が送るURL）
// ============================================================
// 運用（依頼主決定 2026-08-19）：
//   新規会員 … アプリ内で決済
//   継続会員 … 期限が来たら運営がこのリンクを送る → 自動更新に乗る
//
// 🔴 URLの末尾に ?client_reference_id=<会員のID> を必ず付ける。
//    支払いリンクはStripe側で新しい匿名の顧客を作るため、これが無いと
//    決済は成立するのにアプリ側は誰の支払いか特定できない
//    （契約テーブルに何も入らず、運営が手で突き合わせる羽目になる）。
//
//    会員のUUIDを手で調べるのは無理なので、ここで組み立てて渡す。
// ============================================================

import { useEffect, useState } from "react";
import { Link2, Copy, Check, AlertCircle } from "lucide-react";
import type { MemberDbRow } from "./members-data";

interface Plan {
  code: string;
  label: string;
  stripe_payment_link_url: string | null;
}

export function RenewalLink({ row }: { row: MemberDbRow }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/billing-plans", { cache: "no-store" })
      .then(async (res) => (res.ok ? await res.json() : null))
      .then((body) => {
        if (cancelled) return;
        if (body) setPlans(body.plans as Plan[]);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, []);

  // 免除の方には送らない（そもそも請求しない）
  if (row.billing_exempt) return null;
  if (!loaded) return null;

  const plan = plans.find((p) => p.code === row.billing_plan_code) ?? null;
  const base = plan?.stripe_payment_link_url ?? null;
  const url = base ? `${base}?client_reference_id=${row.id}` : null;

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* クリップボードが使えない環境では下の文字列を手で選んでもらう */
    }
  };

  return (
    <div className="border border-gray-200 rounded-xl p-4">
      <h4 className="text-sm font-bold text-gray-900 mb-1 flex items-center gap-1.5">
        <Link2 className="w-4 h-4 text-gray-400" />
        更新リンク
      </h4>
      <p className="text-[11px] text-gray-500 leading-relaxed mb-3">
        期限が来た方にこのURLを送ると、そのままお支払い・自動更新になります。
      </p>

      {!row.billing_plan_code ? (
        <p className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          会費プランが未設定です。下の「登録内容を編集」でプランを選ぶとリンクが出ます。
        </p>
      ) : !base ? (
        <p className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          「{plan?.label ?? row.billing_plan_code}」の支払いリンクが未登録です。会員タブ最上部の
          「会費プランの設定」で登録してください。
        </p>
      ) : (
        <>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="text-xs font-bold text-gray-900">{plan?.label}</span>
            <span className="text-[11px] text-gray-400">
              金額を変えるときは下の「登録内容を編集」から会費プランを選び直してください
            </span>
          </div>
          <p className="px-3 py-2 mb-2 rounded-lg bg-gray-50 border border-gray-100 text-[10px] font-mono text-gray-600 break-all">
            {url}
          </p>
          <button
            onClick={copy}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "コピーしました" : "リンクをコピー"}
          </button>
          <p className="mt-2 text-[11px] text-gray-400 leading-relaxed">
            末尾の <span className="font-mono">client_reference_id</span> がこの方の目印です。
            消したり他の方に使い回すと、誰の支払いか分からなくなります。
          </p>
        </>
      )}
    </div>
  );
}
