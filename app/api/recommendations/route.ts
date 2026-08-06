// おすすめのお店 一覧 / 投稿
import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, requireMember } from "@/lib/supabase/api";
import { signAvatarPaths } from "@/lib/supabase/storage";

export const dynamic = "force-dynamic";

interface Row {
  id: string;
  restaurant_name: string;
  area: string | null;
  genre: string | null;
  story: string | null;
  tags: string[];
  created_at: string;
  member_id: string;
  member_name: string;
  member_job: string | null;
  member_avatar_path: string | null;
  member_is_withdrawn: boolean;
  is_mine: boolean;
}

export async function GET() {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;
  const { supabase } = guard;

  const { data, error } = await supabase.rpc("recommendation_list");
  if (error) {
    console.error("recommendation_list failed", { code: error.code });
    return NextResponse.json(
      { error: "おすすめを取得できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  const rows = (data ?? []) as Row[];
  const avatarUrls = await signAvatarPaths(supabase, rows.map((r) => r.member_avatar_path));

  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      restaurantName: r.restaurant_name,
      area: r.area ?? "",
      genre: r.genre ?? "",
      story: r.story ?? "",
      tags: r.tags ?? [],
      createdAt: r.created_at,
      isMine: r.is_mine,
      member: {
        id: r.member_id,
        name: r.member_name,
        job: r.member_job ?? "",
        avatarUrl: r.member_avatar_path ? avatarUrls[r.member_avatar_path] ?? null : null,
        isWithdrawn: r.member_is_withdrawn,
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
    restaurantName?: string;
    area?: string;
    genre?: string;
    story?: string;
    tags?: string[];
  } | null;

  const restaurantName = body?.restaurantName?.trim();
  if (!restaurantName) {
    return NextResponse.json(
      { error: "お店の名前を入力してください" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const tags = Array.isArray(body?.tags)
    ? body.tags.map((t) => String(t).trim().slice(0, 30)).filter(Boolean).slice(0, 8)
    : [];

  const { error } = await supabase.from("recommendations").insert({
    member_id: member.id,
    restaurant_name: restaurantName.slice(0, 120),
    area: body?.area?.trim() || null,
    genre: body?.genre?.trim() || null,
    story: body?.story?.trim() || null,
    tags,
  });

  if (error) {
    console.error("recommendation insert failed", { code: error.code });
    return NextResponse.json(
      { error: "投稿できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
}
