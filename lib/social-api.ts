// ============================================================
// SNSリンクと開示申請のクライアント側データアクセス
// ============================================================
// 見えないリンクの URL は API の時点で返ってこない（DB側で NULL にしている）。
// ∴ 画面は「表示するかどうか」だけを考えればよい。
// ============================================================
"use client";

import { useCallback, useEffect, useState } from "react";
import type { SocialPlatform, SocialVisibility } from "./social-links";

export interface OwnSocialLink {
  id?: string;
  platform: SocialPlatform;
  label: string | null;
  url: string;
  visibility: SocialVisibility;
}

export type DisclosureStatus = "pending" | "approved" | "declined";

export interface VisibleSocialLink {
  id: string;
  platform: SocialPlatform;
  label: string | null;
  /** 見える権限が無いときは null（URL自体が返ってこない） */
  url: string | null;
  visibility: SocialVisibility;
  isOwner: boolean;
  visible: boolean;
  disclosureStatus: DisclosureStatus | null;
}

export interface DisclosureRequestItem {
  id: string;
  direction: "incoming" | "outgoing";
  status: DisclosureStatus;
  platform: SocialPlatform;
  linkLabel: string | null;
  createdAt: string;
  respondedAt: string | null;
  other: { id: string; name: string; job: string; avatarUrl: string | null };
}

async function readError(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error || fallback;
}

// ============ 自分のリンク ============

export async function fetchMySocialLinks(): Promise<OwnSocialLink[]> {
  const response = await fetch("/api/me/social-links", { cache: "no-store" });
  if (!response.ok) throw new Error("failed");
  const rows = (await response.json()) as {
    id: string;
    platform: SocialPlatform;
    label: string | null;
    url: string;
    visibility: SocialVisibility;
  }[];
  return rows.map((r) => ({
    id: r.id,
    platform: r.platform,
    label: r.label,
    url: r.url,
    visibility: r.visibility,
  }));
}

export async function saveMySocialLinks(
  links: OwnSocialLink[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await fetch("/api/me/social-links", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ links }),
  });
  if (!response.ok) {
    return { ok: false, error: await readError(response, "保存できませんでした") };
  }
  return { ok: true };
}

// ============ 他の会員のリンク ============

export async function fetchProfileSocialLinks(memberId: string): Promise<VisibleSocialLink[]> {
  const response = await fetch(`/api/profile/${memberId}/social-links`, { cache: "no-store" });
  if (!response.ok) throw new Error("failed");
  return (await response.json()) as VisibleSocialLink[];
}

// ============ 開示申請 ============

const UPDATED_EVENT = "tetsujin-disclosure-updated";

function notifyUpdated() {
  window.dispatchEvent(new Event(UPDATED_EVENT));
}

export async function requestDisclosure(
  linkId: string,
  toMemberId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await fetch("/api/disclosures", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ linkId, toMemberId }),
  });
  if (!response.ok) {
    return { ok: false, error: await readError(response, "申請できませんでした") };
  }
  notifyUpdated();
  return { ok: true };
}

export async function respondDisclosure(
  id: string,
  action: "approve" | "decline",
): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await fetch(`/api/disclosures/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  if (!response.ok) {
    return { ok: false, error: await readError(response, "更新できませんでした") };
  }
  notifyUpdated();
  return { ok: true };
}

export async function cancelDisclosure(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await fetch(`/api/disclosures/${id}`, { method: "DELETE" });
  if (!response.ok) {
    return { ok: false, error: await readError(response, "取り下げできませんでした") };
  }
  notifyUpdated();
  return { ok: true };
}

export function useDisclosureRequests() {
  const [requests, setRequests] = useState<DisclosureRequestItem[]>([]);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");

  const reload = useCallback(async () => {
    try {
      const response = await fetch("/api/disclosures", { cache: "no-store" });
      if (!response.ok) throw new Error("failed");
      setRequests((await response.json()) as DisclosureRequestItem[]);
      setStatus("loaded");
    } catch {
      setRequests([]);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void reload();
    const handler = () => void reload();
    window.addEventListener(UPDATED_EVENT, handler);
    return () => window.removeEventListener(UPDATED_EVENT, handler);
  }, [reload]);

  return { requests, status, reload };
}

/** 自分宛の未応答件数（サイドバーのバッジ用） */
export function usePendingIncomingCount(): number {
  const { requests } = useDisclosureRequests();
  return requests.filter((r) => r.direction === "incoming" && r.status === "pending").length;
}
