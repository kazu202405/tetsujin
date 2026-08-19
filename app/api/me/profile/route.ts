// ============================================================
// 自分のプロフィール（設定画面）の保存
// ============================================================
// 氏名・連絡先は本人が直せる。自分の情報なので当然だし、運営の手も減る。
//
// メールを本人が変えても紐づけは壊れない。
// サインアップ時の紐づけは「まだアカウントが無い会員行」だけを探すので、
// ログインできている＝既に紐づいている人の行は対象外になる。
// ただしログインIDは auth 側にあるため、ここを変えてもログインIDは変わらない
// （運営からの連絡先が変わるだけ）。画面でもそう書いている。
//
// 会員番号・会員種別・入会年月・更新状況などは契約の事実なので運営のみ。
//
// 年代・性別も本人が直せる。契約の事実ではなく本人の属性で、
// トリガ(protect_member_admin_fields)でも止めていない。
// つながりの設定で使うので、本人が入れられないと候補に出てこない。
// ============================================================
import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, requireMember } from "@/lib/supabase/api";

export const dynamic = "force-dynamic";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 🔴 台帳の既存表記に合わせる（全角＋前半/後半で10種類・336名分が既にこの形）。
//    半角や「40代」で保存すると同じ人が別の値で二重に存在することになる。
//    ７０代以上だけは既存データに無いが、選べないと困るので足してある。
const AGE_RANGES = [
  "２０代前半", "２０代後半", "３０代前半", "３０代後半", "４０代前半", "４０代後半",
  "５０代前半", "５０代後半", "６０代前半", "６０代後半", "７０代以上",
];
const GENDERS = ["男", "女"];

interface Body {
  name?: string;
  email?: string | null;
  phone?: string | null;
  grip?: string;
  gender?: string | null;
  ageRange?: string | null;
}

export async function PATCH(request: Request) {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;
  const { supabase, member } = guard;

  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body) {
    return NextResponse.json(
      { error: "リクエストが不正です" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const patch: Record<string, unknown> = {};

  if (body.gender !== undefined) {
    const gender = (body.gender ?? "").trim();
    if (gender && !GENDERS.includes(gender)) {
      return NextResponse.json(
        { error: "性別の値が正しくありません" },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }
    patch.gender = gender || null;
  }

  if (body.ageRange !== undefined) {
    const age = (body.ageRange ?? "").trim();
    if (age && !AGE_RANGES.includes(age)) {
      return NextResponse.json(
        { error: "年代の値が正しくありません" },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }
    patch.age_range = age || null;
  }

  if (body.grip !== undefined) {
    const grip = body.grip.trim();
    if (grip.length > 200) {
      return NextResponse.json(
        { error: "一言が長すぎます（200文字まで）" },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }
    patch.grip = grip || null;
  }

  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json(
        { error: "お名前は空にできません" },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }
    if (name.length > 100) {
      return NextResponse.json(
        { error: "お名前が長すぎます" },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }
    patch.name = name;
    // 検索・突き合わせに使う正規化名も一緒に更新する
    patch.name_normalized = name.replace(/[\s　]+/g, "").toLowerCase();
  }

  if (body.phone !== undefined) {
    const phone = (body.phone ?? "").trim();
    patch.phone = phone ? phone.slice(0, 30) : null;
  }

  if (body.email !== undefined) {
    const email = (body.email ?? "").trim();
    if (email && !EMAIL.test(email)) {
      return NextResponse.json(
        { error: "メールアドレスの形式が正しくありません" },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    // 同じメールが2人の会員に入ると、まだアカウントが無い方が
    // サインアップしたときにどちらへ紐づくか決まらなくなる。
    if (email) {
      const { data: dup } = await supabase
        .from("members")
        .select("id")
        .ilike("email", email)
        .neq("id", member.id)
        .maybeSingle();

      if (dup) {
        return NextResponse.json(
          { error: "このメールアドレスは既に別の会員に登録されています。運営にご連絡ください" },
          { status: 409, headers: NO_STORE_HEADERS },
        );
      }
    }
    patch.email = email || null;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: "更新する項目がありません" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const { error } = await supabase.from("members").update(patch).eq("id", member.id);

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "このメールアドレスは既に別の会員に登録されています。運営にご連絡ください" },
        { status: 409, headers: NO_STORE_HEADERS },
      );
    }
    console.error("profile update failed", { code: error.code });
    return NextResponse.json(
      { error: "保存できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
}
