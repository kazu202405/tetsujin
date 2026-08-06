// おすすめの削除（投稿者本人か運営。RLSでも担保している）
import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, requireMember } from "@/lib/supabase/api";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const { error } = await guard.supabase.from("recommendations").delete().eq("id", id);

  if (error) {
    console.error("recommendation delete failed", { code: error.code });
    return NextResponse.json(
      { error: "削除できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
}
