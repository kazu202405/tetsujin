// ============================================================
// 会員1件の運営操作（退会 / 復帰 / 運営メモ / 台帳の編集）
// ============================================================
// 退会は運営のみが行う（確定方針＝本人からの退会ボタンは無い）。
// 退会しても行は消さない。名前と履歴は残し、復帰もできるようにする。
//
// 台帳の項目（氏名・会員番号・連絡先など）もここで直す。
// Excelを廃してアプリが会員管理のマスターになったため、
// 運営がアプリ上で修正できないと直す手段が無くなる。
// ============================================================
import { NextResponse } from "next/server";
import { createClient, getCurrentMember } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

const MAX_REASON_LENGTH = 500;
const MAX_NOTE_LENGTH = 2000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface PatchBody {
  is_withdrawn?: boolean;
  withdrawal_reason?: string | null;
  admin_note?: string | null;
  // 台帳の項目
  name?: string;
  member_no?: number | null;
  email?: string | null;
  phone?: string | null;
  nickname?: string | null;
  job?: string | null;
  membership_type?: string | null;
  start_year?: number | null;
  start_month?: number | null;
  renewal_status?: string | null;
  price?: number | null;
  referrer?: string | null;
}

const RENEWAL_STATUSES = new Set(["未更新", "退会", "更新済", "返事待ち", "入金待ち"]);

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
  const supabase = await createClient();

  // 自分自身を退会させると管理画面から締め出されて復旧できなくなる。
  if (body.is_withdrawn === true && id === currentMember.id) {
    return NextResponse.json(
      { error: "自分自身を退会させることはできません" },
      { status: 400, headers },
    );
  }

  const patch: Record<string, unknown> = {};

  // ---- 在籍 ----
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

  // ---- 運営メモ ----
  if (body.admin_note !== undefined) {
    const note = (body.admin_note ?? "").trim();
    if (note.length > MAX_NOTE_LENGTH) {
      return NextResponse.json({ error: "備考が長すぎます" }, { status: 400, headers });
    }
    patch.admin_note = note || null;
  }

  // ---- 台帳の項目 ----
  const text = (value: string | null | undefined, max = 200) => {
    if (value === undefined || value === null) return null;
    const s = String(value).trim();
    return s ? s.slice(0, max) : null;
  };

  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json({ error: "氏名は空にできません" }, { status: 400, headers });
    }
    patch.name = name.slice(0, 100);
    // 検索・突き合わせに使う正規化名も一緒に更新する
    patch.name_normalized = name.replace(/[\s　]+/g, "").toLowerCase();
  }

  if (body.email !== undefined) {
    const email = text(body.email, 200);
    if (email && !EMAIL.test(email)) {
      return NextResponse.json(
        { error: "メールアドレスの形式が正しくありません" },
        { status: 400, headers },
      );
    }

    // 🔴 同じメールが複数の会員に入ると、サインアップ時に
    //    どちらの会員行へ紐づくかが決まらなくなる。先に弾く。
    if (email) {
      const { data: dup } = await supabase
        .from("members")
        .select("id, name, member_no")
        .ilike("email", email)
        .neq("id", id)
        .maybeSingle();

      if (dup) {
        return NextResponse.json(
          {
            error: `このメールアドレスは既に「${dup.name}${
              dup.member_no != null ? `（No.${dup.member_no}）` : ""
            }」に登録されています`,
          },
          { status: 409, headers },
        );
      }
    }
    patch.email = email;
  }

  if (body.phone !== undefined) patch.phone = text(body.phone, 30);
  if (body.nickname !== undefined) patch.nickname = text(body.nickname, 100);
  if (body.job !== undefined) patch.job = text(body.job, 200);
  if (body.referrer !== undefined) patch.referrer = text(body.referrer, 100);

  if (body.membership_type !== undefined) {
    const type = text(body.membership_type, 10);
    if (type && type !== "法人" && type !== "個人") {
      return NextResponse.json(
        { error: "会員種別は「法人」か「個人」です" },
        { status: 400, headers },
      );
    }
    patch.membership_type = type;
  }

  if (body.member_no !== undefined) {
    if (body.member_no !== null && (!Number.isInteger(body.member_no) || body.member_no < 1)) {
      return NextResponse.json({ error: "会員番号が不正です" }, { status: 400, headers });
    }
    patch.member_no = body.member_no;
  }

  if (body.start_year !== undefined) {
    if (body.start_year !== null && (body.start_year < 2000 || body.start_year > 2100)) {
      return NextResponse.json({ error: "開始年が不正です" }, { status: 400, headers });
    }
    patch.start_year = body.start_year;
  }

  if (body.start_month !== undefined) {
    if (body.start_month !== null && (body.start_month < 1 || body.start_month > 12)) {
      return NextResponse.json({ error: "開始月が不正です" }, { status: 400, headers });
    }
    patch.start_month = body.start_month;
  }

  if (body.renewal_status !== undefined) {
    const status = text(body.renewal_status, 10);
    if (status && !RENEWAL_STATUSES.has(status)) {
      return NextResponse.json({ error: "更新状況が不正です" }, { status: 400, headers });
    }
    if (status) patch.renewal_status = status;
  }

  if (body.price !== undefined) {
    if (body.price !== null && (!Number.isInteger(body.price) || body.price < 0)) {
      return NextResponse.json({ error: "入会時金額が不正です" }, { status: 400, headers });
    }
    patch.price = body.price;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "更新する項目がありません" }, { status: 400, headers });
  }

  const { data, error } = await supabase
    .from("members")
    .update(patch)
    .eq("id", id)
    .select(
      "id, name, member_no, email, phone, nickname, job, membership_type, start_year, start_month, renewal_status, price, referrer, is_withdrawn, withdrawn_at, withdrawal_reason, admin_note",
    )
    .maybeSingle();

  if (error) {
    // 23505 = 会員番号の重複
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "その会員番号は既に使われています" },
        { status: 409, headers },
      );
    }
    console.error("member patch failed", { code: error.code });
    return NextResponse.json({ error: "会員情報を更新できませんでした" }, { status: 500, headers });
  }
  if (!data) {
    // RLS で弾かれた場合もここに来る（運営でなければ更新対象が見えない）
    return NextResponse.json({ error: "会員が見つかりません" }, { status: 404, headers });
  }

  return NextResponse.json(data, { headers });
}
