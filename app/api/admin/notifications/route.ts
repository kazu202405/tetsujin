// 運営からのお知らせを一斉送信（運営のみ）
import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, requireAdminMember } from "@/lib/supabase/api";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guard = await requireAdminMember();
  if (!guard.ok) return guard.response;
  const { supabase } = guard;

  const body = (await request.json().catch(() => null)) as {
    title?: string;
    message?: string;
    href?: string;
  } | null;

  const title = body?.title?.trim();
  if (!title) {
    return NextResponse.json(
      { error: "タイトルを入力してください" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }
  if (title.length > 200) {
    return NextResponse.json(
      { error: "タイトルが長すぎます" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const { data, error } = await supabase.rpc("broadcast_notification", {
    p_title: title,
    p_message: body?.message?.trim() || null,
    p_href: body?.href?.trim() || null,
  });

  if (error) {
    console.error("broadcast_notification failed", { code: error.code });
    return NextResponse.json(
      { error: "お知らせを送信できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json({ sent: Number(data ?? 0) }, { headers: NO_STORE_HEADERS });
}
