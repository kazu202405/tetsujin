// ============================================================
// つながりの設定（自分のこと／探している条件）
// ============================================================
// 🔴 向きが2つある。
//    「自分のこと」＝探される側のデータ。会員同士で見える。
//    「探している条件」＝本人と運営だけ。誰を探しているかは営業の手の内でもある。
//
// 年代・性別は members から返す（ここでは保存しない）。
// 入力口を2つ持つと食い違ったときにどちらが正か分からなくなるため。
// ============================================================
import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, requireMember } from "@/lib/supabase/api";

export const dynamic = "force-dynamic";

/** 保存できるカテゴリ。ここに無いキーは黙って捨てる（列を勝手に増やさせない） */
const PROFILE_KEYS = ["positions", "industries", "regions", "lifestyles", "hobbies", "interests"] as const;
const WANTS_KEYS = [
  "purposes", "positions", "industries", "regions",
  "lifestyles", "hobbies", "interests", "age_ranges", "genders",
] as const;

const REQUIRED_CATEGORIES = [
  "purpose", "position", "industry", "region", "lifestyle", "hobby", "interest", "age_range", "gender",
];

/** 文字列の配列だけを通す。長さも切る（無制限に入れられると表示が壊れる） */
function codes(value: unknown, max = 60): string[] {
  if (!Array.isArray(value)) return [];
  const out = value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter((v) => v.length > 0 && v.length <= 40);
  return Array.from(new Set(out)).slice(0, max);
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t ? t.slice(0, max) : null;
}

export async function GET() {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;
  const { supabase, member } = guard;

  const [optionsRes, profileRes, wantsRes, meRes] = await Promise.all([
    supabase
      .from("matching_options")
      .select("category, code, label, is_sales, sort_order")
      .eq("is_active", true)
      .order("category")
      .order("sort_order"),
    supabase.from("member_matching_profile").select("*").eq("member_id", member.id).maybeSingle(),
    supabase.from("member_matching_wants").select("*").eq("member_id", member.id).maybeSingle(),
    supabase.from("members").select("age_range, gender").eq("id", member.id).maybeSingle(),
  ]);

  if (optionsRes.error) {
    console.error("matching options failed", { code: optionsRes.error.code });
    return NextResponse.json(
      { error: "選択肢を取得できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json(
    {
      options: optionsRes.data ?? [],
      profile: profileRes.data ?? null,
      wants: wantsRes.data ?? null,
      // 年代・性別は会員台帳が正本。画面では読み取り専用で見せる。
      me: { ageRange: meRes.data?.age_range ?? null, gender: meRes.data?.gender ?? null },
    },
    { headers: NO_STORE_HEADERS },
  );
}

export async function PUT(request: Request) {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;
  const { supabase, member } = guard;

  const body = (await request.json().catch(() => null)) as {
    profile?: Record<string, unknown>;
    wants?: Record<string, unknown>;
  } | null;

  if (!body) {
    return NextResponse.json({ error: "内容がありません" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  // --- 自分のこと ---------------------------------------------
  if (body.profile) {
    const patch: Record<string, unknown> = { member_id: member.id };
    for (const key of PROFILE_KEYS) patch[key] = codes(body.profile[key]);
    patch.note = text(body.profile.note, 1000);

    const { error } = await supabase
      .from("member_matching_profile")
      .upsert(patch, { onConflict: "member_id" });

    if (error) {
      console.error("matching profile save failed", { code: error.code });
      return NextResponse.json(
        { error: "自分の設定を保存できませんでした" },
        { status: 500, headers: NO_STORE_HEADERS },
      );
    }
  }

  // --- 探している条件 -----------------------------------------
  if (body.wants) {
    const patch: Record<string, unknown> = { member_id: member.id };
    for (const key of WANTS_KEYS) patch[key] = codes(body.wants[key]);
    patch.note = text(body.wants.note, 1000);
    // 必須指定はカテゴリ名なので、決まった語だけ通す
    patch.required = codes(body.wants.required).filter((c) => REQUIRED_CATEGORIES.includes(c));
    if (typeof body.wants.is_active === "boolean") patch.is_active = body.wants.is_active;

    const { error } = await supabase
      .from("member_matching_wants")
      .upsert(patch, { onConflict: "member_id" });

    if (error) {
      console.error("matching wants save failed", { code: error.code });
      return NextResponse.json(
        { error: "探している条件を保存できませんでした" },
        { status: 500, headers: NO_STORE_HEADERS },
      );
    }
  }

  return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
}
