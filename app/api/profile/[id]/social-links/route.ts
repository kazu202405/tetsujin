// ============================================================
// ある会員のSNSリンク（見る人の権限に応じた形で返す）
// ============================================================
// 判定はDBの social_links_for() が行い、見えないリンクの url は NULL で返る。
// ∴ このAPIの戻り値に見えないURLが載ることはない。
// ============================================================
import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, requireMember } from "@/lib/supabase/api";

export const dynamic = "force-dynamic";

interface Row {
  id: string;
  platform: string;
  label: string | null;
  url: string | null;
  visibility: string;
  is_owner: boolean;
  visible: boolean;
  disclosure_status: string | null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;
  const { supabase } = guard;

  const { id } = await params;
  const { data, error } = await supabase.rpc("social_links_for", { p_owner_id: id });

  if (error) {
    console.error("social_links_for failed", { code: error.code });
    return NextResponse.json(
      { error: "SNSリンクを取得できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json(
    ((data ?? []) as Row[]).map((r) => ({
      id: r.id,
      platform: r.platform,
      label: r.label,
      url: r.url,
      visibility: r.visibility,
      isOwner: r.is_owner,
      visible: r.visible,
      disclosureStatus: r.disclosure_status,
    })),
    { headers: NO_STORE_HEADERS },
  );
}
