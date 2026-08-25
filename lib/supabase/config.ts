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

// ============================================================
// 🔴 mock モードは本番ビルドでは絶対に有効にしない
// ============================================================
// 2026-08-25 リリース前監査で見つけた問題:
//   isSupabaseConfigured が false になると、認証ガードが26箇所すべて素通しになる。
//   middleware は /app を守らなくなり、ログイン画面は何を入れても通り、
//   requireAdmin() は null を返して管理画面が開く。
//
//   ∴ Vercel の Production に環境変数を入れ忘れる、変数名を打ち間違える、
//     Preview 側にだけ設定する——のどれが起きても、
//     アプリは「壊れる」のではなく「全開になる」。画面に手がかりも出ない。
//
// 対策として、mock モードの判定に NODE_ENV を必ず噛ませる。
// 本番で接続情報が無い場合は mock に落ちず、そのまま失敗する（fail-closed）。
export const isMockMode =
  !isSupabaseConfigured && process.env.NODE_ENV !== "production";

/** 本番なのに接続情報が無い＝設定ミス。素通しではなく閉じる必要がある状態 */
export const isMisconfigured =
  !isSupabaseConfigured && process.env.NODE_ENV === "production";
