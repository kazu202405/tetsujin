// お知らせ（通知）機能のデータ・既読管理（mock）
"use client";

import { useEffect, useState } from "react";

export type NotificationType =
  | "board_unread"
  | "plan_renewal"
  | "event_reminder"
  | "connection_new"
  | "comment_reply";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  href: string;
  createdAt: string; // ISO 8601
}

// mock: 「今日 = 2026-04-27」想定
export const mockNotifications: NotificationItem[] = [
  {
    id: "n-1",
    type: "comment_reply",
    title: "佐藤 裕樹さんが返信しました",
    message: "「経営者グルメ会の感想」の投稿に返信があります。",
    href: "/app/board",
    createdAt: "2026-04-27T09:30:00+09:00",
  },
  {
    id: "n-2",
    type: "board_unread",
    title: "掲示板に新しい投稿が3件",
    message: "メンバーから新しい話題が投稿されました。",
    href: "/app/board",
    createdAt: "2026-04-26T18:15:00+09:00",
  },
  {
    id: "n-3",
    type: "event_reminder",
    title: "第13回 経営者グルメ会まで3日",
    message: "2026年4月30日 19:00〜 鮨 まつもと（大阪・北新地）",
    href: "/app/events",
    createdAt: "2026-04-26T08:00:00+09:00",
  },
  {
    id: "n-4",
    type: "connection_new",
    title: "小川 理沙さんが新しいつながりを記録",
    message: "中村 明子さんとの出会いが追加されました。",
    href: "/app/profile/7",
    createdAt: "2026-04-25T14:22:00+09:00",
  },
  {
    id: "n-5",
    type: "plan_renewal",
    title: "プラン更新日が近づいています",
    message: "次回請求日: 2026年5月14日（あと17日）",
    href: "/app/settings",
    createdAt: "2026-04-24T10:00:00+09:00",
  },
  {
    id: "n-6",
    type: "comment_reply",
    title: "山本 恵美さんがコメントしました",
    message: "「割烹 田中さんのおすすめメニュー」にコメントが届きました。",
    href: "/app/board",
    createdAt: "2026-04-22T20:45:00+09:00",
  },
  {
    id: "n-7",
    type: "event_reminder",
    title: "第12回 経営者グルメ会のお礼",
    message: "出会い記録を残しておきましょう。",
    href: "/app/connections",
    createdAt: "2026-04-20T11:00:00+09:00",
  },
];

// ============ 既読管理（localStorage 永続化） ============

const STORAGE_KEY = "tetsujin-notifications-read";
const EVENT_NAME = "tetsujin-notifications-read-update";

function getReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

function persistReadIds(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch {
    /* ignore */
  }
}

// ============ React フック ============

export interface UseNotificationsResult {
  notifications: (NotificationItem & { read: boolean })[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

export function useNotifications(): UseNotificationsResult {
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  // 初期ロード + 他コンポーネントからの更新を購読
  useEffect(() => {
    setReadIds(getReadIds());
    const handler = () => setReadIds(getReadIds());
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, []);

  const markRead = (id: string) => {
    const next = new Set(readIds);
    next.add(id);
    persistReadIds(next);
    setReadIds(next);
  };

  const markAllRead = () => {
    const next = new Set(mockNotifications.map((n) => n.id));
    persistReadIds(next);
    setReadIds(next);
  };

  // createdAt 降順で整列
  const sorted = [...mockNotifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const notifications = sorted.map((n) => ({ ...n, read: readIds.has(n.id) }));
  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount, markRead, markAllRead };
}

// ============ 表示ヘルパー ============

export function formatRelativeTime(iso: string, now = new Date()): string {
  const t = new Date(iso).getTime();
  const diffMs = now.getTime() - t;
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "たった今";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}分前`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}時間前`;
  const day = Math.floor(hour / 24);
  if (day < 7) return `${day}日前`;
  const week = Math.floor(day / 7);
  if (week < 5) return `${week}週間前`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month}ヶ月前`;
  return `${Math.floor(day / 365)}年前`;
}
