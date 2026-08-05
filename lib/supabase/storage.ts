// ============================================================
// Storage（プロフィール写真・投稿画像）の署名URL生成
// ============================================================
// 🔴 バケットは非公開。会員の顔写真は個人情報のため、URLを知る誰でも
//    取得できる公開バケットにはしない。表示はここで作る署名URL経由にする。
//
// 署名は1件ずつではなく createSignedUrls で一括発行する。
// 掲示板や439人のメンバー一覧で1件ずつ署名すると往復が爆発するため。
// ============================================================
import type { SupabaseClient } from "@supabase/supabase-js";

export const AVATAR_BUCKET = "avatars";
export const POST_IMAGE_BUCKET = "post-images";

/** 署名URLの有効期限（秒）。画面を開いている間もつ長さがあればよい。 */
const SIGNED_URL_TTL_SEC = 60 * 60;

/**
 * オブジェクトパスの配列 → { パス: 署名URL } の対応表。
 * null / 空文字 / 重複は呼び出し側で気にしなくてよいようここで吸収する。
 * 署名に失敗したパスは対応表に載らない（画面側は頭文字アイコンにフォールバックする）。
 */
export async function signStoragePaths(
  supabase: SupabaseClient,
  bucket: string,
  paths: (string | null | undefined)[]
): Promise<Record<string, string>> {
  const unique = Array.from(
    new Set(paths.filter((p): p is string => typeof p === "string" && p.length > 0))
  );
  if (unique.length === 0) return {};

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(unique, SIGNED_URL_TTL_SEC);

  if (error) {
    // 写真が出ないだけで画面自体は成立するので、ここでは落とさない。
    console.error("createSignedUrls failed", { bucket, code: error.name });
    return {};
  }

  const map: Record<string, string> = {};
  for (const item of data ?? []) {
    if (item.signedUrl && item.path) map[item.path] = item.signedUrl;
  }
  return map;
}

/** プロフィール写真をまとめて署名する。 */
export function signAvatarPaths(
  supabase: SupabaseClient,
  paths: (string | null | undefined)[]
) {
  return signStoragePaths(supabase, AVATAR_BUCKET, paths);
}

/** 投稿画像をまとめて署名する。 */
export function signPostImagePaths(
  supabase: SupabaseClient,
  paths: (string | null | undefined)[]
) {
  return signStoragePaths(supabase, POST_IMAGE_BUCKET, paths);
}
