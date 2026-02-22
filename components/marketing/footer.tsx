import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="bg-[var(--tetsu-black)] text-gray-400">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* ブランド */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">T</span>
              </div>
              <span className="text-lg font-bold text-white tracking-tight">
                TETSUJIN会
              </span>
            </div>
            <p className="text-sm leading-relaxed max-w-sm">
              誠実と信頼を基盤に、異業種の経営者がつながるコミュニティ。
              月10回以上のオフライン交流会と24時間オンライン連携で、
              あなたのビジネスの可能性を広げます。
            </p>
          </div>

          {/* リンク */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">メニュー</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="#about" className="hover:text-white transition-colors">
                  TETSUJIN会とは
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-white transition-colors">
                  できること
                </a>
              </li>
              <li>
                <a href="#voices" className="hover:text-white transition-colors">
                  メンバーの声
                </a>
              </li>
              <li>
                <a href="#join" className="hover:text-white transition-colors">
                  入会について
                </a>
              </li>
            </ul>
          </div>

          {/* SNS・お問い合わせ */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">つながる</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Instagram
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  お問い合わせ
                </a>
              </li>
              <li>
                <Link
                  href="/app/dashboard"
                  className="hover:text-white transition-colors"
                >
                  会員ログイン
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 text-xs text-gray-500">
          <p>&copy; 2026 TETSUJIN会. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
