"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarSearch,
  // UtensilsCrossed,
  GitBranch,
  MessageSquare,
  Users,
  User,
  UserCog,
  MessageCircle,
  ShieldCheck,
  Bell,
} from "lucide-react";
import { communityStats } from "@/lib/dashboard-data";
import { NotificationBell } from "./notification-bell";
import { useNotifications } from "@/lib/notifications-data";
import { useBoardUnreadCount } from "@/lib/board-data";

const navItems = [
  { href: "/app/mypage", label: "マイページ", icon: User },
  { href: "/app/members", label: "メンバー", icon: Users },
  { href: "/app/board", label: "掲示板", icon: MessageCircle },
  { href: "/app/post", label: "会を探す", icon: CalendarSearch },
  // { href: "/app/discover", label: "おすすめ", icon: UtensilsCrossed },
  { href: "/app/tree", label: "紹介ツリー", icon: GitBranch },
  { href: "/app/members-admin", label: "つながり", icon: UserCog },
  { href: "/app/admin", label: "管理画面", icon: ShieldCheck },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { unreadCount } = useNotifications();
  const boardUnread = useBoardUnreadCount();

  return (
    <>
      {/* デスクトップサイドバー */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-64 bg-white border-r border-gray-100">
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
            const badge = item.href === "/app/board" ? boardUnread : 0;
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
                <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                <span>投稿</span>
              </div>
              <span className="font-bold text-gray-700">
                {communityStats.recommendationCount}件
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

      {/* モバイルボトムタブ（5項目: マイページ / メンバー / お知らせ / 掲示板 / つながり） */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg border-t border-gray-100">
        <div className="flex items-center justify-around h-14">
          {[navItems[0], navItems[1]].map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] font-medium transition-colors ${
                  isActive ? "text-[var(--tetsu-pink)]" : "text-gray-400"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}

          {/* お知らせ（バッジ付き） */}
          {(() => {
            const href = "/app/notifications";
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] font-medium transition-colors ${
                  isActive ? "text-[var(--tetsu-pink)]" : "text-gray-400"
                }`}
              >
                <div className="relative">
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1.5 min-w-[14px] h-3.5 px-1 rounded-full bg-[var(--tetsu-pink)] text-white text-[9px] font-bold flex items-center justify-center leading-none">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </div>
                お知らせ
              </Link>
            );
          })()}

          {[navItems[2], navItems[5]].map((item) => {
            const isActive = pathname.startsWith(item.href);
            const badge = item.href === "/app/board" ? boardUnread : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] font-medium transition-colors ${
                  isActive ? "text-[var(--tetsu-pink)]" : "text-gray-400"
                }`}
              >
                <div className="relative">
                  <item.icon className="w-5 h-5" />
                  {badge > 0 && (
                    <span className="absolute -top-1 -right-1.5 min-w-[14px] h-3.5 px-1 rounded-full bg-[var(--tetsu-pink)] text-white text-[9px] font-bold flex items-center justify-center leading-none">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </div>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
