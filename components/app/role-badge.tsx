"use client";

import { MemberRole, ROLE_META } from "@/lib/member-roles";

// 会員のロールを示すバッジ。ユーザー（一般会員）は既定で非表示。
export function RoleBadge({
  role,
  className = "",
}: {
  role: MemberRole;
  className?: string;
}) {
  const meta = ROLE_META[role];
  if (!meta.showBadge) return null;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${meta.badgeClass} ${className}`}
    >
      {meta.label}
    </span>
  );
}
