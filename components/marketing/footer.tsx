import Link from "next/link";
import { Instagram } from "lucide-react";

export function MarketingFooter() {
  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* ブランド */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-[var(--tetsu-pink)] rounded-xl flex items-center justify-center">
                <span className="text-white text-sm font-extrabold">T</span>
              </div>
              <span className="text-lg font-extrabold text-white tracking-tight">
                TETSUJIN会
              </span>
            </div>
            <p className="text-sm leading-relaxed max-w-sm">
              心と心で繋がり信用・信頼を築き、メンバーを大事にし合う事で
              ビジネスが成功できるコミュニティ。
              大阪を中心に約250人が在籍中。
            </p>
          </div>

          {/* リンク */}
          <div>
            <h4 className="text-sm font-bold text-white mb-4">メニュー</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/" className="hover:text-white transition-colors">HOME</Link></li>
              <li><Link href="/about" className="hover:text-white transition-colors">TETSUJIN会とは</Link></li>
              <li><Link href="/activity" className="hover:text-white transition-colors">活動内容</Link></li>
              <li><Link href="/cost" className="hover:text-white transition-colors">料金</Link></li>
              <li><Link href="/blog" className="hover:text-white transition-colors">活動報告</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">入会希望＆お問い合わせ</Link></li>
            </ul>
          </div>

          {/* SNS */}
          <div>
            <h4 className="text-sm font-bold text-white mb-4">つながる</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a
                  href="https://www.instagram.com/tetsujin_com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 hover:text-white transition-colors"
                >
                  <Instagram className="w-4 h-4" />
                  Instagram
                </a>
              </li>
              <li><Link href="/contact" className="hover:text-white transition-colors">お問い合わせ</Link></li>
              <li><Link href="/app/dashboard" className="hover:text-white transition-colors">会員ログイン</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 text-xs text-gray-500">
          <p>&copy; {new Date().getFullYear()} 異業種コミュニティ TETSUJIN会. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
