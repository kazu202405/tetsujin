// ============================================================
// 出会い記録 一覧 / 追加
// ============================================================
// 記録は本人のメモ。相手にも他人にも中身は見せない。
// 「つながっている」事実だけが SNS の公開範囲判定に効く。
// ============================================================
import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, requireMember } from "@/lib/supabase/api";
import { signAvatarPaths } from "@/lib/supabase/storage";

export const dynamic = "force-dynamic";

interface Row {
  id: string;
  person_id: string;
  person_name: string;
  person_job: string | null;
  person_avatar_path: string | null;
  person_is_withdrawn: boolean;
  occasion: string | null;
  met_on: string | null;
  location: string | null;
  note: string | null;
  tags: string[];
  created_at: string;
}

export async function GET() {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;
  const { supabase } = guard;

  const { data, error } = await supabase.rpc("my_connections");
  if (error) {
    console.error("my_connections failed", { code: error.code });
    return NextResponse.json(
      { error: "出会い記録を取得できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  const rows = (data ?? []) as Row[];
  const avatarUrls = await signAvatarPaths(supabase, rows.map((r) => r.person_avatar_path));

  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      occasion: r.occasion ?? "",
      metOn: r.met_on,
      location: r.location ?? "",
      note: r.note ?? "",
      tags: r.tags ?? [],
      createdAt: r.created_at,
      person: {
        id: r.person_id,
        name: r.person_name,
        job: r.person_job ?? "",
        avatarUrl: r.person_avatar_path ? avatarUrls[r.person_avatar_path] ?? null : null,
        isWithdrawn: r.person_is_withdrawn,
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
    personId?: string;
    occasion?: string;
    metOn?: string;
    location?: string;
    note?: string;
    tags?: string[];
  } | null;

  if (!body?.personId) {
    return NextResponse.json(
      { error: "会った相手を選んでください" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }
  if (body.personId === member.id) {
    return NextResponse.json(
      { error: "自分自身は記録できません" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const tags = Array.isArray(body.tags)
    ? body.tags.map((t) => String(t).trim().slice(0, 30)).filter(Boolean).slice(0, 10)
    : [];

  const { data, error } = await supabase
    .from("connections")
    .insert({
      owner_id: member.id,
      person_id: body.personId,
      occasion: body.occasion?.trim() || null,
      met_on: body.metOn?.trim() || null,
      location: body.location?.trim() || null,
      note: body.note?.trim() || null,
      tags,
    })
    .select("id")
    .single();

  if (error) {
    console.error("connection insert failed", { code: error.code });
    return NextResponse.json(
      { error: "記録できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json({ id: data.id }, { headers: NO_STORE_HEADERS });
}
