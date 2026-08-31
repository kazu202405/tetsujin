// メンバーの活動状況（運営のみ）
// ログイン日時・投稿・イベント参加の実績をまとめて返す。
import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, requireAdminMember } from "@/lib/supabase/api";
import { signAvatarPaths } from "@/lib/supabase/storage";

export const dynamic = "force-dynamic";

interface ActivityRow {
  has_grip: boolean;
  has_sheet: boolean;
  has_matching: boolean;
  member_id: string;
  name: string;
  job: string | null;
  avatar_path: string | null;
  is_withdrawn: boolean;
  has_login: boolean;
  last_sign_in_at: string | null;
  last_visit_date: string | null;
  visit_days_30d: number;
  last_post_at: string | null;
  post_count_30d: number;
  last_event_date: string | null;
  event_count_90d: number;
  referral_count: number;
  renewal_status: string | null;
  start_year: number | null;
  start_month: number | null;
}

export async function GET() {
  const guard = await requireAdminMember();
  if (!guard.ok) return guard.response;
  const { supabase } = guard;

  const { data, error } = await supabase.rpc("member_activity_stats");
  if (error) {
    console.error("member_activity_stats failed", { code: error.code });
    return NextResponse.json(
      { error: "活動状況を取得できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  const rows = (data ?? []) as ActivityRow[];
  const avatarUrls = await signAvatarPaths(supabase, rows.map((r) => r.avatar_path));

  return NextResponse.json(
    rows.map((r) => ({
      memberId: r.member_id,
      name: r.name,
      job: r.job,
      avatarUrl: r.avatar_path ? avatarUrls[r.avatar_path] ?? null : null,
      isWithdrawn: r.is_withdrawn,
      hasLogin: r.has_login,
      lastSignInAt: r.last_sign_in_at,
      lastVisitDate: r.last_visit_date,
      visitDays30d: Number(r.visit_days_30d),
      lastPostAt: r.last_post_at,
      postCount30d: Number(r.post_count_30d),
      lastEventDate: r.last_event_date,
      eventCount90d: Number(r.event_count_90d),
      referralCount: Number(r.referral_count),
      renewalStatus: r.renewal_status,
      startYear: r.start_year,
      startMonth: r.start_month,
      // 記入状況。DBに列が無いうちは undefined になるので、必ず真偽値にする
      hasGrip: Boolean(r.has_grip),
      hasSheet: Boolean(r.has_sheet),
      hasMatching: Boolean(r.has_matching),
    })),
    { headers: NO_STORE_HEADERS },
  );
}
