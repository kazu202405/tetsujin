// ============================================================
// 他の会員のプロフィールシート（閲覧用）
// ============================================================
// members は RLS で他人の行が読めないため profile_sheet_of() 経由で取る。
// 退会者は名前と業種だけが返り、シート本体は返らない（DB側で落としている）。
// ============================================================
import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, requireMember } from "@/lib/supabase/api";
import { signAvatarPaths } from "@/lib/supabase/storage";

export const dynamic = "force-dynamic";

interface SheetRow {
  member_id: string;
  member_no: number | null;
  name: string;
  nickname: string | null;
  job: string | null;
  membership_type: string | null;
  role: "admin" | "manager" | "user";
  is_withdrawn: boolean;
  avatar_path: string | null;
  name_furigana: string | null;
  genre: string | null;
  industry: string | null;
  location: string | null;
  hobbies: string | null;
  my_history: string | null;
  tetsujin_benefit: string | null;
  hitokoto: string | null;
  sns_links: unknown;
  theme_color: string;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;
  const { supabase, member } = guard;

  const { id } = await params;

  const { data, error } = await supabase.rpc("profile_sheet_of", { p_member_id: id });
  if (error) {
    console.error("profile_sheet_of failed", { code: error.code });
    return NextResponse.json(
      { error: "プロフィールを取得できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  const row = (Array.isArray(data) ? data[0] : data) as SheetRow | undefined;
  if (!row) {
    return NextResponse.json(
      { error: "メンバーが見つかりません" },
      { status: 404, headers: NO_STORE_HEADERS },
    );
  }

  const avatarUrls = row.avatar_path ? await signAvatarPaths(supabase, [row.avatar_path]) : {};

  return NextResponse.json(
    {
      id: row.member_id,
      memberNo: row.member_no,
      name: row.name,
      nickname: row.nickname ?? "",
      job: row.job ?? "",
      membershipType: row.membership_type,
      role: row.role,
      isWithdrawn: row.is_withdrawn,
      isMe: row.member_id === member.id,
      avatarUrl: row.avatar_path ? avatarUrls[row.avatar_path] ?? null : null,
      nameFurigana: row.name_furigana ?? "",
      genre: row.genre ?? "",
      industry: row.industry ?? "",
      location: row.location ?? "",
      hobbies: row.hobbies ?? "",
      myHistory: row.my_history ?? "",
      tetsujinBenefit: row.tetsujin_benefit ?? "",
      hitokoto: row.hitokoto ?? "",
      snsLinks: Array.isArray(row.sns_links) ? row.sns_links : [],
      themeColor: row.theme_color,
    },
    { headers: NO_STORE_HEADERS },
  );
}
