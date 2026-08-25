import { AppSidebar } from "@/components/app/app-sidebar";
import { BottomTabs } from "@/components/app/bottom-tabs";
import { NotAMember } from "@/components/app/not-a-member";
import { VisitRecorder } from "@/components/app/visit-recorder";
import { CurrentMemberProvider } from "@/lib/current-member";
import { isMockMode } from "@/lib/supabase/config";
import { createClient, getCurrentMember } from "@/lib/supabase/server";
import { signAvatarPaths } from "@/lib/supabase/storage";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const member = isMockMode ? null : await getCurrentMember();

  // 🔴 ログイン済みだが会員行が無い人をここで止める。
  //    DB側（RLS・SECURITY DEFINER関数）は既にすべて弾いているので
  //    データが漏れることはないが、素通りさせると中身が空の画面が並び
  //    「壊れている」ようにしか見えない。∴ 理由と問い合わせ先を出す。
  if (!isMockMode && !member) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 未ログインは middleware が /login へ送るので、ここに来るのは
    // 「認証は通っているが会員ではない」人だけ。
    if (user) {
      return (
        <div className="min-h-screen bg-gray-50">
          <NotAMember email={user.email} />
        </div>
      );
    }
  }

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
        {/* スマホは下タブ。その分だけ本文の下に余白を足す */}
        <main className="lg:pl-64 pt-14 lg:pt-0 pb-16 lg:pb-0">{children}</main>
        <BottomTabs />
      </div>
    </CurrentMemberProvider>
  );
}
