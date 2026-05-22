// 退会フラグ管理（mock）
// - 確定方針：退会後のidは欠番保持、表示は名前のみクリック不可、運営復帰可能
// - mock の Member.isWithdrawn と localStorage の両方を OR 判定
// - Q1-Q3 依頼主回答後、admin UI から localStorage 操作する想定
"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "tetsujin-withdrawn-members";
const EVENT_NAME = "tetsujin-withdrawn-update";

function readIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr) : new Set();
  } catch {
    return new Set();
  }
}

function writeIds(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch {
    /* ignore */
  }
}

export function setMemberWithdrawn(memberId: string, withdrawn: boolean) {
  const ids = readIds();
  if (withdrawn) ids.add(memberId);
  else ids.delete(memberId);
  writeIds(ids);
}

// localStorage の退会id一覧をリアクティブに購読
export function useWithdrawnIds(): Set<string> {
  const [ids, setIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    setIds(readIds());
    const handler = () => setIds(readIds());
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, []);
  return ids;
}

// 静的判定（SSR 安全）：mock のフラグだけ見る
export function isMockWithdrawn(mockFlag: boolean | undefined): boolean {
  return mockFlag === true;
}

// 単一メンバーの退会判定（コンポーネント内 hook）
export function useIsWithdrawn(memberId: string, mockFlag?: boolean): boolean {
  const ids = useWithdrawnIds();
  return mockFlag === true || ids.has(memberId);
}
