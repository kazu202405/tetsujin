// ============================================================
// 会員1件の運営操作（退会させる / 復帰させる / 運営メモ）
// ============================================================
// 退会は運営のみが行う（確定方針＝本人からの退会ボタンは無い）。
// 退会しても行は消さない。名前と履歴は残し、復帰もできるようにする。
//
// 更新先はすべて members の既存列：
//   is_withdrawn / withdrawn_at / withdrawal_reason / admin_note
// ============================================================
import { NextResponse } from "next/server";
import { createClient, getCurrentMember } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

const MAX_REASON_LENGTH = 500;
const MAX_NOTE_LENGTH = 2000;

interface PatchBody {
  is_withdrawn?: boolean;
  withdrawal_reason?: string | null;
  admin_note?: string | null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const headers = { "Cache-Control": "private, no-store, max-age=0" };

  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Supabase未設定" }, { status: 503, headers });
  }

  const currentMember = await getCurrentMember();
  if (!currentMember) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401, headers });
  }
  if (currentMember.role !== "admin" || currentMember.is_withdrawn) {
    return NextResponse.json({ error: "運営権限が必要です" }, { status: 403, headers });
  }

  const body = (await request.json().catch(() => null)) as PatchBody | null;
  if (!body) {
    return NextResponse.json({ error: "リクエストが不正です" }, { status: 400, headers });
  }

  const { id } = await params;

  // 自分自身を退会させると管理画面から締め出されて復旧できなくなる。
  if (body.is_withdrawn === true && id === currentMember.id) {
    return NextResponse.json(
      { error: "自分自身を退会させることはできません" },
      { status: 400, headers },
    );
  }

  const patch: Record<string, unknown> = {};

  if (typeof body.is_withdrawn === "boolean") {
    patch.is_withdrawn = body.is_withdrawn;
    // 復帰させたときは退会日・理由を消す（誤操作の痕跡を残さない）
    patch.withdrawn_at = body.is_withdrawn ? new Date().toISOString() : null;
    if (!body.is_withdrawn) patch.withdrawal_reason = null;
  }

  if (body.withdrawal_reason !== undefined && body.is_withdrawn !== false) {
    const reason = (body.withdrawal_reason ?? "").trim();
    if (reason.length > MAX_REASON_LENGTH) {
      return NextResponse.json({ error: "退会理由が長すぎます" }, { status: 400, headers });
    }
    patch.withdrawal_reason = reason || null;
  }

  if (body.admin_note !== undefined) {
    const note = (body.admin_note ?? "").trim();
    if (note.length > MAX_NOTE_LENGTH) {
      return NextResponse.json({ error: "備考が長すぎます" }, { status: 400, headers });
    }
    patch.admin_note = note || null;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "更新する項目がありません" }, { status: 400, headers });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .update(patch)
    .eq("id", id)
    .select("id, is_withdrawn, withdrawn_at, withdrawal_reason, admin_note")
    .maybeSingle();

  if (error) {
    console.error("member patch failed", { code: error.code });
    return NextResponse.json({ error: "会員情報を更新できませんでした" }, { status: 500, headers });
  }
  if (!data) {
    // RLS で弾かれた場合もここに来る（運営でなければ更新対象が見えない）
    return NextResponse.json({ error: "会員が見つかりません" }, { status: 404, headers });
  }

  return NextResponse.json(data, { headers });
}
