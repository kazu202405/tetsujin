// 入会申請の一覧（運営のみ）
import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, requireAdminMember } from "@/lib/supabase/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdminMember();
  if (!guard.ok) return guard.response;
  const { supabase } = guard;

  const { data, error } = await supabase
    .from("applications")
    .select(
      "id, name, name_furigana, gender, age_range, email, phone, job, referrer, start_month, membership_type, payment_method, note, status, member_id, reviewed_at, review_note, created_at",
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("applications select failed", { code: error.code });
    return NextResponse.json(
      { error: "入会申請を取得できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json(data ?? [], { headers: NO_STORE_HEADERS });
}
