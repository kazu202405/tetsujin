// 出会い記録の編集 / 削除（本人のみ。RLSでも担保している）
import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, requireMember } from "@/lib/supabase/api";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;
  const { supabase } = guard;

  const body = (await request.json().catch(() => null)) as {
    occasion?: string;
    metOn?: string;
    location?: string;
    note?: string;
    tags?: string[];
  } | null;
  if (!body) {
    return NextResponse.json(
      { error: "リクエストが不正です" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const patch: Record<string, unknown> = {};
  if (body.occasion !== undefined) patch.occasion = body.occasion.trim() || null;
  if (body.metOn !== undefined) patch.met_on = body.metOn.trim() || null;
  if (body.location !== undefined) patch.location = body.location.trim() || null;
  if (body.note !== undefined) patch.note = body.note.trim() || null;
  if (body.tags !== undefined) {
    patch.tags = body.tags.map((t) => String(t).trim().slice(0, 30)).filter(Boolean).slice(0, 10);
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: "更新する項目がありません" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const { id } = await params;
  const { error } = await supabase.from("connections").update(patch).eq("id", id);

  if (error) {
    console.error("connection update failed", { code: error.code });
    return NextResponse.json(
      { error: "更新できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const { error } = await guard.supabase.from("connections").delete().eq("id", id);

  if (error) {
    console.error("connection delete failed", { code: error.code });
    return NextResponse.json(
      { error: "削除できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
}
