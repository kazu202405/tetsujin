"use client";

// ============================================================
// 連絡先がまだ無い人への案内（マイページ）
// ============================================================
// 🔴 これは飾りの催促ではない。SNSリンクが1件も無いと、
//    つながり申請を受けても承認画面が「教えられるものがありません」になり、
//    マッチングで見つけてもらっても、その先に進む手段が無い。
//
// 閉じるボタンは付けない。1件でも登録すれば自動的に消えるので、
// 「閉じたまま登録されない」状態が残らない＝催促が自然に終わる。
// はじめてガイド（×で閉じられる）だけに頼ると、閉じた人には二度と出ない。
// ============================================================

import Link from "next/link";
import { Link2, ChevronRight } from "lucide-react";
import { useCachedResource } from "@/lib/client-cache";

interface Row {
  id: string;
}

// 取れていないうちは出さない（一瞬出て消えるのが一番うるさい）
const UNKNOWN: Row[] | null = null;

export function SocialLinkNudge() {
  const { data, status } = useCachedResource<Row[] | null>(
    "my-social-links",
    "/api/me/social-links",
    UNKNOWN,
  );

  if (status !== "loaded" || data === null || data.length > 0) return null;

  return (
    <Link href="/app/mypage/profile-sheet#sns" className="block mb-6 group">
      <div className="bg-white rounded-2xl border border-[var(--tetsu-pink)]/30 shadow-sm p-5 flex items-center gap-4 hover:border-[var(--tetsu-pink)]/60 transition-colors">
        <span className="w-10 h-10 rounded-xl bg-[var(--tetsu-pink-pale)] text-[var(--tetsu-pink)] flex items-center justify-center flex-shrink-0">
          <Link2 className="w-5 h-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-gray-900">
            連絡先（LINEなど）を登録しておきませんか
          </span>
          <span className="block text-[11px] text-gray-500 mt-0.5 leading-relaxed">
            登録しておくと、つながり申請を受けたときに「どれを教えるか」を選べます。
            誰に見せるかは、そのつど自分で決められます。
          </span>
        </span>
        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[var(--tetsu-pink)] flex-shrink-0" />
      </div>
    </Link>
  );
}
