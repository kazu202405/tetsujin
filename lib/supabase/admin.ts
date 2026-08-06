// ============================================================
// service_role の Supabase クライアント（サーバー専用）
// ============================================================
// 🔴 RLSを完全に迂回する。使ってよいのは
//    「ログインしていない相手のために、サーバーが代わりに動く」場面だけ。
//    現状の用途はプッシュ通知の送信（購読先の読み出しと無効化）のみ。
//
// NEXT_PUBLIC_ を付けない環境変数からしか読まないため、
// ブラウザ側のバンドルに鍵が入ることはない。
// ============================================================
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const isServiceRoleConfigured = Boolean(URL && SERVICE_ROLE_KEY);

export function createAdminClient() {
  if (!isServiceRoleConfigured) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY が設定されていません");
  }
  return createSupabaseClient(URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
