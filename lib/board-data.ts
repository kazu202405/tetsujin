// 掲示板の未読カウント（mock）
"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "tetsujin-board-last-visited";
const EVENT_NAME = "tetsujin-board-visited";

// 訪問前の見せかけ未読件数（mock）
const BASELINE_UNREAD = 3;

export function markBoardVisited() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch {
    /* ignore */
  }
}

function readUnreadCount(): number {
  if (typeof window === "undefined") return BASELINE_UNREAD;
  try {
    const visited = localStorage.getItem(STORAGE_KEY);
    return visited ? 0 : BASELINE_UNREAD;
  } catch {
    return BASELINE_UNREAD;
  }
}

export function useBoardUnreadCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(readUnreadCount());
    const handler = () => setCount(readUnreadCount());
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, []);

  return count;
}

// 掲示板を一度でも開いたか（オンボーディングの完了判定用・購読）
export function useBoardVisited(): boolean {
  const [visited, setVisited] = useState(false);
  useEffect(() => {
    const read = () => {
      try {
        setVisited(localStorage.getItem(STORAGE_KEY) !== null);
      } catch {
        setVisited(false);
      }
    };
    read();
    window.addEventListener(EVENT_NAME, read);
    return () => window.removeEventListener(EVENT_NAME, read);
  }, []);
  return visited;
}
