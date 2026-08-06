// 主催者の委譲（今の主催者か運営のみ。副管理者には許さない）
import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, requireMember } from "@/lib/supabase/api";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;

  const body = (await request.json().catch(() => null)) as { newOwnerId?: string } | null;
  if (!body?.newOwnerId) {
    return NextResponse.json(
      { error: "新しい主催者を選んでください" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const { id } = await params;
  const { error } = await guard.supabase.rpc("transfer_event_ownership", {
    p_event_id: id,
    p_new_owner: body.newOwnerId,
  });

  if (error) {
    const message =
      error.code === "42501"
        ? "主催者だけが委譲できます"
        : error.code === "23514"
          ? "参加者の中から選んでください"
          : "委譲できませんでした";
    console.error("transfer_event_ownership failed", { code: error.code });
    return NextResponse.json({ error: message }, { status: 400, headers: NO_STORE_HEADERS });
  }

  return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
}
