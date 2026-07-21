// 管理画面は運営(admin)のみ。会員データ全件と運営メモを扱うため必ずサーバー側で弾く。
import { requireAdmin } from "@/lib/supabase/guards";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <>{children}</>;
}
