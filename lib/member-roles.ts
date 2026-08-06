// 会員のロール表示（バッジの見た目とラベル）
// 実際のロールは members.role（admin / manager / user）が正で、
// 変更は管理画面の会員管理タブから set_member_role() 経由で行う。
// ここにあるのは画面表示のための対応表だけ。

export type MemberRole = "運営" | "部長" | "ユーザー";

export const ROLE_META: Record<
  MemberRole,
  { label: string; badgeClass: string; showBadge: boolean }
> = {
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
