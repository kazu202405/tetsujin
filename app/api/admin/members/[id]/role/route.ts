import { NextResponse } from "next/server";
import { createClient, getCurrentMember } from "@/lib/supabase/server";

const ALLOWED_ROLES = new Set(["admin", "manager", "user"]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const headers = { "Cache-Control": "private, no-store, max-age=0" };
  const currentMember = await getCurrentMember();
  if (!currentMember) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401, headers });
  }
  if (currentMember.role !== "admin" || currentMember.is_withdrawn) {
    return NextResponse.json({ error: "運営権限が必要です" }, { status: 403, headers });
  }

  const body = (await request.json().catch(() => null)) as { role?: string } | null;
  if (!body?.role || !ALLOWED_ROLES.has(body.role)) {
    return NextResponse.json({ error: "ロールが不正です" }, { status: 400, headers });
  }

  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_member_role", {
    p_member_id: id,
    p_role: body.role,
  });

  if (error) {
    const message = error.code === "23514"
      ? "最後の運営アカウントは降格できません"
      : "ロールを変更できませんでした";
    return NextResponse.json({ error: message }, { status: 400, headers });
  }

  return NextResponse.json(Array.isArray(data) ? data[0] : data, { headers });
}
