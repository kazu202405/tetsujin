// ============================================================
// いいね（付ける / 外す）
// ============================================================
// post_likes は (post_id, member_id) の複合主キー。
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
    .from("post_likes")
    .upsert({ post_id: id, member_id: member.id }, { onConflict: "post_id,member_id" });

  if (error) {
    console.error("like insert failed", { code: error.code });
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
    .from("post_likes")
    .delete()
    .eq("post_id", id)
    .eq("member_id", member.id);

  if (error) {
    console.error("like delete failed", { code: error.code });
    return NextResponse.json(
      { error: "いいねを外せませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json({ liked: false }, { headers: NO_STORE_HEADERS });
}
