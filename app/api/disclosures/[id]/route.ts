// 開示申請への応答（承認/却下＝求められた本人）と取り下げ（＝申請者本人）
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
    action?: "approve" | "decline";
  } | null;

  if (body?.action !== "approve" && body?.action !== "decline") {
    return NextResponse.json(
      { error: "操作が不正です" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const { id } = await params;
  // RLS により、求められた本人以外はこの更新が通らない
  const { data, error } = await supabase
    .from("disclosure_requests")
    .update({
      status: body.action === "approve" ? "approved" : "declined",
      responded_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("disclosure update failed", { code: error.code });
    return NextResponse.json(
      { error: "更新できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
  if (!data) {
    return NextResponse.json(
      { error: "対象の申請が見つかりません" },
      { status: 404, headers: NO_STORE_HEADERS },
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
  // RLS により、申請者本人の pending だけが削除できる
  const { error } = await guard.supabase.from("disclosure_requests").delete().eq("id", id);

  if (error) {
    console.error("disclosure delete failed", { code: error.code });
    return NextResponse.json(
      { error: "取り下げできませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
}
