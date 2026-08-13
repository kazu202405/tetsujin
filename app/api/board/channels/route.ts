// ============================================================
// 掲示板チャンネル 一覧 / 作成
// ============================================================
// これまでチャンネルは会員ごとの localStorage にあり、人によって見える
// チャンネルが違う状態だった。運営が管理する1つの正本に変更している。
// ============================================================
import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, requireAdminMember, requireMember } from "@/lib/supabase/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;
  const { supabase } = guard;

  const [channelsResult, countsResult] = await Promise.all([
    supabase
      .from("board_channels")
      .select("id, slug, name, icon_key, color, sort_order")
      .eq("is_archived", false)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase.rpc("board_channel_counts"),
  ]);

  if (channelsResult.error) {
    console.error("board_channels query failed", { code: channelsResult.error.code });
    return NextResponse.json(
      { error: "チャンネルを取得できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  const counts = new Map<string, { post: number; unread: number }>();
  for (const row of (countsResult.data ?? []) as {
    channel_id: string;
    post_count: number;
    unread_count: number;
  }[]) {
    counts.set(row.channel_id, {
      post: Number(row.post_count),
      unread: Number(row.unread_count ?? 0),
    });
  }

  const channels = (channelsResult.data ?? []).map((c) => ({
    ...c,
    post_count: counts.get(c.id)?.post ?? 0,
    unread_count: counts.get(c.id)?.unread ?? 0,
  }));

  return NextResponse.json(channels, { headers: NO_STORE_HEADERS });
}

export async function POST(request: Request) {
  const guard = await requireAdminMember();
  if (!guard.ok) return guard.response;
  const { supabase } = guard;

  const body = (await request.json().catch(() => null)) as {
    name?: string;
    icon_key?: string;
    color?: string;
  } | null;

  const name = body?.name?.trim();
  if (!name) {
    return NextResponse.json(
      { error: "チャンネル名を入力してください" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }
  if (name.length > 40) {
    return NextResponse.json(
      { error: "チャンネル名が長すぎます" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  // slug は表示名と独立させる（名前を変えてもURL的な同一性を保つため）
  const slug = `ch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

  // 末尾に並ぶよう、既存の最大 sort_order + 10 を採番する
  const { data: last } = await supabase
    .from("board_channels")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("board_channels")
    .insert({
      slug,
      name,
      icon_key: body?.icon_key || "Star",
      color: body?.color || "blue",
      sort_order: (last?.sort_order ?? 0) + 10,
    })
    .select("id, slug, name, icon_key, color, sort_order")
    .single();

  if (error) {
    console.error("board_channels insert failed", { code: error.code });
    return NextResponse.json(
      { error: "チャンネルを追加できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json({ ...data, post_count: 0, unread_count: 0 }, { headers: NO_STORE_HEADERS });
}
