"use client";

import { useState } from "react";
import {
  Shield,
  Crown,
  ShieldCheck,
  UserCheck,
  UserX,
  Users,
  X,
  ChevronDown,
  ChevronUp,
  ArrowRightLeft,
  Pencil,
  Trash2,
  Search,
} from "lucide-react";
import type { Event, ParticipantRole } from "../types";

interface ManagePanelProps {
  event: Event;
  onClose: () => void;
  onApprove: (eventId: string, participantId: string) => void;
  onReject: (eventId: string, participantId: string) => void;
  onApproveAll: (eventId: string) => void;
  onRemove: (eventId: string, participantId: string) => void;
  onChangeRole: (
    eventId: string,
    participantId: string,
    role: ParticipantRole
  ) => void;
  onTransferOwnership: (eventId: string, newOwnerId: string) => void;
  onEditEvent: (eventId: string, updates: Partial<Event>) => void;
  onDeleteEvent: (eventId: string) => void;
}

type ManageTab = "participants" | "roles" | "settings";

export default function ManagePanel({
  event,
  onClose,
  onApprove,
  onReject,
  onApproveAll,
  onRemove,
  onChangeRole,
  onTransferOwnership,
  onEditEvent,
  onDeleteEvent,
}: ManagePanelProps) {
  const [tab, setTab] = useState<ManageTab>("participants");
  const [transferConfirmId, setTransferConfirmId] = useState<string | null>(
    null
  );
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // 設定タブ用の編集state
  const [editTitle, setEditTitle] = useState(event.title);
  const [editDate, setEditDate] = useState(event.date);
  const [editTime, setEditTime] = useState(event.time);
  const [editLocation, setEditLocation] = useState(event.location);
  const [editDescription, setEditDescription] = useState(event.description);
  const [editCapacity, setEditCapacity] = useState(
    event.capacity?.toString() ?? ""
  );

  const isPast = event.status === "past";

  const filteredParticipants = event.participants.filter((p) =>
    searchQuery ? p.name.includes(searchQuery) : true
  );

  const isFull =
    event.capacity !== null && event.participants.length >= event.capacity;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* オーバーレイ */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* モーダル本体 */}
      <div className="relative w-full sm:max-w-lg max-h-[85vh] overflow-y-auto bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-5 sm:p-6">
        {/* ヘッダー */}
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
          <img
            src={event.organizer.photoUrl}
            alt={event.organizer.name}
            className="w-8 h-8 rounded-full object-cover border-2 border-white shadow"
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-gray-900 truncate">{event.title}</h3>
            <p className="text-[11px] text-gray-400">{event.date} {event.time}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* タブ切り替え */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setTab("participants")}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
              tab === "participants"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            参加者
          </button>
          <button
            onClick={() => {
              setTab("roles");
              setTransferConfirmId(null);
            }}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
              tab === "roles"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            権限
          </button>
          {!isPast && (
            <button
              onClick={() => setTab("settings")}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                tab === "settings"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Pencil className="w-3.5 h-3.5" />
              設定
            </button>
          )}
        </div>
      </div>

      {/* 参加者タブ */}
      {tab === "participants" && (
        <>
          {/* 定員情報 */}
          <div className="flex items-center gap-4 mb-4 p-3 bg-gray-50 rounded-xl text-sm">
            <div>
              <span className="text-gray-500">参加者</span>
              <span className="ml-1 font-bold text-gray-900">
                {event.participants.length}人
              </span>
            </div>
            <div>
              <span className="text-gray-500">定員</span>
              <span
                className={`ml-1 font-bold ${isFull ? "text-red-600" : "text-gray-900"}`}
              >
                {event.capacity ?? "無制限"}
              </span>
            </div>
            {!isPast && (
              <div>
                <span className="text-gray-500">申請中</span>
                <span
                  className={`ml-1 font-bold ${event.pendingParticipants.length > 0 ? "text-red-600" : "text-gray-900"}`}
                >
                  {event.pendingParticipants.length}人
                </span>
              </div>
            )}
            {isFull && (
              <span className="ml-auto px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                満員
              </span>
            )}
          </div>

          {/* 申請中の参加者（upcomingのみ） */}
          {!isPast && event.pendingParticipants.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h6 className="text-xs font-bold text-amber-700 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  承認待ち（{event.pendingParticipants.length}件）
                </h6>
                {event.pendingParticipants.length > 1 && (
                  <button
                    onClick={() => onApproveAll(event.id)}
                    className="inline-flex items-center gap-0.5 px-2.5 py-1 rounded-lg bg-green-600 text-white text-[10px] font-bold hover:bg-green-700 transition-colors"
                  >
                    <UserCheck className="w-3 h-3" />
                    全員承認
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {event.pendingParticipants.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl"
                  >
                    <img
                      src={p.photoUrl}
                      alt={p.name}
                      className="w-9 h-9 rounded-full object-cover border-2 border-white shadow flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">
                          {p.name}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {p.appliedAt}
                        </span>
                      </div>
                      {p.message && (
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                          {p.message}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => onApprove(event.id, p.id)}
                        className="inline-flex items-center gap-0.5 px-2.5 py-1.5 rounded-lg bg-green-600 text-white text-[11px] font-bold hover:bg-green-700 transition-colors"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        承認
                      </button>
                      <button
                        onClick={() => onReject(event.id, p.id)}
                        className="inline-flex items-center gap-0.5 px-2.5 py-1.5 rounded-lg bg-gray-200 text-gray-600 text-[11px] font-bold hover:bg-gray-300 transition-colors"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        拒否
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 参加者検索 */}
          {event.participants.length > 5 && (
            <div className="mb-3 relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="名前で検索..."
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
          )}

          {/* 参加確定メンバー一覧 */}
          <div>
            <h6 className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              参加確定（{event.participants.length}人）
            </h6>
            <div className="space-y-1.5">
              {filteredParticipants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors group"
                >
                  <img
                    src={p.photoUrl}
                    alt={p.name}
                    className="w-8 h-8 rounded-full object-cover border-2 border-white shadow"
                  />
                  <span className="text-sm text-gray-900 flex-1">
                    {p.name}
                  </span>
                  {p.role === "owner" ? (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 font-bold">
                      <Crown className="w-3 h-3" />
                      主催者
                    </span>
                  ) : p.role === "admin" ? (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-indigo-500 font-bold">
                      <ShieldCheck className="w-3 h-3" />
                      副管理者
                    </span>
                  ) : !isPast ? (
                    <button
                      onClick={() => onRemove(event.id, p.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"
                      title="参加者を削除"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span className="text-[10px] text-gray-400">メンバー</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* 権限タブ */}
      {tab === "roles" && (
        <>
          {/* 権限の説明 */}
          <div className="mb-4 p-3 bg-gray-50 rounded-xl">
            <div className="space-y-1.5 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <Crown className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <span>
                  <span className="font-bold text-gray-700">主催者</span> —
                  全権限（編集・削除・権限管理・委譲）
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                <span>
                  <span className="font-bold text-gray-700">副管理者</span> —
                  参加者の承認・拒否・削除
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span>
                  <span className="font-bold text-gray-700">一般</span> —
                  閲覧・参加のみ
                </span>
              </div>
            </div>
          </div>

          {/* メンバーごとの権限管理 */}
          <div className="space-y-2">
            {event.participants.map((p) => {
              const isOwner = p.role === "owner";
              const isAdmin = p.role === "admin";
              const isTransferTarget = transferConfirmId === p.id;

              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                    isTransferTarget
                      ? "border-amber-300 bg-amber-50"
                      : "border-gray-100 bg-white"
                  }`}
                >
                  <img
                    src={p.photoUrl}
                    alt={p.name}
                    className="w-9 h-9 rounded-full object-cover border-2 border-white shadow flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-gray-900">
                        {p.name}
                      </span>
                      {isOwner && (
                        <Crown className="w-3.5 h-3.5 text-amber-500" />
                      )}
                      {isAdmin && (
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400">
                      {isOwner
                        ? "主催者"
                        : isAdmin
                          ? "副管理者"
                          : "一般メンバー"}
                    </span>
                  </div>

                  {isPast ? (
                    <span className="text-[10px] text-gray-400 font-medium flex-shrink-0">
                      閲覧のみ
                    </span>
                  ) : isOwner ? (
                    <span className="text-[10px] text-gray-400 font-medium flex-shrink-0">
                      変更不可
                    </span>
                  ) : isTransferTarget ? (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[10px] text-amber-700 font-bold">
                        委譲しますか？
                      </span>
                      <button
                        onClick={() => onTransferOwnership(event.id, p.id)}
                        className="px-2 py-1 rounded-md bg-amber-500 text-white text-[10px] font-bold hover:bg-amber-600 transition-colors"
                      >
                        確定
                      </button>
                      <button
                        onClick={() => setTransferConfirmId(null)}
                        className="px-2 py-1 rounded-md bg-gray-200 text-gray-600 text-[10px] font-bold hover:bg-gray-300 transition-colors"
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isAdmin ? (
                        <button
                          onClick={() =>
                            onChangeRole(event.id, p.id, "member")
                          }
                          className="inline-flex items-center gap-0.5 px-2 py-1 rounded-md bg-gray-100 text-gray-600 text-[10px] font-bold hover:bg-gray-200 transition-colors"
                          title="一般に降格"
                        >
                          <ChevronDown className="w-3 h-3" />
                          一般へ
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            onChangeRole(event.id, p.id, "admin")
                          }
                          className="inline-flex items-center gap-0.5 px-2 py-1 rounded-md bg-indigo-50 text-indigo-600 text-[10px] font-bold hover:bg-indigo-100 transition-colors"
                          title="副管理者に昇格"
                        >
                          <ChevronUp className="w-3 h-3" />
                          副管理者へ
                        </button>
                      )}
                      <button
                        onClick={() => setTransferConfirmId(p.id)}
                        className="inline-flex items-center gap-0.5 px-2 py-1 rounded-md bg-amber-50 text-amber-600 text-[10px] font-bold hover:bg-amber-100 transition-colors"
                        title="主催者権限を委譲"
                      >
                        <ArrowRightLeft className="w-3 h-3" />
                        委譲
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* 設定タブ（upcomingのみ） */}
      {tab === "settings" && !isPast && (
        <>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                タイトル
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  日付
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  時間
                </label>
                <input
                  type="text"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  場所
                </label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  定員
                </label>
                <input
                  type="number"
                  value={editCapacity}
                  onChange={(e) => setEditCapacity(e.target.value)}
                  placeholder="無制限"
                  min={1}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                説明
              </label>
              <textarea
                rows={2}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              {/* 削除 */}
              {!deleteConfirm ? (
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  会を削除
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-600 font-bold">
                    本当に削除しますか？
                  </span>
                  <button
                    onClick={() => onDeleteEvent(event.id)}
                    className="px-2.5 py-1 rounded-md bg-red-600 text-white text-[10px] font-bold hover:bg-red-700 transition-colors"
                  >
                    削除する
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    className="px-2.5 py-1 rounded-md bg-gray-200 text-gray-600 text-[10px] font-bold hover:bg-gray-300 transition-colors"
                  >
                    取消
                  </button>
                </div>
              )}

              {/* 保存 */}
              <button
                onClick={() => {
                  onEditEvent(event.id, {
                    title: editTitle,
                    date: editDate,
                    time: editTime,
                    location: editLocation,
                    description: editDescription,
                    capacity: editCapacity
                      ? parseInt(editCapacity, 10)
                      : null,
                  });
                }}
                className="inline-flex items-center gap-1 px-4 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 transition-colors"
              >
                保存する
              </button>
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  );
}
