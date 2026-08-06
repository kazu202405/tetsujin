// 出会い記録の自由タグ（会員ごと）。まだ使っていないタグも残せるようにする。
import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, requireMember } from "@/lib/supabase/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;
  const { supabase, member } = guard;

  const { data, error } = await supabase
    .from("connection_tags")
    .select("tag")
    .eq("member_id", member.id)
    .order("tag", { ascending: true });

  if (error) {
    console.error("connection_tags select failed", { code: error.code });
    return NextResponse.json({ error: "タグを取得できませんでした" }, { status: 500, headers: NO_STORE_HEADERS });
  }

  return NextResponse.json((data ?? []).map((r) => r.tag), { headers: NO_STORE_HEADERS });
}

export async function POST(request: Request) {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;
  const { supabase, member } = guard;

  const body = (await request.json().catch(() => null)) as { tag?: string } | null;
  const tag = body?.tag?.trim();
  if (!tag || tag.length > 30) {
    return NextResponse.json({ error: "タグ名が不正です" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const { error } = await supabase
    .from("connection_tags")
    .upsert({ member_id: member.id, tag }, { onConflict: "member_id,tag" });

  if (error) {
    console.error("connection_tags insert failed", { code: error.code });
    return NextResponse.json({ error: "タグを追加できませんでした" }, { status: 500, headers: NO_STORE_HEADERS });
  }

  return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
}

export async function DELETE(request: Request) {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;
  const { supabase, member } = guard;

  const tag = new URL(request.url).searchParams.get("tag");
  if (!tag) {
    return NextResponse.json({ error: "タグが指定されていません" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const { error } = await supabase
    .from("connection_tags")
    .delete()
    .eq("member_id", member.id)
    .eq("tag", tag);

  if (error) {
    console.error("connection_tags delete failed", { code: error.code });
    return NextResponse.json({ error: "タグを削除できませんでした" }, { status: 500, headers: NO_STORE_HEADERS });
  }

  return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
}
