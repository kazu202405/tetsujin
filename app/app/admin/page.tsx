"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  CheckCircle,
  XCircle,
  Clock,
  Search,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Briefcase,
  Calendar,
  Building2,
  User,
  Activity,

  ClipboardList,
  CalendarDays,
  Users,
  ChevronDown,
  ChevronUp,
  X,
  Database,
  UserCog,
  RotateCcw,
  StickyNote,
  Handshake,
  Megaphone,
  Send,
} from "lucide-react";
import type { MemberRole } from "@/lib/member-roles";
import { RoleBadge } from "@/components/app/role-badge";
import { MemberAvatar } from "@/components/app/member-avatar";
import { useEvents } from "@/lib/events-api";

// ============================================================
// タブ定義
// ============================================================
// 権限（運営/部長/一般）の変更は「会員管理」タブの各行に統合したため、
// 独立した「権限管理」タブは廃止した（変更口が2か所あると事故るため）。
type AdminTab = "applications" | "activity" | "participation" | "member-manage" | "announce" | "members-db" | "members-db-raw";

const tabs: { id: AdminTab; label: string; icon: typeof Clock }[] = [
  { id: "applications", label: "入会申請", icon: ClipboardList },
  { id: "activity", label: "メンバーの状況", icon: Activity },
  { id: "participation", label: "参加状況", icon: CalendarDays },
  { id: "member-manage", label: "会員管理", icon: UserCog },
  { id: "announce", label: "お知らせ送信", icon: Megaphone },
  { id: "members-db", label: "会員DB", icon: Database },
  { id: "members-db-raw", label: "生会員DB", icon: Database },
];

// ============================================================
// 共通メンバー情報
// ============================================================


// ============================================================
// タブ1: 入会申請 モックデータ
// ============================================================
type ApplicationStatus = "pending" | "approved" | "rejected";

// applications テーブルの行（/api/admin/applications が返す形）
interface Application {
  id: string;
  name: string;
  name_furigana: string | null;
  gender: string | null;
  age_range: string | null;
  email: string;
  phone: string | null;
  job: string | null;
  referrer: string | null;
  start_month: string | null;
  membership_type: "法人" | "個人" | null;
  payment_method: string | null;
  note: string | null;
  status: ApplicationStatus;
  member_id: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
}

const statusConfig: Record<ApplicationStatus, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  pending: { label: "審査中", color: "text-amber-600", bg: "bg-amber-50 border-amber-200", icon: Clock },
  approved: { label: "承認済み", color: "text-green-600", bg: "bg-green-50 border-green-200", icon: CheckCircle },
  rejected: { label: "却下", color: "text-red-600", bg: "bg-red-50 border-red-200", icon: XCircle },
};

// ============================================================
// タブ2: アクティブ状況 モックデータ
// ============================================================
type ActivityStatus = "active" | "dormant" | "inactive";

const activityStatusConfig: Record<ActivityStatus, { label: string; color: string; bg: string; dot: string }> = {
  active: { label: "アクティブ", color: "text-green-700", bg: "bg-green-50 border-green-200", dot: "bg-green-500" },
  dormant: { label: "活動減少", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", dot: "bg-amber-400" },
  inactive: { label: "長期不在", color: "text-red-600", bg: "bg-red-50 border-red-200", dot: "bg-red-400" },
};

// ============================================================
// タブ3: 参加状況 モックデータ
// ============================================================
// ============================================================
// タブ4: 紹介ランキング モックデータ
// ============================================================
// ============================================================
// メインコンポーネント
// ============================================================
export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("applications");
  // 会員DBタブは情報量が多いのでコンテナを広めに
  const containerMaxWidth =
    activeTab === "members-db" || activeTab === "members-db-raw" ? "max-w-7xl" : "max-w-5xl";

  return (
    <div className="min-h-screen">
      {/* ヘッダー */}
      <div className="sticky top-14 lg:top-0 z-30 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200">
        <div className={`${containerMaxWidth} mx-auto px-4 sm:px-6 lg:px-8 py-4`}>
          <h1 className="text-xl font-bold text-gray-900">管理画面</h1>
          <p className="text-sm text-gray-500 mt-0.5">コミュニティの運営・分析</p>
        </div>
        {/* タブナビ */}
        <div className={`${containerMaxWidth} mx-auto px-4 sm:px-6 lg:px-8`}>
          <div className="flex gap-1 overflow-x-auto -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                    isActive
                      ? "border-gray-900 text-gray-900"
                      : "border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className={`${containerMaxWidth} mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24`}>
        {activeTab === "applications" && <ApplicationsTab />}
        {activeTab === "activity" && <ActivityTab />}
        {activeTab === "participation" && <ParticipationTab />}
        {activeTab === "member-manage" && <MemberManageTab />}
        {activeTab === "announce" && <AnnounceTab />}
        {activeTab === "members-db" && <MembersDbTab />}
        {activeTab === "members-db-raw" && <MembersDbRawTab />}

      </div>
    </div>
  );
}

// ============================================================
// タブ1: 入会申請
// ============================================================
function ApplicationsTab() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loadStatus, setLoadStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<ApplicationStatus | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const reload = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/applications", { cache: "no-store" });
      if (!response.ok) throw new Error("failed");
      setApplications((await response.json()) as Application[]);
      setLoadStatus("loaded");
    } catch {
      setApplications([]);
      setLoadStatus("error");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const filtered = applications.filter((app) => {
    const query = search.trim();
    const matchSearch =
      !query ||
      app.name.includes(query) ||
      (app.email ?? "").includes(query) ||
      (app.referrer ?? "").includes(query);
    const matchStatus = filterStatus === "all" || app.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const review = async (id: string, action: "approve" | "reject") => {
    setSavingId(id);
    setMessage(null);
    const response = await fetch(`/api/admin/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const result = (await response.json().catch(() => null)) as { error?: string } | null;
    setSavingId(null);

    if (!response.ok) {
      setMessage({ type: "error", text: result?.error || "更新できませんでした" });
      return;
    }
    setMessage({
      type: "success",
      text: action === "approve" ? "承認して会員台帳に追加しました" : "却下しました",
    });
    await reload();
  };

  if (loadStatus === "loading") {
    return <div className="text-center text-gray-400 py-20">読み込み中...</div>;
  }
  if (loadStatus === "error") {
    return <div className="text-center text-red-600 py-20">入会申請を取得できませんでした。</div>;
  }

  return (
    <>
      {/* 統計カード */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "審査中", count: applications.filter((a) => a.status === "pending").length, color: "text-amber-600", bg: "bg-amber-50", icon: Clock },
          { label: "承認済み", count: applications.filter((a) => a.status === "approved").length, color: "text-green-600", bg: "bg-green-50", icon: UserCheck },
          { label: "却下", count: applications.filter((a) => a.status === "rejected").length, color: "text-red-600", bg: "bg-red-50", icon: UserX },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center mb-3`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.count}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {message && (
        <p
          className={`mb-4 text-sm rounded-lg px-3 py-2 ${
            message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </p>
      )}

      {/* 検索・フィルター */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="名前・メール・紹介者で検索..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "pending", "approved", "rejected"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                filterStatus === s ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {s === "all" ? "すべて" : statusConfig[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* 申請リスト */}
      <div className="space-y-4">
        {filtered.map((app) => {
          const config = statusConfig[app.status];
          const StatusIcon = config.icon;
          const isExpanded = expandedId === app.id;
          return (
            <div key={app.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <button
                onClick={() => setExpandedId(isExpanded ? null : app.id)}
                className="w-full flex items-center gap-4 p-5 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base font-bold text-gray-900">{app.name}</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-bold ${config.bg} ${config.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {config.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                    {app.job && <span>{app.job}</span>}
                    {app.referrer && <span>紹介者: {app.referrer}</span>}
                    {app.membership_type && <span>{app.membership_type}</span>}
                    <span>{fmtDate(app.created_at)}</span>
                  </div>
                </div>
              </button>
              {isExpanded && (
                <div className="border-t border-gray-100 px-5 py-5 bg-gray-50/50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <div className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4 text-gray-400" /><span className="text-gray-600">{app.email}</span></div>
                    <div className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-gray-400" /><span className="text-gray-600">{app.phone}</span></div>
                    <div className="flex items-center gap-2 text-sm"><Briefcase className="w-4 h-4 text-gray-400" /><span className="text-gray-600">{app.job}</span></div>
                    <div className="flex items-center gap-2 text-sm"><Calendar className="w-4 h-4 text-gray-400" /><span className="text-gray-600">開始月: {app.start_month ?? "未記入"}</span></div>
                    <div className="flex items-center gap-2 text-sm"><Building2 className="w-4 h-4 text-gray-400" /><span className="text-gray-600">{app.membership_type ?? "未選択"}{app.membership_type && `（${app.membership_type === "個人" ? "¥19,800" : "¥30,000"}）`}</span></div>
                    <div className="flex items-center gap-2 text-sm"><span className="text-gray-400">💳</span><span className="text-gray-600">{app.payment_method ?? "未選択"}</span></div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 mb-4">
                    <span>年代: {app.age_range ?? "未記入"}</span><span>・</span><span>性別: {app.gender ?? "未記入"}</span><span>・</span><span>紹介者: {app.referrer ?? "未記入"}</span>
                  </div>
                  {app.status === "pending" && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => review(app.id, "approve")}
                        disabled={savingId === app.id}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors disabled:opacity-60"
                      >
                        <UserCheck className="w-4 h-4" />承認して会員に追加
                      </button>
                      <button
                        onClick={() => review(app.id, "reject")}
                        disabled={savingId === app.id}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border-2 border-red-200 text-red-600 rounded-xl text-sm font-bold hover:bg-red-50 transition-colors disabled:opacity-60"
                      >
                        <UserX className="w-4 h-4" />却下する
                      </button>
                    </div>
                  )}
                  {app.status === "approved" && (
                    <p className="text-sm text-green-600">
                      ✓ {app.reviewed_at ? `${fmtDate(app.reviewed_at)} に` : ""}承認済み（会員台帳に追加されています）
                    </p>
                  )}
                  {app.status === "rejected" && (
                    <p className="text-sm text-red-600">
                      却下済み{app.reviewed_at ? `（${fmtDate(app.reviewed_at)}）` : ""}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <UserCheck className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">該当する申請はありません</p>
          </div>
        )}
      </div>
    </>
  );
}

// ============================================================
// タブ2: アクティブ状況
// ============================================================
// ============================================================
// タブ2: メンバーの状況（実データ）
// ============================================================
// 出せる指標だけを出す。ログイン回数や紹介数のように記録していないものは
// 画面にも置かない（もっともらしい数字を作らない）。
interface ActivityRow {
  memberId: string;
  name: string;
  job: string | null;
  avatarUrl: string | null;
  isWithdrawn: boolean;
  hasLogin: boolean;
  lastSignInAt: string | null;
  lastVisitDate: string | null;
  visitDays30d: number;
  lastPostAt: string | null;
  postCount30d: number;
  lastEventDate: string | null;
  eventCount90d: number;
  referralCount: number;
  renewalStatus: string | null;
  startYear: number | null;
  startMonth: number | null;
}

/** 参加・投稿・アクセスから状態を判定する。 */
function judgeActivity(row: ActivityRow): ActivityStatus {
  if (row.eventCount90d > 0 || row.postCount30d > 0) return "active";
  if (row.visitDays30d > 0) return "dormant";
  const days = daysSince(row.lastSignInAt);
  if (days !== null && days <= 30) return "dormant";
  return "inactive";
}

/** 入会年月から在籍月数。年が分からなければ null。 */
function membershipMonths(row: ActivityRow): number | null {
  if (!row.startYear) return null;
  const start = new Date(row.startYear, (row.startMonth ?? 1) - 1, 1);
  const now = new Date();
  return Math.max(
    0,
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
  );
}

function membershipLabel(row: ActivityRow): string {
  const months = membershipMonths(row);
  if (months === null) return "入会日不明";
  if (months < 12) return `${months}か月`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest === 0 ? `${years}年` : `${years}年${rest}か月`;
}

/** 何日前か。日付が無ければ null。 */
function daysSince(value: string | null): number | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function agoLabel(value: string | null): string {
  const days = daysSince(value);
  if (days === null) return "記録なし";
  if (days === 0) return "今日";
  if (days === 1) return "昨日";
  if (days < 31) return `${days}日前`;
  if (days < 365) return `${Math.floor(days / 30)}か月前`;
  return `${Math.floor(days / 365)}年以上前`;
}

function ActivityTab() {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loadStatus, setLoadStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<ActivityStatus | "all">("all");
  const [onlyLoginUsers, setOnlyLoginUsers] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/activity", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("failed");
        if (!cancelled) {
          setRows((await res.json()) as ActivityRow[]);
          setLoadStatus("loaded");
        }
      })
      .catch(() => {
        if (!cancelled) setLoadStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows
      .filter((r) => !r.isWithdrawn)
      .filter((r) => !onlyLoginUsers || r.hasLogin)
      .filter((r) => filterStatus === "all" || judgeActivity(r) === filterStatus)
      .filter(
        (r) =>
          !query ||
          r.name.toLowerCase().includes(query) ||
          (r.job ?? "").toLowerCase().includes(query)
      );
  }, [rows, search, filterStatus, onlyLoginUsers]);

  if (loadStatus === "loading") {
    return <div className="text-center text-gray-400 py-20">読み込み中...</div>;
  }
  if (loadStatus === "error") {
    return <div className="text-center text-red-600 py-20">活動状況を取得できませんでした。</div>;
  }

  const active = rows.filter((r) => !r.isWithdrawn && r.hasLogin);
  const counts = {
    active: active.filter((r) => judgeActivity(r) === "active").length,
    dormant: active.filter((r) => judgeActivity(r) === "dormant").length,
    inactive: active.filter((r) => judgeActivity(r) === "inactive").length,
  };

  // 継続率は台帳全体（ログインの有無に関係なく在籍か退会か）で見る
  const withdrawnTotal = rows.filter((r) => r.isWithdrawn).length;
  const activeTotal = rows.length - withdrawnTotal;
  const retention = {
    active: activeTotal,
    withdrawn: withdrawnTotal,
    rate: rows.length > 0 ? Math.round((activeTotal / rows.length) * 1000) / 10 : 0,
  };

  const renewalBreakdown = Object.entries(
    rows.reduce<Record<string, number>>((acc, r) => {
      const key = r.renewalStatus ?? "未記入";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {})
  )
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <>
      <div className="flex items-start gap-2 p-4 mb-6 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 leading-relaxed">
        <Activity className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>
          掲示板の投稿・イベント参加・アプリを開いた日数から算出しています。「ログイン日数」はサインイン操作の回数ではなく、その期間に何日アプリを開いたかです（セッションが続くため回数では実態が測れません）。ログインアカウントがまだ無い会員は活動を記録できないため既定では表示していません。
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {(
          [
            { key: "active", label: "アクティブ", count: counts.active },
            { key: "dormant", label: "活動減少", count: counts.dormant },
            { key: "inactive", label: "長期不在", count: counts.inactive },
          ] as const
        ).map((stat) => {
          const config = activityStatusConfig[stat.key];
          return (
            <div key={stat.key} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2.5 h-2.5 rounded-full ${config.dot}`} />
                <span className="text-xs text-gray-500">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.count}</p>
            </div>
          );
        })}

        {/* 継続率＝在籍 ÷ （在籍＋退会）。台帳の退会フラグから算出。 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-500 mb-2">継続率</p>
          <p className="text-2xl font-bold text-gray-900">
            {retention.rate}
            <span className="text-sm font-medium text-gray-400">%</span>
          </p>
          <p className="text-[11px] text-gray-400 mt-1">
            在籍{retention.active} / 退会{retention.withdrawn}
          </p>
        </div>
      </div>

      {/* 更新状況の内訳（台帳の renewal_status） */}
      <div className="flex flex-wrap gap-2 mb-6">
        {renewalBreakdown.map((r) => (
          <span
            key={r.label}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-xs text-gray-600"
          >
            {r.label}
            <span className="font-bold text-gray-900">{r.count}</span>
          </span>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="名前・職種で検索..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["all", "active", "dormant", "inactive"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                filterStatus === s
                  ? "bg-gray-900 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {s === "all" ? "すべて" : activityStatusConfig[s].label}
            </button>
          ))}
        </div>
      </div>

      <label className="inline-flex items-center gap-2 mb-4 text-xs text-gray-500 cursor-pointer">
        <input
          type="checkbox"
          checked={onlyLoginUsers}
          onChange={(e) => setOnlyLoginUsers(e.target.checked)}
          className="w-4 h-4"
        />
        ログインアカウントがある会員のみ表示（{rows.filter((r) => r.hasLogin && !r.isWithdrawn).length}人）
      </label>

      <div className="space-y-2.5">
        {filtered.map((row) => {
          const status = judgeActivity(row);
          const config = activityStatusConfig[status];
          return (
            <div
              key={row.memberId}
              className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm"
            >
              <div className="flex items-center gap-3 min-w-0 sm:flex-1">
                <MemberAvatar name={row.name} url={row.avatarUrl} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-900 truncate">{row.name}</p>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${config.bg} ${config.color}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                      {config.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 truncate">{row.job || "職業未登録"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-4 gap-y-2 text-[11px] sm:text-xs pl-14 sm:pl-0 sm:flex-shrink-0">
                <div>
                  <p className="text-gray-400">ログイン日数(30日)</p>
                  <p className="text-gray-700 font-medium">
                    {row.visitDays30d}日
                    <span className="text-gray-400 ml-1">
                      / {row.lastVisitDate ? agoLabel(row.lastVisitDate) : agoLabel(row.lastSignInAt)}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">投稿(30日)</p>
                  <p className="text-gray-700 font-medium">
                    {row.postCount30d}件
                    <span className="text-gray-400 ml-1">/ {agoLabel(row.lastPostAt)}</span>
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">参加(90日)</p>
                  <p className="text-gray-700 font-medium">
                    {row.eventCount90d}回
                    <span className="text-gray-400 ml-1">
                      / {row.lastEventDate ? fmtDate(row.lastEventDate) : "記録なし"}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">紹介</p>
                  <p className="text-gray-700 font-medium">{row.referralCount}人</p>
                </div>
                <div>
                  <p className="text-gray-400">継続</p>
                  <p className="text-gray-700 font-medium">
                    {membershipLabel(row)}
                    {row.renewalStatus && (
                      <span className="text-gray-400 ml-1">/ {row.renewalStatus}</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <p className="text-sm text-gray-400">該当するメンバーがいません</p>
          </div>
        )}
      </div>
    </>
  );
}

// ============================================================
// タブ: お知らせ送信（運営 → 会員へ一斉）
// ============================================================
// 届くのはログインアカウントを持つ在籍会員だけ。
// アカウントが無い人には読む手段が無いため送らない。
function AnnounceTab() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [href, setHref] = useState("");
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const send = async () => {
    setSending(true);
    setResult(null);
    const response = await fetch("/api/admin/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, message, href }),
    });
    const body = (await response.json().catch(() => null)) as
      | { sent?: number; error?: string }
      | null;
    setSending(false);
    setConfirming(false);

    if (!response.ok) {
      setResult({ type: "error", text: body?.error || "送信できませんでした" });
      return;
    }
    setResult({ type: "success", text: `${body?.sent ?? 0}人に送信しました` });
    setTitle("");
    setMessage("");
    setHref("");
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-start gap-2 p-4 mb-6 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 leading-relaxed">
        <Megaphone className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>
          全会員のお知らせ一覧に表示されます。<strong>送信の取り消しはできません。</strong>
          届くのはログインアカウントを持つ在籍会員のみです。
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div>
          <label className="block text-sm font-bold text-gray-900 mb-1.5">タイトル</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例: 4月の交流会の日程が決まりました"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-900 mb-1.5">本文（任意）</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="詳細を書いてください"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-900 mb-1.5">
            リンク先（任意）
          </label>
          <input
            value={href}
            onChange={(e) => setHref(e.target.value)}
            placeholder="例: /app/post"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          <p className="mt-1 text-[11px] text-gray-400">
            アプリ内のページを指定します（例: /app/board、/app/post）。空ならお知らせ一覧を開きます。
          </p>
        </div>

        {result && (
          <p
            className={`text-sm rounded-lg px-3 py-2 ${
              result.type === "success"
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {result.text}
          </p>
        )}

        {/* 取り消せない操作なので2段階にする */}
        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            disabled={!title.trim()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            送信する
          </button>
        ) : (
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
            <span className="text-sm text-gray-700 flex-1">
              全会員に送信します。よろしいですか？
            </span>
            <button
              onClick={() => setConfirming(false)}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-white transition-colors"
            >
              やめる
            </button>
            <button
              onClick={send}
              disabled={sending}
              className="px-5 py-2 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-60"
            >
              {sending ? "送信中..." : "送信"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// タブ3: 参加状況（実データ）
// ============================================================
// events / event_participants を集計する。会員向けの「会を探す」と同じ元データ。
function ParticipationTab() {
  const { events, status } = useEvents();
  const [viewMode, setViewMode] = useState<"member" | "event">("member");
  const [search, setSearch] = useState("");

  // 会員ごとの参加実績（イベント一覧の参加者から組み立てる）
  const memberStats = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; avatarUrl: string | null; dates: string[] }
    >();
    for (const ev of events) {
      for (const p of ev.participants) {
        const entry = map.get(p.id) ?? {
          id: p.id,
          name: p.name,
          avatarUrl: p.avatarUrl,
          dates: [],
        };
        entry.dates.push(ev.date);
        map.set(p.id, entry);
      }
    }
    return Array.from(map.values())
      .map((m) => ({
        ...m,
        total: m.dates.length,
        last: m.dates.slice().sort().at(-1) ?? null,
      }))
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  }, [events]);

  // 直近12か月の並び（ヒートマップの列）
  const months = useMemo(() => {
    const list: string[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      list.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    return list;
  }, []);

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return memberStats;
    return memberStats.filter((m) => m.name.toLowerCase().includes(query));
  }, [memberStats, search]);

  if (status === "loading") {
    return <div className="text-center text-gray-400 py-20">読み込み中...</div>;
  }
  if (status === "error") {
    return <div className="text-center text-red-600 py-20">参加状況を取得できませんでした。</div>;
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
        <CalendarDays className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">まだイベントが登録されていません</p>
        <p className="text-xs text-gray-400 mt-1">
          「会を探す」からイベントを作成すると、ここに参加状況が集計されます
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-500 mb-1">イベント数</p>
          <p className="text-2xl font-bold text-gray-900">{events.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-500 mb-1">参加した人数</p>
          <p className="text-2xl font-bold text-gray-900">{memberStats.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-500 mb-1">のべ参加数</p>
          <p className="text-2xl font-bold text-gray-900">
            {memberStats.reduce((sum, m) => sum + m.total, 0)}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex gap-2">
          {(["member", "event"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                viewMode === mode
                  ? "bg-gray-900 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {mode === "member" ? "会員ごと" : "イベントごと"}
            </button>
          ))}
        </div>
        {viewMode === "member" && (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="名前で検索..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
        )}
      </div>

      {viewMode === "member" ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                {/* 横スクロールしても誰の行か分かるよう左端を固定する */}
                <th className="sticky left-0 z-20 bg-white border-r border-gray-200 px-4 py-3 text-left text-xs font-bold text-gray-600 min-w-[160px]">
                  メンバー
                </th>
                <th className="px-3 py-3 text-right text-xs font-bold text-gray-600">計</th>
                {months.map((m) => (
                  <th
                    key={m}
                    className="px-2 py-3 text-center text-[10px] font-medium text-gray-400 whitespace-nowrap"
                  >
                    {Number(m.slice(5))}月
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((m) => (
                <tr key={m.id} className="group border-b border-gray-50">
                  <td className="sticky left-0 z-10 bg-white group-hover:bg-gray-50 border-r border-gray-200 px-4 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <MemberAvatar name={m.name} url={m.avatarUrl} size="sm" />
                      <span className="text-sm text-gray-800 truncate">{m.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-gray-900">{m.total}</td>
                  {months.map((month) => {
                    const count = m.dates.filter((d) => d.startsWith(month)).length;
                    return (
                      <td key={month} className="px-2 py-2.5 text-center">
                        {count > 0 ? (
                          <span
                            className="inline-flex items-center justify-center w-6 h-6 rounded-md text-[11px] font-bold text-white"
                            style={{
                              backgroundColor: `rgba(230, 37, 102, ${Math.min(1, 0.3 + count * 0.25)})`,
                            }}
                          >
                            {count}
                          </span>
                        ) : (
                          <span className="text-gray-200">・</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {filteredMembers.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-12">該当するメンバーがいません</p>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {[...events]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((ev) => (
              <div
                key={ev.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm"
              >
                <div className="min-w-0 sm:flex-1">
                  <p className="text-sm font-bold text-gray-900 truncate">{ev.title}</p>
                  <p className="text-xs text-gray-400">
                    {fmtDate(ev.date)}
                    {ev.location && `・${ev.location}`}
                    {ev.hostName && `・主催 ${ev.hostName}`}
                  </p>
                </div>
                <div className="flex items-center gap-3 sm:flex-shrink-0">
                  <div className="flex -space-x-2">
                    {ev.participants.slice(0, 6).map((p) => (
                      <MemberAvatar key={p.id} name={p.name} url={p.avatarUrl} size="sm" />
                    ))}
                  </div>
                  <span className="text-sm font-bold text-gray-900">
                    {ev.participantCount}
                    <span className="text-xs font-normal text-gray-400 ml-0.5">人</span>
                  </span>
                </div>
              </div>
            ))}
        </div>
      )}
    </>
  );
}

// ============================================================
// タブ4: 会員DB（統合データビューア）
// ============================================================
// データソース: Supabase接続時は /api/admin/members、未接続mock時は public/members-db.json
interface MemberDbRow {
  id: string;
  member_no: number | string | null;  // 実データは number、フォールバック("00A"等)は string
  name: string;
  nickname: string | null;
  referrer: string | null;
  start_year: number | null;
  start_month: number | null;
  renewal_status: string | null;
  renewal_fee: number | null;
  renewal_note: string | null;
  price: number | null;
  referral_fee: number | null;
  job: string | null;
  grip: string | null;
  frequency: string | null;
  email: string | null;
  phone: string | null;
  gender: string | null;
  age_range: string | null;
  membership_type: string | null;
  payment_method: string | null;
  contact_submitted_at: string | null;
  source: "both" | "member_only" | "contact_only";
  is_withdrawn: boolean;
  import_sheet: string | null;
  auth_user_id: string | null;
  role: "admin" | "manager" | "user";
  withdrawn_at?: string | null;
  withdrawal_reason?: string | null;
  admin_note?: string | null;
  avatar_path?: string | null;
  avatar_url?: string | null;   // サーバー側で発行した署名URL（写真なしは null）
  referrer_member_id?: string | null;
}

type MembersDbFilter = "all" | "both" | "member_only" | "contact_only" | "withdrawn";
type MembersDbSortKey = "member_no" | "name" | "start_year" | "start_month" | "price" | "contact_submitted_at";

const sortKeyLabels: Record<MembersDbSortKey, string> = {
  member_no: "会員番号",
  name: "氏名",
  start_year: "スタート年",
  start_month: "スタート月",
  price: "入会時金額",
  contact_submitted_at: "フォーム送信日",
};

// スタート月の表示（年があれば「YYYY年M月」、月だけなら「M月」）
function formatStartMonth(r: Pick<MemberDbRow, "start_year" | "start_month">): string | null {
  if (r.start_year && r.start_month) return `${r.start_year}年${r.start_month}月`;
  if (r.start_month) return `${r.start_month}月`;
  if (r.start_year) return `${r.start_year}年`;
  return null;
}

// 1回目更新ステータスの色（H列）
const renewalStatusStyle: Record<string, string> = {
  更新済: "bg-green-50 text-green-700 border-green-200",
  退会: "bg-red-50 text-red-600 border-red-200",
  未更新: "bg-gray-50 text-gray-500 border-gray-200",
  返事待ち: "bg-amber-50 text-amber-700 border-amber-200",
  入金待ち: "bg-amber-50 text-amber-700 border-amber-200",
};

// フィルタ・ソート・検索の共通state管理
// 両タブで同じ挙動にしつつ、showWithdrawnの初期値だけ切替可能
function useMembersDbView(rows: MemberDbRow[] | null, defaults?: { showWithdrawn?: boolean }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<MembersDbFilter>("all");
  const [membershipFilter, setMembershipFilter] = useState<"all" | "法人" | "個人">("all");
  const [sortKey, setSortKey] = useState<MembersDbSortKey>("member_no");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [showWithdrawn, setShowWithdrawn] = useState(defaults?.showWithdrawn ?? false);

  const counts = useMemo(() => {
    if (!rows) return { total: 0, both: 0, member_only: 0, contact_only: 0, withdrawn: 0 };
    return rows.reduce(
      (acc, r) => {
        acc.total++;
        acc[r.source]++;
        if (r.is_withdrawn) acc.withdrawn++;
        return acc;
      },
      { total: 0, both: 0, member_only: 0, contact_only: 0, withdrawn: 0 },
    );
  }, [rows]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const result = rows
      .filter((r) => {
        if (filter === "all") return true;
        if (filter === "withdrawn") return r.is_withdrawn;
        return r.source === filter;
      })
      .filter((r) => (filter === "withdrawn" || showWithdrawn ? true : !r.is_withdrawn))
      .filter((r) => (membershipFilter === "all" ? true : r.membership_type === membershipFilter))
      .filter((r) => {
        if (!search.trim()) return true;
        const s = search.toLowerCase();
        return (
          r.name.toLowerCase().includes(s) ||
          (r.nickname?.toLowerCase().includes(s) ?? false) ||
          (r.email?.toLowerCase().includes(s) ?? false) ||
          (r.phone?.includes(search) ?? false) ||
          (r.job?.toLowerCase().includes(s) ?? false) ||
          (r.referrer?.toLowerCase().includes(s) ?? false) ||
          (r.member_no != null && String(r.member_no).includes(search))
        );
      });

    const dir = sortDir === "asc" ? 1 : -1;
    return [...result].sort((a, b) => {
      const av = a[sortKey] as string | number | null;
      const bv = b[sortKey] as string | number | null;
      // nullは常に末尾（sort方向に関わらず既知の値を優先）
      if (av == null && bv == null) return a.name.localeCompare(b.name, "ja");
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv), "ja") * dir;
    });
  }, [rows, search, filter, membershipFilter, sortKey, sortDir, showWithdrawn]);

  // ヘッダークリックでソート切替（同じキーなら昇降反転、違うキーなら昇順）
  const toggleSort = (key: MembersDbSortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return {
    search, setSearch,
    filter, setFilter,
    membershipFilter, setMembershipFilter,
    sortKey, setSortKey,
    sortDir, setSortDir,
    showWithdrawn, setShowWithdrawn,
    toggleSort,
    counts, filtered,
  };
}

// 会員DBデータのフェッチ（Supabase接続時は認証済み管理API、mock時だけローカルJSON）
function useMembersDb() {
  const [rows, setRows] = useState<MemberDbRow[] | null>(null);
  const [loadStatus, setLoadStatus] = useState<"loading" | "loaded" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/members", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((data: MemberDbRow[]) => {
        if (cancelled) return;
        setRows(data);
        setLoadStatus("loaded");
      })
      .catch(() => {
        // 取得できないときはダミーへ落とさない。
        // 実データのつもりで偽の会員を見てしまう方が危ない。
        if (cancelled) return;
        setRows([]);
        setLoadStatus("error");
      });
    return () => { cancelled = true; };
  }, []);

  return { rows, loadStatus };
}

// ソート可能なテーブルヘッダーセル（クリックで昇降切替）
function SortableHeaderCell({
  label,
  sortKey,
  view,
  align = "left",
}: {
  label: string;
  sortKey: MembersDbSortKey;
  view: ReturnType<typeof useMembersDbView>;
  align?: "left" | "right" | "center";
}) {
  const isActive = view.sortKey === sortKey;
  const alignCls = align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start";
  return (
    <button
      onClick={() => view.toggleSort(sortKey)}
      className={`flex items-center gap-1 ${alignCls} hover:text-gray-900 transition-colors ${
        isActive ? "text-amber-700" : "text-gray-600"
      }`}
      title={isActive ? (view.sortDir === "asc" ? "昇順（クリックで降順）" : "降順（クリックで昇順）") : "クリックでソート"}
    >
      <span>{label}</span>
      <span className={`text-[10px] leading-none ${isActive ? "" : "text-gray-300"}`}>
        {isActive ? (view.sortDir === "asc" ? "↑" : "↓") : "⇅"}
      </span>
    </button>
  );
}

// 検索/フィルタ/ソートの共通ツールバー
function MembersDbToolbar({
  view,
  sortKeys,
}: {
  view: ReturnType<typeof useMembersDbView>;
  sortKeys: MembersDbSortKey[];
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4 space-y-3">
      {/* 検索 + 退会者トグル */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={view.search}
            onChange={(e) => view.setSearch(e.target.value)}
            placeholder="氏名・メール・電話・職業・紹介者・会員番号で検索"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        {view.filter !== "withdrawn" && (
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={view.showWithdrawn}
              onChange={(e) => view.setShowWithdrawn(e.target.checked)}
              className="w-4 h-4 accent-amber-500"
            />
            退会者を表示
          </label>
        )}
      </div>

      {/* 枠フィルタ + ソート */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-sm">
        {/* 枠 */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-500 whitespace-nowrap">枠:</span>
          <div className="flex gap-1">
            {(["all", "法人", "個人"] as const).map((t) => (
              <button
                key={t}
                onClick={() => view.setMembershipFilter(t)}
                className={`px-3 py-1 text-xs font-bold rounded-full border transition-colors ${
                  view.membershipFilter === t
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                }`}
              >
                {t === "all" ? "全て" : t}
              </button>
            ))}
          </div>
        </div>

        {/* ソート */}
        <div className="flex items-center gap-2 sm:ml-auto">
          <span className="text-xs font-bold text-gray-500 whitespace-nowrap">並び順:</span>
          <select
            value={view.sortKey}
            onChange={(e) => view.setSortKey(e.target.value as MembersDbSortKey)}
            className="px-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
          >
            {sortKeys.map((k) => (
              <option key={k} value={k}>{sortKeyLabels[k]}</option>
            ))}
          </select>
          <button
            onClick={() => view.setSortDir(view.sortDir === "asc" ? "desc" : "asc")}
            className="px-3 py-1 text-xs font-bold rounded-md border border-gray-200 bg-white hover:border-gray-400 transition-colors whitespace-nowrap"
            title={view.sortDir === "asc" ? "昇順（クリックで降順）" : "降順（クリックで昇順）"}
          >
            {view.sortDir === "asc" ? "↑ 昇順" : "↓ 降順"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MembersDbTab() {
  const { rows, loadStatus } = useMembersDb();
  const view = useMembersDbView(rows);
  const [detailRow, setDetailRow] = useState<MemberDbRow | null>(null);

  const { filter, counts, filtered } = view;

  const sourceLabel: Record<MemberDbRow["source"], { label: string; cls: string }> = {
    both: { label: "両方", cls: "bg-green-50 text-green-700 border-green-200" },
    member_only: { label: "名簿のみ", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    contact_only: { label: "連絡先のみ", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  };

  if (loadStatus === "loading") {
    return <div className="text-center text-gray-400 py-20">読み込み中...</div>;
  }
  if (loadStatus === "error") {
    return <div className="text-center text-red-600 py-20">会員データを取得できませんでした。Supabaseの接続と権限を確認してください。</div>;
  }

  return (
    <>

      {/* 統計カード（クリックでフィルタ切替、全て排他的） */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { key: "all" as MembersDbFilter, label: "全員", count: counts.total, color: "text-gray-900" },
          { key: "both" as MembersDbFilter, label: "両方", count: counts.both, color: "text-green-600" },
          { key: "member_only" as MembersDbFilter, label: "名簿のみ", count: counts.member_only, color: "text-amber-600" },
          { key: "contact_only" as MembersDbFilter, label: "連絡先のみ", count: counts.contact_only, color: "text-blue-600" },
          { key: "withdrawn" as MembersDbFilter, label: "退会者", count: counts.withdrawn, color: "text-red-500" },
        ].map((stat) => (
          <button
            key={stat.key}
            onClick={() => view.setFilter(stat.key)}
            className={`bg-white rounded-xl border shadow-sm p-4 text-left transition-all ${
              filter === stat.key ? "border-gray-900 ring-1 ring-gray-900" : "border-gray-100 hover:border-gray-300"
            }`}
          >
            <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.count}</p>
          </button>
        ))}
      </div>

      {/* 検索・フィルタ・ソート ツールバー */}
      <MembersDbToolbar view={view} sortKeys={["member_no", "name", "start_year", "start_month", "price"]} />

      {/* 一覧 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[820px]">
            {/* ヘッダー行（ソート可能カラムはクリックで切替） */}
            <div className="grid grid-cols-[60px_2fr_60px_100px_100px_1.2fr_80px_70px] gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-600">
              <SortableHeaderCell label="番号" sortKey="member_no" view={view} />
              <SortableHeaderCell label="氏名" sortKey="name" view={view} />
              <div>枠</div>
              <SortableHeaderCell label="スタート" sortKey="start_month" view={view} />
              <SortableHeaderCell label="料金" sortKey="price" view={view} align="right" />
              <div>紹介者</div>
              <div>出典</div>
              <div className="text-right">状態</div>
            </div>
            {/* 行 */}
            <div className="max-h-[calc(100vh-400px)] overflow-y-auto">
              {filtered.length === 0 && (
                <div className="text-center text-gray-400 py-12 text-sm">該当するメンバーがいません</div>
              )}
              {filtered.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setDetailRow(r)}
                  className="w-full grid grid-cols-[60px_2fr_60px_100px_100px_1.2fr_80px_70px] gap-2 px-4 py-3 border-b border-gray-100 text-sm text-left hover:bg-amber-50 transition-colors items-center"
                >
                  <div className="text-gray-500 font-mono text-xs">{r.member_no ?? "—"}</div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate">{r.name}</p>
                    {r.nickname && <p className="text-[11px] text-gray-400 truncate">{r.nickname}</p>}
                    {r.job && <p className="text-[11px] text-gray-500 truncate mt-0.5">{r.job}</p>}
                  </div>
                  <div>
                    {r.membership_type ? (
                      <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded border ${
                        r.membership_type === "法人"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-gray-50 text-gray-600 border-gray-200"
                      }`}>
                        {r.membership_type}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </div>
                  <div className="text-gray-600 text-xs truncate">{formatStartMonth(r) || "—"}</div>
                  <div className="text-right text-gray-700 text-xs font-mono">
                    {r.price != null ? `¥${r.price.toLocaleString()}` : "—"}
                  </div>
                  <div className="text-gray-600 text-xs truncate">{r.referrer || "—"}</div>
                  <div>
                    <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded border ${sourceLabel[r.source].cls}`}>
                      {sourceLabel[r.source].label}
                    </span>
                  </div>
                  <div className="text-right">
                    {r.is_withdrawn ? (
                      <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded bg-red-50 text-red-600 border border-red-200">退会</span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded bg-green-50 text-green-600 border border-green-200">現役</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
          {filtered.length}件 表示中（全{counts.total}件中）
        </div>
      </div>

      {/* 詳細モーダル */}
      {detailRow && <MemberDbDetailModal row={detailRow} onClose={() => setDetailRow(null)} />}
    </>
  );
}

function MemberDbDetailModal({ row, onClose }: { row: MemberDbRow; onClose: () => void }) {
  const fields: { label: string; value: string | number | boolean | null; mono?: boolean }[] = [
    { label: "会員番号", value: row.member_no, mono: true },
    { label: "氏名", value: row.name },
    { label: "呼び名", value: row.nickname },
    { label: "メールアドレス", value: row.email, mono: true },
    { label: "電話番号", value: row.phone, mono: true },
    { label: "性別", value: row.gender },
    { label: "年代", value: row.age_range },
    { label: "職業", value: row.job },
    { label: "紹介者", value: row.referrer },
    { label: "スタート月", value: formatStartMonth(row) },
    { label: "１回目更新", value: row.renewal_status },
    { label: "更新時金額", value: row.renewal_fee != null ? `¥${row.renewal_fee.toLocaleString()}` : null },
    { label: "入会時金額", value: row.price != null ? `¥${row.price.toLocaleString()}` : null },
    { label: "紹介料", value: row.referral_fee != null ? `¥${row.referral_fee.toLocaleString()}` : null },
    { label: "グリップ", value: row.grip },
    { label: "参加頻度", value: row.frequency },
    { label: "法人・個人", value: row.membership_type },
    { label: "支払方法", value: row.payment_method },
    { label: "フォーム送信日", value: row.contact_submitted_at ? new Date(row.contact_submitted_at).toLocaleString("ja-JP") : null },
    { label: "データ出典", value: row.source === "both" ? "両方" : row.source === "member_only" ? "名簿のみ" : "連絡先のみ" },
    { label: "退会", value: row.is_withdrawn ? "はい" : "いいえ" },
    { label: "名簿シート", value: row.import_sheet },
    { label: "ID", value: row.id, mono: true },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{row.name}</h3>
            <p className="text-xs text-gray-500">会員詳細</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="overflow-y-auto p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            {fields.map((f) => (
              <div key={f.label} className="border-b border-gray-100 pb-2">
                <p className="text-[11px] text-gray-400 mb-0.5">{f.label}</p>
                <p className={`text-sm text-gray-900 break-words ${f.mono ? "font-mono" : ""}`}>
                  {f.value == null || f.value === "" ? <span className="text-gray-300">—</span> : String(f.value)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// タブ5: 生会員DB（全フィールド一覧・横スクロール）
// ============================================================
// 会員DBタブが「よく使うカラムのみ」なのに対し、こちらは全22フィールドを一度に表示。
// データ取得ロジックは useMembersDb() を共有。
function MembersDbRawTab() {
  const { rows, loadStatus } = useMembersDb();
  // 生データビューなので退会者もデフォルトで表示（全件が見える状態が期待値）
  const view = useMembersDbView(rows, { showWithdrawn: true });
  const { filter, counts, filtered } = view;

  if (loadStatus === "loading") {
    return <div className="text-center text-gray-400 py-20">読み込み中...</div>;
  }
  if (loadStatus === "error") {
    return <div className="text-center text-red-600 py-20">会員データを取得できませんでした。Supabaseの接続と権限を確認してください。</div>;
  }

  // 全カラム定義（表示順・幅・値の取得関数・ソートキー）
  const columns: { label: string; width: string; align?: "left" | "right" | "center"; sortKey?: MembersDbSortKey; render: (r: MemberDbRow) => React.ReactNode }[] = [
    { label: "番号", width: "60px", sortKey: "member_no", render: (r) => <span className="font-mono text-xs text-gray-500">{r.member_no ?? "—"}</span> },
    { label: "氏名", width: "140px", sortKey: "name", render: (r) => <span className="font-bold text-gray-900">{r.name}</span> },
    { label: "呼び名", width: "100px", render: (r) => r.nickname || <span className="text-gray-300">—</span> },
    { label: "枠", width: "60px", render: (r) => r.membership_type ? (
      <span className={`inline-block px-1.5 py-0.5 text-[10px] font-bold rounded border ${
        r.membership_type === "法人" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-gray-50 text-gray-600 border-gray-200"
      }`}>{r.membership_type}</span>
    ) : <span className="text-gray-300">—</span> },
    { label: "性別", width: "50px", render: (r) => r.gender || <span className="text-gray-300">—</span> },
    { label: "年代", width: "70px", render: (r) => r.age_range || <span className="text-gray-300">—</span> },
    { label: "職業", width: "200px", render: (r) => r.job || <span className="text-gray-300">—</span> },
    { label: "紹介者", width: "110px", render: (r) => r.referrer || <span className="text-gray-300">—</span> },
    { label: "スタート年", width: "70px", sortKey: "start_year", render: (r) => r.start_year != null ? <span className="text-xs">{r.start_year}</span> : <span className="text-gray-300">—</span> },
    { label: "スタート月", width: "60px", sortKey: "start_month", render: (r) => r.start_month != null ? <span className="text-xs">{r.start_month}月</span> : <span className="text-gray-300">—</span> },
    { label: "1回目更新", width: "80px", render: (r) => r.renewal_status ? (
      <span className={`inline-block px-1.5 py-0.5 text-[10px] font-bold rounded border ${renewalStatusStyle[r.renewal_status] || "bg-gray-50 text-gray-600 border-gray-200"}`}>{r.renewal_status}</span>
    ) : <span className="text-gray-300">—</span> },
    { label: "更新時金額", width: "80px", align: "right", render: (r) => r.renewal_fee != null ? <span className="font-mono text-xs">¥{r.renewal_fee.toLocaleString()}</span> : <span className="text-gray-300">—</span> },
    { label: "更新メモ", width: "140px", render: (r) => r.renewal_note || <span className="text-gray-300">—</span> },
    { label: "入会時金額", width: "80px", align: "right", sortKey: "price", render: (r) => r.price != null ? <span className="font-mono text-xs">¥{r.price.toLocaleString()}</span> : <span className="text-gray-300">—</span> },
    { label: "紹介料", width: "80px", align: "right", render: (r) => r.referral_fee != null ? <span className="font-mono text-xs">¥{r.referral_fee.toLocaleString()}</span> : <span className="text-gray-300">—</span> },
    { label: "グリップ", width: "90px", render: (r) => r.grip || <span className="text-gray-300">—</span> },
    { label: "参加頻度", width: "100px", render: (r) => r.frequency || <span className="text-gray-300">—</span> },
    { label: "メール", width: "220px", render: (r) => <span className="text-xs">{r.email || <span className="text-gray-300">—</span>}</span> },
    { label: "電話", width: "130px", render: (r) => <span className="font-mono text-xs">{r.phone || <span className="text-gray-300">—</span>}</span> },
    { label: "支払方法", width: "100px", render: (r) => r.payment_method || <span className="text-gray-300">—</span> },
    { label: "フォーム送信日", width: "150px", sortKey: "contact_submitted_at", render: (r) => r.contact_submitted_at ? (
      <span className="text-xs">{new Date(r.contact_submitted_at).toLocaleDateString("ja-JP")}</span>
    ) : <span className="text-gray-300">—</span> },
    { label: "出典", width: "90px", render: (r) => {
      const label = r.source === "both" ? "両方" : r.source === "member_only" ? "名簿のみ" : "連絡先のみ";
      const cls = r.source === "both" ? "bg-green-50 text-green-700 border-green-200"
        : r.source === "member_only" ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-blue-50 text-blue-700 border-blue-200";
      return <span className={`inline-block px-1.5 py-0.5 text-[10px] font-bold rounded border ${cls}`}>{label}</span>;
    } },
    { label: "状態", width: "70px", render: (r) => r.is_withdrawn ? (
      <span className="inline-block px-1.5 py-0.5 text-[10px] font-bold rounded bg-red-50 text-red-600 border border-red-200">退会</span>
    ) : (
      <span className="inline-block px-1.5 py-0.5 text-[10px] font-bold rounded bg-green-50 text-green-600 border border-green-200">現役</span>
    ) },
    { label: "名簿シート", width: "100px", render: (r) => r.import_sheet || <span className="text-gray-300">—</span> },
    { label: "ID", width: "280px", render: (r) => <span className="font-mono text-[10px] text-gray-400">{r.id}</span> },
  ];

  const gridTemplate = columns.map((c) => c.width).join(" ");
  const minWidth = columns.reduce((sum, c) => sum + (parseInt(c.width) || 0), 0) + columns.length * 8;

  return (
    <>

      {/* 統計カード */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { key: "all" as MembersDbFilter, label: "全員", count: counts.total, color: "text-gray-900" },
          { key: "both" as MembersDbFilter, label: "両方", count: counts.both, color: "text-green-600" },
          { key: "member_only" as MembersDbFilter, label: "名簿のみ", count: counts.member_only, color: "text-amber-600" },
          { key: "contact_only" as MembersDbFilter, label: "連絡先のみ", count: counts.contact_only, color: "text-blue-600" },
          { key: "withdrawn" as MembersDbFilter, label: "退会者", count: counts.withdrawn, color: "text-red-500" },
        ].map((stat) => (
          <button
            key={stat.key}
            onClick={() => view.setFilter(stat.key)}
            className={`bg-white rounded-xl border shadow-sm p-4 text-left transition-all ${
              filter === stat.key ? "border-gray-900 ring-1 ring-gray-900" : "border-gray-100 hover:border-gray-300"
            }`}
          >
            <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.count}</p>
          </button>
        ))}
      </div>

      {/* 検索・フィルタ・ソート ツールバー（生DBは contact_submitted_at もソート可） */}
      <MembersDbToolbar view={view} sortKeys={["member_no", "name", "start_year", "start_month", "price", "contact_submitted_at"]} />

      {/* 全カラムテーブル（横スクロール） */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-auto max-h-[calc(100vh-280px)]">
          <div style={{ minWidth: `${minWidth}px` }}>
            {/* ヘッダー行（sticky、ソート可能カラムはクリックで切替） */}
            <div
              className="grid gap-2 px-4 py-3 bg-gray-100 border-b border-gray-200 text-xs font-bold text-gray-700 sticky top-0 z-10"
              style={{ gridTemplateColumns: gridTemplate }}
            >
              {columns.map((c) => {
                const alignCls = c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "";
                if (c.sortKey) {
                  return (
                    <div key={c.label} className={alignCls}>
                      <SortableHeaderCell label={c.label} sortKey={c.sortKey} view={view} align={c.align} />
                    </div>
                  );
                }
                return <div key={c.label} className={alignCls}>{c.label}</div>;
              })}
            </div>
            {/* 行 */}
            {filtered.length === 0 && (
              <div className="text-center text-gray-400 py-12 text-sm">該当するメンバーがいません</div>
            )}
            {filtered.map((r) => (
              <div
                key={r.id}
                className="grid gap-2 px-4 py-2.5 border-b border-gray-100 text-sm text-gray-700 hover:bg-amber-50 transition-colors items-center"
                style={{ gridTemplateColumns: gridTemplate }}
              >
                {columns.map((c) => (
                  <div
                    key={c.label}
                    className={`truncate ${c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : ""}`}
                    title={typeof c.render(r) === "string" ? String(c.render(r)) : undefined}
                  >
                    {c.render(r)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
          {filtered.length}件 表示中（全{counts.total}件中）・全{columns.length}カラム
        </div>
      </div>
    </>
  );
}

// ============================================================
// タブ: 会員管理（退会フロー＝運営のみ。退会させる / 復帰させる）
// 退会状態は lib/withdrawal-data.ts（localStorage）が正。members/profile/tree に即反映。
// ============================================================
function fmtDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

// DBのロール値（admin/manager/user）を画面表示のラベルへ
function roleLabelOf(role: "admin" | "manager" | "user"): MemberRole {
  if (role === "admin") return "運営";
  if (role === "manager") return "部長";
  return "ユーザー";
}

// 画面が扱う1行の形。実DB接続時とmock時で作り方が違うのでここで揃える。
interface ManageRow {
  id: string;
  name: string;
  job: string;
  memberNo: number | string | null;
  role: "admin" | "manager" | "user";
  /** ログインアカウントと紐づいているか。ロールはこの人にしか意味がない。 */
  hasLogin: boolean;
  isWithdrawn: boolean;
  withdrawnAt: string | null;
  withdrawalReason: string | null;
  note: string | null;
  avatarUrl: string | null;
  /** 台帳に書かれている紹介者の名前（原文） */
  referrerText: string | null;
  /** 紹介者を会員として特定できた場合の members.id */
  referrerMemberId: string | null;
}

// 626名を一度に描画すると重いので、既定はこの件数まで（検索で絞り込む運用）
const MANAGE_PAGE_SIZE = 100;

function MemberManageTab() {
  const { rows: dbRows, loadStatus } = useMembersDb();


  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(MANAGE_PAGE_SIZE);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<
    { type: "success" | "error"; text: string } | null
  >(null);
  // 実DB側の更新結果をその場で反映するための上書き（再取得なしで一覧に効かせる）
  const [overrides, setOverrides] = useState<Record<string, Partial<ManageRow>>>({});

  const [withdrawTarget, setWithdrawTarget] = useState<ManageRow | null>(null);
  const [reason, setReason] = useState("");
  const [reactivateTarget, setReactivateTarget] = useState<ManageRow | null>(null);
  const [noteTarget, setNoteTarget] = useState<ManageRow | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  // 紹介者の紐づけ（台帳のテキストを見ながら会員を選ぶ）
  const [referrerTarget, setReferrerTarget] = useState<ManageRow | null>(null);
  const [referrerSearch, setReferrerSearch] = useState("");

  const allRows: ManageRow[] = useMemo(() => {
    const base: ManageRow[] = (dbRows ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      job: r.job ?? "",
      memberNo: r.member_no,
      role: r.role,
      hasLogin: Boolean(r.auth_user_id),
      isWithdrawn: r.is_withdrawn,
      withdrawnAt: r.withdrawn_at ?? null,
      withdrawalReason: r.withdrawal_reason ?? null,
      note: r.admin_note ?? null,
      avatarUrl: r.avatar_url ?? null,
      referrerText: r.referrer ?? null,
      referrerMemberId: r.referrer_member_id ?? null,
    }));

    return base.map((row) =>
      overrides[row.id] ? { ...row, ...overrides[row.id] } : row
    );
  }, [dbRows, overrides]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return allRows;
    return allRows.filter(
      (m) =>
        m.name.toLowerCase().includes(query) ||
        m.job.toLowerCase().includes(query) ||
        String(m.memberNo ?? "").includes(query)
    );
  }, [allRows, search]);

  const visible = filtered.slice(0, visibleCount);
  const withdrawnCount = allRows.filter((m) => m.isWithdrawn).length;
  const activeCount = allRows.length - withdrawnCount;

  // 実DB接続時のみ API を叩く。mock時は従来の localStorage ストアを更新する。
  const patchMember = async (
    row: ManageRow,
    body: Record<string, unknown>,
    optimistic: Partial<ManageRow>,
    successText: string
  ): Promise<boolean> => {
    setSavingId(row.id);
    setMessage(null);
    const response = await fetch(`/api/admin/members/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = (await response.json().catch(() => null)) as { error?: string } | null;
    setSavingId(null);

    if (!response.ok) {
      setMessage({ type: "error", text: result?.error || "更新できませんでした" });
      return false;
    }
    setOverrides((cur) => ({ ...cur, [row.id]: { ...cur[row.id], ...optimistic } }));
    setMessage({ type: "success", text: successText });
    return true;
  };

  // ロール変更（ログイン紐づけ済みの会員のみ）。
  // set_member_role 側で「最後の運営は降格不可」を担保している。
  const changeRole = async (row: ManageRow, role: ManageRow["role"]) => {
    if (row.role === role) return;

    setSavingId(row.id);
    setMessage(null);
    const response = await fetch(`/api/admin/members/${row.id}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const result = (await response.json().catch(() => null)) as { error?: string } | null;
    setSavingId(null);

    if (!response.ok) {
      setMessage({ type: "error", text: result?.error || "権限を変更できませんでした" });
      return;
    }
    setOverrides((cur) => ({ ...cur, [row.id]: { ...cur[row.id], role } }));
    setMessage({
      type: "success",
      text: `${row.name}さんの権限を「${roleLabelOf(role)}」にしました`,
    });
  };

  const confirmWithdraw = async () => {
    if (!withdrawTarget) return;
    const trimmed = reason.trim();
    const ok = await patchMember(
      withdrawTarget,
      { is_withdrawn: true, withdrawal_reason: trimmed },
      {
        isWithdrawn: true,
        withdrawnAt: new Date().toISOString(),
        withdrawalReason: trimmed || null,
      },
      `${withdrawTarget.name}さんを退会にしました`
    );
    if (ok) {
      setWithdrawTarget(null);
      setReason("");
    }
  };

  const confirmReactivate = async () => {
    if (!reactivateTarget) return;
    const ok = await patchMember(
      reactivateTarget,
      { is_withdrawn: false },
      { isWithdrawn: false, withdrawnAt: null, withdrawalReason: null },
      `${reactivateTarget.name}さんを復帰させました`
    );
    if (ok) setReactivateTarget(null);
  };

  // 紹介者を会員へ紐づける（解除は null）
  const linkReferrer = async (row: ManageRow, referrerMemberId: string | null) => {
    setSavingId(row.id);
    setMessage(null);
    const response = await fetch(`/api/admin/members/${row.id}/referrer`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referrerMemberId }),
    });
    const result = (await response.json().catch(() => null)) as { error?: string } | null;
    setSavingId(null);

    if (!response.ok) {
      setMessage({ type: "error", text: result?.error || "紹介者を更新できませんでした" });
      return;
    }
    setOverrides((cur) => ({ ...cur, [row.id]: { ...cur[row.id], referrerMemberId } }));
    setMessage({
      type: "success",
      text: referrerMemberId ? "紹介者を紐づけました" : "紹介者の紐づけを解除しました",
    });
    setReferrerTarget(null);
    setReferrerSearch("");
  };

  const confirmNote = async () => {
    if (!noteTarget) return;
    const trimmed = noteDraft.trim();
    const ok = await patchMember(
      noteTarget,
      { admin_note: trimmed },
      { note: trimmed || null },
      `${noteTarget.name}さんの備考を保存しました`
    );
    if (ok) setNoteTarget(null);
  };

  if (loadStatus === "loading") {
    return <div className="text-center text-gray-400 py-20">読み込み中...</div>;
  }
  if (loadStatus === "error") {
    return (
      <div className="text-center text-red-600 py-20">
        会員データを取得できませんでした。
      </div>
    );
  }

  return (
    <>
      {/* サマリー */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
          <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
          <p className="text-xs text-gray-500 mt-1">在籍</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
          <p className="text-2xl font-bold text-red-500">{withdrawnCount}</p>
          <p className="text-xs text-gray-500 mt-1">退会</p>
        </div>
      </div>

      {/* 退会の運用メモ */}
      <div className="flex items-start gap-2 p-4 mb-6 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 leading-relaxed">
        <UserX className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>
          退会は運営側でのみ処理します（本人からの退会ボタンはありません）。会員からLINEで退会依頼を受けたら、ここで「退会させる」を実行してください。退会後も名前は記録として残り、いつでも復帰できます。権限（運営／部長）の変更は「権限管理」タブで行います。
        </span>
      </div>

      {/* 検索 */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setVisibleCount(MANAGE_PAGE_SIZE);
          }}
          placeholder="名前・職種・会員番号で検索..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        />
      </div>

      {message && (
        <p
          className={`mb-3 text-sm rounded-lg px-3 py-2 ${
            message.type === "success"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </p>
      )}

      <p className="text-xs text-gray-400 mb-3">
        {filtered.length}件中 {visible.length}件を表示
      </p>

      {/* 一覧 */}
      <div className="space-y-2.5">
        {visible.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-white rounded-2xl border shadow-sm ${
              m.isWithdrawn ? "border-red-100" : "border-gray-100"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0 sm:flex-1">
              <MemberAvatar
                name={m.name}
                url={m.avatarUrl}
                grayscale={m.isWithdrawn}
                className="ring-1 ring-gray-100"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {m.name}
                  </p>
                  {m.isWithdrawn ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-bold border border-red-200">
                      退会
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-50 text-green-600 text-[10px] font-bold border border-green-200">
                      在籍
                    </span>
                  )}
                  <RoleBadge role={roleLabelOf(m.role)} />
                  {m.memberNo != null && (
                    <span className="text-[10px] text-gray-400">
                      No.{m.memberNo}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 truncate">{m.job}</p>
                {m.isWithdrawn && (m.withdrawnAt || m.withdrawalReason) && (
                  <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                    {m.withdrawnAt && `退会日 ${fmtDate(m.withdrawnAt)}`}
                    {m.withdrawalReason && `・理由: ${m.withdrawalReason}`}
                  </p>
                )}
                {m.referrerText && (
                  <button
                    onClick={() => {
                      setReferrerTarget(m);
                      setReferrerSearch(m.referrerText ?? "");
                    }}
                    className="mt-1 inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-800 transition-colors"
                    title="紹介者を会員に紐づける"
                  >
                    <Handshake className="w-3 h-3" />
                    紹介者: {m.referrerText}
                    {m.referrerMemberId ? (
                      <span className="text-green-600 font-bold">（紐づけ済み）</span>
                    ) : (
                      <span className="text-amber-600">（未紐づけ）</span>
                    )}
                  </button>
                )}
                {m.note && (
                  <p className="flex items-start gap-1 text-[11px] text-gray-600 mt-1 bg-amber-50/70 border border-amber-100 rounded-lg px-2 py-1 whitespace-pre-wrap break-words">
                    <StickyNote className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
                    <span>{m.note}</span>
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap sm:flex-shrink-0 pl-14 sm:pl-0">
              {/* 権限。ログインアカウントが無い会員に付けても効かないので選ばせない。 */}
              {m.hasLogin ? (
                <select
                  value={m.role}
                  onChange={(e) => changeRole(m, e.target.value as ManageRow["role"])}
                  disabled={savingId === m.id}
                  className="px-2.5 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent cursor-pointer disabled:opacity-50"
                  aria-label={`${m.name}の権限`}
                  title="権限"
                >
                  <option value="user">一般</option>
                  <option value="manager">部長</option>
                  <option value="admin">運営</option>
                </select>
              ) : (
                <span
                  className="px-2.5 py-2 rounded-xl border border-dashed border-gray-200 text-[11px] text-gray-400"
                  title="ログインアカウントが未作成のため権限は設定できません"
                >
                  未ログイン
                </span>
              )}
              <button
                onClick={() => {
                  setNoteTarget(m);
                  setNoteDraft(m.note ?? "");
                }}
                disabled={savingId === m.id}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-colors disabled:opacity-50 ${
                  m.note
                    ? "border-amber-200 text-amber-600 bg-amber-50 hover:bg-amber-100"
                    : "border-gray-200 text-gray-500 hover:bg-gray-50"
                }`}
                title="運営メモ（備考）"
              >
                <StickyNote className="w-3.5 h-3.5" />
                備考
              </button>
              {m.isWithdrawn ? (
                <button
                  onClick={() => setReactivateTarget(m)}
                  disabled={savingId === m.id}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  復帰させる
                </button>
              ) : (
                <button
                  onClick={() => {
                    setWithdrawTarget(m);
                    setReason("");
                  }}
                  disabled={savingId === m.id}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-red-200 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  <UserX className="w-3.5 h-3.5" />
                  退会させる
                </button>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-gray-400 py-12 text-sm">
            該当するメンバーがいません
          </div>
        )}
        {visible.length < filtered.length && (
          <button
            onClick={() => setVisibleCount((c) => c + MANAGE_PAGE_SIZE)}
            className="w-full py-3 rounded-2xl border border-gray-200 bg-white text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            さらに{Math.min(MANAGE_PAGE_SIZE, filtered.length - visible.length)}件を表示
          </button>
        )}
      </div>

      {/* 退会させるモーダル */}
      {withdrawTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setWithdrawTarget(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                <UserX className="w-5 h-5 text-red-500" />
              </div>
              <h2 className="text-base font-bold text-gray-900">
                {withdrawTarget.name}さんを退会させますか？
              </h2>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              一覧・プロフィール・紹介ツリーから非公開になります（名前は記録として残ります）。あとから復帰できます。
            </p>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              退会理由（任意・運営メモ）
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="例: 本人都合・LINEにて申請"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none mb-5"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setWithdrawTarget(null)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                やめる
              </button>
              <button
                onClick={confirmWithdraw}
                disabled={savingId === withdrawTarget.id}
                className="px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                退会させる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 復帰させるモーダル */}
      {reactivateTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setReactivateTarget(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                <RotateCcw className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-base font-bold text-gray-900">
                {reactivateTarget.name}さんを復帰させますか？
              </h2>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed mb-5">
              再びメンバー一覧・プロフィール・紹介ツリーに表示されます。
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setReactivateTarget(null)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                やめる
              </button>
              <button
                onClick={confirmReactivate}
                disabled={savingId === reactivateTarget.id}
                className="px-5 py-2.5 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition-colors disabled:opacity-60"
              >
                復帰させる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 紹介者の紐づけモーダル */}
      {referrerTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setReferrerTarget(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-bold text-gray-900 mb-1">
              {referrerTarget.name}さんの紹介者
            </h2>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              台帳の記載は「
              <span className="font-bold text-gray-700">{referrerTarget.referrerText}</span>
              」です。該当する会員を選ぶと、その方の紹介数に数えられます。
            </p>

            <input
              value={referrerSearch}
              onChange={(e) => setReferrerSearch(e.target.value)}
              placeholder="会員を名前で検索"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 mb-3"
              autoFocus
            />

            <div className="flex-1 overflow-y-auto space-y-1 mb-4">
              {allRows
                .filter((c) => c.id !== referrerTarget.id)
                .filter((c) => {
                  const q = referrerSearch.trim().toLowerCase();
                  return !q || c.name.toLowerCase().includes(q);
                })
                .slice(0, 30)
                .map((candidate) => (
                  <button
                    key={candidate.id}
                    onClick={() => linkReferrer(referrerTarget, candidate.id)}
                    disabled={savingId === referrerTarget.id}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors disabled:opacity-50 ${
                      referrerTarget.referrerMemberId === candidate.id
                        ? "bg-green-50 border border-green-200"
                        : "hover:bg-gray-50 border border-transparent"
                    }`}
                  >
                    <MemberAvatar name={candidate.name} url={candidate.avatarUrl} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-800 truncate">{candidate.name}</p>
                      <p className="text-[11px] text-gray-400 truncate">
                        {candidate.memberNo != null ? `No.${candidate.memberNo}・` : ""}
                        {candidate.job || "職業未登録"}
                      </p>
                    </div>
                  </button>
                ))}
              {allRows.filter((c) => {
                const q = referrerSearch.trim().toLowerCase();
                return c.id !== referrerTarget.id && (!q || c.name.toLowerCase().includes(q));
              }).length === 0 && (
                <p className="text-center text-xs text-gray-400 py-8">
                  該当する会員が見つかりません
                </p>
              )}
            </div>

            <div className="flex gap-3 justify-between">
              {referrerTarget.referrerMemberId ? (
                <button
                  onClick={() => linkReferrer(referrerTarget, null)}
                  disabled={savingId === referrerTarget.id}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  紐づけを解除
                </button>
              ) : (
                <span />
              )}
              <button
                onClick={() => setReferrerTarget(null)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 備考（運営メモ）編集モーダル */}
      {noteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setNoteTarget(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                <StickyNote className="w-5 h-5 text-amber-500" />
              </div>
              <h2 className="text-base font-bold text-gray-900">
                {noteTarget.name}さんの備考
              </h2>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed mb-3">
              運営用のメモです（会費の受け渡し・連絡手段・対応履歴など）。会員には表示されません。
            </p>
            <textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              rows={4}
              placeholder="例: 会費は手渡し。連絡はLINEのみ。"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none mb-5"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setNoteTarget(null)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                やめる
              </button>
              <button
                onClick={confirmNote}
                disabled={savingId === noteTarget.id}
                className="px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-60"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

