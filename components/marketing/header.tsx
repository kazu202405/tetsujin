"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown } from "lucide-react";

const navLinks = [
  { href: "/about", label: "TETSUJIN会とは" },
  {
    label: "活動",
    children: [
      { href: "/activity", label: "活動内容" },
      { href: "/cost", label: "料金" },
    ],
  },
  { href: "/blog", label: "活動報告" },
  { href: "/contact", label: "入会希望＆お問い合わせ" },
];

export function MarketingHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* ロゴ */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[var(--tetsu-pink)] rounded-xl flex items-center justify-center">
              <span className="text-white text-sm font-extrabold">T</span>
            </div>
            <span className="text-lg font-extrabold tracking-tight text-gray-900">
              TETSUJIN会
            </span>
          </Link>

          {/* デスクトップナビ */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) =>
              "children" in link && link.children ? (
                <div
                  key={link.label}
                  className="relative"
                  onMouseEnter={() => setDropdownOpen(true)}
                  onMouseLeave={() => setDropdownOpen(false)}
                >
                  <button
                    className={`inline-flex items-center gap-1 text-sm font-medium transition-colors ${
                      link.children.some((c) => c.href === pathname)
                        ? "text-[var(--tetsu-pink)] font-bold"
                        : "text-gray-600 hover:text-[var(--tetsu-pink)]"
                    }`}
                  >
                    {link.label}
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2">
                      <div className="bg-white rounded-xl shadow-lg border border-gray-100 py-2 min-w-[140px]">
                        {link.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`block px-5 py-2.5 text-sm transition-colors ${
                              pathname === child.href
                                ? "text-[var(--tetsu-pink)] font-bold bg-[var(--tetsu-pink-pale)]"
                                : "text-gray-600 hover:text-[var(--tetsu-pink)] hover:bg-[var(--tetsu-pink-pale)]"
                            }`}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={link.href}
                  href={link.href!}
                  className={`text-sm transition-colors font-medium ${
                    pathname === link.href
                      ? "text-[var(--tetsu-pink)] font-bold"
                      : "text-gray-600 hover:text-[var(--tetsu-pink)]"
                  }`}
                >
                  {link.label}
                </Link>
              )
            )}
          </nav>

          {/* ログインボタン */}
          <div className="flex items-center gap-3">
            <Link
              href="/app/dashboard"
              className="hidden sm:inline-flex items-center px-5 py-2 text-sm font-bold text-white bg-[var(--tetsu-pink)] rounded-full hover:bg-[var(--tetsu-pink-light)] transition-colors shadow-sm"
            >
              ログイン
            </Link>

            {/* モバイルメニューボタン */}
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
          <nav className="max-w-6xl mx-auto px-4 py-4 space-y-1">
            {navLinks.map((link) =>
              "children" in link && link.children ? (
                <div key={link.label}>
                  <button
                    onClick={() => setMobileDropdownOpen(!mobileDropdownOpen)}
                    className="w-full flex items-center justify-between text-sm text-gray-600 font-medium py-2"
                  >
                    {link.label}
                    <ChevronDown className={`w-4 h-4 transition-transform ${mobileDropdownOpen ? "rotate-180" : ""}`} />
                  </button>
                  {mobileDropdownOpen && (
                    <div className="pl-4 space-y-1">
                      {link.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setIsOpen(false)}
                          className={`block text-sm font-medium py-2 ${
                            pathname === child.href
                              ? "text-[var(--tetsu-pink)] font-bold"
                              : "text-gray-500 hover:text-[var(--tetsu-pink)]"
                          }`}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={link.href}
                  href={link.href!}
                  onClick={() => setIsOpen(false)}
                  className={`block text-sm font-medium py-2 ${
                    pathname === link.href
                      ? "text-[var(--tetsu-pink)] font-bold"
                      : "text-gray-600 hover:text-[var(--tetsu-pink)]"
                  }`}
                >
                  {link.label}
                </Link>
              )
            )}
            <Link
              href="/app/dashboard"
              onClick={() => setIsOpen(false)}
              className="block text-center px-5 py-2.5 text-sm font-bold text-white bg-[var(--tetsu-pink)] rounded-full hover:bg-[var(--tetsu-pink-light)] transition-colors mt-3"
            >
              ログイン
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
