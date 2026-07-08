"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  CalendarDays,
  MapPin,
  Clock,
  FileUser,
  Search,
  Handshake,
  MessageCircle,
  ChevronRight,
} from "lucide-react";
import { SocialLinksSection } from "@/components/app/social-links-section";
import { members } from "@/lib/mock-data";
import { CURRENT_USER_ID } from "@/lib/connections-data";
import { EventCalendar } from "@/components/app/event-calendar";
import { OnboardingChecklist } from "@/components/app/onboarding-checklist";
import { useJoinedEvents } from "@/lib/event-participation";
import { mockPosts } from "@/app/app/board/data";

// --- Mock: my profile ---
const myProfile = {
  name: "田中 一郎",
  photoUrl:
    "https://images.unsplash.com/photo-1630572780329-e051273e980f?w=400&h=400&fit=crop&crop=face",
  roleTitle: "代表取締役",
  jobTitle: "経営コンサルタント",
  headline: "人の可能性を信じ、組織を変える",
};

function formatMonth(year: number, month: number) {
  return `${year}年${month + 1}月`;
}

export default function MyPage() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // 参加イベント（単一ソースから購読）
  const joinedEvents = useJoinedEvents();

  // カレンダーのドット表示日（参加イベントの開催日）
  const markedDates = useMemo(
    () => new Set(joinedEvents.map((e) => e.date)),
    [joinedEvents]
  );

  // 今月（実際の現在月）に参加したイベント数 + 累計
  const thisMonthPrefix = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}`;
  const eventsThisMonth = joinedEvents.filter((e) =>
    e.date.startsWith(thisMonthPrefix)
  ).length;
  const eventsTotal = joinedEvents.length;

  // 選択日 or 表示中の月の参加イベント
  const visibleEvents = useMemo(() => {
    const list = selectedDate
      ? joinedEvents.filter((e) => e.date === selectedDate)
      : joinedEvents.filter((e) =>
          e.date.startsWith(
            `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`
          )
        );
    // 日付昇順
    return [...list].sort((a, b) => a.date.localeCompare(b.date));
  }, [selectedDate, viewYear, viewMonth, joinedEvents]);

  // 掲示板の最新プレビュー（3件・投稿日時の新しい順）。全文フィードは board に一本化。
  const latestPosts = useMemo(
    () => [...mockPosts].sort((a, b) => b.postedAt.localeCompare(a.postedAt)).slice(0, 3),
    []
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

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-14 lg:top-0 z-30 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-xl font-bold text-gray-900">マイページ</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24">
        {/* 使い始めチェックリスト（自動判定・×で閉じる・全完了で消える） */}
        <OnboardingChecklist />

        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 mb-6">
          <div className="flex flex-row items-start gap-4 sm:gap-6">
            <img
              src={myProfile.photoUrl}
              alt={myProfile.name}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-4 border-white shadow-lg ring-1 ring-gray-100 flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h2
                className="text-2xl font-bold text-gray-900 mb-1"
                style={{ fontFamily: "'Noto Serif JP', serif" }}
              >
                {myProfile.name}
              </h2>
              <p className="text-gray-500 mb-4">
                {myProfile.roleTitle} / {myProfile.jobTitle}
              </p>
              <p className="text-gray-600 leading-relaxed border-l-4 border-amber-300 pl-4 text-sm mb-4">
                {myProfile.headline}
              </p>
              <Link
                href="/app/mypage/profile-sheet"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <FileUser className="w-3.5 h-3.5" />
                プロフィールシート
              </Link>
            </div>
          </div>
        </div>

        {/* 主動線: 会を探す（主役） + 参加した会サマリー */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {/* 会を探す（主動線・目立たせる） */}
          <Link
            href="/app/post"
            className="sm:col-span-2 group bg-[var(--tetsu-pink)] rounded-2xl shadow-sm p-6 flex items-center gap-4 hover:bg-[var(--tetsu-pink-light)] transition-colors"
          >
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Search className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold text-white">会を探す</p>
              <p className="text-sm text-white/80">
                カレンダーからイベントを探して参加しよう
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-white/80 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
          </Link>

          {/* 参加した会（今月＋累計） */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col justify-center">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <CalendarDays className="w-4 h-4" />
              <span className="text-xs font-medium">今月参加した会</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 leading-none">
              {eventsThisMonth}
              <span className="text-sm font-medium text-gray-400 ml-1">件</span>
            </p>
            <p className="text-xs text-gray-400 mt-2">累計 {eventsTotal}件</p>
          </div>
        </div>

        {/* 掲示板 最新プレビュー */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-[var(--tetsu-pink)]" />
              掲示板の最新
            </h3>
            <Link
              href="/app/board"
              className="inline-flex items-center gap-1 text-xs font-bold text-[var(--tetsu-pink)] hover:underline"
            >
              掲示板を全部見る
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {latestPosts.map((post) => (
              <Link
                key={post.id}
                href="/app/board"
                className="flex items-start gap-3 py-3 first:pt-0 last:pb-0 group"
              >
                <img
                  src={post.author.photoUrl}
                  alt={post.author.name}
                  className="w-9 h-9 rounded-full object-cover border-2 border-white shadow flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900 group-hover:text-[var(--tetsu-pink)] transition-colors truncate">
                      {post.author.name}
                    </span>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">
                      {post.postedAt}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2 mt-0.5 whitespace-pre-wrap">
                    {post.content}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* SNSリンク */}
        <div className="mb-8">
          <SocialLinksSection
            ownerMode={{
              memberId: CURRENT_USER_ID,
              initialLinks:
                members.find((m) => m.id === CURRENT_USER_ID)?.socialLinks ?? [],
            }}
          />
        </div>

        {/* カレンダー（参加イベント） + 参加リスト */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-gray-400" />
            参加した会
          </h3>
          {/* 出会いの記録は主動線から格下げ（ナビ/ドロワーにも導線あり） */}
          <Link
            href="/app/connections"
            className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors"
          >
            <Handshake className="w-3.5 h-3.5" />
            出会いの記録
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <EventCalendar
              viewYear={viewYear}
              viewMonth={viewMonth}
              selectedDate={selectedDate}
              markedDates={markedDates}
              onPrevMonth={prevMonth}
              onNextMonth={nextMonth}
              onSelectDate={setSelectedDate}
              legendLabel="参加した会"
            />
          </div>

          {/* 参加イベント一覧 */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-gray-900">
                {selectedDate
                  ? `${selectedDate} の参加`
                  : `${formatMonth(viewYear, viewMonth)} の参加`}
              </h4>
              {selectedDate && (
                <button
                  onClick={() => setSelectedDate(null)}
                  className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
                >
                  月全体を表示
                </button>
              )}
            </div>

            {visibleEvents.length > 0 ? (
              <div className="space-y-3">
                {visibleEvents.map((event) => (
                  <div
                    key={event.id}
                    className={`bg-white rounded-2xl border shadow-sm p-5 ${
                      event.status === "past"
                        ? "border-gray-100"
                        : "border-2 border-amber-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h5 className="text-base font-bold text-gray-900">
                        {event.title}
                      </h5>
                      {event.isHost && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${
                            event.status === "past"
                              ? "bg-gray-200 text-gray-600"
                              : "bg-gray-900 text-white"
                          }`}
                        >
                          主催
                        </span>
                      )}
                    </div>
                    <div className="space-y-1.5 text-sm text-gray-500 mb-3">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-gray-400" />
                        <span>{event.date}</span>
                        <Clock className="w-4 h-4 text-gray-400 ml-2" />
                        <span>{event.time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span>{event.location}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {event.participants.slice(0, 5).map((p) => (
                          <img
                            key={p.id}
                            src={p.photoUrl}
                            alt=""
                            className="w-7 h-7 rounded-full object-cover border-2 border-white shadow"
                          />
                        ))}
                      </div>
                      <span className="text-xs text-gray-500">
                        {event.participantCount}人参加
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                <CalendarDays className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400 mb-3">
                  {selectedDate
                    ? "この日の参加はありません"
                    : "この月の参加はありません"}
                </p>
                <Link
                  href="/app/post"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 transition-colors"
                >
                  <Search className="w-3.5 h-3.5" />
                  会を探す
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
