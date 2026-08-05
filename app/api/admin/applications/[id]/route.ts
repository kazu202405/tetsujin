// ============================================================
// 入会申請の承認 / 却下（運営のみ）
// ============================================================
// 承認は approve_application() に任せる。
// 同じメールの会員がすでに台帳にいれば新規作成せずその人に紐づけるため、
// 二重登録が起きない（「アプリが会員管理のマスター」方針の維持）。
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
  const { supabase, member } = guard;

  const body = (await request.json().catch(() => null)) as {
    action?: "approve" | "reject" | "reopen";
    reviewNote?: string;
  } | null;

  const { id } = await params;

  if (body?.action === "approve") {
    const { data, error } = await supabase.rpc("approve_application", {
      p_application_id: id,
    });

    if (error) {
      const message =
        error.code === "23505"
          ? "この申請はすでに承認済みです"
          : "承認できませんでした";
      console.error("approve_application failed", { code: error.code });
      return NextResponse.json({ error: message }, { status: 400, headers: NO_STORE_HEADERS });
    }

    return NextResponse.json(
      { ok: true, memberId: data as string },
      { headers: NO_STORE_HEADERS },
    );
  }

  if (body?.action === "reject" || body?.action === "reopen") {
    const patch =
      body.action === "reject"
        ? {
            status: "rejected",
            reviewed_by: member.id,
            reviewed_at: new Date().toISOString(),
            review_note: body.reviewNote?.trim() || null,
          }
        : { status: "pending", reviewed_by: null, reviewed_at: null, review_note: null };

    const { error } = await supabase.from("applications").update(patch).eq("id", id);
    if (error) {
      console.error("application update failed", { code: error.code });
      return NextResponse.json(
        { error: "更新できませんでした" },
        { status: 500, headers: NO_STORE_HEADERS },
      );
    }
    return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
  }

  return NextResponse.json(
    { error: "操作が不正です" },
    { status: 400, headers: NO_STORE_HEADERS },
  );
}
