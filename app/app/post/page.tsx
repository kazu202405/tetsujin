"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { CalendarDays, Plus, ChevronLeft } from "lucide-react";
import type { Event, MyProfile, ParticipantRole, ToastMessage } from "./types";
import { myProfile } from "./data";
import EventCard from "./components/EventCard";
import CreateForm from "./components/CreateForm";
import ManagePanel from "./components/ManagePanel";
import JoinModal from "./components/JoinModal";
import HostSummary from "./components/HostSummary";
import Toast from "./components/Toast";
import {
  type EventRecord,
  createEvent,
  deleteEvent as deleteEventApi,
  isJoined,
  updateEvent,
  removeParticipant as removeEventParticipant,
  reviewParticipant,
  setEventJoined,
  setParticipantRole,
  setSeriesFollowing,
  transferOwnership,
  useEvents,
} from "@/lib/events-api";
import { EventCalendar } from "@/components/app/event-calendar";

function formatMonth(year: number, month: number) {
  return `${year}年${month + 1}月`;
}

// DBの行を画面が使っている Event 型へ寄せる。
// 参加承認・副管理者・オーナー委譲はまだ設計していないため、
// pendingParticipants は常に空、参加者のロールも持たせない。
function toEvent(record: EventRecord, todayIso: string): Event {
  return {
    id: record.id,
    title: record.title,
    date: record.date,
    time: record.time,
    location: record.location,
    description: record.description,
    organizer: {
      id: record.hostId ?? "",
      name: record.hostName,
      photoUrl: "",
    },
    participantCount: record.participantCount,
    participants: record.participants.map((p) => ({
      id: p.id,
      name: p.name,
      photoUrl: p.avatarUrl ?? "",
      role: p.role,
    })),
    pendingParticipants: record.pendingParticipants.map((p) => ({
      id: p.id,
      name: p.name,
      photoUrl: p.avatarUrl ?? "",
      appliedAt: "",
      message: p.message ?? undefined,
    })),
    capacity: record.capacity,
    status: record.date >= todayIso ? "upcoming" : "past",
    // 名簿の管理は主催者だけでなく副管理者もできる
    isHost: record.isManager,
    seriesId: record.seriesName ?? undefined,
  };
}

export default function PostPage() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  // イベントと参加実績は Supabase が正。マイページの参加数もここと同じ元を見る。
  const { events: eventRecords, status: eventsStatus, reload: reloadEvents } = useEvents();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    setEvents(eventRecords.map((r) => toEvent(r, todayIso)));
  }, [eventRecords, todayIso]);

  // 承認待ちも「参加ボタンを押した状態」として扱う（取り消しできるように）
  const joinedIds = useMemo(
    () => new Set(eventRecords.filter((r) => isJoined(r)).map((r) => r.id)),
    [eventRecords]
  );
  const [showCreate, setShowCreate] = useState(false);
  const [managingEventId, setManagingEventId] = useState<string | null>(null);
  // シリーズは events.series_name の自由入力なので、実データから組み立てる
  const seriesList = useMemo(() => {
    const map = new Map<string, { count: number; hostId: string; hostName: string }>();
    for (const r of eventRecords) {
      const name = r.seriesName?.trim();
      if (!name) continue;
      const entry = map.get(name);
      if (entry) entry.count += 1;
      else
        map.set(name, {
          count: 1,
          hostId: r.hostId ?? "",
          hostName: r.hostName,
        });
    }
    return Array.from(map.entries()).map(([name, v]) => ({
      id: name,
      name,
      description: "",
      organizer: { id: v.hostId, name: v.hostName, photoUrl: "" },
      totalEvents: v.count,
    }));
  }, [eventRecords]);

  // フォロー中のシリーズはサーバーの状態から組み立てる
  const followedSeriesIds = useMemo(
    () =>
      new Set(
        eventRecords
          .filter((r) => r.followingSeries && r.seriesName)
          .map((r) => r.seriesName as string)
      ),
    [eventRecords]
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
  const handleJoinClick = async (eventId: string) => {
    if (joinedIds.has(eventId)) {
      const result = await setEventJoined(eventId, false);
      if (!result.ok) {
        addToast(result.error, "error");
        return;
      }
      await reloadEvents();
      addToast("参加を取り消しました", "info");
    } else {
      setJoiningEventId(eventId);
    }
  };

  // モーダルから参加確定
  const confirmJoin = async (eventId: string, comment: string, editedProfile: MyProfile) => {
    setCurrentProfile(editedProfile);
    const result = await setEventJoined(eventId, true);
    setJoiningEventId(null);
    if (!result.ok) {
      addToast(result.error, "error");
      return;
    }
    await reloadEvents();
    addToast("参加しました");
  };

  const toggleFollowSeries = async (seriesId: string) => {
    const wasFollowed = followedSeriesIds.has(seriesId);
    const result = await setSeriesFollowing(seriesId, !wasFollowed);
    if (!result.ok) {
      addToast(result.error, "error");
      return;
    }
    await reloadEvents();
    addToast(
      wasFollowed ? "フォローを解除しました" : "シリーズをフォローしました",
      wasFollowed ? "info" : "success"
    );
  };

  // ---------- 参加者の管理（主催者・副管理者） ----------
  // 権限の判定はDB側（is_event_manager）で行うため、ここでは結果を反映するだけ。
  const runManage = async (
    action: () => Promise<{ ok: true } | { ok: false; error: string }>,
    successText: string,
    tone: ToastMessage["type"] = "success"
  ) => {
    const result = await action();
    if (!result.ok) {
      addToast(result.error, "error");
      return;
    }
    await reloadEvents();
    addToast(successText, tone);
  };

  const approveParticipant = (eventId: string, participantId: string) =>
    runManage(
      () => reviewParticipant(eventId, participantId, "approve"),
      "参加を承認しました"
    );

  const approveAllParticipants = async (eventId: string) => {
    const target = eventRecords.find((e) => e.id === eventId);
    if (!target || target.pendingParticipants.length === 0) return;

    for (const p of target.pendingParticipants) {
      const result = await reviewParticipant(eventId, p.id, "approve");
      if (!result.ok) {
        addToast(result.error, "error");
        await reloadEvents();
        return;
      }
    }
    await reloadEvents();
    addToast("全員を承認しました");
  };

  const rejectParticipant = (eventId: string, participantId: string) =>
    runManage(
      () => reviewParticipant(eventId, participantId, "decline"),
      "参加申請を拒否しました",
      "info"
    );

  const removeParticipant = (eventId: string, participantId: string) =>
    runManage(
      () => removeEventParticipant(eventId, participantId),
      "参加者を削除しました",
      "info"
    );

  const changeRole = (
    eventId: string,
    participantId: string,
    newRole: ParticipantRole
  ) => {
    if (newRole === "owner") {
      // 主催者は「委譲」でしか変えられない（主催者が2人になるのを防ぐ）
      void runManage(
        () => transferOwnership(eventId, participantId),
        "主催者権限を委譲しました"
      );
      return;
    }
    void runManage(
      () => setParticipantRole(eventId, participantId, newRole),
      `${newRole === "admin" ? "副管理者" : "一般メンバー"}に変更しました`
    );
  };

  const transferOwnershipTo = (eventId: string, newOwnerId: string) =>
    runManage(() => transferOwnership(eventId, newOwnerId), "主催者権限を委譲しました");


  // イベント編集
  const editEvent = (eventId: string, updates: Partial<Event>) =>
    runManage(
      () =>
        updateEvent(eventId, {
          title: updates.title,
          seriesName: updates.seriesId ?? undefined,
          date: updates.date,
          time: updates.time,
          location: updates.location,
          description: updates.description,
          capacity: updates.capacity,
        }),
      "イベント情報を更新しました"
    );

  // イベント削除
  const deleteEvent = async (eventId: string) => {
    const result = await deleteEventApi(eventId);
    if (!result.ok) {
      addToast(result.error, "error");
      return;
    }
    setManagingEventId(null);
    await reloadEvents();
    addToast("イベントを削除しました", "info");
  };

  // イベント作成（DBへ登録し、作成者は自動で参加者に入る）
  const handleCreate = async (newEvent: Event) => {
    const result = await createEvent({
      title: newEvent.title,
      seriesName: newEvent.seriesId ?? null,
      date: newEvent.date,
      time: newEvent.time,
      location: newEvent.location,
      description: newEvent.description,
      capacity: newEvent.capacity,
      requiresApproval: newEvent.requiresApproval === true,
    });
    if (!result.ok) {
      addToast(result.error, "error");
      return;
    }
    await reloadEvents();
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
            onTransferOwnership={transferOwnershipTo}
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
