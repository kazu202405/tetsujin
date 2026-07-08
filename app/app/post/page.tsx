"use client";

import { useState, useMemo, useCallback } from "react";
import { CalendarDays, Plus, ChevronLeft } from "lucide-react";
import type { Event, MyProfile, ParticipantRole, ToastMessage } from "./types";
import { myProfile, seriesList, initialEvents } from "./data";
import EventCard from "./components/EventCard";
import CreateForm from "./components/CreateForm";
import ManagePanel from "./components/ManagePanel";
import JoinModal from "./components/JoinModal";
import HostSummary from "./components/HostSummary";
import Toast from "./components/Toast";
import { useJoinedEventIds, setEventJoined } from "@/lib/event-participation";
import { EventCalendar } from "@/components/app/event-calendar";

function formatMonth(year: number, month: number) {
  return `${year}年${month + 1}月`;
}

export default function PostPage() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>(initialEvents);
  // 参加状態は単一ソース（lib/event-participation）から購読。mypage と同期する。
  const joinedIds = useJoinedEventIds();
  const [showCreate, setShowCreate] = useState(false);
  const [managingEventId, setManagingEventId] = useState<string | null>(null);
  const [followedSeriesIds, setFollowedSeriesIds] = useState<Set<string>>(
    new Set(["s1"])
  );
  const [joiningEventId, setJoiningEventId] = useState<string | null>(null);
  const [currentProfile, setCurrentProfile] = useState<MyProfile>(myProfile);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // トースト通知
  const addToast = useCallback(
    (text: string, type: ToastMessage["type"] = "success") => {
      const id = `t-${Date.now()}`;
      setToasts((prev) => [...prev, { id, text, type }]);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // イベントがある日付のマップ
  const eventDateMap = useMemo(() => {
    const map = new Map<string, number>();
    events.forEach((e) => {
      map.set(e.date, (map.get(e.date) || 0) + 1);
    });
    return map;
  }, [events]);

  // 選択日 or 当月のイベント
  const visibleEvents = useMemo(() => {
    if (selectedDate) {
      return events.filter((e) => e.date === selectedDate);
    }
    const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
    return events.filter((e) => e.date.startsWith(prefix));
  }, [selectedDate, viewYear, viewMonth, events]);

  // カレンダーのドット表示日（イベント開催日）
  const markedDates = useMemo(
    () => new Set(eventDateMap.keys()),
    [eventDateMap]
  );

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
    setSelectedDate(null);
  };

  // 参加ボタン: 未参加→モーダル表示、参加済み→直接取り消し
  const handleJoinClick = (eventId: string) => {
    if (joinedIds.has(eventId)) {
      setEventJoined(eventId, false);
      addToast("参加を取り消しました", "info");
    } else {
      setJoiningEventId(eventId);
    }
  };

  // モーダルから参加確定
  const confirmJoin = (eventId: string, comment: string, editedProfile: MyProfile) => {
    setCurrentProfile(editedProfile);
    setEventJoined(eventId, true);
    setJoiningEventId(null);
    addToast("参加を申請しました");
  };

  const toggleFollowSeries = (seriesId: string) => {
    const wasFollowed = followedSeriesIds.has(seriesId);
    setFollowedSeriesIds((prev) => {
      const next = new Set(prev);
      if (next.has(seriesId)) {
        next.delete(seriesId);
      } else {
        next.add(seriesId);
      }
      return next;
    });
    addToast(wasFollowed ? "フォローを解除しました" : "シリーズをフォローしました", wasFollowed ? "info" : "success");
  };

  // 参加申請を承認
  const approveParticipant = (eventId: string, participantId: string) => {
    setEvents((prev) =>
      prev.map((ev) => {
        if (ev.id !== eventId) return ev;
        const pending = ev.pendingParticipants.find(
          (p) => p.id === participantId
        );
        if (!pending) return ev;
        return {
          ...ev,
          participants: [
            ...ev.participants,
            {
              id: pending.id,
              name: pending.name,
              photoUrl: pending.photoUrl,
              role: "member" as ParticipantRole,
            },
          ],
          pendingParticipants: ev.pendingParticipants.filter(
            (p) => p.id !== participantId
          ),
          participantCount: ev.participantCount + 1,
        };
      })
    );
    addToast("参加を承認しました");
  };

  // 全員承認
  const approveAllParticipants = (eventId: string) => {
    setEvents((prev) =>
      prev.map((ev) => {
        if (ev.id !== eventId) return ev;
        const newParticipants = ev.pendingParticipants.map((p) => ({
          id: p.id,
          name: p.name,
          photoUrl: p.photoUrl,
          role: "member" as ParticipantRole,
        }));
        return {
          ...ev,
          participants: [...ev.participants, ...newParticipants],
          pendingParticipants: [],
          participantCount:
            ev.participantCount + ev.pendingParticipants.length,
        };
      })
    );
    addToast("全員を承認しました");
  };

  // 参加申請を拒否
  const rejectParticipant = (eventId: string, participantId: string) => {
    setEvents((prev) =>
      prev.map((ev) => {
        if (ev.id !== eventId) return ev;
        return {
          ...ev,
          pendingParticipants: ev.pendingParticipants.filter(
            (p) => p.id !== participantId
          ),
        };
      })
    );
    addToast("参加申請を拒否しました", "info");
  };

  // 参加者を削除
  const removeParticipant = (eventId: string, participantId: string) => {
    setEvents((prev) =>
      prev.map((ev) => {
        if (ev.id !== eventId) return ev;
        return {
          ...ev,
          participants: ev.participants.filter((p) => p.id !== participantId),
          participantCount: ev.participantCount - 1,
        };
      })
    );
    addToast("参加者を削除しました", "info");
  };

  // ロール変更
  const changeRole = (
    eventId: string,
    participantId: string,
    newRole: ParticipantRole
  ) => {
    setEvents((prev) =>
      prev.map((ev) => {
        if (ev.id !== eventId) return ev;
        return {
          ...ev,
          participants: ev.participants.map((p) =>
            p.id === participantId ? { ...p, role: newRole } : p
          ),
        };
      })
    );
    const roleLabel = newRole === "admin" ? "副管理者" : "一般メンバー";
    addToast(`${roleLabel}に変更しました`);
  };

  // オーナー権限を委譲
  const transferOwnership = (eventId: string, newOwnerId: string) => {
    setEvents((prev) =>
      prev.map((ev) => {
        if (ev.id !== eventId) return ev;
        const newOwner = ev.participants.find((p) => p.id === newOwnerId);
        if (!newOwner) return ev;
        return {
          ...ev,
          organizer: {
            id: newOwner.id,
            name: newOwner.name,
            photoUrl: newOwner.photoUrl,
          },
          participants: ev.participants.map((p) => {
            if (p.id === newOwnerId)
              return { ...p, role: "owner" as ParticipantRole };
            if (p.role === "owner")
              return { ...p, role: "admin" as ParticipantRole };
            return p;
          }),
        };
      })
    );
    addToast("主催者権限を委譲しました");
  };

  // イベント編集
  const editEvent = (eventId: string, updates: Partial<Event>) => {
    setEvents((prev) =>
      prev.map((ev) => (ev.id === eventId ? { ...ev, ...updates } : ev))
    );
    addToast("イベント情報を更新しました");
  };

  // イベント削除
  const deleteEvent = (eventId: string) => {
    setEvents((prev) => prev.filter((ev) => ev.id !== eventId));
    setManagingEventId(null);
    addToast("イベントを削除しました", "info");
  };

  // イベント作成
  const handleCreate = (newEvent: Event) => {
    setEvents((prev) => [newEvent, ...prev]);
    setEventJoined(newEvent.id, true);
    setShowCreate(false);
    addToast("新しい会を作成しました");
  };

  // 主催イベントのリマインド文面を生成してクリップボードにコピー
  // （実際の一斉配信はしない。運営が LINE/メールへ貼り付けて送る前提）
  // TODO: 自動配信は入金後に Supabase + プッシュ/メール送信で対応
  const handleCopyReminder = async (ev: Event) => {
    const text = `【リマインド】${ev.title}\n${ev.date} ${ev.time}／${ev.location}\nご参加お待ちしております！`;
    try {
      await navigator.clipboard.writeText(text);
      addToast("文面をコピーしました。LINE/メールに貼り付けて送信してください");
    } catch {
      addToast("コピーに失敗しました", "error");
    }
  };

  // サイドバーから管理パネルを開く
  const handleManageFromSidebar = (eventId: string) => {
    setManagingEventId(eventId);
    // そのイベントが見えるように月を合わせる
    const ev = events.find((e) => e.id === eventId);
    if (ev) {
      const [y, m] = ev.date.split("-").map(Number);
      setViewYear(y);
      setViewMonth(m - 1);
      setSelectedDate(null);
    }
  };

  return (
    <div className="min-h-screen">
      {/* ヘッダー */}
      <div className="sticky top-14 lg:top-0 z-30 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">会を探す</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                カレンダーからイベントを探して参加しよう
              </p>
            </div>
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              会を作成
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24">
        {/* 2カラムレイアウト */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* 左カラム: カレンダー + サマリー */}
          <div className="lg:col-span-2 space-y-4">
            <EventCalendar
              viewYear={viewYear}
              viewMonth={viewMonth}
              selectedDate={selectedDate}
              markedDates={markedDates}
              onPrevMonth={prevMonth}
              onNextMonth={nextMonth}
              onSelectDate={setSelectedDate}
              legendLabel="イベントあり"
            />

            {/* 主催イベントサマリー + フォロー中シリーズ */}
            <div className="hidden lg:block">
              <HostSummary
                events={events}
                seriesList={seriesList}
                followedSeriesIds={followedSeriesIds}
                onToggleFollowSeries={toggleFollowSeries}
                onManageEvent={handleManageFromSidebar}
              />
            </div>
          </div>

          {/* 右カラム: イベント一覧 + 作成フォーム */}
          <div className="lg:col-span-3">
            {/* 作成フォーム */}
            {showCreate && (
              <CreateForm
                myProfile={currentProfile}
                seriesList={seriesList}
                onClose={() => setShowCreate(false)}
                onCreate={handleCreate}
              />
            )}

            {/* イベント一覧ヘッダー */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">
                {selectedDate
                  ? `${selectedDate} のイベント`
                  : `${formatMonth(viewYear, viewMonth)} のイベント`}
              </h3>
              {selectedDate && (
                <button
                  onClick={() => setSelectedDate(null)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  月全体を表示
                </button>
              )}
            </div>

            {/* イベントカード一覧 */}
            {visibleEvents.length > 0 ? (
              <div className="space-y-4">
                {visibleEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    isJoined={joinedIds.has(event.id)}
                    seriesList={seriesList}
                    followedSeriesIds={followedSeriesIds}
                    managingEventId={managingEventId}
                    allEvents={events}
                    onToggleJoin={handleJoinClick}
                    onSetManagingEventId={setManagingEventId}
                    onToggleFollowSeries={toggleFollowSeries}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                <CalendarDays className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">
                  {selectedDate
                    ? "この日のイベントはありません"
                    : "この月のイベントはありません"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 管理モーダル */}
      {managingEventId && (() => {
        const managingEvent = events.find((e) => e.id === managingEventId);
        if (!managingEvent) return null;
        return (
          <ManagePanel
            event={managingEvent}
            onClose={() => setManagingEventId(null)}
            onApprove={approveParticipant}
            onReject={rejectParticipant}
            onApproveAll={approveAllParticipants}
            onRemove={removeParticipant}
            onChangeRole={changeRole}
            onTransferOwnership={transferOwnership}
            onEditEvent={editEvent}
            onDeleteEvent={deleteEvent}
            onCopyReminder={handleCopyReminder}
          />
        );
      })()}

      {/* 参加申請モーダル */}
      {joiningEventId && (() => {
        const joiningEvent = events.find((e) => e.id === joiningEventId);
        if (!joiningEvent) return null;
        return (
          <JoinModal
            event={joiningEvent}
            profile={currentProfile}
            onClose={() => setJoiningEventId(null)}
            onConfirm={confirmJoin}
          />
        );
      })()}

      {/* トースト通知 */}
      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
