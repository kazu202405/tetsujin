// オンボーディング（使い始めチェックリスト）の状態（mock）
// - 説明動画を見たか / チェックリストを閉じたか の2フラグを localStorage で保持。
// - 各ステップの「完了」は他ストア（参加・掲示板・プロフ・開示申請）から自動判定するため、
//   ここで持つのは自動判定できない2つだけ。
// - 作法は withdrawal-data.ts 等に準拠（SSR安全・購読フック・window イベント同期）。
"use client";

import { useEffect, useState } from "react";
import { clearJoinedEvents } from "./event-participation";
import { resetBoardVisited } from "./board-data";
import { clearOwnSheet } from "./profile-sheet-data";
import { resetDisclosureForNewMember } from "./disclosure-data";

const VIDEO_KEY = "tetsujin-onboarding-video-watched";
const DISMISSED_KEY = "tetsujin-onboarding-dismissed";
const EVENT_NAME = "tetsujin-onboarding-update";

function readFlag(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeFlag(key: string, value: boolean) {
  try {
    if (value) localStorage.setItem(key, "1");
    else localStorage.removeItem(key);
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch {
    /* ignore */
  }
}

// 説明動画を見たことにする
export function markOnboardingVideoWatched() {
  writeFlag(VIDEO_KEY, true);
}

// チェックリストを閉じる
export function dismissOnboarding() {
  writeFlag(DISMISSED_KEY, true);
}

// デモ用：はじめてガイドを「まっさらな新規会員」（0/6）に戻す。
// 各ステップの完了は他ストア（参加・掲示板・プロフ・開示）から自動判定されるため、
// 動画・×閉じフラグのクリアだけでなく、それらの元データも空にする。
// 注意：デフォルト（初回シード）は 3/6 のまま。この 0/6 化はリセット押下時のみ。
// 開示申請は「自分が送った分」だけ消し、他人→自分の受信申請（受信タブ・通知）は残す。
export function resetOnboardingDemo(userId: string) {
  clearJoinedEvents(); // 参加を空に → join1/join2 未完了
  resetBoardVisited(); // 掲示板の訪問記録をクリア → 未完了
  clearOwnSheet(userId); // 本人のプロフィールシートを削除 → 未完了
  resetDisclosureForNewMember(userId); // 自分の送信申請だけ消す → 開示 未完了（受信は残る）
  writeFlag(VIDEO_KEY, false); // 動画視聴フラグをクリア → 未完了
  writeFlag(DISMISSED_KEY, false); // ×閉じフラグをクリア → 再表示
}

// 2フラグをまとめて購読（mounted ガードでチラつき防止）
export function useOnboardingFlags(): {
  mounted: boolean;
  videoWatched: boolean;
  dismissed: boolean;
} {
  const [state, setState] = useState({
    mounted: false,
    videoWatched: false,
    dismissed: false,
  });
  useEffect(() => {
    const load = () =>
      setState({
        mounted: true,
        videoWatched: readFlag(VIDEO_KEY),
        dismissed: readFlag(DISMISSED_KEY),
      });
    load();
    window.addEventListener(EVENT_NAME, load);
    return () => window.removeEventListener(EVENT_NAME, load);
  }, []);
  return state;
}
