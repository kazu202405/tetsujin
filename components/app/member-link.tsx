"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { useIsWithdrawn } from "@/lib/withdrawal-data";

// 退会者ならクリック不可の span に切り替えるリンクラッパー
// 通常メンバー → /app/profile/{id} へ Link
// 退会者 → onClick 無効、見た目グレー
export function MemberLink({
  memberId,
  mockWithdrawn,
  className,
  children,
}: {
  memberId: string;
  mockWithdrawn?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const withdrawn = useIsWithdrawn(memberId, mockWithdrawn);

  if (withdrawn) {
    return (
      <span
        className={`${className ?? ""} cursor-not-allowed opacity-60`}
        title="退会済みメンバー"
      >
        {children}
      </span>
    );
  }

  return (
    <Link href={`/app/profile/${memberId}`} className={className}>
      {children}
    </Link>
  );
}

// 退会者の名前表示用：通常名 → 「名前（退会）」
export function MemberNameWithStatus({
  memberId,
  name,
  mockWithdrawn,
}: {
  memberId: string;
  name: string;
  mockWithdrawn?: boolean;
}) {
  const withdrawn = useIsWithdrawn(memberId, mockWithdrawn);
  if (withdrawn) {
    return (
      <>
        {name}
        <span className="ml-1 text-[10px] text-gray-400 font-normal">
          （退会）
        </span>
      </>
    );
  }
  return <>{name}</>;
}
