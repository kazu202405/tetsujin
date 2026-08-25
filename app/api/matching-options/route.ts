// ============================================================
// つながりの選択肢（入会フォーム用・未ログインでも読める）
// ============================================================
// /register は未ログインの画面なので、会員用の /api/me/matching は使えない。
// ここは「選択肢の一覧」だけを返す。会員のデータには一切触れない。
//
// 返すのは入会フォームで使う3カテゴリだけ。
// 趣味(29項目)・興味(11項目)・目的 は申込みフォームには置かない
// （長いほど申込みが落ちる。後からマイページで足せる）。
// ============================================================
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isMockMode } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

const FORM_CATEGORIES = ["position", "industry", "region"];

export async function GET() {
  if (isMockMode) {
    return NextResponse.json({ options: [] }, { headers: { "Cache-Control": "no-store" } });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matching_options")
    .select("category, code, label, sort_order")
    .in("category", FORM_CATEGORIES)
    .eq("is_active", true)
    .order("category")
    .order("sort_order");

  if (error) {
    // 選択肢が取れなくても申込みそのものは通せるようにする（空で返す）
    console.error("matching options (public) failed", { code: error.code });
    return NextResponse.json({ options: [] }, { headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json(
    { options: data ?? [] },
    // 選択肢はめったに変わらないので少しキャッシュしてよい
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
