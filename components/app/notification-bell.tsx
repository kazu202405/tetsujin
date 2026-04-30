"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { useNotifications } from "@/lib/notifications-data";
import { NotificationList } from "./notification-list";

export function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 外側クリックで閉じる
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const recent = notifications.slice(0, 8);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        aria-label="お知らせ"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-[var(--tetsu-pink)] text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 lg:left-auto lg:right-0 top-full mt-2 w-[340px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-gray-100 z-30 overflow-hidden">
          {/* ヘッダー */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900">お知らせ</h3>
              {unreadCount > 0 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-[var(--tetsu-pink-pale)] text-[var(--tetsu-pink)] text-[10px] font-bold">
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-gray-900 transition-colors"
              >
                <CheckCheck className="w-3 h-3" />
                すべて既読
              </button>
            )}
          </div>

          {/* リスト */}
          <div className="max-h-[420px] overflow-y-auto">
            <NotificationList
              notifications={recent}
              onItemClick={(id) => {
                markRead(id);
                setOpen(false);
              }}
              density="compact"
            />
          </div>

          {/* フッター */}
          <div className="border-t border-gray-100">
            <Link
              href="/app/notifications"
              onClick={() => setOpen(false)}
              className="block w-full text-center py-3 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
            >
              すべて見る
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
