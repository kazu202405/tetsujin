// ============================================================
// つながり申請（クライアント側）
// ============================================================
// 連絡先を教えてもらう入口はこの申請1本だけ（2026-08-30）。
// リンクごとの開示申請は廃止したので、バッジもここから数える。
// ============================================================
"use client";

import { useEffect } from "react";
import { useCachedResource } from "./client-cache";

export interface ConnectionRequestItem {
  id: string;
  direction: "sent" | "received";
  other: { id: string; name: string; job: string | null; avatarUrl: string | null };
  purposes: string[];
  message: string | null;
  status: "pending" | "accepted" | "declined" | "expired";
  declineReason: string | null;
  replyMessage: string | null;
  isSales: boolean;
  createdAt: string;
}

export interface PurposeOption {
  code: string;
  label: string;
  is_sales: boolean;
}

interface Payload {
  requests: ConnectionRequestItem[];
  purposeOptions: PurposeOption[];
}

const EMPTY: Payload = { requests: [], purposeOptions: [] };

const UPDATED_EVENT = "tetsujin-connection-requests-updated";

export function notifyConnectionRequestsUpdated() {
  window.dispatchEvent(new Event(UPDATED_EVENT));
}

export function useConnectionRequests() {
  const { data, status, reload } = useCachedResource<Payload>(
    "connection-requests",
    "/api/me/connection-requests",
    EMPTY,
  );

  useEffect(() => {
    const handler = () => void reload();
    window.addEventListener(UPDATED_EVENT, handler);
    return () => window.removeEventListener(UPDATED_EVENT, handler);
  }, [reload]);

  return { requests: data.requests, purposeOptions: data.purposeOptions, status, reload };
}

/** 自分宛で、まだ返事をしていない件数（サイドバー・下タブのバッジ用） */
export function usePendingIncomingCount(): number {
  const { requests } = useConnectionRequests();
  return requests.filter((r) => r.direction === "received" && r.status === "pending").length;
}
