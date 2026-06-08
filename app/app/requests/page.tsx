"use client";

import { useState } from "react";
import Link from "next/link";
import {
  UserPlus,
  Inbox,
  Send,
  Check,
  X,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  useDisclosureRequests,
  respondToRequest,
  cancelDisclosureRequest,
  DisclosureRequest,
  DisclosureStatus,
} from "@/lib/disclosure-data";
import { CURRENT_USER_ID } from "@/lib/connections-data";
import { dashboardMembers } from "@/lib/dashboard-data";
import { SOCIAL_PLATFORM_META } from "@/lib/social-links";
import { formatRelativeTime } from "@/lib/notifications-data";

type Tab = "incoming" | "outgoing";

function member(id: string) {
  return dashboardMembers.find((m) => m.id === id);
}

// ステータスのチップ
function StatusChip({ status }: { status: DisclosureStatus }) {
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 text-[11px] font-bold border border-amber-200">
        <Clock className="w-3 h-3" />
        承認待ち
      </span>
    );
  }
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 text-green-600 text-[11px] font-bold border border-green-200">
        <CheckCircle2 className="w-3 h-3" />
        承認済み
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 text-[11px] font-bold border border-gray-200">
      <XCircle className="w-3 h-3" />
      却下
    </span>
  );
}

// 1件のリクエスト行
function RequestRow({
  req,
  perspective,
  onApprove,
  onDecline,
  onCancel,
}: {
  req: DisclosureRequest;
  perspective: Tab;
  onApprove?: () => void;
  onDecline?: () => void;
  onCancel?: () => void;
}) {
  // incoming は申請者、outgoing は相手（持ち主）を表示
  const otherId = perspective === "incoming" ? req.fromMemberId : req.toMemberId;
  const m = member(otherId);
  const platformLabel = SOCIAL_PLATFORM_META[req.platform].label;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start gap-3">
        <Link href={`/app/profile/${otherId}`} className="flex-shrink-0">
          <img
            src={m?.photoUrl}
            alt={m?.name}
            className="w-11 h-11 rounded-full object-cover border-2 border-white shadow ring-1 ring-gray-100 hover:ring-amber-300 transition-all"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                href={`/app/profile/${otherId}`}
                className="text-sm font-bold text-gray-900 hover:text-amber-700 transition-colors"
              >
                {m?.name ?? "メンバー"}
              </Link>
              <p className="text-xs text-gray-400">{m?.roleTitle}</p>
            </div>
            <StatusChip status={req.status} />
          </div>
          <p className="text-sm text-gray-600 mt-2 leading-relaxed">
            {perspective === "incoming" ? (
              <>
                あなたの
                <span className="font-bold text-gray-900">
                  {platformLabel}
                </span>
                の開示を申請しています。
              </>
            ) : (
              <>
                <span className="font-bold text-gray-900">
                  {platformLabel}
                </span>
                の開示を申請しました。
              </>
            )}
          </p>
          <p className="text-[11px] text-gray-400 mt-1">
            {formatRelativeTime(req.respondedAt ?? req.createdAt)}
          </p>

          {/* incoming かつ pending のときだけ承認/却下 */}
          {perspective === "incoming" && req.status === "pending" && (
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={onApprove}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--tetsu-pink)] text-white text-sm font-bold hover:opacity-90 transition-opacity"
              >
                <Check className="w-4 h-4" />
                承認する
              </button>
              <button
                onClick={onDecline}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <X className="w-4 h-4" />
                却下
              </button>
            </div>
          )}

          {/* outgoing かつ pending のときは取り下げ */}
          {perspective === "outgoing" && req.status === "pending" && (
            <div className="mt-3">
              <button
                onClick={onCancel}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <X className="w-4 h-4" />
                申請を取り下げる
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RequestsPage() {
  const requests = useDisclosureRequests();
  const [tab, setTab] = useState<Tab>("incoming");
  // 却下確認モーダル（ネイティブ confirm は使わない方針）
  const [declineTarget, setDeclineTarget] = useState<DisclosureRequest | null>(
    null
  );

  const incoming = requests
    .filter((r) => r.toMemberId === CURRENT_USER_ID)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  const outgoing = requests
    .filter((r) => r.fromMemberId === CURRENT_USER_ID)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const incomingPending = incoming.filter((r) => r.status === "pending").length;
  const list = tab === "incoming" ? incoming : outgoing;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-14 lg:top-0 z-30 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[var(--tetsu-pink)]" />
            <h1 className="text-xl font-bold text-gray-900">つながり申請</h1>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            SNSの開示申請と承認を管理します
          </p>

          {/* Tabs */}
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={() => setTab("incoming")}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-colors ${
                tab === "incoming"
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
              }`}
            >
              <Inbox className="w-4 h-4" />
              受信
              {incomingPending > 0 && (
                <span
                  className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold leading-none ${
                    tab === "incoming"
                      ? "bg-white text-gray-900"
                      : "bg-[var(--tetsu-pink)] text-white"
                  }`}
                >
                  {incomingPending}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab("outgoing")}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-colors ${
                tab === "outgoing"
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
              }`}
            >
              <Send className="w-4 h-4" />
              送信
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {list.length === 0 ? (
          <div className="text-center py-20">
            {tab === "incoming" ? (
              <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            ) : (
              <Send className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            )}
            <p className="text-gray-400">
              {tab === "incoming"
                ? "受信した申請はありません"
                : "送信した申請はありません"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((req) => (
              <RequestRow
                key={req.id}
                req={req}
                perspective={tab}
                onApprove={() => respondToRequest(req.id, "approved")}
                onDecline={() => setDeclineTarget(req)}
                onCancel={() => cancelDisclosureRequest(req.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 却下確認モーダル */}
      {declineTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setDeclineTarget(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <XCircle className="w-5 h-5 text-gray-500" />
              </div>
              <h2 className="text-base font-bold text-gray-900">
                申請を却下しますか？
              </h2>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed mb-5">
              {member(declineTarget.fromMemberId)?.name}さんへの
              {SOCIAL_PLATFORM_META[declineTarget.platform].label}
              は開示されません。相手にお知らせは届きません。
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
                  respondToRequest(declineTarget.id, "declined");
                  setDeclineTarget(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors"
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
