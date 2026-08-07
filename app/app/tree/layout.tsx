// 紹介ツリーは運営のみ。
// 画面のリンクを消しただけではURLを直接開けてしまうので、ここでも止める。
import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function TreeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (isSupabaseConfigured) {
    const member = await getCurrentMember();
    if (!member || member.role !== "admin" || member.is_withdrawn) {
      redirect("/app/mypage");
    }
  }
  return <>{children}</>;
}
