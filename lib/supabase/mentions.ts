// ============================================================
// 解決済みのメンション宛先をまとめて引く
// ============================================================
// 宛先を決めているのはDB側（resolve_mentions）で、その結果が
// post_mentions / comment_mentions に残っている。画面はそれを見て
// 「実際に届いたメンションだけ」に色を付ける。
//
// 🔴 ここを使わずに本文の @ を画面側で色付けすると、届いていない
//    文字列が届いたように見える。2026-09-05まで実際にそうなっていた。
//
// via_all（@all で入った人）は返さない。名指しではないので、本文の
// どこにも「@その人の名前」は書かれていない。@all という語そのものは
// 画面側が定型として色付ける。
// ============================================================
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ResolvedMention {
  id: string;
  name: string;
}

interface Row {
  post_id?: string;
  comment_id?: string;
  members: { id: string; name: string } | { id: string; name: string }[] | null;
}

/**
 * @param table 引く表
 * @param key   まとめるキー（post_mentions なら post_id）
 * @param ids   対象の投稿／コメントID
 * @returns { 投稿ID: 宛先[] }。引けなかったときは空（本文は出す。色が付かないだけ）
 */
export async function fetchMentions(
  supabase: SupabaseClient,
  table: "post_mentions" | "comment_mentions",
  key: "post_id" | "comment_id",
  ids: string[],
): Promise<Record<string, ResolvedMention[]>> {
  const out: Record<string, ResolvedMention[]> = {};
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return out;

  const { data, error } = await supabase
    .from(table)
    .select(`${key}, members ( id, name )`)
    .in(key, unique)
    .eq("via_all", false);

  if (error) {
    // 🔴 ここで例外にしない。メンションが引けないだけで投稿が読めなくなる方が困る。
    //    ただし握って終わりにはせず、必ずログに残す（残さないと気づけない）。
    console.error("mentions fetch failed", { table, code: error.code });
    return out;
  }

  for (const row of (data ?? []) as Row[]) {
    const id = (key === "post_id" ? row.post_id : row.comment_id) as string | undefined;
    if (!id) continue;
    // 埋め込みは1件でも配列で返ることがあるので、どちらでも受ける
    const member = Array.isArray(row.members) ? row.members[0] : row.members;
    if (!member?.id || !member?.name) continue;
    (out[id] ??= []).push({ id: member.id, name: member.name });
  }

  return out;
}
