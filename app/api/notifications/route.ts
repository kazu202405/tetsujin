// ============================================================
// 自分宛のお知らせ 一覧 / 既読
// ============================================================
// 生成はDBのトリガ側で行うため、ここでは読み取りと既読だけを扱う。
// ============================================================
import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, requireMember } from "@/lib/supabase/api";

export const dynamic = "force-dynamic";

const LIMIT = 100;

export async function GET() {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;
  const { supabase } = guard;

  // RLS により自分宛だけが返る
  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, message, href, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(LIMIT);

  if (error) {
    console.error("notifications select failed", { code: error.code });
    return NextResponse.json(
      { error: "お知らせを取得できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json(
    (data ?? []).map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message ?? "",
      href: n.href ?? "/app/notifications",
      read: n.read_at !== null,
      createdAt: n.created_at,
    })),
    { headers: NO_STORE_HEADERS },
  );
}

export async function POST(request: Request) {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;
  const { supabase } = guard;

  const body = (await request.json().catch(() => null)) as {
    id?: string;
    all?: boolean;
  } | null;

  if (body?.all) {
    const { error } = await supabase.rpc("mark_all_notifications_read");
    if (error) {
      console.error("mark_all_notifications_read failed", { code: error.code });
      return NextResponse.json(
        { error: "既読にできませんでした" },
        { status: 500, headers: NO_STORE_HEADERS },
      );
    }
    return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
  }

  if (!body?.id) {
    return NextResponse.json(
      { error: "対象が指定されていません" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", body.id);

  if (error) {
    console.error("notification read failed", { code: error.code });
    return NextResponse.json(
      { error: "既読にできませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
}
