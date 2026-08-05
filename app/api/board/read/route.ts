// ============================================================
// 掲示板の未読件数 / 既読化
// ============================================================
// 旧実装は「訪問したかどうか」の localStorage フラグで固定値3を出していた。
// 実データでは board_reads の最終閲覧時刻より後の他人の投稿数を数える。
// ============================================================
import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, requireMember } from "@/lib/supabase/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;
  const { supabase } = guard;

  const { data, error } = await supabase.rpc("board_unread_count");
  if (error) {
    console.error("board_unread_count failed", { code: error.code });
    return NextResponse.json(
      { error: "未読件数を取得できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json({ unread: Number(data ?? 0) }, { headers: NO_STORE_HEADERS });
}

export async function POST() {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;
  const { supabase } = guard;

  const { error } = await supabase.rpc("mark_board_read");
  if (error) {
    console.error("mark_board_read failed", { code: error.code });
    return NextResponse.json(
      { error: "既読にできませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
}
