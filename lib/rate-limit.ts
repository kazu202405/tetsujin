import type { SupabaseClient } from "@supabase/supabase-js";

// ============================================================
// 書き込みの連投制限
// ============================================================
// 🔴 サーバーレス（Vercel）ではメモリ上のカウンタは使えない。
//    インスタンスが複数立ち、リクエストごとに別のプロセスへ振られるため、
//    「1分に5回まで」のつもりが実際には無制限になる。
//    ∴ 数える場所は必ず全員が共有しているところ＝DBにする。
//
// ここでやるのは「直近N秒に自分が作った行を数える」だけ。
// 追加のテーブルを作らず、既に created_at を持っているテーブルをそのまま使う。
// 精度より「壊れないこと」を優先する作り。
//
// 目的は攻撃の完全な遮断ではなく、
//   ・誤操作やクライアントのループで大量に書き込まれるのを止める
//   ・荒らしの手を鈍らせる
// の2つ。会員制で全書き込みが current_member_id() に紐づくため、
// 悪意ある連投は誰がやったか必ず特定できる（＝抑止はそちらが本体）。

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number; message: string };

/**
 * 直近 windowSec 秒のあいだに、その会員が作った行数を数えて上限と比べる。
 *
 * @param table       数える対象のテーブル（posts / post_comments など）
 * @param authorCol   会員IDが入っている列名
 * @param memberId    現在の会員ID
 * @param limit       windowSec 内に許す件数
 * @param windowSec   窓の長さ（秒）
 */
export async function checkWriteRate(
  supabase: SupabaseClient,
  {
    table,
    authorCol,
    memberId,
    limit,
    windowSec,
    label,
  }: {
    table: string;
    authorCol: string;
    memberId: string;
    limit: number;
    windowSec: number;
    label: string;
  },
): Promise<RateLimitResult> {
  const since = new Date(Date.now() - windowSec * 1000).toISOString();

  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq(authorCol, memberId)
    .gte("created_at", since);

  // 🔴 数えられなかったときは通す（fail-open）。
  //    ここで止めると、DBが一時的に不調なだけで投稿が全部できなくなる。
  //    連投制限は「あれば望ましい」ものであって、認証のような門ではない。
  //    ＝門は fail-closed、こういう緩衝は fail-open、と使い分ける。
  if (error) {
    console.error("rate limit check failed", { table, code: error.code });
    return { ok: true };
  }

  if ((count ?? 0) >= limit) {
    return {
      ok: false,
      retryAfterSec: windowSec,
      message: `${label}が続けて行われています。少し時間をおいてからお試しください。`,
    };
  }

  return { ok: true };
}
