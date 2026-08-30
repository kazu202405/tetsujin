// ============================================================
// 自分のSNSリンク 取得 / 保存
// ============================================================
// 保存は「送られてきた一覧で置き換える」方式。
// 画面側が追加・削除・並べ替えを自由にできるため、差分計算を持たせない。
// ============================================================
import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, requireMember } from "@/lib/supabase/api";
import { type SocialPlatform, normalizeSocialUrl } from "@/lib/social-links";

export const dynamic = "force-dynamic";

const PLATFORMS = new Set(["line", "instagram", "x", "facebook", "website", "other"]);
const VISIBILITIES = new Set(["public", "approved", "private"]);
const MAX_LINKS = 12;

export async function GET() {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;
  const { supabase, member } = guard;

  const { data, error } = await supabase
    .from("member_social_links")
    .select("id, platform, label, url, visibility, sort_order")
    .eq("member_id", member.id)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("social links select failed", { code: error.code });
    return NextResponse.json(
      { error: "SNSリンクを取得できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json(data ?? [], { headers: NO_STORE_HEADERS });
}

export async function PUT(request: Request) {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;
  const { supabase, member } = guard;

  const body = (await request.json().catch(() => null)) as {
    links?: {
      id?: string;
      platform?: string;
      label?: string | null;
      url?: string;
      visibility?: string;
    }[];
  } | null;

  if (!Array.isArray(body?.links)) {
    return NextResponse.json(
      { error: "リクエストが不正です" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }
  if (body.links.length > MAX_LINKS) {
    return NextResponse.json(
      { error: `リンクは${MAX_LINKS}件までです` },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const rows: {
    member_id: string;
    platform: string;
    label: string | null;
    url: string;
    visibility: string;
    sort_order: number;
  }[] = [];

  for (const [index, link] of body.links.entries()) {
    const raw = (link.url ?? "").trim();
    if (!raw) continue; // 入力途中の空行は保存しない

    if (!PLATFORMS.has(link.platform ?? "")) {
      return NextResponse.json(
        { error: "対応していないSNSが含まれています" },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }
    if (!VISIBILITIES.has(link.visibility ?? "")) {
      return NextResponse.json(
        { error: "公開範囲の指定が不正です" },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }
    if (raw.length > 500) {
      return NextResponse.json(
        { error: "URLが長すぎます" },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    // 🔴 http/https 以外は受け付けない。`javascript:` を入れられると
    //    そのリンクを踏んだ別の会員の画面で動いてしまう。
    //    ついでにスキームの補完と、LINEのアプリを開く形への直しもここで。
    const url = normalizeSocialUrl(link.platform as SocialPlatform, raw);
    if (!url) {
      return NextResponse.json(
        { error: "リンクは http:// または https:// で始まるものだけ登録できます" },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    rows.push({
      member_id: member.id,
      platform: link.platform as string,
      label: link.label?.trim() || null,
      url,
      visibility: link.visibility as string,
      sort_order: index,
    });
  }

  // 🔴 開示申請はリンクを参照している（ON DELETE CASCADE）。
  //    全消し→再作成にすると、承認済みの開示が毎回消えてしまう。
  //    ∴ 送られてこなかったリンクだけを消す。
  const keepIds = body.links
    .map((l) => l.id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  if (keepIds.length > 0) {
    await supabase
      .from("member_social_links")
      .delete()
      .eq("member_id", member.id)
      .not("id", "in", `(${keepIds.join(",")})`);
  } else {
    await supabase.from("member_social_links").delete().eq("member_id", member.id);
  }

  // 既存は更新、新規は作成
  for (const [index, link] of body.links.entries()) {
    const row = rows.find((r) => r.sort_order === index);
    if (!row) continue;

    if (link.id) {
      const { error } = await supabase
        .from("member_social_links")
        .update({
          platform: row.platform,
          label: row.label,
          url: row.url,
          visibility: row.visibility,
          sort_order: row.sort_order,
        })
        .eq("id", link.id)
        .eq("member_id", member.id);
      if (error) {
        console.error("social link update failed", { code: error.code });
        return NextResponse.json(
          { error: "SNSリンクを保存できませんでした" },
          { status: 500, headers: NO_STORE_HEADERS },
        );
      }
    } else {
      const { error } = await supabase.from("member_social_links").insert(row);
      if (error) {
        console.error("social link insert failed", { code: error.code });
        return NextResponse.json(
          { error: "SNSリンクを保存できませんでした" },
          { status: 500, headers: NO_STORE_HEADERS },
        );
      }
    }
  }

  return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
}
