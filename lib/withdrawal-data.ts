// 退会フラグ管理（mock）
// - 確定方針(2026-06)：退会の主導権は【運営のみ】。本人はLINEで申請、運営がadminで処理。
// - 退会後のidは欠番保持、表示は名前のみクリック不可、管理者が復帰可能。
// - 唯一の真実は localStorage。初回に mock の isWithdrawn からシードし、以後 localStorage が正。
//   （これにより admin からの「復帰」が mock フラグを上書きして確実に効く）
// - 退会理由・退会日もここで保持（admin で入力／表示）。
"use client";

import { useEffect, useState } from "react";
import { dashboardMembers } from "./dashboard-data";

const STORAGE_KEY = "tetsujin-withdrawn-members"; // string[]（退会id）
const META_KEY = "tetsujin-withdrawal-meta"; // Record<id, {reason, at}>
const EVENT_NAME = "tetsujin-withdrawn-update";

export interface WithdrawalMeta {
  reason: string;
  at: string; // 退会日 ISO（不明なら空文字）
}

// ============ 初回シード（mock の isWithdrawn を localStorage に取り込む） ============
function seedIfNeeded() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(STORAGE_KEY) !== null) return;
  const ids: string[] = [];
  const meta: Record<string, WithdrawalMeta> = {};
  for (const m of dashboardMembers) {
    if (m.isWithdrawn) {
      ids.push(m.id);
      meta[m.id] = { reason: "", at: m.withdrawnAt ?? "" };
    }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  localStorage.setItem(META_KEY, JSON.stringify(meta));
}

// ============ localStorage I/O ============
function readIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
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

function readMeta(): Record<string, WithdrawalMeta> {
  if (typeof window === "undefined") return {};
  try {
    seedIfNeeded();
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

function persist(ids: Set<string>, meta: Record<string, WithdrawalMeta>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
    localStorage.setItem(META_KEY, JSON.stringify(meta));
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch {
    /* ignore */
  }
}

// ============ 変更操作（admin から呼ぶ） ============
// 退会させる / 復帰させる。退会時は理由を保存
export function setMemberWithdrawn(
  memberId: string,
  withdrawn: boolean,
  reason?: string
) {
  const ids = readIds();
  const meta = readMeta();
  if (withdrawn) {
    ids.add(memberId);
    meta[memberId] = {
      reason: reason ?? "",
      at: new Date().toISOString(),
    };
  } else {
    ids.delete(memberId);
    delete meta[memberId];
  }
  persist(ids, meta);
}

// ============ 購読フック ============
// mounted と ids を同一 state で更新し、初期描画のチラつき・hydration mismatch を防ぐ
function useWithdrawnState(): { mounted: boolean; ids: Set<string> } {
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

// 退会id一覧（シード済み）
export function useWithdrawnIds(): Set<string> {
  return useWithdrawnState().ids;
}

// 単一メンバーの退会判定
// マウント前は mock フラグ（SSR一致）、マウント後は localStorage（シード済み・復帰反映）
export function useIsWithdrawn(memberId: string, mockFlag?: boolean): boolean {
  const { mounted, ids } = useWithdrawnState();
  return mounted ? ids.has(memberId) : mockFlag === true;
}

// 複数メンバーを判定する用途（一覧フィルタ）に解決関数を返す
export function useWithdrawnResolver(): (
  id: string,
  mockFlag?: boolean
) => boolean {
  const { mounted, ids } = useWithdrawnState();
  return (id, mockFlag) => (mounted ? ids.has(id) : mockFlag === true);
}

// 退会メタ情報（理由・退会日）を購読
export function useWithdrawalMeta(): Record<string, WithdrawalMeta> {
  const [meta, setMeta] = useState<Record<string, WithdrawalMeta>>({});
  useEffect(() => {
    const load = () => setMeta(readMeta());
    load();
    window.addEventListener(EVENT_NAME, load);
    return () => window.removeEventListener(EVENT_NAME, load);
  }, []);
  return meta;
}
