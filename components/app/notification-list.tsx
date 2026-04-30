"use client";

import Link from "next/link";
import {
  MessageSquare,
  CalendarDays,
  CreditCard,
  Handshake,
  MessageCircle,
  Bell,
} from "lucide-react";
import {
  NotificationItem,
  NotificationType,
  formatRelativeTime,
} from "@/lib/notifications-data";

const TYPE_META: Record<
  NotificationType,
  { Icon: typeof Bell; bg: string; iconColor: string }
> = {
  comment_reply: {
    Icon: MessageSquare,
    bg: "bg-blue-50",
    iconColor: "text-blue-500",
  },
  board_unread: {
    Icon: MessageCircle,
    bg: "bg-amber-50",
    iconColor: "text-amber-500",
  },
  event_reminder: {
    Icon: CalendarDays,
    bg: "bg-purple-50",
    iconColor: "text-purple-500",
  },
  connection_new: {
    Icon: Handshake,
    bg: "bg-emerald-50",
    iconColor: "text-emerald-500",
  },
  plan_renewal: {
    Icon: CreditCard,
    bg: "bg-rose-50",
    iconColor: "text-rose-500",
  },
};

interface Props {
  notifications: (NotificationItem & { read: boolean })[];
  onItemClick?: (id: string) => void;
  // ドロップダウンとページで余白を変えるため
  density?: "compact" | "comfortable";
}

export function NotificationList({
  notifications,
  onItemClick,
  density = "comfortable",
}: Props) {
  if (notifications.length === 0) {
    return (
      <div className="text-center py-12">
        <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-400">お知らせはありません</p>
      </div>
    );
  }

  const padY = density === "compact" ? "py-3" : "py-4";

  return (
    <ul className="divide-y divide-gray-100">
      {notifications.map((n) => {
        const meta = TYPE_META[n.type];
        return (
          <li key={n.id}>
            <Link
              href={n.href}
              onClick={() => onItemClick?.(n.id)}
              className={`group flex items-start gap-3 px-4 ${padY} hover:bg-gray-50 transition-colors ${
                n.read ? "" : "bg-amber-50/30"
              }`}
            >
              <div
                className={`flex items-center justify-center w-9 h-9 rounded-lg ${meta.bg} flex-shrink-0`}
              >
                <meta.Icon className={`w-4 h-4 ${meta.iconColor}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p
                    className={`text-sm leading-snug ${
                      n.read
                        ? "text-gray-600 font-medium"
                        : "text-gray-900 font-bold"
                    }`}
                  >
                    {n.title}
                  </p>
                  {!n.read && (
                    <span className="flex-shrink-0 mt-1.5 w-2 h-2 rounded-full bg-[var(--tetsu-pink)]" />
                  )}
                </div>
                <p className="text-xs text-gray-500 leading-relaxed mt-0.5 line-clamp-2">
                  {n.message}
                </p>
                <p className="text-[11px] text-gray-400 mt-1">
                  {formatRelativeTime(n.createdAt)}
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
