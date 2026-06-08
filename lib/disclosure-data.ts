// SNS個別開示申請（マッチング承認フロー）の状態管理（mock）
// - 「○○さんのLINEを開示してほしい」を 申請 → 通知 → 承認/却下 → 承認なら開示 の流れで管理
// - 確定方針：申請単位は SNSリンク個別（z.md「承認したらLINEどうぞ」）
// - localStorage 永続化 + window イベントで全画面同期（withdrawal-data.ts と同じ作法）
// - 現在のユーザー = CURRENT_USER_ID（"1" 田中 一郎）視点で送受信の両方をデモできるようシード
"use client";

import { useEffect, useState } from "react";
import { dashboardMembers } from "./dashboard-data";
import { SOCIAL_PLATFORM_META, SocialPlatform } from "./social-links";
import type { NotificationItem } from "./notifications-data";

export type DisclosureStatus = "pending" | "approved" | "declined";

export interface DisclosureRequest {
  id: string;
  fromMemberId: string; // 申請した人
  toMemberId: string; // 開示を求められた人（リンクの持ち主）
  linkId: string; // 対象 SocialLink の id
  platform: SocialPlatform;
  status: DisclosureStatus;
  createdAt: string; // ISO 8601
  respondedAt?: string; // 承認/却下した日時
}

const STORAGE_KEY = "tetsujin-disclosure-requests";
const EVENT_NAME = "tetsujin-disclosure-update";

// ============ デモ用シード ============
// me = "1"（田中 一郎）が、送信側・受信側のどちらの状態も確認できるよう仕込む
const SEED_REQUESTS: DisclosureRequest[] = [
  // 受信（承認待ち）：自分(1)の LINE(s1-1) の開示を求められている
  {
    id: "dr-seed-1",
    fromMemberId: "2", // 佐藤 裕樹
    toMemberId: "1",
    linkId: "s1-1",
    platform: "line",
    status: "pending",
    createdAt: "2026-06-06T10:20:00+09:00",
  },
  {
    id: "dr-seed-2",
    fromMemberId: "6", // 渡辺 剛
    toMemberId: "1",
    linkId: "s1-1",
    platform: "line",
    status: "pending",
    createdAt: "2026-06-05T16:45:00+09:00",
  },
  // 送信（承認済み）：自分(1)が森田(8)の LINE(s8-1) を申請 → 承認された
  {
    id: "dr-seed-3",
    fromMemberId: "1",
    toMemberId: "8", // 森田 駿
    linkId: "s8-1",
    platform: "line",
    status: "approved",
    createdAt: "2026-06-04T09:00:00+09:00",
    respondedAt: "2026-06-04T12:30:00+09:00",
  },
  // 送信（申請中）：自分(1)が本田(10)の LINE(s10-2) を申請 → 返答待ち
  {
    id: "dr-seed-4",
    fromMemberId: "1",
    toMemberId: "10", // 本田 浩二
    linkId: "s10-2",
    platform: "line",
    status: "pending",
    createdAt: "2026-06-06T08:10:00+09:00",
  },
];

// ============ localStorage I/O ============

function readRequests(): DisclosureRequest[] {
  if (typeof window === "undefined") return SEED_REQUESTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      // 初回：シードを書き込む
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_REQUESTS));
      return SEED_REQUESTS;
    }
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : SEED_REQUESTS;
  } catch {
    return SEED_REQUESTS;
  }
}

function writeRequests(requests: DisclosureRequest[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch {
    /* ignore */
  }
}

// ============ 変更操作 ============

// 開示を申請する（既に pending / approved があれば何もしない）
export function requestDisclosure(
  fromMemberId: string,
  toMemberId: string,
  linkId: string,
  platform: SocialPlatform
): void {
  const requests = readRequests();
  const existing = requests.find(
    (r) =>
      r.fromMemberId === fromMemberId &&
      r.toMemberId === toMemberId &&
      r.linkId === linkId
  );
  if (existing && existing.status !== "declined") return;

  const next: DisclosureRequest = {
    id: `dr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    fromMemberId,
    toMemberId,
    linkId,
    platform,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  // 却下済みがあれば作り直す（再申請）
  const filtered = existing
    ? requests.filter((r) => r.id !== existing.id)
    : requests;
  writeRequests([next, ...filtered]);
}

// 申請に応答する（承認 / 却下）
export function respondToRequest(
  requestId: string,
  decision: "approved" | "declined"
): void {
  const requests = readRequests();
  const next = requests.map((r) =>
    r.id === requestId
      ? { ...r, status: decision, respondedAt: new Date().toISOString() }
      : r
  );
  writeRequests(next);
}

// 申請者が自分の申請を取り下げる（pending のみ削除＝再申請可能な状態に戻す）
export function cancelDisclosureRequest(requestId: string): void {
  const requests = readRequests();
  const next = requests.filter(
    (r) => !(r.id === requestId && r.status === "pending")
  );
  writeRequests(next);
}

// ============ 参照ヘルパー ============

// 閲覧者→持ち主 の特定リンクが開示済みか（承認済み申請の有無）
export function isLinkDisclosed(
  requests: DisclosureRequest[],
  viewerId: string,
  ownerId: string,
  linkId: string
): boolean {
  return requests.some(
    (r) =>
      r.fromMemberId === viewerId &&
      r.toMemberId === ownerId &&
      r.linkId === linkId &&
      r.status === "approved"
  );
}

// 閲覧者→持ち主 の特定リンクの申請状態（なければ null）
export function getDisclosureStatus(
  requests: DisclosureRequest[],
  viewerId: string,
  ownerId: string,
  linkId: string
): DisclosureStatus | null {
  const r = requests.find(
    (x) =>
      x.fromMemberId === viewerId &&
      x.toMemberId === ownerId &&
      x.linkId === linkId
  );
  return r ? r.status : null;
}

function memberName(id: string): string {
  return dashboardMembers.find((m) => m.id === id)?.name ?? "メンバー";
}

// 通知データを開示申請から導出（notifications-data がマージして使う）
export function getDisclosureNotifications(myId: string): NotificationItem[] {
  const requests = readRequests();
  const items: NotificationItem[] = [];

  for (const r of requests) {
    const platformLabel = SOCIAL_PLATFORM_META[r.platform].label;

    // 自分宛の未応答申請 → 「承認待ち」通知
    if (r.toMemberId === myId && r.status === "pending") {
      items.push({
        id: `ntf-dr-in-${r.id}`,
        type: "disclosure_request",
        title: `${memberName(r.fromMemberId)}さんが${platformLabel}の開示を申請`,
        message: `承認すると${memberName(
          r.fromMemberId
        )}さんに${platformLabel}が表示されます。`,
        href: "/app/requests",
        createdAt: r.createdAt,
      });
    }

    // 自分が出した申請が承認された → 「○○どうぞ」通知
    if (r.fromMemberId === myId && r.status === "approved" && r.respondedAt) {
      items.push({
        id: `ntf-dr-ok-${r.id}`,
        type: "disclosure_approved",
        title: `${memberName(r.toMemberId)}さんが${platformLabel}を開示しました`,
        message: `承認されました！${platformLabel}でつながりましょう。プロフィールから確認できます。`,
        href: `/app/profile/${r.toMemberId}`,
        createdAt: r.respondedAt,
      });
    }
  }
  return items;
}

// ============ React フック ============

// 全申請をリアクティブに購読
export function useDisclosureRequests(): DisclosureRequest[] {
  const [requests, setRequests] = useState<DisclosureRequest[]>([]);
  useEffect(() => {
    setRequests(readRequests());
    const handler = () => setRequests(readRequests());
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, []);
  return requests;
}

// 自分宛の承認待ち件数（サイドバーバッジ用）
export function usePendingIncomingCount(myId: string): number {
  const requests = useDisclosureRequests();
  return requests.filter(
    (r) => r.toMemberId === myId && r.status === "pending"
  ).length;
}
