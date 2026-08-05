import { AppSidebar } from "@/components/app/app-sidebar";
import { CurrentMemberProvider } from "@/lib/current-member";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentMember } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const member = isSupabaseConfigured ? await getCurrentMember() : null;

  return (
    <CurrentMemberProvider member={member}>
      <div className="min-h-screen bg-gray-50">
        <AppSidebar />
        <main className="lg:pl-64 pt-14 lg:pt-0">{children}</main>
      </div>
    </CurrentMemberProvider>
  );
}
