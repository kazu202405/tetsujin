// シリーズのフォロー / 解除。フォロー中のシリーズに新しい会ができたら通知が届く。
import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, requireMember } from "@/lib/supabase/api";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;
  const { supabase, member } = guard;

  const body = (await request.json().catch(() => null)) as { seriesName?: string } | null;
  const seriesName = body?.seriesName?.trim();
  if (!seriesName) {
    return NextResponse.json(
      { error: "シリーズが指定されていません" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const { error } = await supabase
    .from("event_series_follows")
    .upsert({ member_id: member.id, series_name: seriesName }, { onConflict: "member_id,series_name" });

  if (error) {
    console.error("series follow failed", { code: error.code });
    return NextResponse.json(
      { error: "フォローできませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json({ following: true }, { headers: NO_STORE_HEADERS });
}

export async function DELETE(request: Request) {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;
  const { supabase, member } = guard;

  const seriesName = new URL(request.url).searchParams.get("seriesName");
  if (!seriesName) {
    return NextResponse.json(
      { error: "シリーズが指定されていません" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const { error } = await supabase
    .from("event_series_follows")
    .delete()
    .eq("member_id", member.id)
    .eq("series_name", seriesName);

  if (error) {
    console.error("series unfollow failed", { code: error.code });
    return NextResponse.json(
      { error: "解除できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json({ following: false }, { headers: NO_STORE_HEADERS });
}
