"use client";

import { useState } from "react";
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
} from "lucide-react";

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

// モックデータ
const initialApplications: Application[] = [
  {
    id: "a1",
    name: "高橋 美咲",
    gender: "女",
    age: "３０代前半",
    email: "takahashi@example.com",
    phone: "090-1111-2222",
    job: "Webデザイナー",
    referrer: "田中 一郎",
    startMonth: "４月",
    memberType: "個人",
    paymentMethod: "PayPay",
    status: "pending",
    appliedAt: "2026-03-01",
  },
  {
    id: "a2",
    name: "松本 大輔",
    gender: "男",
    age: "４０代前半",
    email: "matsumoto@example.com",
    phone: "080-3333-4444",
    job: "不動産仲介業",
    referrer: "鈴木 健二",
    startMonth: "４月",
    memberType: "法人",
    paymentMethod: "銀行振込",
    status: "pending",
    appliedAt: "2026-03-02",
  },
  {
    id: "a3",
    name: "伊藤 玲奈",
    gender: "女",
    age: "２０代後半",
    email: "ito@example.com",
    phone: "070-5555-6666",
    job: "フリーランスライター",
    referrer: "小川 理沙",
    startMonth: "３月",
    memberType: "個人",
    paymentMethod: "銀行振込",
    status: "approved",
    appliedAt: "2026-02-20",
    approvedAt: "2026-02-22",
  },
  {
    id: "a4",
    name: "山口 健太",
    gender: "男",
    age: "５０代前半",
    email: "yamaguchi@example.com",
    phone: "090-7777-8888",
    job: "税理士事務所代表",
    referrer: "渡辺 剛",
    startMonth: "３月",
    memberType: "法人",
    paymentMethod: "PayPay",
    status: "rejected",
    appliedAt: "2026-02-15",
  },
];

const statusConfig: Record<
  ApplicationStatus,
  { label: string; color: string; bg: string; icon: typeof Clock }
> = {
  pending: { label: "審査中", color: "text-amber-600", bg: "bg-amber-50 border-amber-200", icon: Clock },
  approved: { label: "承認済み", color: "text-green-600", bg: "bg-green-50 border-green-200", icon: CheckCircle },
  rejected: { label: "却下", color: "text-red-600", bg: "bg-red-50 border-red-200", icon: XCircle },
};

export default function AdminPage() {
  const [applications, setApplications] = useState(initialApplications);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<ApplicationStatus | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = applications.filter((app) => {
    const matchSearch =
      app.name.includes(search) ||
      app.email.includes(search) ||
      app.referrer.includes(search);
    const matchStatus = filterStatus === "all" || app.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const pendingCount = applications.filter((a) => a.status === "pending").length;

  const handleApprove = (id: string) => {
    setApplications((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, status: "approved" as ApplicationStatus, approvedAt: new Date().toISOString().split("T")[0] }
          : a
      )
    );
  };

  const handleReject = (id: string) => {
    setApplications((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: "rejected" as ApplicationStatus } : a
      )
    );
  };

  return (
    <div className="min-h-screen">
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">管理画面</h1>
              <p className="text-sm text-gray-500 mt-0.5">入会申請の管理</p>
            </div>
            {pendingCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full text-sm font-bold">
                <Clock className="w-4 h-4" />
                {pendingCount}件の審査待ち
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 統計カード */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            {
              label: "審査中",
              count: applications.filter((a) => a.status === "pending").length,
              color: "text-amber-600",
              bg: "bg-amber-50",
              icon: Clock,
            },
            {
              label: "承認済み",
              count: applications.filter((a) => a.status === "approved").length,
              color: "text-green-600",
              bg: "bg-green-50",
              icon: UserCheck,
            },
            {
              label: "却下",
              count: applications.filter((a) => a.status === "rejected").length,
              color: "text-red-600",
              bg: "bg-red-50",
              icon: UserX,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
            >
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
                  filterStatus === s
                    ? "bg-gray-900 text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
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
              <div
                key={app.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
              >
                {/* メイン行 */}
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

                {/* 詳細展開 */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 py-5 bg-gray-50/50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">{app.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">{app.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Briefcase className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">{app.job}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">開始月: {app.startMonth}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">{app.memberType}（{app.memberType === "個人" ? "¥19,800" : "¥30,000"}）</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-400">💳</span>
                        <span className="text-gray-600">{app.paymentMethod}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
                      <span>年代: {app.age}</span>
                      <span>・</span>
                      <span>性別: {app.gender}</span>
                      <span>・</span>
                      <span>紹介者: {app.referrer}</span>
                    </div>

                    {app.status === "pending" && (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleApprove(app.id)}
                          className="inline-flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors"
                        >
                          <UserCheck className="w-4 h-4" />
                          承認する
                        </button>
                        <button
                          onClick={() => handleReject(app.id)}
                          className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border-2 border-red-200 text-red-600 rounded-xl text-sm font-bold hover:bg-red-50 transition-colors"
                        >
                          <UserX className="w-4 h-4" />
                          却下する
                        </button>
                      </div>
                    )}

                    {app.status === "approved" && app.approvedAt && (
                      <p className="text-sm text-green-600">
                        ✓ {app.approvedAt} に承認済み
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
      </div>
    </div>
  );
}
