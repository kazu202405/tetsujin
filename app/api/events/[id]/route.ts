// イベントの編集 / 削除（主催者・副管理者・運営。RLSでも担保している）
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
    title?: string;
    seriesName?: string | null;
    date?: string;
    time?: string;
    location?: string;
    description?: string;
    capacity?: number | null;
    requiresApproval?: boolean;
    isCanceled?: boolean;
  } | null;
  if (!body) {
    return NextResponse.json(
      { error: "リクエストが不正です" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const patch: Record<string, unknown> = {};
  if (body.title !== undefined) {
    const title = body.title.trim();
    if (!title) {
      return NextResponse.json(
        { error: "タイトルを入力してください" },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }
    patch.title = title.slice(0, 120);
  }
  if (body.seriesName !== undefined) patch.series_name = body.seriesName?.trim() || null;
  if (body.date !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
      return NextResponse.json(
        { error: "開催日の形式が正しくありません" },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }
    patch.event_date = body.date;
  }
  if (body.time !== undefined) patch.start_time = body.time.trim() || null;
  if (body.location !== undefined) patch.location = body.location.trim() || null;
  if (body.description !== undefined) patch.description = body.description.trim() || null;
  if (body.capacity !== undefined) {
    patch.capacity =
      typeof body.capacity === "number" && body.capacity > 0 ? Math.floor(body.capacity) : null;
  }
  if (body.requiresApproval !== undefined) patch.requires_approval = body.requiresApproval;
  if (body.isCanceled !== undefined) patch.is_canceled = body.isCanceled;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: "更新する項目がありません" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const { id } = await params;
  const { data, error } = await supabase
    .from("events")
    .update(patch)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("event update failed", { code: error.code });
    return NextResponse.json(
      { error: "更新できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
  if (!data) {
    return NextResponse.json(
      { error: "このイベントを編集する権限がありません" },
      { status: 403, headers: NO_STORE_HEADERS },
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
  // RLS により、主催者か運営だけが削除できる
  const { error } = await guard.supabase.from("events").delete().eq("id", id);

  if (error) {
    console.error("event delete failed", { code: error.code });
    return NextResponse.json(
      { error: "削除できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
}
