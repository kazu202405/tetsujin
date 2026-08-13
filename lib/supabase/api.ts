// ============================================================
// APIルート共通の入口チェック
// ============================================================
// 掲示板のように「ログイン中の在籍会員だけが触れる」APIが増えたため、
// 未設定／未ログイン／退会者の判定を1か所にまとめる。
// ============================================================
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "./config";
import { createClient, getCurrentMember } from "./server";
import type { CurrentMember } from "@/lib/current-member";
import { isAdminRole } from "@/lib/member-roles";

export const NO_STORE_HEADERS = { "Cache-Control": "private, no-store, max-age=0" };

type Guarded =
  | { ok: true; supabase: SupabaseClient; member: CurrentMember }
  | { ok: false; response: NextResponse };

/** ログイン中の在籍会員であることを確認する。 */
export async function requireMember(): Promise<Guarded> {
  if (!isSupabaseConfigured) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Supabase未設定" },
        { status: 503, headers: NO_STORE_HEADERS },
      ),
    };
  }

  const member = await getCurrentMember();
  if (!member) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "認証が必要です" },
        { status: 401, headers: NO_STORE_HEADERS },
      ),
    };
  }
  if (member.is_withdrawn) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "退会済みのアカウントです" },
        { status: 403, headers: NO_STORE_HEADERS },
      ),
    };
  }

  return { ok: true, supabase: await createClient(), member };
}

/** さらに運営以上（管理者を含む）であることまで確認する。 */
export async function requireAdminMember(): Promise<Guarded> {
  const guard = await requireMember();
  if (!guard.ok) return guard;

  if (!isAdminRole(guard.member.role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "運営権限が必要です" },
        { status: 403, headers: NO_STORE_HEADERS },
      ),
    };
  }
  return guard;
}
