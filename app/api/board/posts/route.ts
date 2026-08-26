// ============================================================
// 掲示板の投稿 一覧 / 作成
// ============================================================
// 一覧は board_feed()（SECURITY DEFINER）経由。members は RLS で他人の行が
// 読めないため、投稿者の氏名や職業はこの関数が安全な列だけを返している。
// ============================================================
import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, requireMember } from "@/lib/supabase/api";
import { checkWriteRate } from "@/lib/rate-limit";
import { signAvatarPaths, signPostImagePaths } from "@/lib/supabase/storage";
import type { MemberRoleCode } from "@/lib/member-roles";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 50;

interface FeedRow {
  id: string;
  channel_id: string;
  content: string;
  image_path: string | null;
  created_at: string;
  author_id: string;
  author_name: string;
  author_nickname: string | null;
  author_job: string | null;
  author_avatar_path: string | null;
  author_role: MemberRoleCode;
  author_is_withdrawn: boolean;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  is_mine: boolean;
}

export async function GET(request: Request) {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;
  const { supabase } = guard;

  const url = new URL(request.url);
  const channelId = url.searchParams.get("channelId");
  const limitParam = Number(url.searchParams.get("limit"));
  const offsetParam = Number(url.searchParams.get("offset"));

  const { data, error } = await supabase.rpc("board_feed", {
    p_channel_id: channelId || null,
    p_limit: Number.isFinite(limitParam) && limitParam > 0 ? limitParam : DEFAULT_LIMIT,
    p_offset: Number.isFinite(offsetParam) && offsetParam > 0 ? offsetParam : 0,
  });

  if (error) {
    console.error("board_feed failed", { code: error.code });
    return NextResponse.json(
      { error: "投稿を取得できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  const rows = (data ?? []) as FeedRow[];

  // 顔写真・投稿画像は非公開バケット。表示用の署名URLをまとめて発行する。
  const [avatarUrls, imageUrls] = await Promise.all([
    signAvatarPaths(supabase, rows.map((r) => r.author_avatar_path)),
    signPostImagePaths(supabase, rows.map((r) => r.image_path)),
  ]);

  const posts = rows.map((r) => ({
    id: r.id,
    channelId: r.channel_id,
    content: r.content,
    imageUrl: r.image_path ? imageUrls[r.image_path] ?? null : null,
    createdAt: r.created_at,
    likeCount: Number(r.like_count),
    commentCount: Number(r.comment_count),
    likedByMe: r.liked_by_me,
    isMine: r.is_mine,
    author: {
      id: r.author_id,
      name: r.author_name,
      nickname: r.author_nickname,
      job: r.author_job,
      avatarUrl: r.author_avatar_path ? avatarUrls[r.author_avatar_path] ?? null : null,
      role: r.author_role,
      isWithdrawn: r.author_is_withdrawn,
    },
  }));

  return NextResponse.json(posts, { headers: NO_STORE_HEADERS });
}

export async function POST(request: Request) {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;
  const { supabase, member } = guard;

  const body = (await request.json().catch(() => null)) as {
    channelId?: string;
    content?: string;
    imagePath?: string | null;
  } | null;

  const content = body?.content?.trim();
  if (!body?.channelId || !content) {
    return NextResponse.json(
      { error: "チャンネルと本文が必要です" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }
  if (content.length > 5000) {
    return NextResponse.json(
      { error: "本文が長すぎます（5000文字まで）" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  // 連投制限（1分に5件まで）。誤操作やクライアントのループで
  // 掲示板が埋まるのを防ぐ。数える場所はDB（lib/rate-limit.ts の注記参照）。
  const rate = await checkWriteRate(supabase, {
    table: "posts",
    authorCol: "author_id",
    memberId: member.id,
    limit: 5,
    windowSec: 60,
    label: "投稿",
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

  const { data, error } = await supabase
    .from("posts")
    .insert({
      channel_id: body.channelId,
      author_id: member.id,
      content,
      image_path: body.imagePath || null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("post insert failed", { code: error.code });
    return NextResponse.json(
      { error: "投稿できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json({ id: data.id }, { headers: NO_STORE_HEADERS });
}
