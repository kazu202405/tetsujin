"use client";

// ============================================================
// つながり申請（受けた分・送った分）
// ============================================================
// 🔴 期限切れの見せ方がこの機能の肝。
//    受けた側には出さない（もう返答できないものを見せても気まずいだけ）。
//    送った側には「一定期間が過ぎたため取り下げました」と出す。
//    断られたのか見られていないのかは分からないままにする＝依頼主の意図。
//
// やりとりは一往復まで。承諾したら既存の連絡先で直接続けてもらう。
// ============================================================

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Handshake, Loader2, Clock, X, AlertCircle, ChevronRight } from "lucide-react";
import { MemberAvatar } from "@/components/app/member-avatar";

interface Req {
  id: string;
  direction: "sent" | "received";
  other: { id: string; name: string; job: string | null; avatarUrl: string | null };
  purposes: string[];
  message: string | null;
  status: "pending" | "accepted" | "declined" | "expired";
  declineReason: string | null;
  replyMessage: string | null;
  isSales: boolean;
  createdAt: string;
}

interface PurposeOption {
  code: string;
  label: string;
  is_sales: boolean;
}

/** 断り方の選択肢。理由を書かせず、選ぶだけで済むようにする。 */
const DECLINE_CHOICES = [
  { code: "not_now", label: "今は必要としていません" },
  { code: "timing", label: "タイミングが合いません" },
  { code: "other", label: "お返事だけ（理由は伝えない）" },
];

const DECLINE_LABEL: Record<string, string> = {
  not_now: "今は必要としていません",
  timing: "タイミングが合いません",
  other: "お返事をいただきました",
};

export function ConnectionRequestsPanel() {
  const [items, setItems] = useState<Req[]>([]);
  const [options, setOptions] = useState<PurposeOption[]>([]);
  const [tab, setTab] = useState<"received" | "sent">("received");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [declineTarget, setDeclineTarget] = useState<Req | null>(null);
  const [declineReason, setDeclineReason] = useState("not_now");
  const [declineMessage, setDeclineMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/me/connection-requests", { cache: "no-store" });
      const body = (await res.json().catch(() => null)) as
        | { requests: Req[]; purposeOptions: PurposeOption[] }
        | null;
      if (body) {
        setItems(body.requests);
        setOptions(body.purposeOptions);
      }
    } catch {
      /* 読めなければ空のまま */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const labelOf = (code: string) => options.find((o) => o.code === code)?.label ?? code;

  const respond = async (id: string, accept: boolean, reason?: string, message?: string) => {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch("/api/me/connection-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, accept, reason, message }),
      });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) setError(body?.error ?? "返答できませんでした");
      else await load();
    } catch {
      setError("返答できませんでした（通信エラー）");
    }
    setBusyId(null);
    setDeclineTarget(null);
    setDeclineMessage("");
  };

  const received = items.filter((r) => r.direction === "received");
  const sent = items.filter((r) => r.direction === "sent");
  const pendingCount = received.filter((r) => r.status === "pending").length;
  const list = tab === "received" ? received : sent;

  if (loading) return <div className="h-32 rounded-2xl bg-white animate-pulse mb-6" />;

  return (
    <div className="mb-8">
      <h2 className="text-sm font-bold text-gray-900 mb-1 flex items-center gap-2">
        <Handshake className="w-4 h-4 text-[var(--tetsu-pink)]" />
        つながりの申請
      </h2>
      <p className="text-[11px] text-gray-400 mb-4">
        目的を伝えて申し込み、相手が受けるかどうかを選びます。
      </p>

      <div className="flex gap-2 mb-4">
        {(["received", "sent"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              tab === t
                ? "bg-gray-900 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            {t === "received" ? "届いた申請" : "送った申請"}
            {t === "received" && pendingCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-[var(--tetsu-pink)] text-white text-[10px]">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <p className="mb-3 text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      {list.length === 0 ? (
        <p className="text-xs text-gray-500 bg-white border border-gray-100 rounded-xl px-4 py-5 text-center">
          {tab === "received" ? "届いている申請はありません" : "送った申請はありません"}
        </p>
      ) : (
        <div className="space-y-3">
          {list.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-start gap-3 mb-3">
                <MemberAvatar
                  name={r.other.name}
                  url={r.other.avatarUrl}
                  className="w-10 h-10 flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-900 truncate">{r.other.name}</p>
                  {r.other.job && (
                    <p className="text-[11px] text-gray-500 truncate">{r.other.job}</p>
                  )}
                </div>
                {r.status === "accepted" && (
                  <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold flex-shrink-0">
                    つながりました
                  </span>
                )}
                {r.status === "expired" && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    取り下げ
                  </span>
                )}
              </div>

              {/* 営業目的は必ず先に見せる（方針書6番） */}
              {r.isSales && r.status === "pending" && tab === "received" && (
                <p className="flex items-start gap-2 mb-3 text-[11px] text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  商品・サービスのご提案が目的に含まれています。
                </p>
              )}

              <div className="flex flex-wrap gap-1.5 mb-2">
                {r.purposes.map((p) => (
                  <span
                    key={p}
                    className="px-2 py-0.5 rounded-full bg-[var(--tetsu-warm)] text-[10px] text-gray-700"
                  >
                    {labelOf(p)}
                  </span>
                ))}
              </div>

              {r.message && (
                <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 rounded-lg px-3 py-2 mb-3 whitespace-pre-wrap">
                  {r.message}
                </p>
              )}

              {/* 相手からの返事 */}
              {(r.status === "declined" || r.status === "accepted") && tab === "sent" && (
                <div className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 mb-3">
                  {r.status === "declined" && r.declineReason && (
                    <p className="font-bold text-gray-700 mb-1">
                      {DECLINE_LABEL[r.declineReason] ?? "お返事をいただきました"}
                    </p>
                  )}
                  {r.replyMessage && <p className="whitespace-pre-wrap">{r.replyMessage}</p>}
                </div>
              )}

              {r.status === "expired" && tab === "sent" && (
                <p className="text-[11px] text-gray-400 leading-relaxed mb-1">
                  一定期間が過ぎたため取り下げました。ご縁があればまたの機会に。
                </p>
              )}

              {r.status === "accepted" && (
                <>
                  <p className="text-[11px] text-gray-400 leading-relaxed mb-2">
                    連絡先はプロフィールの「SNS・リンク」からご確認ください。
                  </p>
                  <Link
                    href={`/app/profile/${r.other.id}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[var(--tetsu-pink)] hover:underline"
                  >
                    プロフィールを見る
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </>
              )}

              {/* 返答（受けた側・保留中だけ） */}
              {r.status === "pending" && tab === "received" && (
                <>
                <p className="text-[11px] text-gray-400 leading-relaxed mb-2">
                  受けると、おたがいの連絡先（「つながり済みのみ」に設定しているもの）が見えるようになります。
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={() => void respond(r.id, true)}
                    disabled={busyId === r.id}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--tetsu-pink)] text-white text-xs font-bold hover:opacity-90 disabled:opacity-40"
                  >
                    {busyId === r.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Handshake className="w-3.5 h-3.5" />
                    )}
                    つながりを受ける
                  </button>
                  <button
                    onClick={() => {
                      setDeclineTarget(r);
                      setDeclineReason("not_now");
                    }}
                    disabled={busyId === r.id}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                  >
                    今回は見送る
                  </button>
                </div>
                </>
              )}

              {r.status === "pending" && tab === "sent" && (
                <p className="text-[11px] text-gray-400">
                  お返事をお待ちしています（1週間で自動的に取り下げられます）
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 見送るときのモーダル。理由を書かせず選ぶだけにする。 */}
      {declineTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-md">
            <div className="flex items-start justify-between gap-3 mb-1">
              <h3 className="text-sm font-bold text-gray-900">
                {declineTarget.other.name}さんへのお返事
              </h3>
              <button
                onClick={() => setDeclineTarget(null)}
                className="text-gray-400 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-gray-500 mb-4 leading-relaxed">
              理由を詳しく書く必要はありません。選ぶだけで伝わります。
            </p>

            <div className="space-y-2 mb-4">
              {DECLINE_CHOICES.map((c) => (
                <label
                  key={c.code}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                    declineReason === c.code
                      ? "border-gray-900 bg-gray-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    checked={declineReason === c.code}
                    onChange={() => setDeclineReason(c.code)}
                    className="w-4 h-4 accent-gray-900"
                  />
                  <span className="text-xs text-gray-700">{c.label}</span>
                </label>
              ))}
            </div>

            <textarea
              value={declineMessage}
              onChange={(e) => setDeclineMessage(e.target.value)}
              rows={2}
              maxLength={1000}
              placeholder="ひとこと添えたい場合（任意）"
              className="w-full px-3 py-2 mb-4 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeclineTarget(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                やめる
              </button>
              <button
                onClick={() =>
                  void respond(declineTarget.id, false, declineReason, declineMessage)
                }
                disabled={busyId === declineTarget.id}
                className="px-5 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 disabled:opacity-40"
              >
                送る
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
