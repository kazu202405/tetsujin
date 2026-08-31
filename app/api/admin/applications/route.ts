// 入会申請の一覧（運営のみ）
import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, requireAdminMember } from "@/lib/supabase/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdminMember();
  if (!guard.ok) return guard.response;
  const { supabase } = guard;

  const { data, error } = await supabase
    .from("applications")
    .select(
      "id, name, name_furigana, gender, age_range, email, phone, job, referrer, start_month, membership_type, payment_method, note, status, member_id, reviewed_at, review_note, created_at",
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("applications select failed", { code: error.code });
    return NextResponse.json(
      { error: "入会申請を取得できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  // 🔴 同じ名前の在籍会員を一緒に返す。名簿から取り込んだ行にはメールが
  //    無い人が100名いて、approve_application() のメール照合が空振りする。
  //    そのまま承認すると既存会員なのに別行ができる（池田さんで実際に起きた）。
  //    自動では紐づけない。気づかせて、判断は運営に残す。
  const { data: matches, error: matchError } = await supabase.rpc(
    "pending_application_same_name_members",
  );
  if (matchError) {
    // 同名の照合が取れなくても、申請の一覧そのものは出す
    console.error("pending_application_same_name_members failed", { code: matchError.code });
  }

  const byApplication = new Map<string, unknown[]>();
  for (const row of (matches ?? []) as { application_id: string }[]) {
    const list = byApplication.get(row.application_id) ?? [];
    list.push(row);
    byApplication.set(row.application_id, list);
  }

  return NextResponse.json(
    (data ?? []).map((a) => ({ ...a, sameNameMembers: byApplication.get(a.id) ?? [] })),
    { headers: NO_STORE_HEADERS },
  );
}
