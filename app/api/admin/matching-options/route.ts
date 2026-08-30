// ============================================================
// 運営：つながりの選択肢を足す・直す・消す
// ============================================================
// 🔴 判定と守りはすべてDB側の関数に置いてある。
//    ここは形を整えて、返ってきた理由をそのまま会員（運営）に見せるだけ。
//    「使われているから消せない」はDBで数えて判断する＝
//    画面で数えて0だったから消す、では数えた後の選択を取りこぼす。
// ============================================================
import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, requireAdminMember } from "@/lib/supabase/api";

export const dynamic = "force-dynamic";

interface Row {
  category: string;
  code: string;
  label: string;
  is_sales: boolean;
  sort_order: number;
  is_active: boolean;
  used_count: number;
}

export async function GET() {
  const guard = await requireAdminMember();
  if (!guard.ok) return guard.response;

  const { data, error } = await guard.supabase.rpc("admin_matching_options");
  if (error) {
    console.error("admin_matching_options failed", { code: error.code });
    return NextResponse.json(
      { error: "選択肢を取得できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json(
    {
      options: ((data ?? []) as Row[]).map((r) => ({
        category: r.category,
        code: r.code,
        label: r.label,
        isSales: r.is_sales,
        sortOrder: r.sort_order,
        isActive: r.is_active,
        usedCount: r.used_count,
      })),
    },
    { headers: NO_STORE_HEADERS },
  );
}

/** 追加・更新（code が既にあれば中身を差し替える） */
export async function PUT(request: Request) {
  const guard = await requireAdminMember();
  if (!guard.ok) return guard.response;

  const body = (await request.json().catch(() => null)) as {
    category?: string;
    code?: string;
    label?: string;
    isSales?: boolean;
    sortOrder?: number;
    isActive?: boolean;
  } | null;

  if (!body?.category || !body.code || !body.label) {
    return NextResponse.json(
      { error: "カテゴリ・コード・表示名は必須です" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const { error } = await guard.supabase.rpc("admin_save_matching_option", {
    p_category: body.category,
    p_code: body.code,
    p_label: body.label,
    p_is_sales: Boolean(body.isSales),
    p_sort_order: Number.isFinite(body.sortOrder) ? Math.trunc(body.sortOrder as number) : 0,
    p_is_active: body.isActive !== false,
  });

  if (error) {
    // 23514 = カテゴリがCHECKに無い。会員に伝わる言い方に直す。
    const message =
      error.code === "23514"
        ? "そのカテゴリは使えません"
        : error.message || "保存できませんでした";
    return NextResponse.json({ error: message }, { status: 400, headers: NO_STORE_HEADERS });
  }

  return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
}

export async function DELETE(request: Request) {
  const guard = await requireAdminMember();
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const code = searchParams.get("code");

  if (!category || !code) {
    return NextResponse.json(
      { error: "削除する選択肢が指定されていません" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const { error } = await guard.supabase.rpc("admin_delete_matching_option", {
    p_category: category,
    p_code: code,
  });

  if (error) {
    // 「◯名の方が選んでいるため削除できません」はDBが作った文言。そのまま出す。
    return NextResponse.json(
      { error: error.message || "削除できませんでした" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
}
