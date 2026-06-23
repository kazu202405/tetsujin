import type { MetadataRoute } from "next";

// PWA マニフェスト。/manifest.webmanifest として自動配信される。
// 「ホーム画面に追加」でアプリのように起動でき、iOS の Web Push 要件を満たす。
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TETSUJIN会",
    short_name: "TETSUJIN会",
    description: "異業種コミュニティ TETSUJIN会のメンバーアプリ",
    start_url: "/app/mypage",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#e62566",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
