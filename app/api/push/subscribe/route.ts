// ============================================================
// 端末のプッシュ購読を登録 / 解除
// ============================================================
// 端末ごとに1件。同じ端末で登録し直しても増えないよう endpoint で一意にする。
// ============================================================
import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, requireMember } from "@/lib/supabase/api";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;
  const { supabase, member } = guard;

  const body = (await request.json().catch(() => null)) as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
    userAgent?: string;
  } | null;

  if (!body?.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json(
      { error: "購読情報が不足しています" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      member_id: member.id,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      user_agent: body.userAgent?.slice(0, 300) ?? null,
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    console.error("push subscribe failed", { code: error.code });
    return NextResponse.json(
      { error: "通知の登録に失敗しました" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
}

export async function DELETE(request: Request) {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;

  const endpoint = new URL(request.url).searchParams.get("endpoint");
  if (!endpoint) {
    return NextResponse.json(
      { error: "対象が指定されていません" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const { error } = await guard.supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);

  if (error) {
    console.error("push unsubscribe failed", { code: error.code });
    return NextResponse.json(
      { error: "解除できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
}
