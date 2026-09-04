// ============================================================
// メンションの宛先候補
// ============================================================
// 🔴 メンバー一覧（/api/members）を流用しない。あちらは会員レコード
//    630件すべてを返すが、実際に通知を受け取れる（ログインできる）のは
//    そのうち6名。候補に出すと、選べるのに届かない人が並ぶ。
// ============================================================
import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, requireMember } from "@/lib/supabase/api";

export const dynamic = "force-dynamic";

interface Row {
  id: string;
  name: string;
  nickname: string | null;
}

export async function GET() {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;

  const { data, error } = await guard.supabase.rpc("mentionable_members");
  if (error) {
    console.error("mentionable_members failed", { code: error.code });
    return NextResponse.json(
      { error: "宛先候補を取得できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  const rows = (data ?? []) as Row[];
  return NextResponse.json(
    rows.map((r) => ({ id: r.id, name: r.name, nickname: r.nickname })),
    { headers: NO_STORE_HEADERS },
  );
}
