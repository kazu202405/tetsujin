"use client";

import { useState, useMemo, useEffect } from "react";
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
} from "lucide-react";

// ============================================================
// タブ定義
// ============================================================
type AdminTab = "applications" | "activity" | "participation" | "members-db" | "members-db-raw";

const tabs: { id: AdminTab; label: string; icon: typeof Clock }[] = [
  { id: "applications", label: "入会申請", icon: ClipboardList },
  { id: "activity", label: "メンバーの状況", icon: Activity },
  { id: "participation", label: "参加状況", icon: CalendarDays },
  { id: "members-db", label: "会員DB", icon: Database },
  { id: "members-db-raw", label: "生会員DB", icon: Database },
];

// ============================================================
// 共通メンバー情報
// ============================================================
const allMembers = [
  { id: "1", name: "田中 一郎", short: "田中", photoUrl: "https://images.unsplash.com/photo-1630572780329-e051273e980f?w=400&h=400&fit=crop&crop=face", job: "経営コンサルタント", industry: "コンサル/研修/講師", memberType: "法人" as const },
  { id: "2", name: "佐藤 裕樹", short: "佐藤", photoUrl: "https://images.unsplash.com/photo-1619193597120-1d1edb42e34b?w=400&h=400&fit=crop&crop=face", job: "IT起業家", industry: "AI/IT/SE", memberType: "法人" as const },
  { id: "3", name: "山本 恵美", short: "山本", photoUrl: "https://images.unsplash.com/photo-1613020092739-5d01102e080b?w=400&h=400&fit=crop&crop=face", job: "飲食店経営", industry: "飲食/BAR/カフェ", memberType: "個人" as const },
  { id: "4", name: "鈴木 健二", short: "鈴木", photoUrl: "https://images.unsplash.com/photo-1720467438431-c1b5659a933e?w=400&h=400&fit=crop&crop=face", job: "不動産デベロッパー", industry: "不動産/住宅関連", memberType: "法人" as const },
  { id: "5", name: "中村 明子", short: "中村", photoUrl: "https://images.unsplash.com/photo-1624091844772-554661d10173?w=400&h=400&fit=crop&crop=face", job: "医師・クリニック経営", industry: "医療", memberType: "法人" as const },
  { id: "6", name: "渡辺 剛", short: "渡辺", photoUrl: "https://images.unsplash.com/photo-1590799159581-0ef74a3bac90?w=400&h=400&fit=crop&crop=face", job: "ファイナンシャルアドバイザー", industry: "金融/生命保険/投資", memberType: "個人" as const },
  { id: "7", name: "小川 理沙", short: "小川", photoUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face", job: "デザイナー", industry: "WEBデザイン", memberType: "個人" as const },
  { id: "8", name: "森田 駿", short: "森田", photoUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face", job: "人材紹介業", industry: "人材業/人事", memberType: "法人" as const },
  { id: "9", name: "藤田 舞", short: "藤田", photoUrl: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=400&fit=crop&crop=face", job: "Eコマース経営", industry: "小売り/卸/物販", memberType: "個人" as const },
  { id: "10", name: "本田 浩二", short: "本田", photoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face", job: "飲食店グループ経営", industry: "飲食/BAR/カフェ", memberType: "法人" as const },
];

// ============================================================
// タブ1: 入会申請 モックデータ
// ============================================================
type ApplicationStatus = "pending" | "approved" | "rejected";

interface Application {
  id: string;
  name: string;
  gender: string;
  age: string;
  email: string;
  phone: string;
  job: string;
  referrer: string;
  startMonth: string;
  memberType: "法人" | "個人";
  paymentMethod: "銀行振込" | "PayPay";
  status: ApplicationStatus;
  appliedAt: string;
  approvedAt?: string;
}

const initialApplications: Application[] = [
  { id: "a1", name: "高橋 美咲", gender: "女", age: "３０代前半", email: "takahashi@example.com", phone: "090-1111-2222", job: "Webデザイナー", referrer: "田中 一郎", startMonth: "４月", memberType: "個人", paymentMethod: "PayPay", status: "pending", appliedAt: "2026-03-01" },
  { id: "a2", name: "松本 大輔", gender: "男", age: "４０代前半", email: "matsumoto@example.com", phone: "080-3333-4444", job: "不動産仲介業", referrer: "鈴木 健二", startMonth: "４月", memberType: "法人", paymentMethod: "銀行振込", status: "pending", appliedAt: "2026-03-02" },
  { id: "a3", name: "伊藤 玲奈", gender: "女", age: "２０代後半", email: "ito@example.com", phone: "070-5555-6666", job: "フリーランスライター", referrer: "小川 理沙", startMonth: "３月", memberType: "個人", paymentMethod: "銀行振込", status: "approved", appliedAt: "2026-02-20", approvedAt: "2026-02-22" },
  { id: "a4", name: "山口 健太", gender: "男", age: "５０代前半", email: "yamaguchi@example.com", phone: "090-7777-8888", job: "税理士事務所代表", referrer: "渡辺 剛", startMonth: "３月", memberType: "法人", paymentMethod: "PayPay", status: "rejected", appliedAt: "2026-02-15" },
];

const statusConfig: Record<ApplicationStatus, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  pending: { label: "審査中", color: "text-amber-600", bg: "bg-amber-50 border-amber-200", icon: Clock },
  approved: { label: "承認済み", color: "text-green-600", bg: "bg-green-50 border-green-200", icon: CheckCircle },
  rejected: { label: "却下", color: "text-red-600", bg: "bg-red-50 border-red-200", icon: XCircle },
};

// ============================================================
// タブ2: アクティブ状況 モックデータ
// ============================================================
type ActivityStatus = "active" | "dormant" | "inactive";

interface MemberActivity {
  memberId: string;
  lastLoginAt: string;
  lastEventAt: string;
  lastPostAt: string;
  loginCount30d: number;
  eventCount90d: number;
  postCount30d: number;
  status: ActivityStatus;
}

const memberActivities: MemberActivity[] = [
  { memberId: "1", lastLoginAt: "2026-04-05", lastEventAt: "2026-03-28", lastPostAt: "2026-04-04", loginCount30d: 18, eventCount90d: 5, postCount30d: 8, status: "active" },
  { memberId: "3", lastLoginAt: "2026-04-06", lastEventAt: "2026-04-01", lastPostAt: "2026-04-05", loginCount30d: 22, eventCount90d: 6, postCount30d: 12, status: "active" },
  { memberId: "10", lastLoginAt: "2026-04-04", lastEventAt: "2026-03-28", lastPostAt: "2026-04-02", loginCount30d: 15, eventCount90d: 4, postCount30d: 5, status: "active" },
  { memberId: "2", lastLoginAt: "2026-04-03", lastEventAt: "2026-03-15", lastPostAt: "2026-03-30", loginCount30d: 12, eventCount90d: 3, postCount30d: 3, status: "dormant" },
  { memberId: "8", lastLoginAt: "2026-03-18", lastEventAt: "2026-02-20", lastPostAt: "2026-03-10", loginCount30d: 4, eventCount90d: 1, postCount30d: 0, status: "inactive" },
  { memberId: "5", lastLoginAt: "2026-04-05", lastEventAt: "2026-03-28", lastPostAt: "2026-04-03", loginCount30d: 14, eventCount90d: 4, postCount30d: 3, status: "active" },
  { memberId: "6", lastLoginAt: "2026-03-20", lastEventAt: "2026-02-15", lastPostAt: "2026-03-10", loginCount30d: 4, eventCount90d: 1, postCount30d: 0, status: "inactive" },
  { memberId: "7", lastLoginAt: "2026-03-15", lastEventAt: "2026-02-15", lastPostAt: "2026-03-05", loginCount30d: 3, eventCount90d: 1, postCount30d: 0, status: "inactive" },
  { memberId: "4", lastLoginAt: "2026-04-02", lastEventAt: "2026-03-15", lastPostAt: "2026-03-28", loginCount30d: 8, eventCount90d: 2, postCount30d: 1, status: "dormant" },
  { memberId: "9", lastLoginAt: "2026-02-01", lastEventAt: "2025-12-20", lastPostAt: "2026-01-15", loginCount30d: 0, eventCount90d: 0, postCount30d: 0, status: "inactive" },
];

const activityStatusConfig: Record<ActivityStatus, { label: string; color: string; bg: string; dot: string }> = {
  active: { label: "アクティブ", color: "text-green-700", bg: "bg-green-50 border-green-200", dot: "bg-green-500" },
  dormant: { label: "活動減少", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", dot: "bg-amber-400" },
  inactive: { label: "長期不在", color: "text-red-600", bg: "bg-red-50 border-red-200", dot: "bg-red-400" },
};

// ============================================================
// タブ3: 参加状況 モックデータ
// ============================================================
interface EventParticipation {
  eventId: string;
  eventName: string;
  seriesName: string | null;
  date: string;
  location: string;
  participantIds: string[];
}

const eventParticipations: EventParticipation[] = [
  { eventId: "e1", eventName: "第12回 経営者グルメ会", seriesName: "経営者グルメ会", date: "2026-03-28", location: "鮨 まつもと（大阪・北新地）", participantIds: ["1", "3", "10", "8", "2"] },
  { eventId: "e2", eventName: "第11回 経営者グルメ会", seriesName: "経営者グルメ会", date: "2026-02-15", location: "割烹 田中（大阪・北新地）", participantIds: ["1", "2", "3", "5", "10"] },
  { eventId: "e3", eventName: "ワイン勉強会 Vol.3", seriesName: "ワイン勉強会", date: "2026-03-20", location: "ワインバー CAVA（大阪・心斎橋）", participantIds: ["1", "6", "8", "10"] },
  { eventId: "e4", eventName: "新メンバー歓迎ランチ", seriesName: null, date: "2026-02-15", location: "ビストロ マルシェ（大阪・中之島）", participantIds: ["1", "2", "7", "5"] },
  { eventId: "e5", eventName: "健康経営セミナー", seriesName: null, date: "2026-01-25", location: "ホテルニューオータニ（大阪）", participantIds: ["1", "5", "3", "8"] },
  { eventId: "e6", eventName: "第10回 経営者グルメ会", seriesName: "経営者グルメ会", date: "2026-01-10", location: "天ぷら 大阪あら川（大阪・本町）", participantIds: ["1", "3", "10", "4", "6"] },
  { eventId: "e7", eventName: "ワイン勉強会 Vol.2", seriesName: "ワイン勉強会", date: "2025-12-15", location: "ワインバー CAVA（大阪・心斎橋）", participantIds: ["6", "8", "1", "10"] },
  { eventId: "e8", eventName: "産地訪問ツアー", seriesName: null, date: "2025-12-20", location: "農家レストラン みのり（長野・安曇野）", participantIds: ["3", "9", "1", "5"] },
  { eventId: "e9", eventName: "第9回 経営者グルメ会", seriesName: "経営者グルメ会", date: "2025-11-15", location: "天ぷら 大阪あら川（大阪・本町）", participantIds: ["1", "3", "10", "2", "8"] },
  { eventId: "e10", eventName: "ヘルスケアイベント", seriesName: null, date: "2025-11-30", location: "自然食レストラン みどり（大阪・中崎町）", participantIds: ["5", "9", "7"] },
];

// ============================================================
// タブ4: 紹介ランキング モックデータ
// ============================================================
interface ReferralRecord {
  referrerId: string;
  referredId: string;
  referredName: string;
  referredPhotoUrl: string;
  referredJob: string;
  joinedAt: string;
}

const referralRecords: ReferralRecord[] = [
  { referrerId: "1", referredId: "2", referredName: "佐藤 裕樹", referredPhotoUrl: allMembers[1].photoUrl, referredJob: "IT起業家", joinedAt: "2024-02-10" },
  { referrerId: "1", referredId: "3", referredName: "山本 恵美", referredPhotoUrl: allMembers[2].photoUrl, referredJob: "飲食店経営", joinedAt: "2024-03-05" },
  { referrerId: "1", referredId: "8", referredName: "森田 駿", referredPhotoUrl: allMembers[7].photoUrl, referredJob: "人材紹介業", joinedAt: "2025-01-15" },
  { referrerId: "6", referredId: "4", referredName: "鈴木 健二", referredPhotoUrl: allMembers[3].photoUrl, referredJob: "不動産デベロッパー", joinedAt: "2024-03-20" },
  { referrerId: "3", referredId: "5", referredName: "中村 明子", referredPhotoUrl: allMembers[4].photoUrl, referredJob: "医師・クリニック経営", joinedAt: "2024-04-01" },
  { referrerId: "3", referredId: "10", referredName: "本田 浩二", referredPhotoUrl: allMembers[9].photoUrl, referredJob: "飲食店グループ経営", joinedAt: "2024-06-15" },
  { referrerId: "2", referredId: "7", referredName: "小川 理沙", referredPhotoUrl: allMembers[6].photoUrl, referredJob: "デザイナー", joinedAt: "2025-02-20" },
  { referrerId: "5", referredId: "9", referredName: "藤田 舞", referredPhotoUrl: allMembers[8].photoUrl, referredJob: "Eコマース経営", joinedAt: "2025-03-10" },
];

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
      <div className="sticky top-0 z-10 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200">
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
  const [applications, setApplications] = useState(initialApplications);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<ApplicationStatus | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = applications.filter((app) => {
    const matchSearch = app.name.includes(search) || app.email.includes(search) || app.referrer.includes(search);
    const matchStatus = filterStatus === "all" || app.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const pendingCount = applications.filter((a) => a.status === "pending").length;

  const handleApprove = (id: string) => {
    setApplications((prev) =>
      prev.map((a) => a.id === id ? { ...a, status: "approved" as ApplicationStatus, approvedAt: new Date().toISOString().split("T")[0] } : a)
    );
  };

  const handleReject = (id: string) => {
    setApplications((prev) =>
      prev.map((a) => a.id === id ? { ...a, status: "rejected" as ApplicationStatus } : a)
    );
  };

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
                    <span>{app.job}</span>
                    <span>紹介者: {app.referrer}</span>
                    <span>{app.memberType}</span>
                    <span>{app.appliedAt}</span>
                  </div>
                </div>
              </button>
              {isExpanded && (
                <div className="border-t border-gray-100 px-5 py-5 bg-gray-50/50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <div className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4 text-gray-400" /><span className="text-gray-600">{app.email}</span></div>
                    <div className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-gray-400" /><span className="text-gray-600">{app.phone}</span></div>
                    <div className="flex items-center gap-2 text-sm"><Briefcase className="w-4 h-4 text-gray-400" /><span className="text-gray-600">{app.job}</span></div>
                    <div className="flex items-center gap-2 text-sm"><Calendar className="w-4 h-4 text-gray-400" /><span className="text-gray-600">開始月: {app.startMonth}</span></div>
                    <div className="flex items-center gap-2 text-sm"><Building2 className="w-4 h-4 text-gray-400" /><span className="text-gray-600">{app.memberType}（{app.memberType === "個人" ? "¥19,800" : "¥30,000"}）</span></div>
                    <div className="flex items-center gap-2 text-sm"><span className="text-gray-400">💳</span><span className="text-gray-600">{app.paymentMethod}</span></div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
                    <span>年代: {app.age}</span><span>・</span><span>性別: {app.gender}</span><span>・</span><span>紹介者: {app.referrer}</span>
                  </div>
                  {app.status === "pending" && (
                    <div className="flex items-center gap-3">
                      <button onClick={() => handleApprove(app.id)} className="inline-flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors">
                        <UserCheck className="w-4 h-4" />承認する
                      </button>
                      <button onClick={() => handleReject(app.id)} className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border-2 border-red-200 text-red-600 rounded-xl text-sm font-bold hover:bg-red-50 transition-colors">
                        <UserX className="w-4 h-4" />却下する
                      </button>
                    </div>
                  )}
                  {app.status === "approved" && app.approvedAt && (
                    <p className="text-sm text-green-600">✓ {app.approvedAt} に承認済み</p>
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
type ActivitySort = "status" | "referral" | "retention" | "idle";


function ActivityTab() {
  const [filterStatus, setFilterStatus] = useState<ActivityStatus | "all">("all");
  const [search, setSearch] = useState("");

  const [sortBy, setSortBy] = useState<ActivitySort>("status");
  const [sortAsc, setSortAsc] = useState(true);
  const [activityModal, setActivityModal] = useState<string | null>(null);

  const handleSortClick = (key: ActivitySort) => {
    if (sortBy === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortBy(key);
      setSortAsc(false);
    }
  };

  // 日数計算
  function daysAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "今日";
    if (days === 1) return "昨日";
    return `${days}日前`;
  }

  function daysFromNow(dateStr: string): number {
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  }

  function getLastActivityDate(memberId: string): number {
    const a = memberActivities.find((x) => x.memberId === memberId);
    if (!a) return 999;
    return daysFromNow(a.lastEventAt);
  }

  // 紹介者ごとの定着率マップ
  const referrerRetention = useMemo(() => {
    const map = new Map<string, { count: number; activeCount: number; rate: number }>();
    const grouped = new Map<string, string[]>();
    referralRecords.forEach((r) => {
      const arr = grouped.get(r.referrerId) || [];
      arr.push(r.referredId);
      grouped.set(r.referrerId, arr);
    });
    grouped.forEach((referredIds, referrerId) => {
      const activeCount = referredIds.filter((id) => {
        const a = memberActivities.find((x) => x.memberId === id);
        return a?.status === "active";
      }).length;
      map.set(referrerId, {
        count: referredIds.length,
        activeCount,
        rate: Math.round((activeCount / referredIds.length) * 100),
      });
    });
    return map;
  }, []);

  // 紹介者の定着率を取得
  function getReferrerRetentionRate(memberId: string): number | null {
    const rec = referralRecords.find((r) => r.referredId === memberId);
    if (!rec) return null;
    return referrerRetention.get(rec.referrerId)?.rate ?? null;
  }

  // 全メンバーベースの紹介stats（紹介ランキング形式）
  const activityMemberStatsBase = useMemo(() => {
    const map = new Map<string, ReferralRecord[]>();
    referralRecords.forEach((r) => {
      const arr = map.get(r.referrerId) || [];
      arr.push(r);
      map.set(r.referrerId, arr);
    });
    return allMembers.map((member) => {
      const records = map.get(member.id) || [];
      const activity = memberActivities.find((a) => a.memberId === member.id);
      const activeCount = records.filter((r) => {
        const a = memberActivities.find((x) => x.memberId === r.referredId);
        return a?.status === "active";
      }).length;
      const selfLast = getLastActivityDate(member.id);
      return {
        member,
        activity,
        records: records.sort((a, b) => b.joinedAt.localeCompare(a.joinedAt)),
        referralCount: records.length,
        activeCount,
        retentionRate: records.length > 0 ? Math.round((activeCount / records.length) * 100) : 0,
        selfIdleDays: selfLast < 999 ? selfLast : 999,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activityMemberStats = useMemo(() => {
    const arr = [...activityMemberStatsBase];
    const dir = sortAsc ? 1 : -1;
    if (sortBy === "status") {
      const order: Record<ActivityStatus, number> = { active: 0, dormant: 1, inactive: 2 };
      arr.sort((a, b) => {
        const sa = a.activity?.status || "inactive";
        const sb = b.activity?.status || "inactive";
        return dir * (order[sa] - order[sb]);
      });
    } else if (sortBy === "referral") {
      arr.sort((a, b) => dir * (a.referralCount - b.referralCount));
    } else if (sortBy === "retention") {
      arr.sort((a, b) => dir * (a.retentionRate - b.retentionRate) || b.referralCount - a.referralCount);
    } else if (sortBy === "idle") {
      arr.sort((a, b) => dir * (a.selfIdleDays - b.selfIdleDays));
    }
    return arr;
  }, [activityMemberStatsBase, sortBy, sortAsc]);

  const counts = {
    active: memberActivities.filter((a) => a.status === "active").length,
    dormant: memberActivities.filter((a) => a.status === "dormant").length,
    inactive: memberActivities.filter((a) => a.status === "inactive").length,
  };


  return (
    <>
      {/* 統計カード */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <button
          onClick={() => setFilterStatus("all")}
          className={`bg-white rounded-2xl border shadow-sm p-5 text-left transition-all ${
            filterStatus === "all" ? "border-gray-900 ring-1 ring-gray-900" : "border-gray-100 hover:border-gray-300"
          }`}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />
            <span className="text-xs text-gray-500">全員</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{memberActivities.length}</p>
          <p className="text-[11px] text-gray-400 mt-1">メンバー</p>
        </button>
        {([
          { key: "active" as const, label: "アクティブ", color: "text-green-600", bg: "bg-green-50", dot: "bg-green-500" },
          { key: "dormant" as const, label: "活動減少", color: "text-amber-600", bg: "bg-amber-50", dot: "bg-amber-400" },
          { key: "inactive" as const, label: "長期不在", color: "text-red-600", bg: "bg-red-50", dot: "bg-red-400" },
        ]).map((stat) => (
          <button
            key={stat.key}
            onClick={() => setFilterStatus(stat.key)}
            className={`bg-white rounded-2xl border shadow-sm p-5 text-left transition-all ${
              filterStatus === stat.key ? "border-gray-900 ring-1 ring-gray-900" : "border-gray-100 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-2.5 h-2.5 rounded-full ${stat.dot}`} />
              <span className="text-xs text-gray-500">{stat.label}</span>
            </div>
            <p className={`text-2xl font-bold ${stat.color}`}>{counts[stat.key]}</p>
            <p className="text-[11px] text-gray-400 mt-1">/ {memberActivities.length}人中</p>
          </button>
        ))}
      </div>

      {/* 入会・退会推移（直近6ヶ月） */}
      {(() => {
        const monthlyData = [
          { month: "11月", joined: 1, left: 0 },
          { month: "12月", joined: 2, left: 1 },
          { month: "1月", joined: 1, left: 0 },
          { month: "2月", joined: 3, left: 0 },
          { month: "3月", joined: 0, left: 1 },
          { month: "4月", joined: 2, left: 0 },
        ];
        const maxVal = Math.max(...monthlyData.map((d) => Math.max(d.joined, d.left)), 1);
        return (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-gray-700">入会・退会推移</p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-green-400" />
                  <span className="text-[11px] text-gray-500">入会</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-red-400" />
                  <span className="text-[11px] text-gray-500">退会</span>
                </div>
              </div>
            </div>
            <div className="flex items-end gap-2 h-24">
              {monthlyData.map((d) => (
                <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end justify-center gap-1 h-16">
                    <div
                      className="w-3 rounded-t bg-green-400 transition-all"
                      style={{ height: `${(d.joined / maxVal) * 100}%`, minHeight: d.joined > 0 ? 4 : 0 }}
                    />
                    <div
                      className="w-3 rounded-t bg-red-400 transition-all"
                      style={{ height: `${(d.left / maxVal) * 100}%`, minHeight: d.left > 0 ? 4 : 0 }}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-gray-400">{d.month}</p>
                    <p className="text-[10px] font-bold text-gray-600">
                      {d.joined > 0 ? `+${d.joined}` : ""}{d.joined > 0 && d.left > 0 ? " " : ""}{d.left > 0 ? `-${d.left}` : ""}{d.joined === 0 && d.left === 0 ? "—" : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* 判定基準 */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-6">
        <p className="text-xs font-bold text-gray-600 mb-2">判定基準</p>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-gray-500">
          <span><span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1" />アクティブ：30日以内にイベント参加</span>
          <span><span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1" />活動減少：60日以内にイベント参加</span>
          <span><span className="inline-block w-2 h-2 rounded-full bg-red-400 mr-1" />長期不在：60日以上イベント参加なし</span>
        </div>
      </div>

      {/* メンバー管理（紹介ランキング形式） */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">メンバー管理</h2>
            <p className="text-xs text-gray-400 mt-0.5">紹介数クリックで紹介メンバーの詳細を表示</p>
          </div>
          <div className="flex gap-1.5">
            {([
              { key: "status" as ActivitySort, label: "ステータス" },
              { key: "referral" as ActivitySort, label: "紹介数" },
              { key: "retention" as ActivitySort, label: "定着率" },
              { key: "idle" as ActivitySort, label: "最終活動" },
            ]).map((opt) => {
              const isActive = sortBy === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => handleSortClick(opt.key)}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    isActive ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {opt.label}
                  {isActive && <span className="text-[10px] opacity-70">{sortAsc ? "↑" : "↓"}</span>}
                </button>
              );
            })}
          </div>
        </div>
        <div className="space-y-2">
          {activityMemberStats.map((rs, i) => {
            const statusCfg = activityStatusConfig[rs.activity?.status || "inactive"];
            const matchStatus = filterStatus === "all" || rs.activity?.status === filterStatus;
            const matchSearch = !search || rs.member.name.includes(search) || rs.member.job.includes(search);
            if (!matchStatus || !matchSearch) return null;
            return (
              <div
                key={rs.member.id}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-all"
              >
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  i === 0 ? "bg-amber-100 text-amber-700" :
                  i === 1 ? "bg-gray-100 text-gray-600" :
                  i === 2 ? "bg-orange-50 text-orange-600" :
                  "bg-gray-50 text-gray-400"
                }`}>
                  {i + 1}
                </span>
                <img src={rs.member.photoUrl} alt={rs.member.name} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow ring-1 ring-gray-100 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-900">{rs.member.name}</p>
                    {rs.activity && (
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-bold ${statusCfg.bg} ${statusCfg.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                        {statusCfg.label}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500">{rs.member.job}</p>
                </div>
                <div className="flex items-center flex-shrink-0">
                  {rs.referralCount > 0 ? (
                    <button
                      onClick={() => setActivityModal(rs.member.id)}
                      className="w-14 text-center hover:bg-amber-50 rounded-lg py-1 transition-colors cursor-pointer"
                    >
                      <span className="text-sm font-bold text-amber-600">{rs.referralCount}</span>
                      <span className="text-[10px] text-amber-600 ml-0.5">人</span>
                      <p className="text-[9px] text-amber-500">紹介</p>
                    </button>
                  ) : (
                    <div className="w-14 text-center py-1">
                      <span className="text-sm font-bold text-gray-300">0</span>
                      <span className="text-[10px] text-gray-300 ml-0.5">人</span>
                      <p className="text-[9px] text-gray-300">紹介</p>
                    </div>
                  )}
                  <div className={`w-14 text-center ${sortBy === "retention" ? "" : "hidden sm:block"}`}>
                    {rs.referralCount > 0 ? (
                      <span className={`text-sm font-bold ${rs.retentionRate >= 80 ? "text-green-600" : rs.retentionRate >= 50 ? "text-amber-600" : "text-red-500"}`}>
                        {rs.retentionRate}%
                      </span>
                    ) : (
                      <span className="text-sm font-bold text-gray-300">-</span>
                    )}
                    <p className="text-[9px] text-gray-400">定着</p>
                  </div>
                  <div className={`w-16 text-center ${sortBy === "idle" ? "" : "hidden sm:block"}`}>
                    <span className={`text-sm font-bold ${rs.selfIdleDays >= 999 ? "text-gray-300" : rs.selfIdleDays <= 14 ? "text-green-600" : rs.selfIdleDays <= 30 ? "text-amber-600" : "text-red-500"}`}>
                      {rs.selfIdleDays >= 999 ? "—" : `${rs.selfIdleDays}日前`}
                    </span>
                    <p className="text-[9px] text-gray-400">最終活動</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 紹介メンバー詳細モーダル */}
      {activityModal && (() => {
        const rs = activityMemberStats.find((r) => r.member.id === activityModal);
        if (!rs || rs.referralCount === 0) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setActivityModal(null)}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center gap-3 z-10">
                <img src={rs.member.photoUrl} alt={rs.member.name} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow ring-1 ring-gray-100" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900">{rs.member.name}</p>
                  <p className="text-[11px] text-gray-500">{rs.member.job}</p>
                </div>
                <div className="flex items-center gap-3 mr-2">
                  <div className="text-center">
                    <span className="text-sm font-bold text-amber-600">{rs.referralCount}</span>
                    <span className="text-[10px] text-amber-600 ml-0.5">人紹介</span>
                  </div>
                  <div className="text-center">
                    <span className={`text-sm font-bold ${rs.retentionRate >= 80 ? "text-green-600" : rs.retentionRate >= 50 ? "text-amber-600" : "text-red-500"}`}>
                      {rs.retentionRate}%
                    </span>
                    <span className="text-[10px] text-gray-400 ml-0.5">定着</span>
                  </div>
                </div>
                <button
                  onClick={() => setActivityModal(null)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[calc(80vh-72px)] space-y-2">
                {rs.records.map((r) => {
                  const status = memberActivities.find((a) => a.memberId === r.referredId)?.status || "inactive";
                  const cfg = activityStatusConfig[status];
                  return (
                    <Link
                      key={r.referredId}
                      href={`/app/profile/${r.referredId}`}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-amber-200 hover:bg-amber-50/50 transition-colors"
                    >
                      <img src={r.referredPhotoUrl} alt={r.referredName} className="w-9 h-9 rounded-full object-cover" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-medium text-gray-900">{r.referredName}</p>
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-bold ${cfg.bg} ${cfg.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500">{r.referredJob}</p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-[10px] text-gray-400">入会 {r.joinedAt}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}

// ============================================================
// タブ3: 参加状況
// ============================================================
function ParticipationTab() {
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"member" | "event">("member");

  // メンバー別参加数の集計
  const memberStats = useMemo(() => {
    return allMembers.map((m) => {
      const events = eventParticipations.filter((e) => e.participantIds.includes(m.id));
      const seriesMap = new Map<string, number>();
      events.forEach((e) => {
        if (e.seriesName) {
          seriesMap.set(e.seriesName, (seriesMap.get(e.seriesName) || 0) + 1);
        }
      });
      return {
        member: m,
        totalEvents: events.length,
        series: Array.from(seriesMap.entries()).map(([name, count]) => ({ name, count })),
        lastEventDate: events.length > 0 ? events.sort((a, b) => b.date.localeCompare(a.date))[0].date : null,
      };
    }).sort((a, b) => b.totalEvents - a.totalEvents);
  }, []);

  const maxEvents = memberStats[0]?.totalEvents || 1;

  // 月別参加数（ヒートマップ風）
  const months = ["2025-08", "2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03"];
  const monthLabels = ["8月", "9月", "10月", "11月", "12月", "1月", "2月", "3月"];

  function getMonthCount(memberId: string, month: string) {
    return eventParticipations.filter(
      (e) => e.participantIds.includes(memberId) && e.date.startsWith(month)
    ).length;
  }

  function heatBg(count: number) {
    if (count === 0) return "bg-gray-50 text-gray-300";
    if (count === 1) return "bg-amber-100 text-amber-700";
    if (count === 2) return "bg-amber-200 text-amber-800";
    return "bg-amber-300 text-amber-900 font-bold";
  }

  // 選択メンバーの参加イベント一覧
  const selectedMemberEvents = selectedMemberId
    ? eventParticipations
        .filter((e) => e.participantIds.includes(selectedMemberId))
        .sort((a, b) => b.date.localeCompare(a.date))
    : [];

  return (
    <>
      {/* ビューモード切替 */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setViewMode("member")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            viewMode === "member" ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
          }`}
        >
          <Users className="w-4 h-4 inline mr-1.5" />メンバー別
        </button>
        <button
          onClick={() => setViewMode("event")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            viewMode === "event" ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
          }`}
        >
          <CalendarDays className="w-4 h-4 inline mr-1.5" />イベント別
        </button>
      </div>

      {viewMode === "member" ? (
        <>
          {/* 統計サマリー */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
              <p className="text-2xl font-bold text-gray-900">{eventParticipations.length}</p>
              <p className="text-xs text-gray-500 mt-1">総イベント数</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
              <p className="text-2xl font-bold text-gray-900">
                {(eventParticipations.reduce((s, e) => s + e.participantIds.length, 0) / eventParticipations.length).toFixed(1)}
              </p>
              <p className="text-xs text-gray-500 mt-1">平均参加人数</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
              <p className="text-2xl font-bold text-amber-600">
                {(memberStats.reduce((s, m) => s + m.totalEvents, 0) / memberStats.length).toFixed(1)}
              </p>
              <p className="text-xs text-gray-500 mt-1">一人あたり平均参加数</p>
            </div>
          </div>

          {/* 参加ヒートマップ */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
            <h2 className="text-base font-bold text-gray-900 mb-1">月別参加ヒートマップ</h2>
            <p className="text-xs text-gray-400 mb-4">メンバーをクリックすると参加履歴を表示</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[500px]">
                <thead>
                  <tr>
                    <th className="p-2 text-left text-[11px] text-gray-400 font-medium w-28" />
                    {monthLabels.map((label) => (
                      <th key={label} className="p-1.5 text-center text-[11px] text-gray-500 font-medium">{label}</th>
                    ))}
                    <th className="p-1.5 text-center text-[11px] text-gray-500 font-medium">計</th>
                  </tr>
                </thead>
                <tbody>
                  {memberStats.map((ms) => (
                    <tr
                      key={ms.member.id}
                      onClick={() => setSelectedMemberId(selectedMemberId === ms.member.id ? null : ms.member.id)}
                      className={`cursor-pointer transition-colors ${
                        selectedMemberId === ms.member.id ? "bg-amber-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <img src={ms.member.photoUrl} alt={ms.member.short} className="w-6 h-6 rounded-full object-cover" />
                          <span className="text-xs text-gray-700 font-medium">{ms.member.short}</span>
                        </div>
                      </td>
                      {months.map((month) => {
                        const count = getMonthCount(ms.member.id, month);
                        return (
                          <td key={month} className="p-1">
                            <div className={`w-full aspect-square max-w-[36px] mx-auto rounded-lg flex items-center justify-center text-[11px] font-medium ${heatBg(count)}`}>
                              {count || ""}
                            </div>
                          </td>
                        );
                      })}
                      <td className="p-1.5 text-center">
                        <span className="text-sm font-bold text-gray-700">{ms.totalEvents}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* 凡例 */}
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
              <span className="text-[10px] text-gray-400">参加数:</span>
              {[0, 1, 2, 3].map((n) => (
                <div key={n} className="flex items-center gap-1">
                  <div className={`w-5 h-5 rounded ${heatBg(n)} flex items-center justify-center text-[10px]`}>
                    {n || ""}
                  </div>
                  <span className="text-[10px] text-gray-400">
                    {n === 0 ? "なし" : n === 3 ? "3+" : `${n}`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 選択メンバーの参加履歴 */}
          {selectedMemberId && (
            <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-6 mb-8">
              <div className="flex items-center gap-3 mb-4">
                <img
                  src={allMembers.find((m) => m.id === selectedMemberId)!.photoUrl}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover border-2 border-white shadow"
                />
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    {allMembers.find((m) => m.id === selectedMemberId)!.name}の参加履歴
                  </p>
                  <p className="text-xs text-gray-500">計 {selectedMemberEvents.length} イベント</p>
                </div>
              </div>
              <div className="space-y-2">
                {selectedMemberEvents.map((ev) => (
                  <div key={ev.eventId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="flex-shrink-0 w-16 text-center">
                      <p className="text-[11px] text-gray-400">{ev.date.slice(0, 7)}</p>
                      <p className="text-sm font-bold text-gray-700">{ev.date.slice(8)}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{ev.eventName}</p>
                      <p className="text-[11px] text-gray-500">{ev.location}</p>
                    </div>
                    {ev.seriesName && (
                      <span className="flex-shrink-0 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-full text-[10px] font-bold text-amber-700">
                        {ev.seriesName}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* メンバー別ランキング */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">参加回数ランキング</h2>
            <div className="space-y-3">
              {memberStats.map((ms, i) => (
                <div key={ms.member.id} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    i === 0 ? "bg-amber-100 text-amber-700" :
                    i === 1 ? "bg-gray-100 text-gray-600" :
                    i === 2 ? "bg-orange-50 text-orange-600" :
                    "bg-gray-50 text-gray-400"
                  }`}>
                    {i + 1}
                  </span>
                  <Link href={`/app/profile/${ms.member.id}`} className="flex items-center gap-2.5 flex-1 group">
                    <img src={ms.member.photoUrl} alt={ms.member.name} className="w-9 h-9 rounded-full object-cover border-2 border-white shadow ring-1 ring-gray-100" />
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-gray-900 group-hover:text-amber-700 transition-colors">{ms.member.name}</span>
                      {ms.series.length > 0 && (
                        <p className="text-[10px] text-gray-400 truncate">
                          {ms.series.map((s) => `${s.name}(${s.count})`).join(" / ")}
                        </p>
                      )}
                    </div>
                  </Link>
                  <div className="flex items-center gap-1.5">
                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(ms.totalEvents / maxEvents) * 100}%` }} />
                    </div>
                    <span className="text-sm font-bold text-gray-700 w-8 text-right">{ms.totalEvents}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* イベント別ビュー */
        <div className="space-y-4">
          {eventParticipations
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((ev) => (
              <div key={ev.eventId} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-gray-900">{ev.eventName}</p>
                      {ev.seriesName && (
                        <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-full text-[10px] font-bold text-amber-700">
                          {ev.seriesName}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{ev.date} ・ {ev.location}</p>
                  </div>
                  <span className="text-lg font-bold text-gray-900">{ev.participantIds.length}<span className="text-xs font-normal text-gray-400 ml-0.5">名</span></span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ev.participantIds.map((pid) => {
                    const m = allMembers.find((x) => x.id === pid);
                    if (!m) return null;
                    return (
                      <Link key={pid} href={`/app/profile/${pid}`} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <img src={m.photoUrl} alt={m.short} className="w-5 h-5 rounded-full object-cover" />
                        <span className="text-xs text-gray-700 font-medium">{m.short}</span>
                      </Link>
                    );
                  })}
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
// データソース: public/members-db.json（ローカル専用、gitignore）
// Vercel環境ではCSVが無いため allMembers をフォールバック表示
interface MemberDbRow {
  id: string;
  member_no: number | string | null;  // 実データは number、フォールバック("00A"等)は string
  name: string;
  nickname: string | null;
  referrer: string | null;
  start_month: string | null;
  first_renewal: string | null;
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
}

type MembersDbFilter = "all" | "both" | "member_only" | "contact_only" | "withdrawn";
type MembersDbSortKey = "member_no" | "name" | "start_month" | "price" | "contact_submitted_at";

const sortKeyLabels: Record<MembersDbSortKey, string> = {
  member_no: "会員番号",
  name: "氏名",
  start_month: "スタート月",
  price: "料金",
  contact_submitted_at: "フォーム送信日",
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

// 会員DBデータのフェッチ（ローカル: 実データ / Vercel: allMembersフォールバック）
function useMembersDb() {
  const [rows, setRows] = useState<MemberDbRow[] | null>(null);
  const [loadStatus, setLoadStatus] = useState<"loading" | "loaded" | "fallback">("loading");

  useEffect(() => {
    let cancelled = false;
    fetch("/members-db.json")
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
        if (cancelled) return;
        // Vercel等でCSVが無い場合: 既存allMembersを暫定表示（空を避ける）
        // ダミー番号は実データ(1〜450番)と衝突しないよう "00A"〜"00J" を使用
        const fallback: MemberDbRow[] = allMembers.map((m, i) => ({
          id: m.id,
          member_no: `00${String.fromCharCode(65 + i)}`,
          name: m.name,
          nickname: m.short,
          referrer: null,
          start_month: null,
          first_renewal: null,
          price: null,
          referral_fee: null,
          job: m.job,
          grip: null,
          frequency: null,
          email: null,
          phone: null,
          gender: null,
          age_range: null,
          membership_type: m.memberType,
          payment_method: null,
          contact_submitted_at: null,
          source: "both",
          is_withdrawn: false,
          import_sheet: null,
        }));
        setRows(fallback);
        setLoadStatus("fallback");
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

  return (
    <>
      {/* ステータスバナー（fallback時のみ表示） */}
      {loadStatus === "fallback" && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-amber-800">
            <span className="font-bold">⚠ デモ表示中</span> — 実データ（入会者名簿 / 連絡先情報）を読み込むには、ローカル環境で
            <code className="mx-1 px-1.5 py-0.5 bg-amber-100 rounded text-xs">node scripts/build-members-db.mjs</code>
            を実行してください。
          </p>
        </div>
      )}

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
      <MembersDbToolbar view={view} sortKeys={["member_no", "name", "start_month", "price"]} />

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
                  <div className="text-gray-600 text-xs truncate">{r.start_month || "—"}</div>
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
    { label: "スタート月", value: row.start_month },
    { label: "１回目更新", value: row.first_renewal },
    { label: "料金", value: row.price != null ? `¥${row.price.toLocaleString()}` : null },
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
    { label: "スタート月", width: "90px", sortKey: "start_month", render: (r) => r.start_month || <span className="text-gray-300">—</span> },
    { label: "1回目更新", width: "90px", render: (r) => r.first_renewal || <span className="text-gray-300">—</span> },
    { label: "料金", width: "80px", align: "right", sortKey: "price", render: (r) => r.price != null ? <span className="font-mono text-xs">¥{r.price.toLocaleString()}</span> : <span className="text-gray-300">—</span> },
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
      {loadStatus === "fallback" && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-amber-800">
            <span className="font-bold">⚠ デモ表示中</span> — 実データを読み込むには、ローカル環境で
            <code className="mx-1 px-1.5 py-0.5 bg-amber-100 rounded text-xs">node scripts/build-members-db.mjs</code>
            を実行してください。
          </p>
        </div>
      )}

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
      <MembersDbToolbar view={view} sortKeys={["member_no", "name", "start_month", "price", "contact_submitted_at"]} />

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

