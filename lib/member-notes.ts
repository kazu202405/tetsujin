// 会員ごとの運営メモ（備考欄）の管理（mock）
// - 退会理由とは別の、在籍中も使える常設メモ。admin（会員管理）でのみ編集・表示
// - localStorage 永続化＋windowイベントで同期（他のmock機能と同作法）
"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "tetsujin-member-notes";
const EVENT_NAME = "tetsujin-member-notes-update";

function readNotes(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

// メモを保存（空文字なら削除）
export function setMemberNote(memberId: string, note: string) {
  const notes = readNotes();
  const trimmed = note.trim();
  if (trimmed) notes[memberId] = trimmed;
  else delete notes[memberId];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch {
    /* ignore */
  }
}

// 全メモを購読
export function useMemberNotes(): Record<string, string> {
  const [notes, setNotes] = useState<Record<string, string>>({});
  useEffect(() => {
    const load = () => setNotes(readNotes());
    load();
    window.addEventListener(EVENT_NAME, load);
    return () => window.removeEventListener(EVENT_NAME, load);
  }, []);
  return notes;
}
