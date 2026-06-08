// 会員のロール（権限ラベル）管理（mock）
// - 今は「付与＋表示」まで（種別＝肩書きバッジ）。実際の権限ゲートは権限定義が固まってから後乗せ。
// - localStorage 永続化＋windowイベント同期（他のmock機能と同作法）
"use client";

import { useEffect, useState } from "react";

export type MemberRole =
  | "マスター"
  | "運営"
  | "アンバサダー"
  | "部長"
  | "ユーザー";

// 表示順（権限の強い順）とバッジの色
export const ROLE_LIST: MemberRole[] = [
  "マスター",
  "運営",
  "アンバサダー",
  "部長",
  "ユーザー",
];

export const ROLE_META: Record<
  MemberRole,
  { label: string; badgeClass: string; showBadge: boolean }
> = {
  マスター: {
    label: "マスター",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    showBadge: true,
  },
  運営: {
    label: "運営",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    showBadge: true,
  },
  アンバサダー: {
    label: "アンバサダー",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    showBadge: true,
  },
  部長: {
    label: "部長",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    showBadge: true,
  },
  // 一般会員はバッジを出さない（ノイズ防止）
  ユーザー: {
    label: "ユーザー",
    badgeClass: "bg-gray-100 text-gray-500 border-gray-200",
    showBadge: false,
  },
};

const STORAGE_KEY = "tetsujin-member-roles";
const EVENT_NAME = "tetsujin-member-roles-update";

// デモ用シード（id 1-10。田中=マスター、他に運営/アンバサダー/部長を散らす）
const SEED_ROLES: Record<string, MemberRole> = {
  "1": "マスター", // 田中 一郎（現在ユーザー＝オーナー）
  "4": "アンバサダー", // 鈴木 健二
  "5": "運営", // 中村 明子
  "10": "部長", // 本田 浩二
};

function readRoles(): Record<string, MemberRole> {
  if (typeof window === "undefined") return SEED_ROLES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_ROLES));
      return SEED_ROLES;
    }
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? obj : SEED_ROLES;
  } catch {
    return SEED_ROLES;
  }
}

export function getMemberRole(
  roles: Record<string, MemberRole>,
  memberId: string
): MemberRole {
  return roles[memberId] ?? "ユーザー";
}

// ロールを設定（ユーザーに戻すときはキー削除＝既定）
export function setMemberRole(memberId: string, role: MemberRole) {
  const roles = readRoles();
  if (role === "ユーザー") delete roles[memberId];
  else roles[memberId] = role;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(roles));
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch {
    /* ignore */
  }
}

// 全ロールを購読
export function useMemberRoles(): Record<string, MemberRole> {
  const [roles, setRoles] = useState<Record<string, MemberRole>>({});
  useEffect(() => {
    const load = () => setRoles(readRoles());
    load();
    window.addEventListener(EVENT_NAME, load);
    return () => window.removeEventListener(EVENT_NAME, load);
  }, []);
  return roles;
}

// 単一メンバーのロールを購読（SSR安全：マウント前は既定ユーザー）
export function useMemberRole(memberId: string): MemberRole {
  const roles = useMemberRoles();
  return roles[memberId] ?? "ユーザー";
}
