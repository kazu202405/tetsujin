"use client";

// ============================================================
// 「出会い」の見出しとサブタブ
// ============================================================
// 記録・申請はどちらも「つながり」の話なのに、サイドバーで
// 別々の項目として離れて並んでいた。下タブは5つまでなので、
// この機会に1つにまとめる。
//
// 別ページ（別URL）のままタブに見せている。同じ画面の中で
// 出し分けると、申請の通知から直接開けなくなるため。
// ============================================================

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePendingIncomingCount } from "@/lib/connection-requests-api";

// 申請を先頭に置く（依頼主判断 2026-09-04）。
// 相手を待たせるのは申請の側だけで、記録は自分のペースで見ればよい。
// ナビの「出会い」も申請に着地させている＝並びと行き先を一致させる。
const SUB_TABS = [
  { href: "/app/connections/requests", label: "申請" },
  { href: "/app/connections", label: "記録" },
];

export function ConnectionsHeader({
  description,
  action,
}: {
  description: string;
  action?: React.ReactNode;
}) {
  const pathname = usePathname();
  const pending = usePendingIncomingCount();

  return (
    <div className="sticky top-14 lg:top-0 z-30 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900">出会い</h1>
            <p className="text-sm text-gray-500 mt-0.5">{description}</p>
          </div>
          {action}
        </div>

        <div className="flex gap-1 mt-3 -mb-px">
          {SUB_TABS.map((tab) => {
            // 「記録」は完全一致で見る。前方一致だと申請を開いても両方光る。
            const isActive =
              tab.href === "/app/connections"
                ? pathname === "/app/connections"
                : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
                  isActive
                    ? "border-[var(--tetsu-pink)] text-gray-900 font-bold"
                    : "border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300"
                }`}
              >
                {tab.label}
                {tab.href === "/app/connections/requests" && pending > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--tetsu-pink)] text-white text-[10px] font-bold leading-none">
                    {pending > 9 ? "9+" : pending}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
