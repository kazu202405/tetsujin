// ============================================================
// ブラウザ側の Supabase クライアント
// ============================================================
// ログイン／サインアップ／ログアウトなど、クライアントコンポーネントから使う。
// publishable(anon) キーを使うため、読める範囲は RLS ポリシーで決まる。
// ============================================================
"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
