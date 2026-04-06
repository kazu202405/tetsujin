"use client";

import { useState, useMemo } from "react";
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
  Trophy,
  ClipboardList,
  CalendarDays,
  Users,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ============================================================
// タブ定義
// ============================================================
type AdminTab = "applications" | "activity" | "participation" | "referral";

const tabs: { id: AdminTab; label: string; icon: typeof Clock }[] = [
  { id: "applications", label: "入会申請", icon: ClipboardList },
  { id: "activity", label: "アクティブ状況", icon: Activity },
  { id: "participation", label: "参加状況", icon: CalendarDays },
  { id: "referral", label: "紹介ランキング", icon: Trophy },
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
  { memberId: "2", lastLoginAt: "2026-04-03", lastEventAt: "2026-03-15", lastPostAt: "2026-03-30", loginCount30d: 12, eventCount90d: 3, postCount30d: 3, status: "active" },
  { memberId: "8", lastLoginAt: "2026-03-18", lastEventAt: "2026-02-20", lastPostAt: "2026-03-10", loginCount30d: 4, eventCount90d: 1, postCount30d: 0, status: "dormant" },
  { memberId: "5", lastLoginAt: "2026-04-05", lastEventAt: "2026-03-28", lastPostAt: "2026-04-03", loginCount30d: 14, eventCount90d: 4, postCount30d: 3, status: "active" },
  { memberId: "6", lastLoginAt: "2026-03-20", lastEventAt: "2026-02-15", lastPostAt: "2026-03-10", loginCount30d: 4, eventCount90d: 1, postCount30d: 0, status: "dormant" },
  { memberId: "7", lastLoginAt: "2026-03-15", lastEventAt: "2026-02-15", lastPostAt: "2026-03-05", loginCount30d: 3, eventCount90d: 1, postCount30d: 0, status: "dormant" },
  { memberId: "4", lastLoginAt: "2026-04-02", lastEventAt: "2026-03-15", lastPostAt: "2026-03-28", loginCount30d: 8, eventCount90d: 2, postCount30d: 1, status: "active" },
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

  return (
    <div className="min-h-screen">
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-xl font-bold text-gray-900">管理画面</h1>
          <p className="text-sm text-gray-500 mt-0.5">コミュニティの運営・分析</p>
        </div>
        {/* タブナビ */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
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

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
        {activeTab === "applications" && <ApplicationsTab />}
        {activeTab === "activity" && <ActivityTab />}
        {activeTab === "participation" && <ParticipationTab />}
        {activeTab === "referral" && <ReferralTab />}
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

// 紹介者IDから紹介者名を引く
function getReferrerName(memberId: string): string | null {
  const rec = referralRecords.find((r) => r.referredId === memberId);
  if (!rec) return null;
  return allMembers.find((m) => m.id === rec.referrerId)?.short || null;
}

// 紹介経由かどうか
function isReferred(memberId: string): boolean {
  return referralRecords.some((r) => r.referredId === memberId);
}

function ActivityTab() {
  const [filterStatus, setFilterStatus] = useState<ActivityStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [referredOnly, setReferredOnly] = useState(false);
  const [sortBy, setSortBy] = useState<ActivitySort>("status");
  const [sortAsc, setSortAsc] = useState(false);

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
    const latest = [a.lastLoginAt, a.lastEventAt, a.lastPostAt].sort((x, y) => y.localeCompare(x))[0];
    return daysFromNow(latest);
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

  const enriched = memberActivities.map((a) => ({
    ...a,
    member: allMembers.find((m) => m.id === a.memberId)!,
    referrerName: getReferrerName(a.memberId),
    isReferred: isReferred(a.memberId),
    idleDays: getLastActivityDate(a.memberId),
    referrerRate: getReferrerRetentionRate(a.memberId),
  }));

  // フィルター
  const filtered = enriched.filter((item) => {
    const matchStatus = filterStatus === "all" || item.status === filterStatus;
    const matchSearch = !search || item.member.name.includes(search) || item.member.job.includes(search);
    const matchReferred = !referredOnly || item.isReferred;
    return matchStatus && matchSearch && matchReferred;
  });

  // ソート
  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortAsc ? 1 : -1;
    if (sortBy === "status") {
      const order: Record<ActivityStatus, number> = { active: 0, dormant: 1, inactive: 2 };
      arr.sort((a, b) => dir * (order[a.status] - order[b.status]));
    } else if (sortBy === "idle") {
      arr.sort((a, b) => dir * (a.idleDays - b.idleDays));
    } else if (sortBy === "referral") {
      // 紹介経由を上に、紹介者名でグルーピング
      arr.sort((a, b) => {
        const aRef = a.isReferred ? 1 : 0;
        const bRef = b.isReferred ? 1 : 0;
        return dir * (aRef - bRef) || (a.referrerName || "").localeCompare(b.referrerName || "");
      });
    } else if (sortBy === "retention") {
      // 紹介された人の紹介者の定着率でソート
      arr.sort((a, b) => {
        const recA = referralRecords.find((r) => r.referredId === a.memberId);
        const recB = referralRecords.find((r) => r.referredId === b.memberId);
        const rateA = recA ? (referrerRetention.get(recA.referrerId)?.rate ?? -1) : -1;
        const rateB = recB ? (referrerRetention.get(recB.referrerId)?.rate ?? -1) : -1;
        return dir * (rateA - rateB);
      });
    }
    return arr;
  }, [filtered, sortBy, sortAsc, referrerRetention]);

  const counts = {
    active: memberActivities.filter((a) => a.status === "active").length,
    dormant: memberActivities.filter((a) => a.status === "dormant").length,
    inactive: memberActivities.filter((a) => a.status === "inactive").length,
  };

  // 紹介経由の定着率サマリー
  const referredMembers = memberActivities.filter((a) => isReferred(a.memberId));
  const referredActive = referredMembers.filter((a) => a.status === "active").length;
  const referredRetentionRate = referredMembers.length > 0 ? Math.round((referredActive / referredMembers.length) * 100) : 0;

  return (
    <>
      {/* 統計カード */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {([
          { key: "active" as const, label: "アクティブ", color: "text-green-600", bg: "bg-green-50", dot: "bg-green-500" },
          { key: "dormant" as const, label: "活動減少", color: "text-amber-600", bg: "bg-amber-50", dot: "bg-amber-400" },
          { key: "inactive" as const, label: "長期不在", color: "text-red-600", bg: "bg-red-50", dot: "bg-red-400" },
        ]).map((stat) => (
          <button
            key={stat.key}
            onClick={() => setFilterStatus(filterStatus === stat.key ? "all" : stat.key)}
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

      {/* 紹介経由メンバーの定着率（コンパクト） */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <p className="text-xs font-bold text-gray-700">紹介経由の定着率</p>
            <span className={`text-base font-bold ${referredRetentionRate >= 60 ? "text-green-600" : referredRetentionRate >= 40 ? "text-amber-600" : "text-red-500"}`}>
              {referredRetentionRate}%
            </span>
            <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-green-500" style={{ width: `${referredRetentionRate}%` }} />
            </div>
            <span className="text-[11px] text-gray-400">{referredActive}/{referredMembers.length}人がアクティブ</span>
          </div>
          <button
            onClick={() => setReferredOnly(!referredOnly)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              referredOnly ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            紹介経由のみ
          </button>
        </div>
      </div>

      {/* 判定基準 */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-6">
        <p className="text-xs font-bold text-gray-600 mb-2">判定基準</p>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-gray-500">
          <span><span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1" />アクティブ：30日以内にログイン＆90日以内にイベント参加</span>
          <span><span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1" />活動減少：ログインはあるが、イベント参加や投稿が減少傾向</span>
          <span><span className="inline-block w-2 h-2 rounded-full bg-red-400 mr-1" />長期不在：30日以上ログインなし</span>
        </div>
      </div>

      {/* 検索 + ソート */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
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
        <div className="flex gap-1.5">
          {([
            { key: "status" as ActivitySort, label: "ステータス" },
            { key: "idle" as ActivitySort, label: "最終活動" },
            { key: "referral" as ActivitySort, label: "紹介者" },
            { key: "retention" as ActivitySort, label: "定着率" },
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
                {isActive && (
                  <span className="text-[10px] opacity-70">{sortAsc ? "↑" : "↓"}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* メンバーリスト */}
      <div className="space-y-3">
        {sorted.map((item) => {
          const cfg = activityStatusConfig[item.status];
          return (
            <div key={item.memberId} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start gap-4">
                <Link href={`/app/profile/${item.memberId}`}>
                  <img src={item.member.photoUrl} alt={item.member.name} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow ring-1 ring-gray-100" />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Link href={`/app/profile/${item.memberId}`} className="text-sm font-bold text-gray-900 hover:text-amber-700 transition-colors">
                      {item.member.name}
                    </Link>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-bold ${cfg.bg} ${cfg.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                    {item.referrerName && (
                      <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 rounded-full text-[10px] font-bold text-blue-600">
                        紹介: {item.referrerName}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mb-3">{item.member.job}・{item.member.industry}</p>

                  {/* 紹介者・定着率・最終活動 */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-50 rounded-lg p-2.5">
                      <p className="text-[10px] text-gray-400 mb-0.5">紹介者</p>
                      {item.referrerName ? (
                        <p className="text-xs font-bold text-gray-700">{item.referrerName}</p>
                      ) : (
                        <p className="text-xs text-gray-300">—</p>
                      )}
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2.5">
                      <p className="text-[10px] text-gray-400 mb-0.5">紹介者の定着率</p>
                      {item.referrerRate !== null ? (
                        <p className={`text-xs font-bold ${
                          item.referrerRate >= 80 ? "text-green-600" :
                          item.referrerRate >= 50 ? "text-amber-600" :
                          "text-red-500"
                        }`}>{item.referrerRate}%</p>
                      ) : (
                        <p className="text-xs text-gray-300">—</p>
                      )}
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2.5">
                      <p className="text-[10px] text-gray-400 mb-0.5">最終活動</p>
                      <p className={`text-xs font-bold ${
                        item.idleDays <= 7 ? "text-green-600" :
                        item.idleDays <= 30 ? "text-amber-600" :
                        "text-red-500"
                      }`}>
                        {item.idleDays === 0 ? "今日" : `${item.idleDays}日前`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {sorted.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">該当するメンバーはいません</p>
          </div>
        )}
      </div>
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
// タブ4: 紹介ランキング
// ============================================================
type ReferralSort = "count" | "retention" | "idle";

function ReferralTab() {
  const [expandedReferrer, setExpandedReferrer] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<ReferralSort>("count");
  const [sortAsc, setSortAsc] = useState(false);

  const handleSortClick = (key: ReferralSort) => {
    if (sortBy === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortBy(key);
      setSortAsc(false);
    }
  };

  function getReferredStatus(referredId: string): ActivityStatus {
    return memberActivities.find((a) => a.memberId === referredId)?.status || "inactive";
  }

  function getFirstEventDate(memberId: string): string | null {
    const events = eventParticipations
      .filter((e) => e.participantIds.includes(memberId))
      .sort((a, b) => a.date.localeCompare(b.date));
    return events.length > 0 ? events[0].date : null;
  }

  function getLastActivityDate(memberId: string): string | null {
    const a = memberActivities.find((x) => x.memberId === memberId);
    if (!a) return null;
    return [a.lastLoginAt, a.lastEventAt, a.lastPostAt].sort((x, y) => y.localeCompare(x))[0];
  }

  function daysBetween(dateA: string, dateB: string): number {
    return Math.floor((new Date(dateB).getTime() - new Date(dateA).getTime()) / (1000 * 60 * 60 * 24));
  }

  function daysFromNow(dateStr: string): number {
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  }

  const referrerStatsBase = useMemo(() => {
    const map = new Map<string, ReferralRecord[]>();
    referralRecords.forEach((r) => {
      const arr = map.get(r.referrerId) || [];
      arr.push(r);
      map.set(r.referrerId, arr);
    });
    return Array.from(map.entries())
      .map(([referrerId, records]) => {
        const activeCount = records.filter((r) => getReferredStatus(r.referredId) === "active").length;
        const idleDaysList = records.map((r) => {
          const last = getLastActivityDate(r.referredId);
          return last ? daysFromNow(last) : 999;
        });
        const maxIdle = Math.max(...idleDaysList);
        return {
          referrer: allMembers.find((m) => m.id === referrerId)!,
          records: records.sort((a, b) => b.joinedAt.localeCompare(a.joinedAt)),
          count: records.length,
          activeCount,
          retentionRate: Math.round((activeCount / records.length) * 100),
          maxIdle,
        };
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const referrerStats = useMemo(() => {
    const sorted = [...referrerStatsBase];
    const dir = sortAsc ? 1 : -1;
    if (sortBy === "count") sorted.sort((a, b) => dir * (a.count - b.count));
    else if (sortBy === "retention") sorted.sort((a, b) => dir * (a.retentionRate - b.retentionRate) || b.count - a.count);
    else if (sortBy === "idle") sorted.sort((a, b) => dir * (a.maxIdle - b.maxIdle));
    return sorted;
  }, [referrerStatsBase, sortBy, sortAsc]);

  const maxCount = Math.max(...referrerStats.map((r) => r.count), 1);
  const totalReferrals = referralRecords.length;
  const totalActive = referralRecords.filter((r) => getReferredStatus(r.referredId) === "active").length;
  const overallRetention = Math.round((totalActive / totalReferrals) * 100);

  return (
    <>
      {/* ヘッドライン: 全体定着率 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-8">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <p className="text-xs font-bold text-gray-700">紹介入会 {totalReferrals}人</p>
            <span className="text-gray-300">|</span>
            <p className="text-xs text-gray-500">定着率</p>
            <span className={`text-base font-bold ${overallRetention >= 60 ? "text-green-600" : overallRetention >= 40 ? "text-amber-600" : "text-red-500"}`}>
              {overallRetention}%
            </span>
            <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-green-500" style={{ width: `${overallRetention}%` }} />
            </div>
            <span className="text-[11px] text-gray-400">{totalActive}/{totalReferrals}人がアクティブ</span>
          </div>
          <div className="flex gap-3">
            {(["active", "dormant", "inactive"] as const).map((s) => {
              const count = referralRecords.filter((r) => getReferredStatus(r.referredId) === s).length;
              const cfg = activityStatusConfig[s];
              return (
                <div key={s} className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  <span className="text-[11px] text-gray-600">{cfg.label} {count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 紹介一覧（ソート切替） */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">紹介メンバー管理</h2>
            <p className="text-xs text-gray-400 mt-0.5">クリックで紹介メンバーの詳細を表示</p>
          </div>
          <div className="flex gap-1.5">
            {([
              { key: "count" as ReferralSort, label: "紹介数" },
              { key: "retention" as ReferralSort, label: "定着率" },
              { key: "idle" as ReferralSort, label: "最終活動" },
            ]).map((opt) => {
              const isActive = sortBy === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => handleSortClick(opt.key)}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
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
          {referrerStats.map((rs, i) => {
            const isExpanded = expandedReferrer === rs.referrer.id;
            return (
              <div key={rs.referrer.id}>
                <button
                  onClick={() => setExpandedReferrer(isExpanded ? null : rs.referrer.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                    isExpanded ? "bg-amber-50 ring-1 ring-amber-200" : "hover:bg-gray-50"
                  }`}
                >
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    i === 0 ? "bg-amber-100 text-amber-700" :
                    i === 1 ? "bg-gray-100 text-gray-600" :
                    i === 2 ? "bg-orange-50 text-orange-600" :
                    "bg-gray-50 text-gray-400"
                  }`}>
                    {i + 1}
                  </span>
                  <img src={rs.referrer.photoUrl} alt={rs.referrer.name} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow ring-1 ring-gray-100 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-900">{rs.referrer.name}</p>
                      {(() => {
                        const st = memberActivities.find((a) => a.memberId === rs.referrer.id)?.status;
                        if (!st) return null;
                        const cfg = activityStatusConfig[st];
                        return (
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-bold ${cfg.bg} ${cfg.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                        );
                      })()}
                    </div>
                    <p className="text-[11px] text-gray-500">{rs.referrer.job}</p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className={`text-center ${sortBy === "count" ? "" : "hidden sm:block"}`}>
                      <span className="text-sm font-bold text-gray-900">{rs.count}</span>
                      <span className="text-[10px] text-gray-400 ml-0.5">人</span>
                      <p className="text-[9px] text-gray-400">紹介</p>
                    </div>
                    <div className={`text-center ${sortBy === "retention" ? "" : "hidden sm:block"}`}>
                      <span className={`text-sm font-bold ${rs.retentionRate >= 80 ? "text-green-600" : rs.retentionRate >= 50 ? "text-amber-600" : "text-red-500"}`}>
                        {rs.retentionRate}%
                      </span>
                      <p className="text-[9px] text-gray-400">定着</p>
                    </div>
                    <div className={`text-center ${sortBy === "idle" ? "" : "hidden sm:block"}`}>
                      <span className={`text-sm font-bold ${rs.maxIdle <= 14 ? "text-green-600" : rs.maxIdle <= 30 ? "text-amber-600" : "text-red-500"}`}>
                        {rs.maxIdle >= 999 ? "—" : `${rs.maxIdle}日前`}
                      </span>
                      <p className="text-[9px] text-gray-400">最終活動</p>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>
                {isExpanded && (
                  <div className="ml-10 mt-1 mb-2 pl-4 border-l-2 border-amber-200 space-y-2">
                    {rs.records.map((r) => {
                      const status = getReferredStatus(r.referredId);
                      const cfg = activityStatusConfig[status];
                      const firstEvent = getFirstEventDate(r.referredId);
                      const daysToFirst = firstEvent ? daysBetween(r.joinedAt, firstEvent) : null;
                      const lastActivity = getLastActivityDate(r.referredId);
                      const idleDays = lastActivity ? daysFromNow(lastActivity) : null;
                      return (
                        <Link
                          key={r.referredId}
                          href={`/app/profile/${r.referredId}`}
                          className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100 hover:border-amber-200 transition-colors"
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
                          <div className="flex-shrink-0 text-right space-y-0.5">
                            <p className="text-[10px] text-gray-400">入会 {r.joinedAt}</p>
                            {daysToFirst !== null ? (
                              <p className="text-[10px] text-gray-500">
                                初参加まで <span className={`font-bold ${daysToFirst <= 30 ? "text-green-600" : daysToFirst <= 60 ? "text-amber-600" : "text-red-500"}`}>{daysToFirst}日</span>
                              </p>
                            ) : (
                              <p className="text-[10px] text-red-400 font-bold">イベント未参加</p>
                            )}
                            {idleDays !== null && idleDays > 14 && (
                              <p className="text-[10px] text-red-400">最終活動 {idleDays}日前</p>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
