// 掲示板を一度でも開いたか（オンボーディング「掲示板を見る」の完了判定）
// - 未読件数は実データ（board_reads）に移行したため lib/board-api.ts の useBoardUnread を使う。
//   ここに残しているのは端末ローカルで持てば十分なオンボーディング用のフラグのみ。
"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "tetsujin-board-last-visited";
const EVENT_NAME = "tetsujin-board-visited";

export function markBoardVisited() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch {
    /* ignore */
  }
}

// デモ用：掲示板の訪問記録をクリア（オンボ「掲示板を見る」が初期状態に戻る）
export function resetBoardVisited() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch {
    /* ignore */
  }
}

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
