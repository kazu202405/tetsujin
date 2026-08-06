// ============================================================
// イベントのクライアント側データアクセス
// ============================================================
// 参加実績は会員ごとの localStorage ではなく Supabase が正になった。
// 管理画面の「参加状況」も同じ event_participants を集計している。
// ============================================================
"use client";

import { useCallback, useEffect, useState } from "react";

export type EventParticipantRole = "owner" | "admin" | "member";
export type ParticipationStatus = "pending" | "approved" | "declined";

export interface EventParticipantSummary {
  id: string;
  name: string;
  job: string;
  avatarUrl: string | null;
  role: EventParticipantRole;
  message: string | null;
}

export interface EventRecord {
  id: string;
  title: string;
  seriesName: string | null;
  date: string; // YYYY-MM-DD
  time: string;
  location: string;
  description: string;
  capacity: number | null;
  isCanceled: boolean;
  /** 参加に主催者の承認が必要か */
  requiresApproval: boolean;
  hostId: string | null;
  hostName: string;
  /** 承認済みの参加者数 */
  participantCount: number;
  /** 承認待ちの件数（管理できる人にだけ入る） */
  pendingCount: number;
  myStatus: ParticipationStatus | null;
  myRole: EventParticipantRole | null;
  /** 主催者・副管理者・運営なら true */
  isManager: boolean;
  isMine: boolean;
  followingSeries: boolean;
  participants: EventParticipantSummary[];
  pendingParticipants: EventParticipantSummary[];
}

/** 参加している扱いか（承認待ちも含む） */
export function isJoined(event: EventRecord): boolean {
  return event.myStatus === "pending" || event.myStatus === "approved";
}

async function readError(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error || fallback;
}

export async function fetchEvents(): Promise<EventRecord[]> {
  const response = await fetch("/api/events", { cache: "no-store" });
  if (!response.ok) throw new Error("failed to load events");
  return (await response.json()) as EventRecord[];
}

export async function createEvent(input: {
  title: string;
  seriesName?: string | null;
  date: string;
  time?: string;
  location?: string;
  description?: string;
  capacity?: number | null;
  requiresApproval?: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    return { ok: false, error: await readError(response, "イベントを作成できませんでした") };
  }
  return { ok: true };
}

export async function updateEvent(
  eventId: string,
  input: {
    title?: string;
    seriesName?: string | null;
    date?: string;
    time?: string;
    location?: string;
    description?: string;
    capacity?: number | null;
    requiresApproval?: boolean;
    isCanceled?: boolean;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await fetch(`/api/events/${eventId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    return { ok: false, error: await readError(response, "更新できませんでした") };
  }
  window.dispatchEvent(new Event("tetsujin-events-updated"));
  return { ok: true };
}

export async function deleteEvent(
  eventId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await fetch(`/api/events/${eventId}`, { method: "DELETE" });
  if (!response.ok) {
    return { ok: false, error: await readError(response, "削除できませんでした") };
  }
  window.dispatchEvent(new Event("tetsujin-events-updated"));
  return { ok: true };
}

export async function setEventJoined(
  eventId: string,
  joined: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await fetch(`/api/events/${eventId}/join`, {
    method: joined ? "POST" : "DELETE",
  });
  if (!response.ok) {
    return {
      ok: false,
      error: await readError(response, joined ? "参加できませんでした" : "取り消せませんでした"),
    };
  }
  // 他の画面（マイページの参加数・カレンダー）にも知らせる
  window.dispatchEvent(new Event("tetsujin-events-updated"));
  return { ok: true };
}

/** イベント一覧を購読する。参加操作のあと自動で読み直す。 */
export function useEvents() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");

  const reload = useCallback(async () => {
    try {
      setEvents(await fetchEvents());
      setStatus("loaded");
    } catch {
      setEvents([]);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void reload();
    const handler = () => void reload();
    window.addEventListener("tetsujin-events-updated", handler);
    return () => window.removeEventListener("tetsujin-events-updated", handler);
  }, [reload]);

  return { events, status, reload };
}

/** 自分が参加しているイベントだけ（マイページの参加数・カレンダー用）。承認待ちは含めない。 */
export function useJoinedEvents(): EventRecord[] {
  const { events } = useEvents();
  return events.filter((e) => e.myStatus === "approved");
}

// ============ 参加者の管理（主催者・副管理者） ============

export async function reviewParticipant(
  eventId: string,
  memberId: string,
  action: "approve" | "decline",
): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await fetch(`/api/events/${eventId}/participants/${memberId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  if (!response.ok) {
    return { ok: false, error: await readError(response, "更新できませんでした") };
  }
  window.dispatchEvent(new Event("tetsujin-events-updated"));
  return { ok: true };
}

export async function setParticipantRole(
  eventId: string,
  memberId: string,
  role: "admin" | "member",
): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await fetch(`/api/events/${eventId}/participants/${memberId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
  if (!response.ok) {
    return { ok: false, error: await readError(response, "役割を変更できませんでした") };
  }
  window.dispatchEvent(new Event("tetsujin-events-updated"));
  return { ok: true };
}

export async function removeParticipant(
  eventId: string,
  memberId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await fetch(`/api/events/${eventId}/participants/${memberId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    return { ok: false, error: await readError(response, "削除できませんでした") };
  }
  window.dispatchEvent(new Event("tetsujin-events-updated"));
  return { ok: true };
}

export async function transferOwnership(
  eventId: string,
  newOwnerId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await fetch(`/api/events/${eventId}/transfer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newOwnerId }),
  });
  if (!response.ok) {
    return { ok: false, error: await readError(response, "委譲できませんでした") };
  }
  window.dispatchEvent(new Event("tetsujin-events-updated"));
  return { ok: true };
}

// ============ シリーズのフォロー ============

export async function setSeriesFollowing(
  seriesName: string,
  following: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = following
    ? await fetch("/api/events/series/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seriesName }),
      })
    : await fetch(`/api/events/series/follow?seriesName=${encodeURIComponent(seriesName)}`, {
        method: "DELETE",
      });

  if (!response.ok) {
    return { ok: false, error: await readError(response, "更新できませんでした") };
  }
  window.dispatchEvent(new Event("tetsujin-events-updated"));
  return { ok: true };
}
