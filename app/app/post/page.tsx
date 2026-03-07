"use client";

import { useState, useMemo } from "react";
import {
  CalendarDays,
  MapPin,
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  Users,
  Check,
  Settings,
  UserCheck,
  UserX,
  X,
  Shield,
  Repeat,
  Bell,
  BellOff,
  ChevronDown,
  ChevronUp,
  Crown,
  ShieldCheck,
  ArrowRightLeft,
} from "lucide-react";

// --- 型定義 ---
type ParticipantRole = "owner" | "admin" | "member";

interface Participant {
  id: string;
  name: string;
  photoUrl: string;
  role?: ParticipantRole;
}

interface PendingParticipant extends Participant {
  appliedAt: string;
  message?: string;
}

interface Series {
  id: string;
  name: string;
  description: string;
  organizer: Participant;
  totalEvents: number;
}

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  organizer: Participant;
  participantCount: number;
  participants: Participant[];
  pendingParticipants: PendingParticipant[];
  capacity: number | null;
  status: "upcoming" | "past";
  isHost: boolean;
  seriesId?: string;
}

// --- カレンダーヘルパー ---
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

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

// --- 自分のプロフィール（主催者として使用） ---
const myProfile: Participant = {
  id: "1",
  name: "田中 一郎",
  photoUrl:
    "https://images.unsplash.com/photo-1630572780329-e051273e980f?w=400&h=400&fit=crop&crop=face",
};

// --- シリーズモックデータ ---
const seriesList: Series[] = [
  {
    id: "s1",
    name: "経営者グルメ会",
    description: "月1回、大阪の名店で食事をしながら経営者同士の交流を深める定例会です。",
    organizer: {
      id: "1",
      name: "田中 一郎",
      photoUrl: "https://images.unsplash.com/photo-1630572780329-e051273e980f?w=400&h=400&fit=crop&crop=face",
    },
    totalEvents: 12,
  },
  {
    id: "s2",
    name: "ワイン勉強会",
    description: "ソムリエを招いてワインの知識を深める不定期開催の勉強会シリーズです。",
    organizer: {
      id: "6",
      name: "渡辺 剛",
      photoUrl: "https://images.unsplash.com/photo-1590799159581-0ef74a3bac90?w=400&h=400&fit=crop&crop=face",
    },
    totalEvents: 3,
  },
];

// --- モックデータ ---
const initialEvents: Event[] = [
  {
    id: "e1",
    title: "第12回 経営者グルメ会",
    date: "2026-03-01",
    time: "19:00〜22:00",
    location: "鮨 まつもと（大阪・北新地）",
    description:
      "今回は北新地の名店で、メンバー同士の交流を深めます。初参加の方も歓迎です。",
    organizer: {
      id: "1",
      name: "田中 一郎",
      photoUrl:
        "https://images.unsplash.com/photo-1630572780329-e051273e980f?w=400&h=400&fit=crop&crop=face",
    },
    participantCount: 8,
    capacity: 10,
    participants: [
      { id: "1", name: "田中 一郎", photoUrl: "https://images.unsplash.com/photo-1630572780329-e051273e980f?w=400&h=400&fit=crop&crop=face", role: "owner" },
      { id: "3", name: "山本 恵美", photoUrl: "https://images.unsplash.com/photo-1613020092739-5d01102e080b?w=400&h=400&fit=crop&crop=face", role: "admin" },
      { id: "6", name: "渡辺 剛", photoUrl: "https://images.unsplash.com/photo-1590799159581-0ef74a3bac90?w=400&h=400&fit=crop&crop=face", role: "member" },
      { id: "10", name: "本田 浩二", photoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face", role: "member" },
    ],
    pendingParticipants: [
      { id: "11", name: "高橋 真一", photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face", appliedAt: "2026-02-25", message: "初参加です。知人の紹介で申し込みました。" },
      { id: "12", name: "井上 美咲", photoUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face", appliedAt: "2026-02-27", message: "飲食業界で経営しております。ぜひ参加したいです。" },
    ],
    status: "upcoming",
    isHost: true,
    seriesId: "s1",
  },
  {
    id: "e2",
    title: "新メンバー歓迎ランチ",
    date: "2026-03-08",
    time: "12:00〜14:00",
    location: "ビストロ マルシェ（大阪・中之島）",
    description:
      "今月入会した3名の歓迎ランチです。カジュアルな雰囲気でお互いを知る場にしましょう。",
    organizer: {
      id: "3",
      name: "山本 恵美",
      photoUrl:
        "https://images.unsplash.com/photo-1613020092739-5d01102e080b?w=400&h=400&fit=crop&crop=face",
    },
    participantCount: 6,
    capacity: 8,
    participants: [
      { id: "3", name: "山本 恵美", photoUrl: "https://images.unsplash.com/photo-1613020092739-5d01102e080b?w=400&h=400&fit=crop&crop=face" },
      { id: "7", name: "小川 理沙", photoUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face" },
      { id: "9", name: "藤田 舞", photoUrl: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=400&fit=crop&crop=face" },
    ],
    pendingParticipants: [],
    status: "upcoming",
    isHost: false,
  },
  {
    id: "e5",
    title: "経営者×士業 交流ディナー",
    date: "2026-03-22",
    time: "18:30〜21:30",
    location: "天ぷら 近藤（大阪・本町）",
    description:
      "弁護士・税理士・社労士など士業の方と経営者をつなぐ異業種交流会です。",
    organizer: {
      id: "5",
      name: "中村 明子",
      photoUrl:
        "https://images.unsplash.com/photo-1624091844772-554661d10173?w=400&h=400&fit=crop&crop=face",
    },
    participantCount: 12,
    capacity: 15,
    participants: [
      { id: "5", name: "中村 明子", photoUrl: "https://images.unsplash.com/photo-1624091844772-554661d10173?w=400&h=400&fit=crop&crop=face" },
      { id: "2", name: "佐藤 裕樹", photoUrl: "https://images.unsplash.com/photo-1619193597120-1d1edb42e34b?w=400&h=400&fit=crop&crop=face" },
      { id: "4", name: "鈴木 健二", photoUrl: "https://images.unsplash.com/photo-1720467438431-c1b5659a933e?w=400&h=400&fit=crop&crop=face" },
      { id: "8", name: "森田 駿", photoUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face" },
      { id: "6", name: "渡辺 剛", photoUrl: "https://images.unsplash.com/photo-1590799159581-0ef74a3bac90?w=400&h=400&fit=crop&crop=face" },
    ],
    pendingParticipants: [],
    status: "upcoming",
    isHost: false,
  },
  {
    id: "e3",
    title: "第11回 経営者グルメ会",
    date: "2026-02-01",
    time: "19:00〜22:00",
    location: "割烹 田中（大阪・北新地）",
    description:
      "北新地の割烹で季節の食材を楽しみながら、事業の近況を共有しました。",
    organizer: {
      id: "1",
      name: "田中 一郎",
      photoUrl:
        "https://images.unsplash.com/photo-1630572780329-e051273e980f?w=400&h=400&fit=crop&crop=face",
    },
    participantCount: 10,
    capacity: 10,
    participants: [
      { id: "1", name: "田中 一郎", photoUrl: "https://images.unsplash.com/photo-1630572780329-e051273e980f?w=400&h=400&fit=crop&crop=face", role: "owner" },
      { id: "2", name: "佐藤 裕樹", photoUrl: "https://images.unsplash.com/photo-1619193597120-1d1edb42e34b?w=400&h=400&fit=crop&crop=face", role: "admin" },
      { id: "4", name: "鈴木 健二", photoUrl: "https://images.unsplash.com/photo-1720467438431-c1b5659a933e?w=400&h=400&fit=crop&crop=face", role: "member" },
      { id: "5", name: "中村 明子", photoUrl: "https://images.unsplash.com/photo-1624091844772-554661d10173?w=400&h=400&fit=crop&crop=face", role: "member" },
    ],
    pendingParticipants: [],
    status: "past",
    isHost: true,
    seriesId: "s1",
  },
  {
    id: "e4",
    title: "ワイン勉強会",
    date: "2026-01-20",
    time: "18:30〜21:00",
    location: "ワインバー CAVA（大阪・心斎橋）",
    description:
      "ソムリエを招いてのワイン勉強会。ビジネスシーンでのワイン選びを学びました。",
    organizer: {
      id: "6",
      name: "渡辺 剛",
      photoUrl:
        "https://images.unsplash.com/photo-1590799159581-0ef74a3bac90?w=400&h=400&fit=crop&crop=face",
    },
    participantCount: 5,
    capacity: null,
    participants: [
      { id: "6", name: "渡辺 剛", photoUrl: "https://images.unsplash.com/photo-1590799159581-0ef74a3bac90?w=400&h=400&fit=crop&crop=face" },
      { id: "8", name: "森田 駿", photoUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face" },
    ],
    pendingParticipants: [],
    status: "past",
    isHost: false,
    seriesId: "s2",
  },
  {
    id: "e6",
    title: "春の読書会＆ランチ",
    date: "2026-04-05",
    time: "11:00〜14:00",
    location: "カフェ 北浜レトロ（大阪・北浜）",
    description:
      "経営に役立つ本を持ち寄り、学びを共有するカジュアルな読書会です。",
    organizer: {
      id: "7",
      name: "小川 理沙",
      photoUrl:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face",
    },
    participantCount: 4,
    capacity: null,
    participants: [
      { id: "7", name: "小川 理沙", photoUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face" },
      { id: "9", name: "藤田 舞", photoUrl: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=400&fit=crop&crop=face" },
    ],
    pendingParticipants: [],
    status: "upcoming",
    isHost: false,
  },
];

export default function PostPage() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set(["e1", "e3"]));
  const [showCreate, setShowCreate] = useState(false);
  const [managingEventId, setManagingEventId] = useState<string | null>(null);
  const [followedSeriesIds, setFollowedSeriesIds] = useState<Set<string>>(new Set(["s1"]));
  const [expandedSeriesId, setExpandedSeriesId] = useState<string | null>(null);
  const [manageTab, setManageTab] = useState<"participants" | "roles">("participants");
  const [transferConfirmId, setTransferConfirmId] = useState<string | null>(null);

  // フォーム入力値
  const [createTitle, setCreateTitle] = useState("");
  const [createDate, setCreateDate] = useState("");
  const [createTime, setCreateTime] = useState("");
  const [createLocation, setCreateLocation] = useState("");
  const [createDescription, setCreateDescription] = useState("");

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

  const toggleJoin = (eventId: string) => {
    setJoinedIds((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  // シリーズフォロートグル
  const toggleFollowSeries = (seriesId: string) => {
    setFollowedSeriesIds((prev) => {
      const next = new Set(prev);
      if (next.has(seriesId)) {
        next.delete(seriesId);
      } else {
        next.add(seriesId);
      }
      return next;
    });
  };

  // シリーズに属するイベント一覧を取得
  const getSeriesEvents = (seriesId: string) => {
    return events
      .filter((e) => e.seriesId === seriesId)
      .sort((a, b) => b.date.localeCompare(a.date));
  };

  // 参加申請を承認
  const approveParticipant = (eventId: string, participantId: string) => {
    setEvents((prev) =>
      prev.map((ev) => {
        if (ev.id !== eventId) return ev;
        const pending = ev.pendingParticipants.find((p) => p.id === participantId);
        if (!pending) return ev;
        return {
          ...ev,
          participants: [...ev.participants, { id: pending.id, name: pending.name, photoUrl: pending.photoUrl, role: "member" as ParticipantRole }],
          pendingParticipants: ev.pendingParticipants.filter((p) => p.id !== participantId),
          participantCount: ev.participantCount + 1,
        };
      })
    );
  };

  // 参加申請を拒否
  const rejectParticipant = (eventId: string, participantId: string) => {
    setEvents((prev) =>
      prev.map((ev) => {
        if (ev.id !== eventId) return ev;
        return {
          ...ev,
          pendingParticipants: ev.pendingParticipants.filter((p) => p.id !== participantId),
        };
      })
    );
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
  };

  // ロール変更
  const changeRole = (eventId: string, participantId: string, newRole: ParticipantRole) => {
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
          organizer: { id: newOwner.id, name: newOwner.name, photoUrl: newOwner.photoUrl },
          participants: ev.participants.map((p) => {
            if (p.id === newOwnerId) return { ...p, role: "owner" as ParticipantRole };
            if (p.role === "owner") return { ...p, role: "admin" as ParticipantRole };
            return p;
          }),
        };
      })
    );
    setTransferConfirmId(null);
  };

  const handleCreate = () => {
    if (!createTitle || !createDate) return;
    const newEvent: Event = {
      id: `e-new-${Date.now()}`,
      title: createTitle,
      date: createDate,
      time: createTime || "未定",
      location: createLocation || "未定",
      description: createDescription,
      organizer: myProfile,
      participantCount: 1,
      capacity: null,
      participants: [{ ...myProfile, role: "owner" as ParticipantRole }],
      pendingParticipants: [],
      status: "upcoming",
      isHost: true,
    };
    setEvents((prev) => [newEvent, ...prev]);
    setJoinedIds((prev) => new Set(prev).add(newEvent.id));
    setCreateTitle("");
    setCreateDate("");
    setCreateTime("");
    setCreateLocation("");
    setCreateDescription("");
    setShowCreate(false);
  };

  return (
    <div className="min-h-screen">
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200">
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

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 2カラムレイアウト */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* 左カラム: カレンダー */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 lg:sticky lg:top-24">
              {/* 月ナビゲーション */}
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

              {/* 曜日ヘッダー */}
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

              {/* 日付グリッド */}
              <div className="grid grid-cols-7">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = toDateStr(viewYear, viewMonth, day);
                  const hasEvent = eventDateMap.has(dateStr);
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
                      {hasEvent && (
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

              {/* 凡例 */}
              <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  イベントあり
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded bg-amber-50 border border-amber-200" />
                  今日
                </div>
              </div>
            </div>
          </div>

          {/* 右カラム: イベント一覧 + 作成フォーム */}
          <div className="lg:col-span-3">
            {/* 作成フォーム */}
            {showCreate && (
              <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-6 sm:p-8 mb-6">
                <h2 className="text-base font-bold text-gray-900 mb-5">
                  新しい会を作成
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      タイトル <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={createTitle}
                      onChange={(e) => setCreateTitle(e.target.value)}
                      placeholder="例: 第13回 経営者グルメ会"
                      className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        日付 <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="date"
                        value={createDate}
                        onChange={(e) => setCreateDate(e.target.value)}
                        className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        時間
                      </label>
                      <input
                        type="text"
                        value={createTime}
                        onChange={(e) => setCreateTime(e.target.value)}
                        placeholder="例: 19:00〜22:00"
                        className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      場所
                    </label>
                    <input
                      type="text"
                      value={createLocation}
                      onChange={(e) => setCreateLocation(e.target.value)}
                      placeholder="例: 鮨 まつもと（大阪・北新地）"
                      className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      説明
                    </label>
                    <textarea
                      rows={3}
                      value={createDescription}
                      onChange={(e) => setCreateDescription(e.target.value)}
                      placeholder="会の趣旨や備考を記入..."
                      className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
                    />
                  </div>
                  <div className="flex gap-3 justify-end pt-2">
                    <button
                      onClick={() => setShowCreate(false)}
                      className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleCreate}
                      className="px-6 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors"
                    >
                      作成する
                    </button>
                  </div>
                </div>
              </div>
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
                {visibleEvents.map((event) => {
                  const isUpcoming = event.status === "upcoming";
                  const isJoined = joinedIds.has(event.id);

                  return (
                    <div
                      key={event.id}
                      className={`bg-white rounded-2xl border shadow-sm p-5 hover:shadow-md transition-all ${
                        isUpcoming ? "border-amber-200" : "border-gray-100"
                      }`}
                    >
                      {/* タイトル行 */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-base font-bold text-gray-900">
                            {event.title}
                          </h4>
                          {event.isHost && (
                            <span className="px-2 py-0.5 rounded-full bg-gray-900 text-white text-[10px] font-bold">
                              主催
                            </span>
                          )}
                        </div>
                        {isUpcoming && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold flex-shrink-0">
                            開催予定
                          </span>
                        )}
                      </div>

                      {/* シリーズバッジ */}
                      {event.seriesId && (() => {
                        const series = seriesList.find((s) => s.id === event.seriesId);
                        if (!series) return null;
                        const isExpanded = expandedSeriesId === event.seriesId + "-" + event.id;
                        const seriesEvents = getSeriesEvents(series.id);
                        const isFollowed = followedSeriesIds.has(series.id);
                        return (
                          <div className="mb-3">
                            <button
                              onClick={() => setExpandedSeriesId(isExpanded ? null : series.id + "-" + event.id)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-medium hover:bg-indigo-100 transition-colors"
                            >
                              <Repeat className="w-3 h-3" />
                              {series.name}（全{series.totalEvents}回）
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>

                            {isExpanded && (
                              <div className="mt-3 p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                                <div className="flex items-start justify-between gap-3 mb-3">
                                  <div>
                                    <h5 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                                      <Repeat className="w-4 h-4 text-indigo-500" />
                                      {series.name}
                                    </h5>
                                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{series.description}</p>
                                  </div>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); toggleFollowSeries(series.id); }}
                                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex-shrink-0 ${
                                      isFollowed
                                        ? "bg-indigo-600 text-white hover:bg-indigo-700"
                                        : "bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                                    }`}
                                  >
                                    {isFollowed ? (
                                      <><Bell className="w-3.5 h-3.5" />フォロー中</>
                                    ) : (
                                      <><BellOff className="w-3.5 h-3.5" />フォローする</>
                                    )}
                                  </button>
                                </div>

                                <div className="flex items-center gap-2 mb-3 text-xs text-gray-500">
                                  <img
                                    src={series.organizer.photoUrl}
                                    alt={series.organizer.name}
                                    className="w-5 h-5 rounded-full object-cover border border-white shadow"
                                  />
                                  主催: <span className="font-medium text-gray-700">{series.organizer.name}</span>
                                </div>

                                <h6 className="text-[11px] font-bold text-gray-500 mb-2">開催履歴</h6>
                                <div className="space-y-1.5">
                                  {seriesEvents.map((se) => (
                                    <div
                                      key={se.id}
                                      className={`flex items-center gap-3 p-2 rounded-lg text-xs ${
                                        se.id === event.id ? "bg-white border border-indigo-200 font-bold" : "hover:bg-white/60"
                                      }`}
                                    >
                                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                        se.status === "upcoming" ? "bg-amber-500" : "bg-gray-300"
                                      }`} />
                                      <span className="text-gray-500 w-20 flex-shrink-0">{se.date}</span>
                                      <span className="text-gray-900 flex-1 truncate">{se.title}</span>
                                      <span className="text-gray-400 flex-shrink-0">{se.participantCount}人</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* 日時・場所 */}
                      <div className="space-y-1.5 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span>{event.date}</span>
                          <Clock className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0" />
                          <span>{event.time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span>{event.location}</span>
                        </div>
                      </div>

                      {/* 説明 */}
                      {event.description && (
                        <p className="text-sm text-gray-500 leading-relaxed mb-4">
                          {event.description}
                        </p>
                      )}

                      {/* 主催者 */}
                      <div className="flex items-center gap-2 mb-3 text-sm text-gray-600">
                        <img
                          src={event.organizer.photoUrl}
                          alt={event.organizer.name}
                          className="w-6 h-6 rounded-full object-cover border border-white shadow"
                        />
                        <span className="text-xs text-gray-500">
                          主催: <span className="font-medium text-gray-700">{event.organizer.name}</span>
                        </span>
                      </div>

                      {/* 参加者 + 参加ボタン */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2">
                            {event.participants.slice(0, 4).map((p) => (
                              <img
                                key={p.id}
                                src={p.photoUrl}
                                alt={p.name}
                                className="w-7 h-7 rounded-full object-cover border-2 border-white shadow"
                              />
                            ))}
                            {event.participants.length > 4 && (
                              <span className="w-7 h-7 rounded-full bg-gray-100 border-2 border-white shadow flex items-center justify-center text-[10px] font-bold text-gray-500">
                                +{event.participants.length - 4}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            <Users className="w-3.5 h-3.5 inline mr-0.5" />
                            {event.participantCount}人参加
                            {event.capacity && (
                              <span className="text-gray-400"> / {event.capacity}人</span>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {event.isHost && (
                            <button
                              onClick={() => { setManagingEventId(managingEventId === event.id ? null : event.id); setManageTab("participants"); setTransferConfirmId(null); }}
                              className={`relative inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                managingEventId === event.id
                                  ? "bg-gray-900 text-white"
                                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                              }`}
                            >
                              <Settings className="w-3.5 h-3.5" />
                              管理
                              {event.pendingParticipants.length > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                                  {event.pendingParticipants.length}
                                </span>
                              )}
                            </button>
                          )}
                          {isUpcoming && (
                            <button
                              onClick={() => toggleJoin(event.id)}
                              className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                isJoined
                                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                                  : "bg-amber-500 text-white hover:bg-amber-600"
                              }`}
                            >
                              {isJoined ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  参加済み
                                </>
                              ) : (
                                "参加する"
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 管理パネル */}
                      {event.isHost && managingEventId === event.id && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                              <button
                                onClick={() => setManageTab("participants")}
                                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                                  manageTab === "participants" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                                }`}
                              >
                                <Shield className="w-3.5 h-3.5" />
                                参加者
                              </button>
                              <button
                                onClick={() => { setManageTab("roles"); setTransferConfirmId(null); }}
                                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                                  manageTab === "roles" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                                }`}
                              >
                                <Crown className="w-3.5 h-3.5" />
                                権限
                              </button>
                            </div>
                            <button
                              onClick={() => setManagingEventId(null)}
                              className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              <X className="w-4 h-4 text-gray-400" />
                            </button>
                          </div>

                          {manageTab === "participants" && (
                            <>
                              {/* 定員情報 */}
                              <div className="flex items-center gap-4 mb-4 p-3 bg-gray-50 rounded-xl text-sm">
                                <div>
                                  <span className="text-gray-500">参加者</span>
                                  <span className="ml-1 font-bold text-gray-900">{event.participants.length}人</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">定員</span>
                                  <span className="ml-1 font-bold text-gray-900">{event.capacity ?? "無制限"}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">申請中</span>
                                  <span className={`ml-1 font-bold ${event.pendingParticipants.length > 0 ? "text-red-600" : "text-gray-900"}`}>
                                    {event.pendingParticipants.length}人
                                  </span>
                                </div>
                              </div>

                              {/* 申請中の参加者 */}
                              {event.pendingParticipants.length > 0 && (
                                <div className="mb-4">
                                  <h6 className="text-xs font-bold text-amber-700 mb-2 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    承認待ち（{event.pendingParticipants.length}件）
                                  </h6>
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
                                            <span className="text-sm font-bold text-gray-900">{p.name}</span>
                                            <span className="text-[10px] text-gray-400">{p.appliedAt}</span>
                                          </div>
                                          {p.message && (
                                            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{p.message}</p>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                          <button
                                            onClick={() => approveParticipant(event.id, p.id)}
                                            className="inline-flex items-center gap-0.5 px-2.5 py-1.5 rounded-lg bg-green-600 text-white text-[11px] font-bold hover:bg-green-700 transition-colors"
                                          >
                                            <UserCheck className="w-3.5 h-3.5" />
                                            承認
                                          </button>
                                          <button
                                            onClick={() => rejectParticipant(event.id, p.id)}
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

                              {/* 参加確定メンバー一覧 */}
                              <div>
                                <h6 className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                  参加確定（{event.participants.length}人）
                                </h6>
                                <div className="space-y-1.5">
                                  {event.participants.map((p) => (
                                    <div
                                      key={p.id}
                                      className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors group"
                                    >
                                      <img
                                        src={p.photoUrl}
                                        alt={p.name}
                                        className="w-8 h-8 rounded-full object-cover border-2 border-white shadow"
                                      />
                                      <span className="text-sm text-gray-900 flex-1">{p.name}</span>
                                      {p.role === "owner" ? (
                                        <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 font-bold">
                                          <Crown className="w-3 h-3" />主催者
                                        </span>
                                      ) : p.role === "admin" ? (
                                        <span className="inline-flex items-center gap-0.5 text-[10px] text-indigo-500 font-bold">
                                          <ShieldCheck className="w-3 h-3" />副管理者
                                        </span>
                                      ) : (
                                        <button
                                          onClick={() => removeParticipant(event.id, p.id)}
                                          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"
                                          title="参加者を削除"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}

                          {manageTab === "roles" && (
                            <>
                              {/* 権限の説明 */}
                              <div className="mb-4 p-3 bg-gray-50 rounded-xl">
                                <div className="space-y-1.5 text-xs text-gray-500">
                                  <div className="flex items-center gap-2">
                                    <Crown className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                    <span><span className="font-bold text-gray-700">主催者</span> — 全権限（編集・削除・権限管理・委譲）</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                                    <span><span className="font-bold text-gray-700">副管理者</span> — 参加者の承認・拒否・削除</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Users className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                    <span><span className="font-bold text-gray-700">一般</span> — 閲覧・参加のみ</span>
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
                                        isTransferTarget ? "border-amber-300 bg-amber-50" : "border-gray-100 bg-white"
                                      }`}
                                    >
                                      <img
                                        src={p.photoUrl}
                                        alt={p.name}
                                        className="w-9 h-9 rounded-full object-cover border-2 border-white shadow flex-shrink-0"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-sm font-bold text-gray-900">{p.name}</span>
                                          {isOwner && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                                          {isAdmin && <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />}
                                        </div>
                                        <span className="text-[10px] text-gray-400">
                                          {isOwner ? "主催者" : isAdmin ? "副管理者" : "一般メンバー"}
                                        </span>
                                      </div>

                                      {isOwner ? (
                                        <span className="text-[10px] text-gray-400 font-medium flex-shrink-0">変更不可</span>
                                      ) : isTransferTarget ? (
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                          <span className="text-[10px] text-amber-700 font-bold">委譲しますか？</span>
                                          <button
                                            onClick={() => transferOwnership(event.id, p.id)}
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
                                              onClick={() => changeRole(event.id, p.id, "member")}
                                              className="inline-flex items-center gap-0.5 px-2 py-1 rounded-md bg-gray-100 text-gray-600 text-[10px] font-bold hover:bg-gray-200 transition-colors"
                                              title="一般に降格"
                                            >
                                              <ChevronDown className="w-3 h-3" />
                                              一般へ
                                            </button>
                                          ) : (
                                            <button
                                              onClick={() => changeRole(event.id, p.id, "admin")}
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
                        </div>
                      )}
                    </div>
                  );
                })}
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
    </div>
  );
}
