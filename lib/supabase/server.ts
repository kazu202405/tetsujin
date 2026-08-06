// ============================================================
// サーバー側の Supabase クライアント
// ============================================================
// Server Component / Route Handler から使う。
// セッションはCookieに保持されるため、@supabase/ssr にCookieの読み書きを渡す。
// ============================================================
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";
import type { CurrentMember } from "@/lib/current-member";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Component からは Cookie を書けない。
          // セッション更新は middleware 側が行うためここでは無視してよい。
        }
      },
    },
  });
}

/**
 * ログイン中の会員行を取得する。
 * 未ログイン、または members に紐づく行がなければ null。
 */
export async function getCurrentMember() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // RLS により「自分の行」だけが返る
  const { data } = await supabase
    .from("members")
    .select(
      "id, member_no, name, nickname, email, job, grip, membership_type, role, is_withdrawn, avatar_path, price, start_year, start_month, renewal_status",
    )
    .eq("auth_user_id", user.id)
    .maybeSingle();

  return (data as CurrentMember | null) ?? null;
}
