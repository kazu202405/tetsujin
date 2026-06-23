import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Serif_JP } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSerifJP = Noto_Serif_JP({
  variable: "--font-noto-serif-jp",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "TETSUJIN会 | 異業種コミュニティ",
  description:
    "誠実と信頼を基盤に人脈を広げるコミュニティ。月10回以上の交流会、24時間オンライン連携で、ビジネスの可能性を広げます。",
  manifest: "/manifest.webmanifest",
  // iOS で「ホーム画面に追加」した時にアプリのように起動＋通知を有効化するための設定
  appleWebApp: {
    capable: true,
    title: "TETSUJIN会",
    statusBarStyle: "default",
  },
  // iOS Safari はレガシーの apple- 接頭辞メタしか見ないため明示追加（standalone起動の確実性向上）
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#e62566",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoSerifJP.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
