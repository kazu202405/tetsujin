// ============================================================
// 運営：誰と誰がマッチしそうか＋設定の埋まり具合
// ============================================================
// マッチングが動くかはコードでなくデータで決まる。
// 「まだ誰も地域を入れていない」ことに運営が気づけないと、
// 機能が壊れていると誤解される。∴ 充足率を必ず一緒に返す。
// ============================================================
import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, requireAdminMember } from "@/lib/supabase/api";

export const dynamic = "force-dynamic";

interface Pair {
  seeker_id: string;
  seeker_name: string;
  candidate_id: string;
  candidate_name: string;
  score: number;
  matched: string[];
}

export async function GET() {
  const guard = await requireAdminMember();
  if (!guard.ok) return guard.response;
  const { supabase } = guard;

  const [pairsRes, statsRes] = await Promise.all([
    supabase.rpc("admin_matching_overview", { p_per_seeker: 3 }),
    supabase.rpc("admin_matching_stats"),
  ]);

  if (pairsRes.error || statsRes.error) {
    const code = pairsRes.error?.code ?? statsRes.error?.code;
    console.error("admin matching failed", { code });
    return NextResponse.json(
      { error: "マッチング状況を取得できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  const stats =
    (statsRes.data as {
      total_members: number;
      with_profile: number;
      with_wants: number;
      with_region: number;
      with_industry: number;
      with_position: number;
    }[] | null)?.[0] ?? null;

  return NextResponse.json(
    { pairs: (pairsRes.data as Pair[] | null) ?? [], stats },
    { headers: NO_STORE_HEADERS },
  );
}
