// ============================================================
// Stripe 接続
// ============================================================
// Supabase と同じ作法で「鍵が無い間は決済を止める」。
// 鍵が揃うまで画面には「準備中」を出し、APIは 503 を返す。
// 中途半端に動いて実際の請求が飛ぶ方が危ないため。
//
// 🔴 このファイルはサーバー専用。クライアントから import しない
//    （STRIPE_SECRET_KEY が混ざる）。
// ============================================================
import Stripe from "stripe";

const SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? "";

export const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";

/** 決済を有効にしてよいか（鍵が揃っているか） */
export const isStripeConfigured = Boolean(SECRET_KEY);

/** 本番の鍵かどうか。テスト鍵なら画面に「テスト」と出して取り違えを防ぐ。 */
export const isStripeLive = SECRET_KEY.startsWith("sk_live_");

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (!SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY が未設定です");
  }
  if (!client) {
    client = new Stripe(SECRET_KEY, {
      // 会員1人につき数回しか呼ばないので、失敗したら諦めず少し粘る
      maxNetworkRetries: 2,
      timeout: 20000,
    });
  }
  return client;
}

/** アプリの公開URL（Checkoutの戻り先に使う） */
export function appUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000");
  return url.replace(/\/+$/, "");
}
