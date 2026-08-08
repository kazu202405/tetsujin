"use client";

// ============================================================
// つながり申請（SNSの開示申請）
// ============================================================
// 受信＝自分のリンクを見せてほしいと言われている分。承認/却下できる。
// 送信＝自分が他の人に出している分。保留中なら取り下げできる。
// 承認すると相手に通知が飛ぶ（DBトリガ）。
// ============================================================

import { useState } from "react";
import Link from "next/link";
import { Check, X, Clock, Inbox, Send, Handshake } from "lucide-react";
import { MemberAvatar } from "@/components/app/member-avatar";
import { ConnectionsHeader } from "../connections-header";
import { SOCIAL_PLATFORM_META } from "@/lib/social-links";
import { formatRelativeTime } from "@/lib/notifications-data";
import {
  type DisclosureRequestItem,
  cancelDisclosure,
  respondDisclosure,
  useDisclosureRequests,
} from "@/lib/social-api";
import { LoadingRows } from "@/components/app/skeleton";

function platformLabel(item: DisclosureRequestItem): string {
  if (item.platform === "other") return item.linkLabel?.trim() || "リンク";
  return SOCIAL_PLATFORM_META[item.platform].label;
}

export default function RequestsPage() {
  const { requests, status, reload } = useDisclosureRequests();
  const [tab, setTab] = useState<"incoming" | "outgoing">("incoming");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [declineTarget, setDeclineTarget] = useState<DisclosureRequestItem | null>(null);

  const incoming = requests.filter((r) => r.direction === "incoming");
  const outgoing = requests.filter((r) => r.direction === "outgoing");
  const pendingIncoming = incoming.filter((r) => r.status === "pending");

  const run = async (
    id: string,
    action: () => Promise<{ ok: true } | { ok: false; error: string }>,
  ) => {
    setBusyId(id);
    setError(null);
    const result = await action();
    setBusyId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    await reload();
  };

  const list = tab === "incoming" ? incoming : outgoing;

  return (
    <div className="min-h-screen">
      <ConnectionsHeader description="SNSの開示をお願いする・される画面です" />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24">
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setTab("incoming")}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              tab === "incoming"
                ? "bg-gray-900 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            <Inbox className="w-4 h-4" />
            受信
            {pendingIncoming.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-[var(--tetsu-pink)] text-white text-[10px]">
                {pendingIncoming.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("outgoing")}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              tab === "outgoing"
                ? "bg-gray-900 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            <Send className="w-4 h-4" />
            送信
          </button>
        </div>

        {error && (
          <p className="mb-4 text-sm bg-red-50 text-red-700 rounded-xl px-4 py-3">{error}</p>
        )}

        {status === "loading" && (
          <LoadingRows rows={3} />
        )}

        {status === "error" && (
          <p className="text-center text-red-600 py-20 text-sm">申請を取得できませんでした。</p>
        )}

        {status === "loaded" && (
          <div className="space-y-3">
            {list.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"
              >
                <div className="flex items-center gap-3">
                  <Link href={`/app/profile/${item.other.id}`}>
                    <MemberAvatar name={item.other.name} url={item.other.avatarUrl} />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/app/profile/${item.other.id}`}
                      className="text-sm font-bold text-gray-900 hover:text-amber-700 transition-colors"
                    >
                      {item.other.name}
                    </Link>
                    <p className="text-xs text-gray-500">
                      {tab === "incoming"
                        ? `${platformLabel(item)} の開示を希望`
                        : `${platformLabel(item)} の開示を申請`}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {formatRelativeTime(item.createdAt)}
                    </p>
                  </div>

                  {item.status === "pending" && tab === "incoming" && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => run(item.id, () => respondDisclosure(item.id, "approve"))}
                        disabled={busyId === item.id}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition-colors disabled:opacity-60"
                      >
                        <Check className="w-3.5 h-3.5" />
                        承認
                      </button>
                      <button
                        onClick={() => setDeclineTarget(item)}
                        disabled={busyId === item.id}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-60"
                      >
                        <X className="w-3.5 h-3.5" />
                        却下
                      </button>
                    </div>
                  )}

                  {item.status === "pending" && tab === "outgoing" && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                        <Clock className="w-3.5 h-3.5" />
                        承認待ち
                      </span>
                      <button
                        onClick={() => run(item.id, () => cancelDisclosure(item.id))}
                        disabled={busyId === item.id}
                        className="text-xs text-gray-400 hover:text-gray-600 underline disabled:opacity-50"
                      >
                        取り下げ
                      </button>
                    </div>
                  )}

                  {item.status === "approved" && (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600 flex-shrink-0">
                      <Check className="w-3.5 h-3.5" />
                      開示済み
                    </span>
                  )}
                  {item.status === "declined" && (
                    <span className="text-xs text-gray-400 flex-shrink-0">却下</span>
                  )}
                </div>
              </div>
            ))}

            {list.length === 0 && (
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                <Handshake className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">
                  {tab === "incoming" ? "届いている申請はありません" : "送った申請はありません"}
                </p>
                {tab === "outgoing" && (
                  <p className="text-xs text-gray-300 mt-1">
                    メンバーのプロフィールから「開示を申請」できます
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 却下の確認（ネイティブのconfirmは使わない） */}
      {declineTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setDeclineTarget(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-bold text-gray-900 mb-2">
              {declineTarget.other.name}さんの申請を却下しますか？
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-5">
              {platformLabel(declineTarget)}は表示されません。相手はあとから再申請できます。
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeclineTarget(null)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                やめる
              </button>
              <button
                onClick={() => {
                  const target = declineTarget;
                  setDeclineTarget(null);
                  void run(target.id, () => respondDisclosure(target.id, "decline"));
                }}
                className="px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors"
              >
                却下する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
