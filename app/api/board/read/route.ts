// ============================================================
// 掲示板の未読件数 / 既読化
// ============================================================
// 旧実装は「訪問したかどうか」の localStorage フラグで固定値3を出していた。
// 実データでは board_reads の最終閲覧時刻より後の他人の投稿数を数える。
//
// 🔴 既読化(POST)は、その場で数え直した未読件数も返す。
//    返さないと画面がバッジを更新するためにもう1往復することになる
//    （2026-09-07 実測：掲示板を1回開くだけでAPIが8本、うち1本がこれ）。
//    サーバー側の数え直しはDBと同じ地域なので、ここでやる方がずっと安い。
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

export async function POST(request: Request) {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;
  const { supabase } = guard;

  // チャンネルが指定されていればそのチャンネルだけ既読にする。
  // 指定が無ければ従来通り掲示板全体（初回訪問や旧クライアント向け）。
  const body = (await request.json().catch(() => null)) as { channelId?: string } | null;

  const { error } = body?.channelId
    ? await supabase.rpc("mark_board_channel_read", { p_channel_id: body.channelId })
    : await supabase.rpc("mark_board_read");
  if (error) {
    console.error("mark board read failed", { code: error.code });
    return NextResponse.json(
      { error: "既読にできませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  // 既読にした直後の未読件数（画面のバッジ用）。
  // 数え直しに失敗しても既読化そのものは成功しているので、件数だけ落とす。
  const { data: unread } = await supabase.rpc("board_unread_count");

  return NextResponse.json(
    { ok: true, unread: unread == null ? null : Number(unread) },
    { headers: NO_STORE_HEADERS },
  );
}
