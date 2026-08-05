// その日アプリを開いたことを記録する（会員×日付で1行）。
// 「ログイン回数」ではなく「何日来たか」を測るための記録。
import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, requireMember } from "@/lib/supabase/api";

export const dynamic = "force-dynamic";

export async function POST() {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;

  const { error } = await guard.supabase.rpc("record_visit");
  if (error) {
    console.error("record_visit failed", { code: error.code });
    // 記録に失敗しても利用は妨げない
    return NextResponse.json({ ok: false }, { headers: NO_STORE_HEADERS });
  }

  return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
}
