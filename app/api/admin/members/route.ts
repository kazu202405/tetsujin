import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient, getCurrentMember } from "@/lib/supabase/server";
import { signAvatarPaths } from "@/lib/supabase/storage";
import { isAdminRole } from "@/lib/member-roles";

export const dynamic = "force-dynamic";

const SELECT_COLUMNS = [
  "id", "member_no", "name", "nickname", "referrer", "start_year", "start_month",
  "renewal_status", "renewal_fee", "renewal_note", "price", "referral_fee", "job",
  "grip", "frequency", "email", "phone", "gender", "age_range", "membership_type",
  "payment_method", "contact_submitted_at", "source", "is_withdrawn", "import_sheet",
  "auth_user_id", "role", "withdrawn_at", "withdrawal_reason", "admin_note", "avatar_path",
  "referrer_member_id", "billing_plan_code", "billing_starts_on", "stripe_customer_id",
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
  if (!isAdminRole(currentMember.role) || currentMember.is_withdrawn) {
    return NextResponse.json({ error: "運営権限が必要です" }, { status: 403, headers });
  }

  const supabase = await createClient();
  const pageSize = 1000;
  const rows: Record<string, unknown>[] = [];

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

    rows.push(...((data ?? []) as unknown as Record<string, unknown>[]));
    if (!data || data.length < pageSize) break;
  }

  // 写真は非公開バケットにあるため、表示用の署名URLを一括で作って行に添える。
  const signed = await signAvatarPaths(
    supabase,
    rows.map((row) => row.avatar_path as string | null),
  );
  const withAvatars = rows.map((row) => ({
    ...row,
    avatar_url: signed[row.avatar_path as string] ?? null,
  }));

  return NextResponse.json(withAvatars, { headers });
}
