// つながり申請は「出会い」の中のタブに移した。
// 以前のURLを知っている人が迷子にならないよう、ここは転送だけ残す。
import { redirect } from "next/navigation";

export default function RequestsRedirect() {
  redirect("/app/connections/requests");
}
