// ============================================================
// 運営向け：誰と誰がつながっているか（ペアと回数）
// ============================================================
// 🔴 出会い記録のメモ本文は返さない。記録は「本人のメモであり相手にも
//    他人にも見せない」設計のため、運営にもペアと回数までしか出さない。
// ============================================================
import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, requireAdminMember } from "@/lib/supabase/api";
import { signAvatarPaths } from "@/lib/supabase/storage";

export const dynamic = "force-dynamic";

interface Row {
  member_a_id: string;
  member_a_name: string;
  member_a_avatar: string | null;
  member_b_id: string;
  member_b_name: string;
  member_b_avatar: string | null;
  meeting_count: number;
  last_met_on: string | null;
}

export async function GET() {
  const guard = await requireAdminMember();
  if (!guard.ok) return guard.response;
  const { supabase } = guard;

  const { data, error } = await supabase.rpc("member_meeting_pairs");
  if (error) {
    console.error("member_meeting_pairs failed", { code: error.code });
    return NextResponse.json(
      { error: "つながりを取得できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  const rows = (data ?? []) as Row[];
  const avatarUrls = await signAvatarPaths(
    supabase,
    rows.flatMap((r) => [r.member_a_avatar, r.member_b_avatar]),
  );

  return NextResponse.json(
    rows.map((r) => ({
      count: Number(r.meeting_count),
      lastMetOn: r.last_met_on,
      a: {
        id: r.member_a_id,
        name: r.member_a_name,
        avatarUrl: r.member_a_avatar ? avatarUrls[r.member_a_avatar] ?? null : null,
      },
      b: {
        id: r.member_b_id,
        name: r.member_b_name,
        avatarUrl: r.member_b_avatar ? avatarUrls[r.member_b_avatar] ?? null : null,
      },
    })),
    { headers: NO_STORE_HEADERS },
  );
}
