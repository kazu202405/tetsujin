// ============================================================
// ログインはできたが会員ではない人が、いまどの段階にいるか
// ============================================================
// 「会員として登録されていません」の画面が、次に何をすればいいかを
// 出し分けるために使う。
//
//   pending  … 申請は出ている（アプリで直接登録した人は 0049 が自動で立てる）
//              → もう一度フォームを出させない。出させると同じ人の申請が
//                2件並ぶ（2026-09-05 南山さんで実際に発生した）
//   none     … 申請が無い → 登録内容を教えてもらう
//   rejected … 断られている → 運営へ連絡してもらう
//
// 🔴 申請は会員以外も出すため RLS では SELECT できない。
//    ∴ 管理クライアントで引く。条件は「自分のアカウントのメール」だけで、
//      他人の申請は返らない。
// ============================================================
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "no-store" };

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401, headers: HEADERS });
  }

  if (!isServiceRoleConfigured) {
    // 引けないときは「申請が無い」と言い切らない。無いと伝えるとフォームへ
    // 送ってしまい、すでに出している人の2件目を作らせることになる。
    return NextResponse.json(
      { email: user.email, application: "unknown" },
      { headers: HEADERS },
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("applications")
    .select("status")
    .ilike("email", user.email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("signup-status failed", { code: error.code });
    return NextResponse.json(
      { email: user.email, application: "unknown" },
      { headers: HEADERS },
    );
  }

  return NextResponse.json(
    { email: user.email, application: data?.status ?? "none" },
    { headers: HEADERS },
  );
}
