import { AppSidebar } from "@/components/app/app-sidebar";
import { VisitRecorder } from "@/components/app/visit-recorder";
import { CurrentMemberProvider } from "@/lib/current-member";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient, getCurrentMember } from "@/lib/supabase/server";
import { signAvatarPaths } from "@/lib/supabase/storage";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const member = isSupabaseConfigured ? await getCurrentMember() : null;

  // 自分の顔写真は非公開バケットにあるため、ここで署名URLにして配る。
  // サイドバー・マイページ・設定が同じものを参照する。
  let memberWithAvatar = member;
  if (member?.avatar_path) {
    const supabase = await createClient();
    const signed = await signAvatarPaths(supabase, [member.avatar_path]);
    memberWithAvatar = { ...member, avatar_url: signed[member.avatar_path] ?? null };
  }

  return (
    <CurrentMemberProvider member={memberWithAvatar}>
      <div className="min-h-screen bg-gray-50">
        <VisitRecorder />
        <AppSidebar />
        <main className="lg:pl-64 pt-14 lg:pt-0">{children}</main>
      </div>
    </CurrentMemberProvider>
  );
}
