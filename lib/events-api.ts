// ============================================================
// イベントのクライアント側データアクセス
// ============================================================
// 参加実績は会員ごとの localStorage ではなく Supabase が正になった。
// 管理画面の「参加状況」も同じ event_participants を集計している。
// ============================================================
"use client";

import { useCallback, useEffect, useState } from "react";

export interface EventParticipantSummary {
  id: string;
  name: string;
  avatarUrl: string | null;
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
  hostId: string | null;
  hostName: string;
  participantCount: number;
  joinedByMe: boolean;
  isMine: boolean;
  participants: EventParticipantSummary[];
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

/** 自分が参加しているイベントだけ（マイページの参加数・カレンダー用）。 */
export function useJoinedEvents(): EventRecord[] {
  const { events } = useEvents();
  return events.filter((e) => e.joinedByMe);
}
