// イベント参加状態の単一ソース（mock）
// - 「どのイベントに参加しているか」の唯一の真実を localStorage に置く。
// - 会を探す(post) と マイページ(mypage) が同じ状態を共有できるよう、window イベントで全画面同期。
// - 作法は withdrawal-data.ts / disclosure-data.ts に準拠（SSR安全・mounted ガード・購読フック）。
// - TODO: 本連携は入金後に Supabase（event_participants テーブル）へ。
"use client";

import { useEffect, useState } from "react";
import { initialEvents } from "@/app/app/post/data";
import type { Event } from "@/app/app/post/types";

const STORAGE_KEY = "tetsujin-joined-events"; // string[]（参加中イベントid）
const EVENT_NAME = "tetsujin-joined-update";

// 初回シード（現行 post 画面のローカル初期値に揃える）
const SEED_JOINED = ["e1", "e3"];

// ============ localStorage I/O ============
function seedIfNeeded() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(STORAGE_KEY) !== null) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_JOINED));
}

function readIds(): Set<string> {
  if (typeof window === "undefined") return new Set(SEED_JOINED);
  try {
    seedIfNeeded();
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr) : new Set();
  } catch {
    return new Set();
  }
}

function persist(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch {
    /* ignore */
  }
}

// ============ 変更操作 ============
// 参加する / 参加を取り消す
export function setEventJoined(eventId: string, joined: boolean) {
  const ids = readIds();
  if (joined) {
    ids.add(eventId);
  } else {
    ids.delete(eventId);
  }
  persist(ids);
}

// デモ用：参加状態を空にする（オンボ「イベントに参加する」を未完了に戻す＝まっさらな新規会員）
export function clearJoinedEvents() {
  persist(new Set());
}

// ============ 購読フック ============
// mounted と ids を同一 state で更新し、初期描画のチラつき・hydration mismatch を防ぐ
function useJoinedState(): { mounted: boolean; ids: Set<string> } {
  const [state, setState] = useState<{ mounted: boolean; ids: Set<string> }>({
    mounted: false,
    ids: new Set(),
  });
  useEffect(() => {
    const load = () => setState({ mounted: true, ids: readIds() });
    load();
    window.addEventListener(EVENT_NAME, load);
    return () => window.removeEventListener(EVENT_NAME, load);
  }, []);
  return state;
}

// 参加中イベントidの Set（購読）
export function useJoinedEventIds(): Set<string> {
  return useJoinedState().ids;
}

// 参加中イベントを initialEvents と結合して完全な Event[] で返す（購読）
export function useJoinedEvents(): Event[] {
  const { ids } = useJoinedState();
  return initialEvents.filter((e) => ids.has(e.id));
}
