"use client";

import { useState, useMemo, useEffect } from "react";
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
  Users,
} from "lucide-react";
import { EventCalendar } from "@/components/app/event-calendar";
import { OnboardingChecklist } from "@/components/app/onboarding-checklist";
import { MatchingSuggestions } from "@/components/app/matching-suggestions";
import { useJoinedEvents } from "@/lib/events-api";
import { useCurrentMember } from "@/lib/current-member";
import { roleLabelOf } from "@/lib/member-roles";
import { MemberAvatar } from "@/components/app/member-avatar";
import { type BoardPost, fetchPosts, formatPostedAt } from "@/lib/board-api";
import { PersonLink } from "@/components/app/person-link";

function formatMonth(year: number, month: number) {
  return `${year}年${month + 1}月`;
}

export default function MyPage() {
  const currentMember = useCurrentMember();
  const today = new Date();
  // 開催済みかどうかの判定に使う「今日」（YYYY-MM-DD）
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const myProfile = {
    name: currentMember?.name ?? "会員",
    roleTitle:
      currentMember && currentMember.role !== "user"
        ? roleLabelOf(currentMember.role)
        : currentMember?.membership_type || "会員",
    jobTitle: currentMember?.job || "職業未登録",
    headline:
      currentMember?.grip ||
      (currentMember?.member_no != null
        ? `会員番号 ${currentMember.member_no}`
        : "プロフィール情報を登録してください"),
  };

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

  // 掲示板の最新プレビュー（3件）。全文フィードは board に一本化。
  // チャンネル指定なしで新しい順に取れるので、そのまま先頭3件を出す。
  const [latestPosts, setLatestPosts] = useState<BoardPost[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetchPosts(undefined, 3)
      .then((items) => {
        if (!cancelled) setLatestPosts(items);
      })
      .catch(() => {
        if (!cancelled) setLatestPosts([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
            <MemberAvatar
              name={myProfile.name}
              url={currentMember?.avatar_url}
              className="w-16 h-16 sm:w-20 sm:h-20 text-2xl border-4 shadow-lg ring-1 ring-gray-100"
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
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/app/mypage/profile-sheet"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <FileUser className="w-3.5 h-3.5" />
                  プロフィールシート
                </Link>
                {/* つながりの設定。プロフィールシートが「見せる自分」なのに対し、
                    こちらは「探す・探される」ための条件。役割が違うので並べて置く。 */}
                <Link
                  href="/app/mypage/matching"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Users className="w-3.5 h-3.5" />
                  つながりの設定
                </Link>
              </div>
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

        {/* 今月のおすすめ（つながりマッチング） */}
        <MatchingSuggestions />

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
                <MemberAvatar
                  name={post.author.name}
                  url={post.author.avatarUrl}
                  className="w-9 h-9"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900 group-hover:text-[var(--tetsu-pink)] transition-colors truncate">
                      {post.author.name}
                    </span>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">
                      {formatPostedAt(post.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2 mt-0.5 whitespace-pre-wrap">
                    {post.content}
                  </p>
                </div>
              </Link>
            ))}
            {latestPosts.length === 0 && (
              <Link
                href="/app/board"
                className="block py-6 text-center text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                まだ投稿がありません。最初の投稿をしてみましょう
              </Link>
            )}
          </div>
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
                      event.date < todayIso
                        ? "border-gray-100"
                        : "border-2 border-amber-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h5 className="text-base font-bold text-gray-900">
                        {event.title}
                      </h5>
                      {event.isMine && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${
                            event.date < todayIso
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
                          <PersonLink key={p.id} id={p.id} title={p.name}>
                            <MemberAvatar name={p.name} url={p.avatarUrl} size="sm" />
                          </PersonLink>
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
