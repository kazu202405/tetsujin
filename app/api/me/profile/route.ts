// ============================================================
// 自分のプロフィール（設定画面）の保存
// ============================================================
// 会員番号・氏名・会員種別・メールアドレスは台帳側が正本のためここでは変えない。
// （メールはログインIDでもあるので、変更には確認メールの手順が要る）
// 本人が自由に書き換えてよいのは「一言（グリップ）」だけ。
// ============================================================
import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, requireMember } from "@/lib/supabase/api";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;
  const { supabase, member } = guard;

  const body = (await request.json().catch(() => null)) as { grip?: string } | null;
  if (!body || body.grip === undefined) {
    return NextResponse.json(
      { error: "更新する項目がありません" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const grip = body.grip.trim();
  if (grip.length > 200) {
    return NextResponse.json(
      { error: "一言が長すぎます（200文字まで）" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const { error } = await supabase
    .from("members")
    .update({ grip: grip || null })
    .eq("id", member.id);

  if (error) {
    console.error("profile update failed", { code: error.code });
    return NextResponse.json(
      { error: "保存できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
}
