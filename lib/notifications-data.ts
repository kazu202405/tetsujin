// ============================================================
// お知らせ（通知）
// ============================================================
// 実データ。生成はDB側のトリガ（コメント・いいね・イベント参加・入会申請）と
// 運営からの一斉送信で行われ、既読も会員ごとにDBへ保存される。
// 旧実装は固定mock＋localStorage既読で、端末を変えると既読が消えていた。
// ============================================================
"use client";

import { useCallback, useEffect, useState } from "react";

export type NotificationType =
  | "board_unread"
  | "plan_renewal"
  | "event_reminder"
  | "connection_new"
  | "comment_reply"
  | "disclosure_request"
  | "disclosure_approved"
  | "announcement"
  | "weekly_digest"
  | "billing_alert"
  | "connection_request"
  | "connection_accepted"
  | "connection_declined"
  | "mention";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  href: string;
  createdAt: string; // ISO 8601
}

export interface UseNotificationsResult {
  notifications: (NotificationItem & { read: boolean })[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

/** 他の画面にも更新を知らせるためのイベント名 */
const UPDATED_EVENT = "tetsujin-notifications-updated";

/**
 * アプリアイコンのバッジ（右上の数字）を未読数に合わせる。
 * プッシュ受信時は Service Worker 側でも設定しているが、
 * アプリを開いて既読にしたときはこちらで消す必要がある。
 * 非対応の環境では何も起きない。
 */
function syncAppBadge(unread: number) {
  if (typeof navigator === "undefined") return;
  const nav = navigator as Navigator & {
    setAppBadge?: (n?: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
  };
  try {
    if (unread > 0) void nav.setAppBadge?.(unread);
    else void nav.clearAppBadge?.();
  } catch {
    /* 非対応環境 */
  }
}

export function useNotifications(): UseNotificationsResult {
  const [notifications, setNotifications] = useState<
    (NotificationItem & { read: boolean })[]
  >([]);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok) throw new Error("failed");
      setNotifications(
        (await response.json()) as (NotificationItem & { read: boolean })[]
      );
    } catch {
      // 取得できないときは何も出さない（存在しない通知を作らない）
      setNotifications([]);
    }
  }, []);

  useEffect(() => {
    void load();
    const handler = () => void load();
    window.addEventListener(UPDATED_EVENT, handler);

    // 🔴 これまで読み直すのは「画面を開いた瞬間」だけだった。
    //    開いたまま待っている人には新しい通知が永久に出ず、
    //    別のページへ移動して戻ってきて初めて届く＝「通知が遅い」。
    //
    //    ① タブに戻ってきたとき ② ウィンドウにフォーカスが戻ったとき
    //    ③ 見えている間だけ60秒ごと、の3つで読み直す。
    //    見えていないタブでは動かさない（開きっぱなしの端末が
    //    一日中サーバーを叩き続けるのを避ける）。
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", handler);
    const timer = setInterval(onVisible, 60_000);

    return () => {
      window.removeEventListener(UPDATED_EVENT, handler);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", handler);
      clearInterval(timer);
    };
  }, [load]);

  const markRead = (id: string) => {
    // 先に画面へ反映してから保存する（連打しても表示が跳ねない）
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    void fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
      .then(() => window.dispatchEvent(new Event(UPDATED_EVENT)))
      .catch(() => void load());
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    void fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    })
      .then(() => window.dispatchEvent(new Event(UPDATED_EVENT)))
      .catch(() => void load());
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  // 未読数が変わるたびにアイコンのバッジを合わせる
  useEffect(() => {
    syncAppBadge(unreadCount);
  }, [unreadCount]);

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
