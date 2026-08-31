// ============================================================
// 投稿のコメントスレッド 取得 / 追加
// ============================================================
// 返信は1階層まで（DB側の enforce_comment_depth トリガでも担保している）。
// ============================================================
import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, requireMember } from "@/lib/supabase/api";
import { checkWriteRate } from "@/lib/rate-limit";
import { signAvatarPaths } from "@/lib/supabase/storage";

export const dynamic = "force-dynamic";

interface ThreadRow {
  edited_at: string | null;
  is_deleted: boolean;
  id: string;
  post_id: string;
  parent_comment_id: string | null;
  content: string;
  created_at: string;
  author_id: string;
  author_name: string;
  author_nickname: string | null;
  author_job: string | null;
  author_avatar_path: string | null;
  author_is_withdrawn: boolean;
  is_mine: boolean;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;
  const { supabase } = guard;

  const { id } = await params;
  const { data, error } = await supabase.rpc("post_thread", { p_post_id: id });

  if (error) {
    console.error("post_thread failed", { code: error.code });
    return NextResponse.json(
      { error: "コメントを取得できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  const rows = (data ?? []) as ThreadRow[];
  const avatarUrls = await signAvatarPaths(
    supabase,
    rows.map((r) => r.author_avatar_path),
  );

  const toItem = (r: ThreadRow) => ({
    id: r.id,
    parentId: r.parent_comment_id,
    // 🔴 削除済みの本文は返さない。DB側でも空にしてあるが、
    //    「見せない」判断をここでも持たせておく（入口が増えても漏れない）。
    content: r.is_deleted ? "" : r.content,
    createdAt: r.created_at,
    isMine: r.is_mine,
    editedAt: r.edited_at ?? null,
    isDeleted: Boolean(r.is_deleted),
    author: {
      id: r.author_id,
      name: r.author_name,
      nickname: r.author_nickname,
      job: r.author_job,
      avatarUrl: r.author_avatar_path ? avatarUrls[r.author_avatar_path] ?? null : null,
      isWithdrawn: r.author_is_withdrawn,
    },
  });

  // 親コメント配下に返信をぶら下げた形にして返す（画面がそのまま描ける形）
  const parents = rows.filter((r) => !r.parent_comment_id).map(toItem);
  const repliesByParent = new Map<string, ReturnType<typeof toItem>[]>();
  for (const r of rows) {
    if (!r.parent_comment_id) continue;
    const list = repliesByParent.get(r.parent_comment_id) ?? [];
    list.push(toItem(r));
    repliesByParent.set(r.parent_comment_id, list);
  }

  const comments = parents.map((p) => ({
    ...p,
    replies: repliesByParent.get(p.id) ?? [],
  }));

  return NextResponse.json(comments, { headers: NO_STORE_HEADERS });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;
  const { supabase, member } = guard;

  const body = (await request.json().catch(() => null)) as {
    content?: string;
    parentCommentId?: string | null;
  } | null;

  const content = body?.content?.trim();
  if (!content) {
    return NextResponse.json(
      { error: "コメントを入力してください" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }
  if (content.length > 2000) {
    return NextResponse.json(
      { error: "コメントが長すぎます（2000文字まで）" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  // 連投制限（1分に10件まで）。投稿より会話のテンポが速いので枠を広く取る。
  const rate = await checkWriteRate(supabase, {
    table: "post_comments",
    authorCol: "author_id",
    memberId: member.id,
    limit: 10,
    windowSec: 60,
    label: "コメント",
  });
  if (!rate.ok) {
    return NextResponse.json(
      { error: rate.message },
      {
        status: 429,
        headers: { ...NO_STORE_HEADERS, "Retry-After": String(rate.retryAfterSec) },
      },
    );
  }

  const { id } = await params;
  const { data, error } = await supabase
    .from("post_comments")
    .insert({
      post_id: id,
      parent_comment_id: body?.parentCommentId || null,
      author_id: member.id,
      content,
    })
    .select("id")
    .single();

  if (error) {
    // 23514 = 返信への返信・別投稿への返信をDB側で止めた場合
    const message =
      error.code === "23514"
        ? "この返信先には返信できません"
        : "コメントできませんでした";
    console.error("comment insert failed", { code: error.code });
    return NextResponse.json({ error: message }, { status: 400, headers: NO_STORE_HEADERS });
  }

  return NextResponse.json({ id: data.id }, { headers: NO_STORE_HEADERS });
}
