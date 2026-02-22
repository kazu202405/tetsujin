"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const navLinks = [
  { href: "#about", label: "TETSUJIN会とは" },
  { href: "#features", label: "できること" },
  { href: "#voices", label: "メンバーの声" },
  { href: "#join", label: "入会について" },
];

export function MarketingHeader() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* ロゴ */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[var(--tetsu-black)] rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">T</span>
            </div>
            <span className="text-lg font-bold tracking-tight text-gray-900">
              TETSUJIN会
            </span>
          </Link>

          {/* デスクトップナビ */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors font-medium"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* ログインボタン */}
          <div className="flex items-center gap-3">
            <Link
              href="/app/dashboard"
              className="hidden sm:inline-flex items-center px-5 py-2 text-sm font-semibold text-white bg-[var(--tetsu-black)] rounded-full hover:bg-gray-800 transition-colors"
            >
              ログイン
            </Link>

            {/* モバイルメニュー */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-gray-900"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* モバイルメニュー展開 */}
      {isOpen && (
        <div className="md:hidden bg-white border-b border-gray-100 shadow-lg">
          <nav className="max-w-6xl mx-auto px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="block text-sm text-gray-600 hover:text-gray-900 font-medium py-2"
              >
                {link.label}
              </a>
            ))}
            <Link
              href="/app/dashboard"
              onClick={() => setIsOpen(false)}
              className="block text-center px-5 py-2.5 text-sm font-semibold text-white bg-[var(--tetsu-black)] rounded-full hover:bg-gray-800 transition-colors"
            >
              ログイン
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
