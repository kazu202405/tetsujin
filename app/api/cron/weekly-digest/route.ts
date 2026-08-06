// ============================================================
// 週次ダイジェストの配信（定期実行）
// ============================================================
// Vercel Cron から週1回呼ばれる。
// 受け取る設定にしている会員にだけ、直近の動きをまとめて1件送る。
//
// 🔴 誰でも叩けると好きなタイミングで全員に通知を投げられてしまうため、
//    Vercel Cron が付ける Authorization ヘッダ（CRON_SECRET）を検証する。
//    未設定の環境では動作させない。
// ============================================================
import { NextResponse } from "next/server";
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "no-store" };
const CRON_SECRET = process.env.CRON_SECRET ?? "";

export async function GET(request: Request) {
  if (!CRON_SECRET) {
    return NextResponse.json(
      { error: "CRON_SECRET が未設定です" },
      { status: 503, headers: HEADERS },
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "認証できません" }, { status: 401, headers: HEADERS });
  }
  if (!isServiceRoleConfigured) {
    return NextResponse.json(
      { error: "サーバー側のSupabase設定が不足しています" },
      { status: 503, headers: HEADERS },
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("send_weekly_digest");

  if (error) {
    console.error("send_weekly_digest failed", { code: error.code });
    return NextResponse.json(
      { error: "ダイジェストを送信できませんでした" },
      { status: 500, headers: HEADERS },
    );
  }

  return NextResponse.json({ sent: Number(data ?? 0) }, { headers: HEADERS });
}
