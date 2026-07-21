// 会員DB(生データ)画面も運営(admin)のみ。連絡先を含む全件を扱うため管理画面と同じ扱いにする。
import { requireAdmin } from "@/lib/supabase/guards";

export default async function MembersAdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <>{children}</>;
}
