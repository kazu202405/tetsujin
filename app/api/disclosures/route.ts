// ============================================================
// SNS開示申請 一覧 / 申請
// ============================================================
// 申請できるのは「つながり済みのみ」公開のリンクだけ（DB側のポリシーでも担保）。
// 申請が入ると相手に通知が飛ぶ（DBトリガ）。
// ============================================================
import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, requireMember } from "@/lib/supabase/api";
import { signAvatarPaths } from "@/lib/supabase/storage";

export const dynamic = "force-dynamic";

interface Row {
  id: string;
  direction: "incoming" | "outgoing";
  status: "pending" | "approved" | "declined";
  platform: string;
  link_label: string | null;
  other_id: string;
  other_name: string;
  other_job: string | null;
  other_avatar: string | null;
  created_at: string;
  responded_at: string | null;
}

export async function GET() {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;
  const { supabase } = guard;

  const { data, error } = await supabase.rpc("my_disclosure_requests");
  if (error) {
    console.error("my_disclosure_requests failed", { code: error.code });
    return NextResponse.json(
      { error: "申請を取得できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  const rows = (data ?? []) as Row[];
  const avatarUrls = await signAvatarPaths(supabase, rows.map((r) => r.other_avatar));

  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      direction: r.direction,
      status: r.status,
      platform: r.platform,
      linkLabel: r.link_label,
      createdAt: r.created_at,
      respondedAt: r.responded_at,
      other: {
        id: r.other_id,
        name: r.other_name,
        job: r.other_job ?? "",
        avatarUrl: r.other_avatar ? avatarUrls[r.other_avatar] ?? null : null,
      },
    })),
    { headers: NO_STORE_HEADERS },
  );
}

export async function POST(request: Request) {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;
  const { supabase, member } = guard;

  const body = (await request.json().catch(() => null)) as {
    linkId?: string;
    toMemberId?: string;
  } | null;

  if (!body?.linkId || !body.toMemberId) {
    return NextResponse.json(
      { error: "申請の対象が指定されていません" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  // 却下されたあとの再申請は、古い行を消してから作り直す（UNIQUE制約のため）
  await supabase
    .from("disclosure_requests")
    .delete()
    .eq("from_member_id", member.id)
    .eq("link_id", body.linkId)
    .eq("status", "declined");

  const { error } = await supabase.from("disclosure_requests").insert({
    from_member_id: member.id,
    to_member_id: body.toMemberId,
    link_id: body.linkId,
    status: "pending",
  });

  if (error) {
    // 23505 = すでに申請済み
    const message =
      error.code === "23505" ? "すでに申請しています" : "申請できませんでした";
    console.error("disclosure insert failed", { code: error.code });
    return NextResponse.json({ error: message }, { status: 400, headers: NO_STORE_HEADERS });
  }

  return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
}
