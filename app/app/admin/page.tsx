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
  UserCog,
  RotateCcw,
  StickyNote,
  Handshake,
  Megaphone,
  Send,
  Link2, AlertCircle } from "lucide-react";
import { RoleBadge } from "@/components/app/role-badge";
import { MemberAvatar } from "@/components/app/member-avatar";
import { MemberTab } from "./member-tab";
import { MatchingPanel } from "./matching-panel";
import { MatchingOptionsPanel } from "./matching-options-panel";
import { MemberPicker, type MemberHit } from "./member-picker";
import { useEvents } from "@/lib/events-api";

// ============================================================
// タブ定義
// ============================================================
// 権限（運営/部長/一般）の変更は「会員管理」タブの各行に統合したため、
// 独立した「権限管理」タブは廃止した（変更口が2か所あると事故るため）。
type AdminTab =
  | "applications"
  | "activity"
  | "participation"
  | "members"
  | "matching"
  | "announce";

const tabs: { id: AdminTab; label: string; icon: typeof Clock }[] = [
  { id: "applications", label: "入会申請", icon: ClipboardList },
  { id: "activity", label: "メンバーの状況", icon: Activity },
  { id: "participation", label: "参加状況", icon: CalendarDays },
  { id: "members", label: "会員", icon: UserCog },
  // マッチングは会員タブの中にあったが、会員テーブルより下に置かれるため
  // 「会員を見に来たのに関係ない表が先に出る」形になっていた。独立させる。
  { id: "matching", label: "マッチング", icon: Handshake },
  { id: "announce", label: "お知らせ送信", icon: Megaphone },
];

// ============================================================
// 共通メンバー情報
// ============================================================



/** 日付の表示（YYYY/MM/DD） */
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

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
  /** 同じ名前の在籍会員。メールが無い台帳行とは自動で照合できないための保険 */
  sameNameMembers?: {
    member_id: string;
    member_no: number | null;
    name: string;
    job: string | null;
    email: string | null;
    phone: string | null;
    start_year: number | null;
    start_month: number | null;
    has_login: boolean;
  }[];
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
  // 「メンバーの状況」「参加状況」で気になる人を見つけたら、そのまま会員詳細を開く。
  // 名前を覚えて会員タブで検索し直す手間を無くすため。
  const [focusMemberId, setFocusMemberId] = useState<string | null>(null);
  const openMember = (id: string) => {
    setFocusMemberId(id);
    setActiveTab("members");
  };
  // 表を出すタブだけコンテナを広げる。会員は10列あり、5xl(1024px)では
  // 収まらず横スクロールが出ていた。申請・お知らせは1カラムの読み物なので
  // 広げると逆に読みにくくなる（1行が長くなりすぎる）。
  //
  // Tailwind v4 では max-w-screen-* が無いので、実寸で指定する。
  const WIDE_TABS: AdminTab[] = ["members", "participation", "activity", "matching"];
  const containerMaxWidth = WIDE_TABS.includes(activeTab) ? "max-w-[96rem]" : "max-w-5xl";

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
        {activeTab === "activity" && <ActivityTab onSelectMember={openMember} />}
        {activeTab === "participation" && <ParticipationTab onSelectMember={openMember} />}
        {activeTab === "members" && <MemberTab focusMemberId={focusMemberId} />}
        {activeTab === "matching" && (
          <>
            <MatchingPanel />
            <MatchingOptionsPanel />
          </>
        )}
        {activeTab === "announce" && <AnnounceTab />}

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
  // 🔴 既定は「審査中」。このタブを開く目的はほぼ「新しい申請を処理する」ことで、
  //    「すべて」だと承認済みが積み上がるほど審査中が下に埋もれる。
  //    承認しないと会員行が作られない（＝入会の唯一の経路）ため、
  //    審査中の取りこぼしはそのまま「入会できない人が出る」につながる。
  //    承認済み・却下はボタン1つで見られ、件数は上のサマリーに常に出ている。
  const [filterStatus, setFilterStatus] = useState<ApplicationStatus | "all">("pending");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  // 既存の会員に紐づけて承認する場合の選択状態（申請ごと）
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [linkTarget, setLinkTarget] = useState<MemberHit | null>(null);

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

  const review = async (
    id: string,
    action: "approve" | "reject",
    memberId?: string | null,
  ) => {
    setSavingId(id);
    setMessage(null);
    const response = await fetch(`/api/admin/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, memberId: memberId ?? null }),
    });
    const result = (await response.json().catch(() => null)) as { error?: string } | null;
    setSavingId(null);

    if (!response.ok) {
      setMessage({ type: "error", text: result?.error || "更新できませんでした" });
      return;
    }
    setMessage({
      type: "success",
      text:
        action !== "approve"
          ? "却下しました"
          : memberId
            ? "既存の会員に紐づけて承認しました"
            : "承認して会員台帳に追加しました",
    });
    setPickerFor(null);
    setLinkTarget(null);
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
                    <span className="text-base font-bold text-gray-900 whitespace-nowrap">
                      {app.name}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-bold whitespace-nowrap flex-shrink-0 ${config.bg} ${config.color}`}>
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
                    <div className="space-y-3">
                      {/* 🔴 同じ名前の在籍会員がいたら、承認する前に必ず見せる。
                             台帳から取り込んだ行にはメールが無い人が100名いて、
                             メールでの自動照合が空振りする。そのまま承認すると
                             既存会員なのに番号なし・新料金の別行ができる
                             （池田さんで実際に起きた）。
                             自動では紐づけない——同姓同名は実在するので、
                             気づかせて判断は運営に残す。 */}
                      {(app.sameNameMembers?.length ?? 0) > 0 && (
                        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
                          <p className="flex items-start gap-2 text-xs font-bold text-amber-900 mb-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            同じ名前の在籍会員がいます。すでに会員の方ではありませんか？
                          </p>
                          <ul className="space-y-1 mb-2">
                            {app.sameNameMembers?.map((m) => (
                              <li key={m.member_id} className="text-xs text-amber-900">
                                ・{m.name}
                                {m.member_no != null && `（会員番号${m.member_no}）`}
                                {m.job && ` / ${m.job}`}
                                <span className="text-amber-700">
                                  {m.email ? ` / ${m.email}` : " / メール未登録"}
                                  {m.has_login ? " / ログインあり" : ""}
                                </span>
                              </li>
                            ))}
                          </ul>
                          <p className="text-[11px] text-amber-800 leading-relaxed">
                            同じ方なら「既存会員に紐づける」を選んでください。そのまま承認すると、
                            会員番号の無い別の行がもう1つできます。同姓同名の別の方であれば、
                            そのまま承認して問題ありません。
                          </p>
                        </div>
                      )}

                      {/* 既に会員の方からの申請なら、新しく作らず台帳の行に紐づける。
                          台帳にメールが入っていない会員は自動では一致しないため、
                          運営が番号と氏名を見て選ぶ。 */}
                      {pickerFor === app.id && (
                        <MemberPicker
                          defaultQuery={app.name}
                          selected={linkTarget}
                          onSelect={setLinkTarget}
                          onCancel={() => {
                            setPickerFor(null);
                            setLinkTarget(null);
                          }}
                        />
                      )}

                      <div className="flex flex-wrap items-center gap-3">
                        {pickerFor === app.id && linkTarget ? (
                          <button
                            onClick={() => review(app.id, "approve", linkTarget.id)}
                            disabled={savingId === app.id}
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-60"
                          >
                            <Link2 className="w-4 h-4" />
                            この会員に紐づけて承認
                          </button>
                        ) : (
                          <button
                            onClick={() => review(app.id, "approve")}
                            disabled={savingId === app.id || pickerFor === app.id}
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors disabled:opacity-60"
                          >
                            <UserCheck className="w-4 h-4" />新しい会員として追加
                          </button>
                        )}

                        {pickerFor !== app.id && (
                          <button
                            onClick={() => {
                              setPickerFor(app.id);
                              setLinkTarget(null);
                            }}
                            disabled={savingId === app.id}
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border-2 border-blue-200 text-blue-600 rounded-xl text-sm font-bold hover:bg-blue-50 transition-colors disabled:opacity-60"
                          >
                            <Link2 className="w-4 h-4" />既存の会員に紐づける
                          </button>
                        )}

                        <button
                          onClick={() => review(app.id, "reject")}
                          disabled={savingId === app.id}
                          className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border-2 border-red-200 text-red-600 rounded-xl text-sm font-bold hover:bg-red-50 transition-colors disabled:opacity-60"
                        >
                          <UserX className="w-4 h-4" />却下する
                        </button>
                      </div>

                      <p className="text-[11px] text-gray-400">
                        メールアドレスが台帳の会員と一致すれば、「新しい会員として追加」でもその会員に紐づきます。
                      </p>
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
            {/* 「審査中が0件」と「検索で消えた」は原因が違うので文言を分ける。
                同じ文言だと、処理し切ったのか絞り込みすぎたのか読めない。 */}
            {search.trim() === "" && filterStatus === "pending" ? (
              <>
                <p className="text-sm font-bold text-gray-500">
                  審査中の申請はありません
                </p>
                <p className="text-xs text-gray-400 mt-1.5">
                  新しい入会申請が届くとここに表示されます
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-400">該当する申請はありません</p>
            )}
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
  /** 記入状況。運営が声を掛けるためのもので、会員向けの一覧には出さない */
  hasGrip: boolean;
  hasSheet: boolean;
  hasMatching: boolean;
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

function ActivityTab({ onSelectMember }: { onSelectMember: (id: string) => void }) {
  // 毎日見る数字ではないので既定は畳んでおく
  const [showCompleteness, setShowCompleteness] = useState(false);
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

  // プロフィールの埋まり具合。誰に声を掛ければよいかを運営が見る。
  // ひとことは任意なので充足率は出さない（依頼主判断）
  const filled = {
    sheet: rows.filter((r) => !r.isWithdrawn && r.hasSheet).length,
    matching: rows.filter((r) => !r.isWithdrawn && r.hasMatching).length,
  };
  // ひとことは必須ではないので、未記入の数には入れない（依頼主判断）
  const notFilled = rows.filter(
    (r) => !r.isWithdrawn && (!r.hasSheet || !r.hasMatching),
  );

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

      {/* 🔴 これは運営だけが見る。会員向けの一覧に「未記入」の印は出さない
             （本人に烙印が付くのは気分が悪い）。
             普段は畳んでおく。毎日見る数字ではなく、声を掛ける前に開くもの。 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6">
        <button
          onClick={() => setShowCompleteness((v) => !v)}
          className="w-full flex items-center justify-between gap-3 px-5 py-3 text-left"
        >
          <span className="text-sm font-bold text-gray-900">
            プロフィールの埋まり具合
            <span className="ml-2 text-xs font-normal text-gray-400">
              未記入 {notFilled.length}名
            </span>
          </span>
          {showCompleteness ? (
            <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
          )}
        </button>

        {showCompleteness && (
          <div className="px-5 pb-5">
            <p className="text-[11px] text-gray-400 mb-3">
              在籍{activeTotal}名のうち、どれだけ書いてもらえているか。声を掛ける相手を探すために出しています。
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "プロフィールシート", value: filled.sheet, hint: "名刺カード" },
                { label: "つながりの設定", value: filled.matching, hint: "業種・立場・地域" },
              ].map((x) => {
                const pct = activeTotal > 0 ? Math.round((x.value / activeTotal) * 100) : 0;
                return (
                  <div key={x.label} className="rounded-xl bg-gray-50 px-3 py-2.5">
                    <p className="text-[11px] text-gray-500">{x.label}</p>
                    <p className="text-lg font-bold text-gray-900 leading-tight">
                      {x.value}
                      <span className="text-xs font-normal text-gray-400">
                        /{activeTotal}（{pct}%）
                      </span>
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{x.hint}</p>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-gray-500 mt-3">
              どちらかが未記入の方：<b className="text-gray-900">{notFilled.length}名</b>
              <span className="text-gray-400">（ひとことは任意なので数えていません）</span>
            </p>
          </div>
        )}
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
              role="button"
              tabIndex={0}
              onClick={() => onSelectMember(row.memberId)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectMember(row.memberId);
                }
              }}
              className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm cursor-pointer hover:border-gray-300 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3 min-w-0 sm:flex-1">
                <MemberAvatar name={row.name} url={row.avatarUrl} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-900 truncate">{row.name}</p>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold whitespace-nowrap flex-shrink-0 ${config.bg} ${config.color}`}
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
                  {/* 🔴 ひとことは必須にしない（依頼主判断）。書いてほしいが、
                         書かないことを未記入として責める種類の欄ではない。
                         ∴ ここに出すのはプロフィールシートとつながりの設定だけ。 */}
                  <p className="text-gray-400">未記入</p>
                  <p className="font-medium">
                    {!row.hasSheet || !row.hasMatching ? (
                      <span className="text-amber-700">
                        {[!row.hasSheet && "シート", !row.hasMatching && "つながり"]
                          .filter(Boolean)
                          .join("・")}
                      </span>
                    ) : (
                      <span className="text-gray-400">なし</span>
                    )}
                  </p>
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
function ParticipationTab({ onSelectMember }: { onSelectMember: (id: string) => void }) {
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
                    <button
                      type="button"
                      onClick={() => onSelectMember(m.id)}
                      className="flex items-center gap-2 min-w-0 w-full text-left hover:opacity-70 transition-opacity"
                    >
                      <MemberAvatar name={m.name} url={m.avatarUrl} size="sm" />
                      <span className="text-sm text-gray-800 truncate hover:underline">{m.name}</span>
                    </button>
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

