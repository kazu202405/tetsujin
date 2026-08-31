import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signAvatarPaths } from "@/lib/supabase/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  const headers = { "Cache-Control": "private, no-store, max-age=0" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401, headers });
  }

  const { data, error } = await supabase.rpc("member_directory");
  if (error) {
    console.error("member_directory failed", { code: error.code });
    return NextResponse.json({ error: "メンバー一覧を取得できませんでした" }, { status: 500, headers });
  }

  const rows = (data ?? []) as Record<string, unknown>[];

  // 写真は非公開バケット。表示用の署名URLをまとめて発行して添える。
  const signed = await signAvatarPaths(
    supabase,
    rows.map((row) => row.avatar_path as string | null),
  );
  const withAvatars = rows.map((row) => ({
    ...row,
    avatar_url: signed[row.avatar_path as string] ?? null,
    // 🔴 必ず配列で返す。member_directory() に industries を足す前の状態でも
    //    画面が落ちないようにする（アプリのデプロイとDBの適用は別々に起きる）。
    industries: Array.isArray(row.industries) ? (row.industries as string[]) : [],
    // 同じ理由で、created_at も必ず文字列で返す（未適用でも並び替えが落ちない）
    created_at: typeof row.created_at === "string" ? row.created_at : "",
  }));

  return NextResponse.json(withAvatars, { headers });
}
