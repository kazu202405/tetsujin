// ============================================================
// 参加者の承認 / 却下 / 役割変更 / 削除（管理できる人のみ）
// ============================================================
// 「管理できる人」＝主催者・副管理者・運営（DBの is_event_manager が判定）。
// ============================================================
import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, requireMember } from "@/lib/supabase/api";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;
  const { supabase } = guard;

  const body = (await request.json().catch(() => null)) as {
    action?: "approve" | "decline";
    role?: "admin" | "member";
  } | null;

  const { id, memberId } = await params;

  if (body?.action === "approve" || body?.action === "decline") {
    // RLS により、管理できる人以外はこの更新が通らない
    const { data, error } = await supabase
      .from("event_participants")
      .update({ status: body.action === "approve" ? "approved" : "declined" })
      .eq("event_id", id)
      .eq("member_id", memberId)
      .select("member_id")
      .maybeSingle();

    if (error) {
      console.error("participant status update failed", { code: error.code });
      return NextResponse.json(
        { error: "更新できませんでした" },
        { status: 500, headers: NO_STORE_HEADERS },
      );
    }
    if (!data) {
      return NextResponse.json(
        { error: "権限がないか、対象が見つかりません" },
        { status: 403, headers: NO_STORE_HEADERS },
      );
    }
    return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
  }

  if (body?.role === "admin" || body?.role === "member") {
    const { error } = await supabase.rpc("set_event_participant_role", {
      p_event_id: id,
      p_member_id: memberId,
      p_role: body.role,
    });

    if (error) {
      const message =
        error.code === "42501"
          ? "このイベントを管理する権限がありません"
          : error.code === "23514"
            ? "主催者の役割は変更できません（委譲してください）"
            : "役割を変更できませんでした";
      console.error("set_event_participant_role failed", { code: error.code });
      return NextResponse.json({ error: message }, { status: 400, headers: NO_STORE_HEADERS });
    }
    return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
  }

  return NextResponse.json(
    { error: "操作が不正です" },
    { status: 400, headers: NO_STORE_HEADERS },
  );
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;

  const { id, memberId } = await params;
  // RLS により、本人か管理できる人だけが削除できる
  const { error } = await guard.supabase
    .from("event_participants")
    .delete()
    .eq("event_id", id)
    .eq("member_id", memberId);

  if (error) {
    console.error("participant delete failed", { code: error.code });
    return NextResponse.json(
      { error: "削除できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
}
