// ============================================================
// 紐づけ先の会員を探す（運営のみ）
// ============================================================
// 入会申請を承認するときに「この申請はこの会員です」と手で選ぶための検索。
// 台帳にメールが入っていない会員は自動では一致しようがないため、
// 会員番号と氏名で運営が見つけられるようにする。
//
// 626名を丸ごと返すと重いので、DB側で20件に絞って返す。
// ============================================================
import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, requireAdminMember } from "@/lib/supabase/api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requireAdminMember();
  if (!guard.ok) return guard.response;
  const { supabase } = guard;

  const query = (new URL(request.url).searchParams.get("q") ?? "").trim();
  if (query.length < 1) {
    return NextResponse.json([], { headers: NO_STORE_HEADERS });
  }

  const { data, error } = await supabase.rpc("admin_member_search", { p_query: query });

  if (error) {
    console.error("admin_member_search failed", { code: error.code });
    return NextResponse.json(
      { error: "会員を検索できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json(data ?? [], { headers: NO_STORE_HEADERS });
}
