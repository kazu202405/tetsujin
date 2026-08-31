// ============================================================
// 掲示板チャンネル 編集 / 削除（運営のみ）
// ============================================================
// 削除は投稿ごと消えるため、投稿があるチャンネルは既定で消させない。
// 使わなくなったチャンネルは is_archived で一覧から外す運用にする。
// ============================================================
import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, requireAdminMember } from "@/lib/supabase/api";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminMember();
  if (!guard.ok) return guard.response;
  const { supabase } = guard;

  const body = (await request.json().catch(() => null)) as {
    name?: string;
    icon_key?: string;
    color?: string;
    is_archived?: boolean;
    sort_order?: number;
  } | null;
  if (!body) {
    return NextResponse.json(
      { error: "リクエストが不正です" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name || name.length > 40) {
      return NextResponse.json(
        { error: "チャンネル名が不正です" },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }
    patch.name = name;
  }
  if (body.icon_key !== undefined) patch.icon_key = body.icon_key;
  if (body.color !== undefined) patch.color = body.color;
  if (body.is_archived !== undefined) patch.is_archived = body.is_archived;
  // 並び順。小さいほど上。10刻みで入っているので、入れ替えは値の交換で行う。
  if (body.sort_order !== undefined) {
    if (!Number.isFinite(body.sort_order)) {
      return NextResponse.json(
        { error: "並び順が不正です" },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }
    patch.sort_order = Math.trunc(body.sort_order);
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: "更新する項目がありません" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const { id } = await params;
  const { data, error } = await supabase
    .from("board_channels")
    .update(patch)
    .eq("id", id)
    .select("id, slug, name, icon_key, color, sort_order")
    .maybeSingle();

  if (error) {
    console.error("board_channels update failed", { code: error.code });
    return NextResponse.json(
      { error: "チャンネルを更新できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
  if (!data) {
    return NextResponse.json(
      { error: "チャンネルが見つかりません" },
      { status: 404, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json(data, { headers: NO_STORE_HEADERS });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminMember();
  if (!guard.ok) return guard.response;
  const { supabase } = guard;

  const { id } = await params;

  // 投稿が残っているチャンネルの削除は事故につながるため止める。
  const { count, error: countError } = await supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("channel_id", id);

  if (countError) {
    console.error("posts count failed", { code: countError.code });
    return NextResponse.json(
      { error: "チャンネルを削除できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      {
        error: `投稿が${count}件あるため削除できません。使わない場合は「非表示にする」を選んでください。`,
      },
      { status: 409, headers: NO_STORE_HEADERS },
    );
  }

  const { error } = await supabase.from("board_channels").delete().eq("id", id);
  if (error) {
    console.error("board_channels delete failed", { code: error.code });
    return NextResponse.json(
      { error: "チャンネルを削除できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
}
