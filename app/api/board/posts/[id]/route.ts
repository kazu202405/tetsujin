// ============================================================
// 投稿の編集 / 削除
// ============================================================
// 判定はDB側の関数に置いてある（編集は本人だけ、削除は本人か運営）。
// ここは形を整えて、返ってきた理由をそのまま画面に見せるだけ。
// ============================================================
import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, requireMember } from "@/lib/supabase/api";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { content?: string } | null;
  if (!body?.content) {
    return NextResponse.json(
      { error: "本文を入力してください" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const { error } = await guard.supabase.rpc("edit_post", {
    p_id: id,
    p_content: body.content,
  });
  if (error) {
    return NextResponse.json(
      { error: error.message || "編集できませんでした" },
      { status: 400, headers: NO_STORE_HEADERS },
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
  const { error } = await guard.supabase.rpc("delete_post", { p_id: id });
  if (error) {
    return NextResponse.json(
      { error: error.message || "削除できませんでした" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }
  return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
}
