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
  }));

  return NextResponse.json(withAvatars, { headers });
}
