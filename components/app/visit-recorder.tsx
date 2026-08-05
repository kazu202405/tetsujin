// ============================================================
// アクセス記録
// ============================================================
// 「その日アプリを開いたか」を1日1回だけサーバーへ知らせる。
// 管理画面の「ログイン日数（30日）」はこれを数えている。
//
// ログインのサインイン操作を数える方式にしないのは、セッションが継続するため
// 毎日使っている人でも月1回程度しか発生せず、実態より低く出てしまうため。
// ============================================================
"use client";

import { useEffect } from "react";

const KEY = "tetsujin-visit-recorded";

export function VisitRecorder() {
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    try {
      // 同じ日に何度も送らない（ページ遷移のたびに叩かないため）
      if (localStorage.getItem(KEY) === today) return;
      localStorage.setItem(KEY, today);
    } catch {
      /* localStorage が使えない場合はそのまま送る */
    }

    void fetch("/api/me/visit", { method: "POST" }).catch(() => {
      /* 記録できなくても利用は妨げない */
    });
  }, []);

  return null;
}
