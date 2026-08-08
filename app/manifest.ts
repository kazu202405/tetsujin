import type { MetadataRoute } from "next";

// PWA マニフェスト。/manifest.webmanifest として自動配信される。
// 「ホーム画面に追加」でアプリのように起動でき、iOS の Web Push 要件を満たす。
//
// 🔴 scope は必ず "/" にする。
//    省略すると start_url の階層（/app/）がスコープになり、
//    ログインが切れた人がアイコンを開いたときに /login へ飛んだ時点で
//    「アプリの外」と判定され、iOS が Safari で開いてしまう。
//    Safari で開かれると通知の仕組みが使えず、
//    「この端末は通知に対応していません」と出る。
//    ログイン画面もアプリの一部なので、スコープに含める。
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "TETSUJIN会",
    short_name: "TETSUJIN会",
    description: "異業種コミュニティ TETSUJIN会のメンバーアプリ",
    // ログイン状態に応じて掲示板かログイン画面へ振り分ける
    start_url: "/",
    scope: "/",
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
