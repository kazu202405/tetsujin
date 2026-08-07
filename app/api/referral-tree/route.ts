// 紹介ツリー。members.referrer_member_id（運営が紐づける列）から作る。
// 誰が誰の紹介かは会員どうしの力関係が見える情報なので運営のみ。
import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, requireAdminMember } from "@/lib/supabase/api";
import { signAvatarPaths } from "@/lib/supabase/storage";

export const dynamic = "force-dynamic";

interface Row {
  id: string;
  name: string;
  job: string | null;
  avatar_path: string | null;
  is_withdrawn: boolean;
  member_no: number | null;
  referrer_member_id: string | null;
  referrer_text: string | null;
}

export async function GET() {
  const guard = await requireAdminMember();
  if (!guard.ok) return guard.response;
  const { supabase } = guard;

  const { data, error } = await supabase.rpc("referral_tree");
  if (error) {
    console.error("referral_tree failed", { code: error.code });
    return NextResponse.json(
      { error: "紹介ツリーを取得できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  const rows = (data ?? []) as Row[];
  const avatarUrls = await signAvatarPaths(supabase, rows.map((r) => r.avatar_path));

  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      job: r.job ?? "",
      avatarUrl: r.avatar_path ? avatarUrls[r.avatar_path] ?? null : null,
      isWithdrawn: r.is_withdrawn,
      memberNo: r.member_no,
      referrerId: r.referrer_member_id,
      referrerText: r.referrer_text ?? "",
    })),
    { headers: NO_STORE_HEADERS },
  );
}
