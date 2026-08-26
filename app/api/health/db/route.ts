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
//
// 🔴 このエンドポイントは未認証で公開されている（監視サービスから叩くため）。
//    ∴ 応答に中身を載せないこと。
//    2026-08-26 のリリース前監査まで、会員数と生の例外メッセージを
//    誰にでも返していた（本番で `{"ok":true,"table":"members","count":629}` が取れた）。
//    会員数は依頼主が対外的に扱いを気にしている数字であり、
//    例外メッセージには接続先やドライバの詳細が混じる。
//    ∴ 外へ出すのは ok と ms だけ。原因はサーバーログにだけ残す。
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
    // どの環境変数が欠けているかも外には出さない（構成の手がかりになる）
    console.error("health/db misconfigured", { hasUrl: Boolean(url), hasKey: Boolean(key) });
    return Response.json(
      { ok: false },
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
      console.error("health/db upstream failed", { status: res.status });
      return Response.json({ ok: false }, { status: 503, headers: NO_STORE });
    }

    // 件数はキープアライブが実際にDBへ届いた確認に使うだけで、応答には載せない。
    const count = Number(res.headers.get("content-range")?.split("/")[1] ?? 0);
    if (count === 0) {
      console.warn("health/db returned zero rows", { table: "members" });
    }

    return Response.json(
      { ok: true, ms: Date.now() - startedAt },
      { status: 200, headers: NO_STORE },
    );
  } catch (e) {
    // 例外の中身は外に出さない（接続先やドライバの詳細が混じるため）
    console.error("health/db failed", e instanceof Error ? e.message : e);
    return Response.json({ ok: false }, { status: 503, headers: NO_STORE });
  }
}
