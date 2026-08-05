// イベントへの参加 / 参加取消
import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, requireMember } from "@/lib/supabase/api";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;
  const { supabase, member } = guard;

  const { id } = await params;

  // 定員がある場合は満席かどうかを見る（参加できないのに登録されるのを防ぐ）
  const { data: event } = await supabase
    .from("events")
    .select("capacity, is_canceled")
    .eq("id", id)
    .maybeSingle();

  if (!event) {
    return NextResponse.json(
      { error: "イベントが見つかりません" },
      { status: 404, headers: NO_STORE_HEADERS },
    );
  }
  if (event.is_canceled) {
    return NextResponse.json(
      { error: "このイベントは中止されています" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  if (event.capacity) {
    const { count } = await supabase
      .from("event_participants")
      .select("member_id", { count: "exact", head: true })
      .eq("event_id", id);

    const { data: already } = await supabase
      .from("event_participants")
      .select("member_id")
      .eq("event_id", id)
      .eq("member_id", member.id)
      .maybeSingle();

    if (!already && (count ?? 0) >= event.capacity) {
      return NextResponse.json(
        { error: "定員に達しています" },
        { status: 409, headers: NO_STORE_HEADERS },
      );
    }
  }

  const { error } = await supabase
    .from("event_participants")
    .upsert({ event_id: id, member_id: member.id }, { onConflict: "event_id,member_id" });

  if (error) {
    console.error("event join failed", { code: error.code });
    return NextResponse.json(
      { error: "参加できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json({ joined: true }, { headers: NO_STORE_HEADERS });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;
  const { supabase, member } = guard;

  const { id } = await params;
  const { error } = await supabase
    .from("event_participants")
    .delete()
    .eq("event_id", id)
    .eq("member_id", member.id);

  if (error) {
    console.error("event leave failed", { code: error.code });
    return NextResponse.json(
      { error: "参加を取り消せませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json({ joined: false }, { headers: NO_STORE_HEADERS });
}
