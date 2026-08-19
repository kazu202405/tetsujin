// ============================================================
// 今月のおすすめ（月3人まで）
// ============================================================
// 🔴 GET で呼ぶが、中で「今月分が無ければ作る」ので書き込みが起きる。
//    月内は同じ顔ぶれを返す（毎回計算し直すと開くたびに変わって
//    「さっきの人がいない」になる）。
//
// 候補が0人のときは理由を返す。「設定が空だから」なのか
// 「条件に合う人がいないから」なのかで、会員がやることが変わるため。
// ============================================================
import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, requireMember } from "@/lib/supabase/api";
import { signAvatarPaths } from "@/lib/supabase/storage";

export const dynamic = "force-dynamic";

interface Row {
  member_id: string;
  name: string;
  job: string | null;
  avatar_path: string | null;
  score: number;
  matched: string[];
}

export async function GET() {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;
  const { supabase, member } = guard;

  const [suggestRes, setupRes] = await Promise.all([
    supabase.rpc("my_monthly_suggestions"),
    supabase.rpc("my_matching_setup"),
  ]);

  if (suggestRes.error) {
    console.error("my_monthly_suggestions failed", { code: suggestRes.error.code });
    return NextResponse.json(
      { error: "おすすめを取得できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  const rows = (suggestRes.data as Row[] | null) ?? [];
  const setup = (setupRes.data as { wants_filled: number; profile_filled: number }[] | null)?.[0];

  // 写真のバケットは非公開なので署名URLにする（既存の一括発行ヘルパーを使う）
  const avatarMap = await signAvatarPaths(supabase, rows.map((r) => r.avatar_path));

  const withAvatars = rows.map((r) => ({
    id: r.member_id,
    name: r.name,
    job: r.job,
    score: r.score,
    matched: r.matched,
    avatarUrl: r.avatar_path ? (avatarMap[r.avatar_path] ?? null) : null,
  }));

  return NextResponse.json(
    {
      suggestions: withAvatars,
      // 0人だったときに何を案内するかの判断材料
      wantsFilled: setup?.wants_filled ?? 0,
      profileFilled: setup?.profile_filled ?? 0,
      memberId: member.id,
    },
    { headers: NO_STORE_HEADERS },
  );
}
