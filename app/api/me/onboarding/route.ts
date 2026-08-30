// ============================================================
// はじめてガイドの進捗
// ============================================================
// 各ステップの完了は実データから毎回数える（フラグは持たない）。
// 持つと「やったのに消えた」「やってないのに完了」がすぐ起きる。
//
// 画面から何本も叩くと往復が増えて遅くなるので、1回で全部返す。
// ============================================================
import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, requireMember } from "@/lib/supabase/api";

export const dynamic = "force-dynamic";

const EMPTY = {
  hasAvatar: false,
  hasSheet: false,
  hasSocialLink: false,
  visitedBoard: false,
  hasPost: false,
  joinedEvent: false,
  hasConnection: false,
  dismissed: false,
};

interface Row {
  has_avatar: boolean;
  has_sheet: boolean;
  has_social_link: boolean;
  visited_board: boolean;
  has_post: boolean;
  joined_event: boolean;
  has_connection: boolean;
  dismissed: boolean;
}

export async function GET() {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;
  const { supabase } = guard;

  const { data, error } = await supabase.rpc("onboarding_progress");
  if (error) {
    console.error("onboarding_progress failed", { code: error.code });
    // 取れないときはガイドを出さない（作った進捗を見せない）
    return NextResponse.json({ ...EMPTY, dismissed: true }, { headers: NO_STORE_HEADERS });
  }

  const row = (data as Row[] | null)?.[0];
  if (!row) return NextResponse.json({ ...EMPTY, dismissed: true }, { headers: NO_STORE_HEADERS });

  return NextResponse.json(
    {
      hasAvatar: row.has_avatar,
      hasSheet: row.has_sheet,
      hasSocialLink: row.has_social_link,
      visitedBoard: row.visited_board,
      hasPost: row.has_post,
      joinedEvent: row.joined_event,
      hasConnection: row.has_connection,
      dismissed: row.dismissed,
    },
    { headers: NO_STORE_HEADERS },
  );
}

/** 閉じる / もう一度見る */
export async function PATCH(request: Request) {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;
  const { supabase } = guard;

  const body = (await request.json().catch(() => null)) as { dismissed?: boolean } | null;
  if (typeof body?.dismissed !== "boolean") {
    return NextResponse.json(
      { error: "リクエストが不正です" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const { error } = await supabase.rpc("set_onboarding_dismissed", {
    p_dismissed: body.dismissed,
  });
  if (error) {
    console.error("set_onboarding_dismissed failed", { code: error.code });
    return NextResponse.json(
      { error: "保存できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
}
