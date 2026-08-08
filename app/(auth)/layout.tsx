// ============================================================
// ログイン・入会申込まわりの外枠
// ============================================================
// これまでこの5画面は紹介サイト（LP）の中に同居していて、
// LPのヘッダー・フッター（会について／費用／ブログ…）が一緒に出ていた。
//
// このリポジトリは会員アプリだけを持つことになったため、
// ロゴだけの静かな外枠に置き換える。
// ============================================================
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="h-16 flex items-center px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[var(--tetsu-pink)] rounded-xl flex items-center justify-center">
            <span className="text-white text-sm font-extrabold">T</span>
          </div>
          <span className="text-lg font-extrabold tracking-tight text-gray-900">
            TETSUJIN会
          </span>
        </Link>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="py-6 text-center text-[11px] text-gray-400">
        © TETSUJIN会
      </footer>
    </div>
  );
}
