// ============================================================
// Supabase 接続設定の共通判定
// ============================================================
// このアプリは「Supabase未接続でもmockとして動く」状態を維持する。
// 依頼主の実機レビューが接続前でも止まらないようにするため、
// 環境変数が揃っていない間は認証ガードを一切かけない（mockモード）。
//
// ∴ 接続前 = 従来どおり誰でも /app を閲覧できるデモ
//    接続後 = ログイン必須の本番挙動
// に自動で切り替わる。
// ============================================================

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Supabase の接続情報が揃っているか（＝本番の認証を有効にしてよいか） */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
