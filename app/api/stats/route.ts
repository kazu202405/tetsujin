// サイドバーに出すコミュニティの実数（固定値をやめる）
import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, requireMember } from "@/lib/supabase/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;

  const { data, error } = await guard.supabase.rpc("community_stats");
  if (error) {
    console.error("community_stats failed", { code: error.code });
    return NextResponse.json(
      { error: "統計を取得できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  const row = (Array.isArray(data) ? data[0] : data) as
    | { member_count: number; events_this_month: number; posts_this_month: number }
    | undefined;

  return NextResponse.json(
    {
      memberCount: Number(row?.member_count ?? 0),
      eventsThisMonth: Number(row?.events_this_month ?? 0),
      postsThisMonth: Number(row?.posts_this_month ?? 0),
    },
    { headers: NO_STORE_HEADERS },
  );
}
