"use client";

// ============================================================
// 画面をまたいでデータを覚えておく（体感速度のため）
// ============================================================
// これまでは画面を開くたびに毎回ゼロから取り直していた。
// 下タブで行き来する使い方だと、戻るたびに「読み込み中...」が出て
// 毎回サーバーとの往復を待たされる。
//
// ∴ 一度取れたものは覚えておき、次に開いたときは
//    まず覚えている内容をすぐ出す → 裏で取り直して差し替える。
//    ユーザーから見ると、2回目以降は待ち時間が消える。
//
// 🔴 別の人がログインしたときに前の人のデータが残らないよう、
//    ログアウト時に clearClientCache() で必ず捨てる。
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";

export type LoadStatus = "loading" | "loaded" | "error";

const cache = new Map<string, unknown>();

/** ログアウト時に呼ぶ。前の人のデータを次の人に見せないため。 */
export function clearClientCache() {
  cache.clear();
}

/**
 * 覚えている内容のうち1つだけ捨てる。
 * 次に開いた画面は「一度も取れていない」扱いになり、
 * 古い内容が一瞬出てから差し替わる、というちらつきが起きない。
 */
export function clearCached(key: string) {
  cache.delete(key);
}

/** 手元の控えを差し替える（作成・削除の直後など） */
export function setCached<T>(key: string, value: T) {
  cache.set(key, value);
}

export function getCached<T>(key: string): T | undefined {
  return cache.get(key) as T | undefined;
}

/**
 * URLから取ってくる。覚えていればそれを即座に返し、裏で取り直す。
 *
 * @param key   覚えておくときの名前
 * @param url   取得先
 * @param empty 一度も取れていないときの値
 */
export function useCachedResource<T>(key: string, url: string, empty: T) {
  const cached = cache.get(key) as T | undefined;
  const [data, setData] = useState<T>(cached ?? empty);
  const [status, setStatus] = useState<LoadStatus>(cached === undefined ? "loading" : "loaded");
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const reload = useCallback(async () => {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error("failed");
      const body = (await response.json()) as T;
      cache.set(key, body);
      if (!alive.current) return;
      setData(body);
      setStatus("loaded");
    } catch {
      // 取り直しに失敗しても、覚えている内容は消さない。
      // 一瞬出ていたものが急に空になる方が分かりにくいため。
      if (!alive.current) return;
      if (cache.has(key)) {
        setStatus("loaded");
      } else {
        setData(empty);
        setStatus("error");
      }
    }
    // empty は毎回新しい配列/オブジェクトが渡されうるので依存に入れない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, url]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, status, reload, setData } as const;
}
