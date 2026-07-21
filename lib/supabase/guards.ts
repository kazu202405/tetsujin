// ============================================================
// 画面のアクセス制御（サーバー側）
// ============================================================
// middleware は「ログインしているか」までしか見ない。
// 「運営かどうか」は members.role の参照が必要なため、こちらで判定する。
//
// 🔴 Supabase未接続のあいだは素通しする（mockモード）。
//    依頼主の実機レビューを止めないため。接続した瞬間から本番の制限がかかる。
// ============================================================
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "./config";
import { getCurrentMember } from "./server";

/**
 * 運営(admin)以外を締め出す。運営ならその会員行を返す。
 * 管理画面のレイアウトから呼ぶ。
 */
export async function requireAdmin() {
  if (!isSupabaseConfigured) return null;

  const member = await getCurrentMember();

  // 未ログインは middleware が /login へ送るが、念のためここでも守る
  if (!member) redirect("/login?next=/app/admin");

  // 退会者・一般会員・部長は管理画面に入れない
  if (member.role !== "admin" || member.is_withdrawn) redirect("/app/mypage");

  return member;
}
