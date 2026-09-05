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
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
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

  const payload = {
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
  };

  // ------------------------------------------------------------
  // 🔴 同じメールの申請が既にあれば、2件目を作らず中身を差し替える
  // ------------------------------------------------------------
  // アプリで直接アカウントを作った人は 0049 が申請を自動で立てている。
  // その人が案内どおり入会申込フォームも出すと、同じ人の申請が2件並ぶ
  // （2026-09-05 南山さんで実際に発生）。運営はどちらを処理したのか
  // 分からなくなり、片方が審査中のまま永久に残る。
  //
  // 申請は会員以外も出すため RLS では SELECT / UPDATE ができない。
  // ∴ 照合はサーバー側の管理クライアントで行う。メールで自分の行を
  //    引くだけなので、他人の申請には触れない。
  if (isServiceRoleConfigured) {
    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("applications")
      .select("id, status")
      .ilike("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      // 承認済みなら触らない。すでに会員になっているので出し直す必要がない。
      if (existing.status === "approved") {
        return NextResponse.json({ ok: true, alreadyApproved: true }, { headers: HEADERS });
      }

      // 審査中なら中身を更新、却下済みなら申請し直しとして審査中に戻す
      const { error: updateError } = await admin
        .from("applications")
        .update({ ...payload, reviewed_by: null, reviewed_at: null, review_note: null })
        .eq("id", existing.id);

      if (updateError) {
        console.error("application update failed", { code: updateError.code });
        return NextResponse.json(
          { error: "送信できませんでした。時間をおいて再度お試しください" },
          { status: 500, headers: HEADERS },
        );
      }
      return NextResponse.json({ ok: true }, { headers: HEADERS });
    }
  } else {
    // 鍵が無い環境では重複を防げない。黙って通すと、あとで運営が
    // 「なぜ2件あるのか」を追えなくなるのでログには必ず残す。
    console.warn("SUPABASE_SERVICE_ROLE_KEY 未設定のため、申請の重複チェックを飛ばしました");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("applications").insert(payload);

  if (error) {
    console.error("application insert failed", { code: error.code });
    return NextResponse.json(
      { error: "送信できませんでした。時間をおいて再度お試しください" },
      { status: 500, headers: HEADERS },
    );
  }

  return NextResponse.json({ ok: true }, { headers: HEADERS });
}
