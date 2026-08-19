// ============================================================
// つながり申請
// ============================================================
// 作成・返答はどちらもRPC経由。テーブルに書き込みポリシーを作っていないため、
// 直接INSERTはできない（from_member_id を詐称されないようにするため）。
//
// やりとりは一往復まで。承諾したあとは既存の連絡先で直接続けてもらう。
// ============================================================
import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, requireMember } from "@/lib/supabase/api";
import { signAvatarPaths } from "@/lib/supabase/storage";

export const dynamic = "force-dynamic";

interface Row {
  id: string;
  direction: "sent" | "received";
  other_id: string;
  other_name: string;
  other_job: string | null;
  other_avatar: string | null;
  purposes: string[];
  message: string | null;
  status: "pending" | "accepted" | "declined" | "expired";
  decline_reason: string | null;
  reply_message: string | null;
  is_sales: boolean;
  created_at: string;
  responded_at: string | null;
}

export async function GET() {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;
  const { supabase } = guard;

  const [reqRes, optRes] = await Promise.all([
    supabase.rpc("my_connection_requests"),
    supabase
      .from("matching_options")
      .select("code, label, is_sales")
      .eq("category", "purpose")
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  if (reqRes.error) {
    console.error("my_connection_requests failed", { code: reqRes.error.code });
    return NextResponse.json(
      { error: "申請を取得できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  const rows = (reqRes.data as Row[] | null) ?? [];
  const avatarMap = await signAvatarPaths(supabase, rows.map((r) => r.other_avatar));

  return NextResponse.json(
    {
      requests: rows.map((r) => ({
        id: r.id,
        direction: r.direction,
        other: {
          id: r.other_id,
          name: r.other_name,
          job: r.other_job,
          avatarUrl: r.other_avatar ? (avatarMap[r.other_avatar] ?? null) : null,
        },
        purposes: r.purposes,
        message: r.message,
        status: r.status,
        declineReason: r.decline_reason,
        replyMessage: r.reply_message,
        isSales: r.is_sales,
        createdAt: r.created_at,
        respondedAt: r.responded_at,
      })),
      purposeOptions: optRes.data ?? [],
    },
    { headers: NO_STORE_HEADERS },
  );
}

/** 申請を出す */
export async function POST(request: Request) {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;
  const { supabase } = guard;

  const body = (await request.json().catch(() => null)) as {
    toMemberId?: string;
    purposes?: unknown;
    message?: string;
  } | null;

  const purposes = Array.isArray(body?.purposes)
    ? body.purposes.filter((v): v is string => typeof v === "string").slice(0, 12)
    : [];

  if (!body?.toMemberId || purposes.length === 0) {
    return NextResponse.json(
      { error: "つながりたい目的を1つ以上選んでください" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const { error } = await supabase.rpc("send_connection_request", {
    p_to: body.toMemberId,
    p_purposes: purposes,
    p_message: typeof body.message === "string" ? body.message.slice(0, 1000) : null,
  });

  if (error) {
    // RPCが投げた文言をそのまま出す（「すでに申請中です」など会員に伝わる内容にしてある）
    return NextResponse.json(
      { error: error.message || "申請できませんでした" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
}

/** 申請に返答する（一往復目＝これで終わり） */
export async function PATCH(request: Request) {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;
  const { supabase } = guard;

  const body = (await request.json().catch(() => null)) as {
    id?: string;
    accept?: boolean;
    reason?: string;
    message?: string;
  } | null;

  if (!body?.id || typeof body.accept !== "boolean") {
    return NextResponse.json(
      { error: "内容が不正です" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const reason =
    body.reason && ["not_now", "timing", "other"].includes(body.reason) ? body.reason : "other";

  const { error } = await supabase.rpc("respond_connection_request", {
    p_id: body.id,
    p_accept: body.accept,
    p_reason: body.accept ? null : reason,
    p_message: typeof body.message === "string" ? body.message.slice(0, 1000) : null,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message || "返答できませんでした" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
}
