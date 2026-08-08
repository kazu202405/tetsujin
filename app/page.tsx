// このリポジトリは会員アプリだけを持つ（紹介サイトは別に用意される）。
// ∴ トップに来た人はそのままアプリへ送る。
// 未ログインなら middleware が /login へ回す。
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/app/board");
}
