// ============================================================
// DB死活監視 兼 Supabase無料枠のキープアライブ
// ============================================================
// GET /api/health/db
//
// 目的が2つある:
//   1. 死活監視 … DBまで到達できるかを確認する
//   2. キープアライブ … Supabase無料枠は「7日間DBアクティビティなし」で
//      プロジェクトが自動一時停止される。UptimeRobot等でここを定期的に叩き、
//      実際にクエリを発生させて停止を防ぐ。
//
// 🔴 200を返すだけのhealthエンドポイントでは意味がない。
//    DBに触らないアクセスはアクティビティとして数えられず、一時停止を防げないため、
//    このルートは必ず members への実クエリを1本投げる。
//    （stockアプリで無料枠が停止した際に得た教訓）
//
// members は RLS 全拒否のため service_role キーで問い合わせる。
// 返すのは件数のみで会員データは一切返さない。
// ============================================================

// 常に実行時評価する（ビルド時に静的化されるとキープアライブにならない）
export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
} as const;

export async function GET() {
  const startedAt = Date.now();

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return Response.json(
      { ok: false, error: "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が未設定です" },
      { status: 503, headers: NO_STORE },
    );
  }

  try {
    // HEAD + count=exact … 行データを転送せずに件数だけ取得する（＝軽いが確実にDBへ届く）
    const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/members?select=id`, {
      method: "HEAD",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: "count=exact",
        Range: "0-0",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return Response.json(
        { ok: false, error: `Supabase応答エラー (${res.status})` },
        { status: 503, headers: NO_STORE },
      );
    }

    const count = Number(res.headers.get("content-range")?.split("/")[1] ?? 0);

    return Response.json(
      { ok: true, table: "members", count, ms: Date.now() - startedAt },
      { status: 200, headers: NO_STORE },
    );
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "DBへの接続に失敗しました" },
      { status: 503, headers: NO_STORE },
    );
  }
}
