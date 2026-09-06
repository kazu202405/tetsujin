// ============================================================
// コメントのいいね（付ける / 外す）
// ============================================================
// 投稿のいいね（posts/[id]/like）と同じ作り。
// comment_likes は (comment_id, member_id) の複合主キーなので、
// 連打しても二重に入らないよう upsert で受ける。
// ============================================================
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
  const { error } = await supabase
    .from("comment_likes")
    .upsert({ comment_id: id, member_id: member.id }, { onConflict: "comment_id,member_id" });

  if (error) {
    console.error("comment like insert failed", { code: error.code });
    return NextResponse.json(
      { error: "いいねできませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json({ liked: true }, { headers: NO_STORE_HEADERS });
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
    .from("comment_likes")
    .delete()
    .eq("comment_id", id)
    .eq("member_id", member.id);

  if (error) {
    console.error("comment like delete failed", { code: error.code });
    return NextResponse.json(
      { error: "いいねを外せませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json({ liked: false }, { headers: NO_STORE_HEADERS });
}
