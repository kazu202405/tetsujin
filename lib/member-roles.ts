// 会員のロール（DBの members.role が正）と、その表示・判定をまとめた場所。
//
// DBの値        画面の呼び方   できること
//   owner        管理者        運営の全権限 ＋ 会員のロール変更
//   admin        運営          運営業務すべて（ロールだけは触れない）
//   manager      部長          肩書き（特権なし）
//   user         ユーザー      一般会員
//
// ロール変更は管理画面から set_member_role() 経由で行う。
//
// 【重要】権限の判定は必ずここの isAdminRole / isOwnerRole を通すこと。
// 画面のあちこちで role === "admin" と直接比較すると、
// ロールを足したときに「管理者なのに入れない」場所が必ず取り残される。

export type MemberRoleCode = "owner" | "admin" | "manager" | "user";

/** 運営以上か（管理者を含む）。管理画面や運営操作の出し分けはこれで判定する。 */
export function isAdminRole(role: string | null | undefined): boolean {
  return role === "owner" || role === "admin";
}

/** 管理者（全権限）か。ロール変更を許すのはこの人だけ。 */
export function isOwnerRole(role: string | null | undefined): boolean {
  return role === "owner";
}

export type MemberRole = "管理者" | "運営" | "部長" | "ユーザー";

/** DBのロール値を画面の呼び方に変換する。 */
export function roleLabelOf(role: string | null | undefined): MemberRole {
  if (role === "owner") return "管理者";
  if (role === "admin") return "運営";
  if (role === "manager") return "部長";
  return "ユーザー";
}

export const ROLE_META: Record<
  MemberRole,
  { label: string; badgeClass: string; showBadge: boolean }
> = {
  管理者: {
    label: "管理者",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    showBadge: true,
  },
  運営: {
    label: "運営",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
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
