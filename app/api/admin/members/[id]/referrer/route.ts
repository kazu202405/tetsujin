// ============================================================
// 紹介者の紐づけ（運営のみ）
// ============================================================
// 台帳の referrer は「紹介してくれた人の名前」のテキストで会員と繋がっていない。
// 名前から機械的に特定できないため、運営がここで会員を選んで紐づける。
// 紐づいた分だけが管理画面の「紹介数」に数えられる。
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
    referrerMemberId?: string | null;
  } | null;

  const { id } = await params;

  const { error } = await supabase.rpc("set_referrer_link", {
    p_member_id: id,
    p_referrer_id: body?.referrerMemberId ?? null,
  });

  if (error) {
    const message =
      error.code === "23514" ? "自分自身を紹介者にはできません" : "紹介者を更新できませんでした";
    console.error("set_referrer_link failed", { code: error.code });
    return NextResponse.json({ error: message }, { status: 400, headers: NO_STORE_HEADERS });
  }

  return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
}
