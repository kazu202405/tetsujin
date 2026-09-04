"use client";

// ============================================================
// スマホの下タブ（ネイティブアプリと同じ形）
// ============================================================
// ホーム画面に追加して使ってもらう前提のため（iPhoneは通知にPWA導入が必須）、
// 開いた瞬間に主要な画面へ1タップで届く形にする。
// これまではハンバーガー → 開く → 選ぶ の3手が毎回かかっていた。
//
// 出すのは5つまで。これ以上並べるとアイコンが潰れて押し間違える。
// 落とした項目（お知らせ・紹介ツリー・設定・管理画面）は
// 上のベルとハンバーガーから従来どおり辿れる。
// ============================================================

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarSearch, Handshake, MessageCircle, User, Users } from "lucide-react";
import { useBoardUnread } from "@/lib/board-api";
import { usePendingIncomingCount } from "@/lib/connection-requests-api";

const TABS: {
  href: string;
  label: string;
  icon: typeof User;
  /** 選択中かどうかを見るときの前方一致。省略時は href。 */
  activePrefix?: string;
}[] = [
  { href: "/app/board", label: "掲示板", icon: MessageCircle },
  { href: "/app/post", label: "会を探す", icon: CalendarSearch },
  { href: "/app/members", label: "メンバー", icon: Users },
  // 申請に着地させる。記録タブを開いてもタブは光ったままにしたいので、
  // 行き先（href）と選択判定（activePrefix）を別々に持つ。
  {
    href: "/app/connections/requests",
    label: "出会い",
    icon: Handshake,
    activePrefix: "/app/connections",
  },
  { href: "/app/mypage", label: "マイページ", icon: User },
];

export function BottomTabs() {
  const pathname = usePathname();
  const boardUnread = useBoardUnread();
  // つながり申請は「出会い」の中に入れたので、バッジもそこへ出す。
  // 相手を待たせる操作なので、埋もれさせない。
  const requestsPending = usePendingIncomingCount();

  const keyOf = (tab: (typeof TABS)[number]) => tab.activePrefix ?? tab.href;
  const badgeFor = (tab: (typeof TABS)[number]) =>
    keyOf(tab) === "/app/board"
      ? boardUnread
      : keyOf(tab) === "/app/connections"
      ? requestsPending
      : 0;

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-lg border-t border-gray-100"
      // ホーム画面から起動したiPhoneは画面下端にホームバーがあるため、その分を空ける
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex">
        {TABS.map((tab) => {
          const isActive = pathname.startsWith(keyOf(tab));
          const badge = badgeFor(tab);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-colors ${
                isActive ? "text-[var(--tetsu-pink)]" : "text-gray-400"
              }`}
            >
              <span className="relative">
                <Icon className="w-6 h-6" strokeWidth={isActive ? 2.4 : 1.8} />
                {badge > 0 && (
                  <span className="absolute -top-1 -right-2 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-[var(--tetsu-pink)] text-white text-[10px] font-bold leading-none">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </span>
              <span className={`text-[10px] ${isActive ? "font-bold" : "font-medium"}`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
