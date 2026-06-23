"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarSearch,
  // UtensilsCrossed,
  GitBranch,
  Users,
  User,
  UserCog,
  MessageCircle,
  ShieldCheck,
  Bell,
  UserPlus,
  Menu,
  X,
  Settings,
} from "lucide-react";
import { communityStats } from "@/lib/dashboard-data";
import { NotificationBell } from "./notification-bell";
import { useNotifications } from "@/lib/notifications-data";
import { useBoardUnreadCount } from "@/lib/board-data";
import { usePendingIncomingCount } from "@/lib/disclosure-data";
import { CURRENT_USER_ID } from "@/lib/connections-data";

const navItems = [
  { href: "/app/mypage", label: "マイページ", icon: User },
  { href: "/app/members", label: "メンバー", icon: Users },
  { href: "/app/board", label: "掲示板", icon: MessageCircle },
  { href: "/app/post", label: "会を探す", icon: CalendarSearch },
  // { href: "/app/discover", label: "おすすめ", icon: UtensilsCrossed },
  { href: "/app/tree", label: "紹介ツリー", icon: GitBranch },
  { href: "/app/requests", label: "つながり申請", icon: UserPlus },
  { href: "/app/members-admin", label: "つながり", icon: UserCog },
  { href: "/app/admin", label: "管理画面", icon: ShieldCheck },
  { href: "/app/settings", label: "設定", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { unreadCount } = useNotifications();
  const boardUnread = useBoardUnreadCount();
  const requestsPending = usePendingIncomingCount(CURRENT_USER_ID);
  // モバイル/タブレット用ドロワー（ハンバーガー）
  const [drawerOpen, setDrawerOpen] = useState(false);

  // ページ遷移したらドロワーを閉じる
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // ドロワー表示中は背景スクロールを止める + Esc で閉じる
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const badgeFor = (href: string) =>
    href === "/app/board"
      ? boardUnread
      : href === "/app/requests"
      ? requestsPending
      : 0;

  return (
    <>
      {/* デスクトップサイドバー */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-64 lg:z-40 bg-white border-r border-gray-100">
        {/* ロゴ + 通知 */}
        <div className="flex items-center justify-between gap-2 pl-6 pr-3 h-16 border-b border-gray-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 bg-[var(--tetsu-pink)] rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-extrabold">T</span>
            </div>
            <span className="text-lg font-extrabold tracking-tight text-gray-900 truncate">
              TETSUJIN会
            </span>
          </div>
          <NotificationBell />
        </div>

        {/* プロフィールミニ */}
        <div className="px-4 py-5 border-b border-gray-100">
          <Link
            href="/app/mypage"
            className="flex items-center gap-3 group"
          >
            <img
              src="https://images.unsplash.com/photo-1630572780329-e051273e980f?w=400&h=400&fit=crop&crop=face"
              alt="田中 一郎"
              className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm ring-1 ring-gray-100 group-hover:ring-[var(--tetsu-pink)] transition-all"
            />
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate group-hover:text-[var(--tetsu-pink)] transition-colors">
                田中 一郎
              </p>
              <p className="text-xs text-gray-400">経営コンサルタント</p>
            </div>
          </Link>
        </div>

        {/* ナビゲーション */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const badge = badgeFor(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-[var(--tetsu-pink-pale)] text-[var(--tetsu-pink)] font-bold"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <item.icon
                  className={`w-5 h-5 flex-shrink-0 ${
                    isActive ? "text-[var(--tetsu-pink)]" : ""
                  }`}
                />
                <span className="flex-1">{item.label}</span>
                {badge > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--tetsu-pink)] text-white text-[10px] font-bold leading-none">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* コミュニティ統計 */}
        <div className="px-4 py-5 border-t border-gray-100">
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-3">
            コミュニティ
          </p>
          <div className="space-y-2.5 text-xs text-gray-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-gray-400" />
                <span>メンバー</span>
              </div>
              <span className="font-bold text-gray-700">
                {communityStats.memberCount}人
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarSearch className="w-3.5 h-3.5 text-gray-400" />
                <span>今月の会</span>
              </div>
              <span className="font-bold text-gray-700">
                {communityStats.monthlyPosts}件
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* モバイル/タブレット用トップバー（ロゴ + お知らせ + ハンバーガー） */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 bg-white/90 backdrop-blur-lg border-b border-gray-100">
        <div className="flex items-center justify-between h-full pl-4 pr-2">
          {/* ロゴ */}
          <Link href="/app/mypage" className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 bg-[var(--tetsu-pink)] rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-extrabold">T</span>
            </div>
            <span className="text-lg font-extrabold tracking-tight text-gray-900 truncate">
              TETSUJIN会
            </span>
          </Link>

          {/* 右側：お知らせベル + ハンバーガー */}
          <div className="flex items-center gap-1">
            {/* デスクトップと同じトグル式ドロップダウン（再タップで閉じる） */}
            <NotificationBell />
            <button
              onClick={() => setDrawerOpen(true)}
              className="relative p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              aria-label="メニューを開く"
            >
              <Menu className="w-6 h-6" />
              {/* 未対応の申請/未読があるとき、ハンバーガーにも小さなドット */}
              {(boardUnread > 0 || requestsPending > 0) && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--tetsu-pink)]" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ドロワー（右からスライド） */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* オーバーレイ */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          {/* パネル */}
          <div className="absolute top-0 right-0 bottom-0 w-72 max-w-[85vw] bg-white shadow-2xl flex flex-col animate-[slideIn_0.2s_ease-out]">
            {/* ヘッダー */}
            <div className="flex items-center justify-between h-14 pl-5 pr-3 border-b border-gray-100 flex-shrink-0">
              <span className="text-sm font-extrabold tracking-tight text-gray-900">
                メニュー
              </span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                aria-label="メニューを閉じる"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* プロフィールミニ */}
            <Link
              href="/app/mypage"
              className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 group flex-shrink-0"
            >
              <img
                src="https://images.unsplash.com/photo-1630572780329-e051273e980f?w=400&h=400&fit=crop&crop=face"
                alt="田中 一郎"
                className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm ring-1 ring-gray-100 group-hover:ring-[var(--tetsu-pink)] transition-all"
              />
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate group-hover:text-[var(--tetsu-pink)] transition-colors">
                  田中 一郎
                </p>
                <p className="text-xs text-gray-400">経営コンサルタント</p>
              </div>
            </Link>

            {/* ナビゲーション */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {/* お知らせ（トップバーのベルと同じ導線をドロワーにも） */}
              {(() => {
                const isActive = pathname.startsWith("/app/notifications");
                return (
                  <Link
                    href="/app/notifications"
                    onClick={() => setDrawerOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? "bg-[var(--tetsu-pink-pale)] text-[var(--tetsu-pink)] font-bold"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <Bell
                      className={`w-5 h-5 flex-shrink-0 ${
                        isActive ? "text-[var(--tetsu-pink)]" : ""
                      }`}
                    />
                    <span className="flex-1">お知らせ</span>
                    {unreadCount > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--tetsu-pink)] text-white text-[10px] font-bold leading-none">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Link>
                );
              })()}
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                const badge = badgeFor(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? "bg-[var(--tetsu-pink-pale)] text-[var(--tetsu-pink)] font-bold"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <item.icon
                      className={`w-5 h-5 flex-shrink-0 ${
                        isActive ? "text-[var(--tetsu-pink)]" : ""
                      }`}
                    />
                    <span className="flex-1">{item.label}</span>
                    {badge > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--tetsu-pink)] text-white text-[10px] font-bold leading-none">
                        {badge > 9 ? "9+" : badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* コミュニティ統計 */}
            <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0 space-y-2.5">
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                コミュニティ
              </p>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-gray-400" />
                  <span>メンバー</span>
                </div>
                <span className="font-bold text-gray-700">
                  {communityStats.memberCount}人
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                  <CalendarSearch className="w-3.5 h-3.5 text-gray-400" />
                  <span>今月の会</span>
                </div>
                <span className="font-bold text-gray-700">
                  {communityStats.monthlyPosts}件
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
