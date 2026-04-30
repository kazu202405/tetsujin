"use client";

import { useState } from "react";
import { CheckCheck, Bell } from "lucide-react";
import { useNotifications } from "@/lib/notifications-data";
import { NotificationList } from "@/components/app/notification-list";

type FilterMode = "all" | "unread";

export default function NotificationsPage() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [filter, setFilter] = useState<FilterMode>("all");

  const visible =
    filter === "unread" ? notifications.filter((n) => !n.read) : notifications;

  return (
    <div className="min-h-screen">
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Bell className="w-5 h-5 text-gray-500" />
              <h1 className="text-xl font-bold text-gray-900">お知らせ</h1>
              {unreadCount > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[var(--tetsu-pink-pale)] text-[var(--tetsu-pink)] text-xs font-bold">
                  {unreadCount}件 未読
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:border-gray-300 hover:text-gray-900 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                すべて既読
              </button>
            )}
          </div>

          {/* フィルタ */}
          <div className="flex items-center gap-2 mt-4">
            {(
              [
                { key: "all", label: "すべて", count: notifications.length },
                { key: "unread", label: "未読のみ", count: unreadCount },
              ] as { key: FilterMode; label: string; count: number }[]
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filter === tab.key
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
                }`}
              >
                {tab.label}
                <span
                  className={`text-[11px] font-bold ${
                    filter === tab.key ? "text-gray-200" : "text-gray-400"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <NotificationList
            notifications={visible}
            onItemClick={(id) => markRead(id)}
            density="comfortable"
          />
        </div>
      </div>
    </div>
  );
}
