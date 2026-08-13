// ============================================================
// 自分のプロフィールシート 取得 / 保存
// ============================================================
// 会員番号・氏名は台帳(members)が正本のため、ここでは更新しない。
// ニックネームと職業はメンバー一覧や掲示板でも使うので members 側を更新する。
// それ以外のシート項目は profile_sheets に入れる。
// ============================================================
import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, requireMember } from "@/lib/supabase/api";
import { signAvatarPaths } from "@/lib/supabase/storage";

export const dynamic = "force-dynamic";

const TEXT_LIMIT = 2000;
const SNS_LIMIT = 12;
const HEX = /^#[0-9A-Fa-f]{6}$/;

const SHEET_COLUMNS =
  "name_furigana, genre, industry, location, hobbies, my_history, tetsujin_benefit, hitokoto, sns_links, theme_color";

interface SnsLink {
  id: string;
  platform: string;
  label?: string;
  url: string;
}

const PLATFORMS = new Set(["line", "instagram", "x", "facebook", "website", "other"]);

/** 入力されたSNSリンクを、保存してよい形だけに整える。 */
function sanitizeSnsLinks(input: unknown): SnsLink[] | null {
  if (!Array.isArray(input)) return null;
  if (input.length > SNS_LIMIT) return null;

  const out: SnsLink[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") return null;
    const item = raw as Record<string, unknown>;
    const platform = String(item.platform ?? "");
    if (!PLATFORMS.has(platform)) return null;

    const url = String(item.url ?? "").trim();
    if (url.length > 500) return null;
    // 空URLは「入力途中の行」なので保存対象から落とす
    if (!url) continue;

    out.push({
      id: String(item.id ?? "").slice(0, 64) || `sns-${out.length}`,
      platform,
      label: item.label ? String(item.label).slice(0, 40) : undefined,
      url,
    });
  }
  return out;
}

export async function GET() {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;
  const { supabase, member } = guard;

  const { data, error } = await supabase
    .from("profile_sheets")
    .select(SHEET_COLUMNS)
    .eq("member_id", member.id)
    .maybeSingle();

  if (error) {
    console.error("profile_sheets select failed", { code: error.code });
    return NextResponse.json(
      { error: "プロフィールシートを取得できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  const avatarUrls = member.avatar_path
    ? await signAvatarPaths(supabase, [member.avatar_path])
    : {};

  return NextResponse.json(
    {
      // 台帳が正本＝画面では編集させない
      memberNo: member.member_no,
      name: member.name,
      avatarUrl: member.avatar_path ? avatarUrls[member.avatar_path] ?? null : null,
      // members にあるがシートから編集してよい項目
      nickname: member.nickname ?? "",
      job: member.job ?? "",
      // シート固有の項目（未作成なら空）
      sheet: data ?? null,
      // 一言の初期値は台帳のグリップから拾う
      gripFallback: member.grip ?? "",
      exists: Boolean(data),
    },
    { headers: NO_STORE_HEADERS },
  );
}

export async function PUT(request: Request) {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;
  const { supabase, member } = guard;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json(
      { error: "リクエストが不正です" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const text = (key: string): string | null => {
    const value = body[key];
    if (value === undefined || value === null) return null;
    const s = String(value).trim();
    return s ? s.slice(0, TEXT_LIMIT) : null;
  };

  // sns_links は廃止した列。SNSは member_social_links（公開範囲＋開示申請を持つ側）に
  // 一本化したため、ここでは常に空を書いて残骸を残さない。
  // 🔴 この列にまた書き始めると、公開範囲を無視して全会員に見える入力口が復活する。
  const snsLinks = sanitizeSnsLinks(body.snsLinks ?? []);
  if (snsLinks === null) {
    return NextResponse.json(
      { error: "SNSリンクの内容が不正です" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const themeColor = String(body.themeColor ?? "#2a2a3e");
  if (!HEX.test(themeColor)) {
    return NextResponse.json(
      { error: "テーマカラーが不正です" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const { error: sheetError } = await supabase.from("profile_sheets").upsert(
    {
      member_id: member.id,
      name_furigana: text("nameFurigana"),
      genre: text("genre"),
      industry: text("industry"),
      location: text("location"),
      hobbies: text("hobbies"),
      my_history: text("myHistory"),
      tetsujin_benefit: text("tetsujinBenefit"),
      hitokoto: text("hitokoto"),
      sns_links: snsLinks,
      theme_color: themeColor,
    },
    { onConflict: "member_id" },
  );

  if (sheetError) {
    console.error("profile_sheets upsert failed", { code: sheetError.code });
    return NextResponse.json(
      { error: "プロフィールシートを保存できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  // ニックネーム・職業は台帳側にも反映する（メンバー一覧・掲示板と食い違わないように）
  const { error: memberError } = await supabase
    .from("members")
    .update({ nickname: text("nickname"), job: text("job") })
    .eq("id", member.id);

  if (memberError) {
    console.error("members update from sheet failed", { code: memberError.code });
    return NextResponse.json(
      { error: "シートは保存しましたが、氏名まわりの反映に失敗しました" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
}
