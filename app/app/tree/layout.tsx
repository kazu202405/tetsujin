// 紹介ツリーは運営のみ。
// 画面のリンクを消しただけではURLを直接開けてしまうので、ここでも止める。
import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isAdminRole } from "@/lib/member-roles";

export default async function TreeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (isSupabaseConfigured) {
    const member = await getCurrentMember();
    if (!member || !isAdminRole(member.role) || member.is_withdrawn) {
      redirect("/app/mypage");
    }
  }
  return <>{children}</>;
}
