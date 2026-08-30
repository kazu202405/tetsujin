// ============================================================
// SNSリンクのクライアント側データアクセス
// ============================================================
// 見えないリンクの URL は API の時点で返ってこない（DB側で NULL にしている）。
// ∴ 画面は「表示するかどうか」だけを考えればよい。
// ============================================================
"use client";

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
