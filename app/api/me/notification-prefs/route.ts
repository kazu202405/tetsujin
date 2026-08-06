// ============================================================
// 通知の受け取り設定 取得 / 保存
// ============================================================
// 設定行がまだ無い会員は既定（週次ダイジェスト以外オン）として返す。
// ============================================================
import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, requireMember } from "@/lib/supabase/api";

export const dynamic = "force-dynamic";

const DEFAULTS = { board: true, events: true, connections: true, weekly_digest: false };

export async function GET() {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;
  const { supabase, member } = guard;

  const { data, error } = await supabase
    .from("member_notification_prefs")
    .select("board, events, connections, weekly_digest")
    .eq("member_id", member.id)
    .maybeSingle();

  if (error) {
    console.error("notification prefs select failed", { code: error.code });
    return NextResponse.json(
      { error: "通知設定を取得できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json(data ?? DEFAULTS, { headers: NO_STORE_HEADERS });
}

export async function PUT(request: Request) {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;
  const { supabase, member } = guard;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json(
      { error: "リクエストが不正です" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const bool = (key: keyof typeof DEFAULTS) =>
    typeof body[key] === "boolean" ? (body[key] as boolean) : DEFAULTS[key];

  const { error } = await supabase.from("member_notification_prefs").upsert(
    {
      member_id: member.id,
      board: bool("board"),
      events: bool("events"),
      connections: bool("connections"),
      weekly_digest: bool("weekly_digest"),
    },
    { onConflict: "member_id" },
  );

  if (error) {
    console.error("notification prefs upsert failed", { code: error.code });
    return NextResponse.json(
      { error: "保存できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
}
