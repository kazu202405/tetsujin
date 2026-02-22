"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Settings,
  ChevronLeft,
  ChevronRight,
  Handshake,
  CalendarDays,
  MapPin,
  Clock,
  Eye,
} from "lucide-react";

// --- Mock: my profile ---
const myProfile = {
  name: "田中 一郎",
  photoUrl:
    "https://images.unsplash.com/photo-1630572780329-e051273e980f?w=400&h=400&fit=crop&crop=face",
  roleTitle: "代表取締役",
  jobTitle: "経営コンサルタント",
  headline: "人の可能性を信じ、組織を変える",
  connectionsCount: 6,
  eventsAttended: 8,
};

// --- Mock: connection log tied to dates ---
interface ConnectionLog {
  id: string;
  date: string; // YYYY-MM-DD
  person: { id: string; name: string; photoUrl: string; roleTitle: string };
  occasion: string;
  location: string;
  note: string;
}

const connectionLogs: ConnectionLog[] = [
  { id: "c1", date: "2026-03-01", person: { id: "10", name: "本田 浩二", photoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face", roleTitle: "飲食店グループ経営" }, occasion: "第12回 経営者グルメ会", location: "鮨 まつもと（大阪・北新地）", note: "飲食業界の裏側について深い話。新メニュー開発の相談を受けそう。" },
  { id: "c1b", date: "2026-03-01", person: { id: "6", name: "渡辺 剛", photoUrl: "https://images.unsplash.com/photo-1590799159581-0ef74a3bac90?w=400&h=400&fit=crop&crop=face", roleTitle: "ファイナンシャルアドバイザー" }, occasion: "第12回 経営者グルメ会", location: "鮨 まつもと（大阪・北新地）", note: "資金調達の新しいスキームについて情報交換。" },
  { id: "c2", date: "2026-02-15", person: { id: "7", name: "小川 理沙", photoUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face", roleTitle: "デザイナー" }, occasion: "新メンバー歓迎ランチ", location: "ビストロ マルシェ（大阪・中之島）", note: "空間デザインの視点が面白い。オフィスリニューアルの際に相談したい。" },
  { id: "c3", date: "2026-02-01", person: { id: "2", name: "佐藤 裕樹", photoUrl: "https://images.unsplash.com/photo-1619193597120-1d1edb42e34b?w=400&h=400&fit=crop&crop=face", roleTitle: "IT起業家" }, occasion: "第11回 経営者グルメ会", location: "割烹 田中（大阪・北新地）", note: "地方DXの取り組みに共感。クライアント企業を紹介できるかも。" },
  { id: "c4", date: "2026-02-01", person: { id: "5", name: "中村 明子", photoUrl: "https://images.unsplash.com/photo-1624091844772-554661d10173?w=400&h=400&fit=crop&crop=face", roleTitle: "医師・クリニック経営" }, occasion: "第11回 経営者グルメ会", location: "割烹 田中（大阪・北新地）", note: "健康経営セミナー共同開催の方向で話が進んだ。" },
  { id: "c5", date: "2026-01-20", person: { id: "8", name: "森田 駿", photoUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face", roleTitle: "人材紹介業" }, occasion: "ワイン勉強会", location: "ワインバー CAVA（大阪・心斎橋）", note: "経営幹部の採用で連携できそう。ワインの趣味も合う。" },
  { id: "c6", date: "2026-01-10", person: { id: "4", name: "鈴木 健二", photoUrl: "https://images.unsplash.com/photo-1720467438431-c1b5659a933e?w=400&h=400&fit=crop&crop=face", roleTitle: "不動産デベロッパー" }, occasion: "個別会食", location: "焼肉 万両（大阪・南森町）", note: "オフィス移転の相談。物件を紹介してもらえることに。" },
  { id: "c7", date: "2025-12-15", person: { id: "3", name: "山本 恵美", photoUrl: "https://images.unsplash.com/photo-1613020092739-5d01102e080b?w=400&h=400&fit=crop&crop=face", roleTitle: "オーナーシェフ" }, occasion: "忘年会", location: "割烹 田中（大阪・北新地）", note: "ケータリングの協業について意気投合。" },
];

// --- Calendar helpers ---
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function formatMonth(year: number, month: number) {
  return `${year}年${month + 1}月`;
}

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// --- Mock: my events ---
interface MyEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  participantCount: number;
  participants: { id: string; photoUrl: string }[];
  isHost: boolean;
  isPast: boolean;
}

const myEvents: MyEvent[] = [
  {
    id: "e1",
    title: "第12回 経営者グルメ会",
    date: "2026-03-01",
    time: "19:00〜22:00",
    location: "鮨 まつもと（大阪・北新地）",
    participantCount: 8,
    participants: [
      { id: "10", photoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face" },
      { id: "3", photoUrl: "https://images.unsplash.com/photo-1613020092739-5d01102e080b?w=400&h=400&fit=crop&crop=face" },
      { id: "6", photoUrl: "https://images.unsplash.com/photo-1590799159581-0ef74a3bac90?w=400&h=400&fit=crop&crop=face" },
    ],
    isHost: true,
    isPast: false,
  },
  {
    id: "e3",
    title: "第11回 経営者グルメ会",
    date: "2026-02-01",
    time: "19:00〜22:00",
    location: "割烹 田中（大阪・北新地）",
    participantCount: 10,
    participants: [
      { id: "2", photoUrl: "https://images.unsplash.com/photo-1619193597120-1d1edb42e34b?w=400&h=400&fit=crop&crop=face" },
      { id: "4", photoUrl: "https://images.unsplash.com/photo-1720467438431-c1b5659a933e?w=400&h=400&fit=crop&crop=face" },
      { id: "5", photoUrl: "https://images.unsplash.com/photo-1624091844772-554661d10173?w=400&h=400&fit=crop&crop=face" },
    ],
    isHost: true,
    isPast: true,
  },
  {
    id: "e4",
    title: "ワイン勉強会",
    date: "2026-01-20",
    time: "18:30〜21:00",
    location: "ワインバー CAVA（大阪・心斎橋）",
    participantCount: 5,
    participants: [
      { id: "6", photoUrl: "https://images.unsplash.com/photo-1590799159581-0ef74a3bac90?w=400&h=400&fit=crop&crop=face" },
      { id: "8", photoUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face" },
    ],
    isHost: false,
    isPast: true,
  },
];

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

type ViewTab = "connections" | "events";

export default function MyPage() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ViewTab>("connections");

  // Dates that have logs
  const logDates = useMemo(() => {
    const set = new Set<string>();
    connectionLogs.forEach((l) => set.add(l.date));
    return set;
  }, []);

  // Logs for selected date, or all in current month
  const visibleLogs = useMemo(() => {
    if (selectedDate) {
      return connectionLogs.filter((l) => l.date === selectedDate);
    }
    const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
    return connectionLogs.filter((l) => l.date.startsWith(prefix));
  }, [selectedDate, viewYear, viewMonth]);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);

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
      <div className="sticky top-0 z-10 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">マイページ</h1>
          <Link
            href="/app/settings"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <Settings className="w-4 h-4" />
            設定
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 mb-8">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <img
              src={myProfile.photoUrl}
              alt={myProfile.name}
              className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg ring-1 ring-gray-100"
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
                href="/app/profile/1"
                className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                公開プロフィールを見る
              </Link>
            </div>
          </div>

          {/* Tab stats */}
          <div className="grid grid-cols-2 gap-3 mt-6 pt-6 border-t border-gray-100">
            <button
              onClick={() => setActiveTab("connections")}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all ${
                activeTab === "connections"
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
            >
              <Handshake className="w-4 h-4" />
              <span className="text-xl font-bold">{myProfile.connectionsCount}</span>
              <span className="text-sm">出会い</span>
            </button>
            <button
              onClick={() => setActiveTab("events")}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all ${
                activeTab === "events"
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              <span className="text-xl font-bold">{myProfile.eventsAttended}</span>
              <span className="text-sm">参加した会</span>
            </button>
          </div>
        </div>

        {/* Calendar + Tab content */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 lg:sticky lg:top-24">
              {/* Month nav */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={prevMonth}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <span className="text-sm font-bold text-gray-900">
                  {formatMonth(viewYear, viewMonth)}
                </span>
                <button
                  onClick={nextMonth}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 mb-1">
                {WEEKDAYS.map((d, i) => (
                  <div
                    key={d}
                    className={`text-center text-[11px] font-medium py-1 ${
                      i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-400"
                    }`}
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7">
                {/* Empty cells for days before first */}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = toDateStr(viewYear, viewMonth, day);
                  const hasLog = logDates.has(dateStr);
                  const isSelected = selectedDate === dateStr;
                  const isToday =
                    viewYear === today.getFullYear() &&
                    viewMonth === today.getMonth() &&
                    day === today.getDate();
                  const dayOfWeek = (firstDay + i) % 7;

                  return (
                    <button
                      key={day}
                      onClick={() =>
                        setSelectedDate(isSelected ? null : dateStr)
                      }
                      className={`aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-all relative ${
                        isSelected
                          ? "bg-gray-900 text-white"
                          : isToday
                          ? "bg-amber-50 text-amber-700 font-bold"
                          : dayOfWeek === 0
                          ? "text-red-400 hover:bg-gray-50"
                          : dayOfWeek === 6
                          ? "text-blue-400 hover:bg-gray-50"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {day}
                      {hasLog && (
                        <span
                          className={`absolute bottom-1 w-1 h-1 rounded-full ${
                            isSelected ? "bg-amber-400" : "bg-amber-500"
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  出会いあり
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded bg-amber-50 border border-amber-200" />
                  今日
                </div>
              </div>
            </div>
          </div>

          {/* Right column: tab content */}
          {activeTab === "connections" && (
            <div className="lg:col-span-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-gray-900">
                  {selectedDate
                    ? `${selectedDate} の出会い`
                    : `${formatMonth(viewYear, viewMonth)} の出会い`}
                </h3>
                {selectedDate && (
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    月全体を表示
                  </button>
                )}
              </div>

              {visibleLogs.length > 0 ? (
                <div className="space-y-4">
                  {visibleLogs.map((log) => (
                    <div
                      key={log.id}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <Link href={`/app/profile/${log.person.id}`}>
                          <img
                            src={log.person.photoUrl}
                            alt={log.person.name}
                            className="w-10 h-10 rounded-full object-cover border-2 border-white shadow ring-1 ring-gray-100 hover:ring-amber-300 transition-all"
                          />
                        </Link>
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/app/profile/${log.person.id}`}
                            className="text-sm font-bold text-gray-900 hover:text-amber-700 transition-colors"
                          >
                            {log.person.name}
                          </Link>
                          <p className="text-xs text-gray-500">
                            {log.person.roleTitle}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {log.date}
                        </span>
                      </div>

                      <div className="space-y-1 text-xs text-gray-500 mb-3">
                        <div className="flex items-center gap-1.5">
                          <Handshake className="w-3.5 h-3.5 text-gray-400" />
                          {log.occasion}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          {log.location}
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-3">
                        {log.note}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                  <CalendarDays className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">
                    {selectedDate
                      ? "この日の出会いはありません"
                      : "この月の出会いはありません"}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "events" && (
            <div className="lg:col-span-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-gray-900">参加した会</h3>
                <Link
                  href="/app/events"
                  className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
                >
                  会を作成する →
                </Link>
              </div>

              {/* Upcoming */}
              {myEvents.filter((e) => !e.isPast).length > 0 && (
                <div className="mb-6">
                  <p className="text-xs font-medium text-amber-600 uppercase tracking-wider mb-3">
                    今後の予定
                  </p>
                  <div className="space-y-3">
                    {myEvents
                      .filter((e) => !e.isPast)
                      .map((event) => (
                        <div
                          key={event.id}
                          className="bg-white rounded-2xl border-2 border-amber-200 shadow-sm p-5"
                        >
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <h4 className="text-base font-bold text-gray-900">
                              {event.title}
                            </h4>
                            {event.isHost && (
                              <span className="px-2 py-0.5 rounded-full bg-gray-900 text-white text-[10px] font-bold flex-shrink-0">
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
                              {event.participants.map((p) => (
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
                </div>
              )}

              {/* Past */}
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
                  過去の会
                </p>
                <div className="space-y-3">
                  {myEvents
                    .filter((e) => e.isPast)
                    .map((event) => (
                      <div
                        key={event.id}
                        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h4 className="text-sm font-bold text-gray-900">
                            {event.title}
                          </h4>
                          {event.isHost && (
                            <span className="px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 text-[10px] font-bold flex-shrink-0">
                              主催
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                          <div className="flex items-center gap-1.5">
                            <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
                            {event.date}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                            {event.location}
                          </div>
                          <span>{event.participantCount}人参加</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
