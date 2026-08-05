import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient, getCurrentMember } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const SELECT_COLUMNS = [
  "id", "member_no", "name", "nickname", "referrer", "start_year", "start_month",
  "renewal_status", "renewal_fee", "renewal_note", "price", "referral_fee", "job",
  "grip", "frequency", "email", "phone", "gender", "age_range", "membership_type",
  "payment_method", "contact_submitted_at", "source", "is_withdrawn", "import_sheet",
  "auth_user_id", "role",
].join(",");

export async function GET() {
  const headers = { "Cache-Control": "private, no-store, max-age=0" };

  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Supabase未設定" }, { status: 503, headers });
  }

  const currentMember = await getCurrentMember();
  if (!currentMember) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401, headers });
  }
  if (currentMember.role !== "admin" || currentMember.is_withdrawn) {
    return NextResponse.json({ error: "運営権限が必要です" }, { status: 403, headers });
  }

  const supabase = await createClient();
  const pageSize = 1000;
  const rows: unknown[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("members")
      .select(SELECT_COLUMNS)
      .order("member_no", { ascending: true, nullsFirst: false })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error("members query failed", { code: error.code });
      return NextResponse.json({ error: "会員データを取得できませんでした" }, { status: 500, headers });
    }

    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }

  return NextResponse.json(rows, { headers });
}
