// ============================================================
// 入会申請の受付（公開フォーム /register から）
// ============================================================
// これまで申込は画面上で「送信しました」と出るだけで、実際にはどこにも
// 保存されていなかった。ここで受け取って applications に記録する。
//
// 未ログインからの書き込みになるため、DB側は anon に INSERT だけを許し
// SELECT を与えていない（他人の申込内容は読めない）。
// ============================================================
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isMockMode } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "no-store" };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value: unknown, max = 200): string | null {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s ? s.slice(0, max) : null;
}

/**
 * つながりの設定（立場・業種・地域）のコード配列。
 * 未ログインから来るので、長さも件数も必ず切る。
 * 値そのものの正しさは承認時にマスタと突き合わせるより、
 * 使う側（マッチング）が知らないコードを無視する作りにしてある。
 */
function codes(value: unknown, max = 60): string[] {
  if (!Array.isArray(value)) return [];
  const out = value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter((v) => v.length > 0 && v.length <= 40);
  return Array.from(new Set(out)).slice(0, max);
}

export async function POST(request: Request) {
  if (isMockMode) {
    return NextResponse.json({ error: "受付を準備中です" }, { status: 503, headers: HEADERS });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "入力内容を確認できません" }, { status: 400, headers: HEADERS });
  }

  const name = clean(body.name, 100);
  const email = clean(body.email, 200);

  if (!name) {
    return NextResponse.json({ error: "お名前を入力してください" }, { status: 400, headers: HEADERS });
  }
  if (!email || !EMAIL.test(email)) {
    return NextResponse.json(
      { error: "メールアドレスの形式が正しくありません" },
      { status: 400, headers: HEADERS },
    );
  }
  if (body.termsAgreed !== true) {
    return NextResponse.json(
      { error: "規約への同意が必要です" },
      { status: 400, headers: HEADERS },
    );
  }

  const membershipType = clean(body.membershipType, 10);

  const supabase = await createClient();
  const { error } = await supabase.from("applications").insert({
    name,
    name_furigana: clean(body.nameFurigana, 100),
    gender: clean(body.gender, 20),
    age_range: clean(body.ageRange, 20),
    email,
    phone: clean(body.phone, 30),
    job: clean(body.job, 100),
    referrer: clean(body.referrer, 100),
    start_month: clean(body.startMonth, 20),
    membership_type: membershipType === "個人" || membershipType === "法人" ? membershipType : null,
    payment_method: clean(body.paymentMethod, 30),
    note: clean(body.note, 2000),
    // マッチング用。承認時に member_matching_profile へ引き継がれる。
    positions: codes(body.positions),
    industries: codes(body.industries),
    regions: codes(body.regions),
    terms_agreed: true,
    status: "pending",
  });

  if (error) {
    console.error("application insert failed", { code: error.code });
    return NextResponse.json(
      { error: "送信できませんでした。時間をおいて再度お試しください" },
      { status: 500, headers: HEADERS },
    );
  }

  return NextResponse.json({ ok: true }, { headers: HEADERS });
}
