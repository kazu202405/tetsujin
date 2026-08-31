// ============================================================
// 掲示板のクライアント側データアクセス
// ============================================================
// 実データは Supabase（posts / post_comments / post_likes / board_channels）。
// 画面はこのモジュール越しにだけ触る。
// ============================================================
"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { POST_IMAGE_BUCKET } from "@/lib/supabase/storage";
import { useCachedResource } from "./client-cache";
import type { MemberRoleCode } from "@/lib/member-roles";

export interface BoardChannel {
  id: string;
  slug: string;
  name: string;
  icon_key: string;
  color: string;
  sort_order: number;
  post_count: number;
  /** 自分がまだ読んでいない他の人の投稿数 */
  unread_count: number;
}

export interface BoardAuthor {
  id: string;
  name: string;
  nickname: string | null;
  job: string | null;
  avatarUrl: string | null;
  role?: MemberRoleCode;
  isWithdrawn: boolean;
}

export interface BoardPost {
  id: string;
  channelId: string;
  content: string;
  imageUrl: string | null;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  isMine: boolean;
  author: BoardAuthor;
}

export interface BoardComment {
  id: string;
  parentId: string | null;
  content: string;
  createdAt: string;
  isMine: boolean;
  author: BoardAuthor;
  replies?: BoardComment[];
}

export type LoadStatus = "loading" | "loaded" | "error";

async function readError(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error || fallback;
}

// ============ 表示用フォーマット ============

/** 投稿日時を「M月D日 HH:MM」で。1年以上前は年を付ける。 */
export function formatPostedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const date = `${d.getMonth() + 1}月${d.getDate()}日`;
  return sameYear ? `${date} ${time}` : `${d.getFullYear()}年${date} ${time}`;
}

// ============ チャンネル ============

const EMPTY_CHANNELS: BoardChannel[] = [];

export function useBoardChannels() {
  const { data, status, reload } = useCachedResource<BoardChannel[]>(
    "board-channels",
    "/api/board/channels",
    EMPTY_CHANNELS,
  );
  return { channels: data, status, reload };
}

export async function createChannel(input: {
  name: string;
  icon_key: string;
  color: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await fetch("/api/board/channels", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    return { ok: false, error: await readError(response, "チャンネルを追加できませんでした") };
  }
  return { ok: true };
}

export async function updateChannel(
  id: string,
  input: {
    name?: string;
    icon_key?: string;
    color?: string;
    is_archived?: boolean;
    /** 小さいほど上。並び替えは隣と値を入れ替える */
    sort_order?: number;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await fetch(`/api/board/channels/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    return { ok: false, error: await readError(response, "チャンネルを更新できませんでした") };
  }
  return { ok: true };
}

export async function deleteChannel(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await fetch(`/api/board/channels/${id}`, { method: "DELETE" });
  if (!response.ok) {
    return { ok: false, error: await readError(response, "チャンネルを削除できませんでした") };
  }
  return { ok: true };
}

// ============ 投稿 ============

export async function fetchPosts(channelId?: string, limit = 50): Promise<BoardPost[]> {
  const query = new URLSearchParams();
  if (channelId) query.set("channelId", channelId);
  query.set("limit", String(limit));

  const response = await fetch(`/api/board/posts?${query.toString()}`, { cache: "no-store" });
  if (!response.ok) throw new Error("failed to load posts");
  return (await response.json()) as BoardPost[];
}

export async function createPost(input: {
  channelId: string;
  content: string;
  imagePath?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await fetch("/api/board/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    return { ok: false, error: await readError(response, "投稿できませんでした") };
  }
  return { ok: true };
}

const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * 投稿画像をブラウザから直接 Storage へ上げ、保存先パスを返す。
 * 置き場所は "<自分のmembers.id>/<ファイル名>"（Storage側のポリシーと対応）。
 */
export async function uploadPostImage(
  memberId: string,
  file: File,
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  if (!IMAGE_TYPES.includes(file.type)) {
    return { ok: false, error: "JPEG / PNG / WebP の画像を選んでください" };
  }
  if (file.size > IMAGE_MAX_BYTES) {
    return { ok: false, error: "画像は10MBまでです" };
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${memberId}/${Date.now()}.${ext}`;

  const { error } = await createClient()
    .storage.from(POST_IMAGE_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (error) return { ok: false, error: "画像をアップロードできませんでした" };
  return { ok: true, path };
}

export async function toggleLike(
  postId: string,
  liked: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await fetch(`/api/board/posts/${postId}/like`, {
    method: liked ? "POST" : "DELETE",
  });
  if (!response.ok) {
    return { ok: false, error: await readError(response, "いいねを更新できませんでした") };
  }
  return { ok: true };
}

// ============ コメント ============

export async function fetchComments(postId: string): Promise<BoardComment[]> {
  const response = await fetch(`/api/board/posts/${postId}/comments`, { cache: "no-store" });
  if (!response.ok) throw new Error("failed to load comments");
  return (await response.json()) as BoardComment[];
}

export async function createComment(
  postId: string,
  input: { content: string; parentCommentId?: string | null },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await fetch(`/api/board/posts/${postId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    return { ok: false, error: await readError(response, "コメントできませんでした") };
  }
  return { ok: true };
}

// ============ 未読 ============

/** 未読件数（最終閲覧より後の他人の投稿数）。取得に失敗したら0扱い＝バッジを出さない。 */
export function useBoardUnread(): number {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch("/api/board/read", { cache: "no-store" });
        if (!response.ok) throw new Error("failed");
        const body = (await response.json()) as { unread: number };
        if (!cancelled) setUnread(body.unread);
      } catch {
        if (!cancelled) setUnread(0);
      }
    };
    void load();
    window.addEventListener("tetsujin-board-read", load);
    return () => {
      cancelled = true;
      window.removeEventListener("tetsujin-board-read", load);
    };
  }, []);

  return unread;
}

/** 掲示板を開いたときに既読化する。チャンネルを渡すとそのチャンネルだけ。 */
export async function markBoardRead(channelId?: string): Promise<void> {
  try {
    await fetch("/api/board/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(channelId ? { channelId } : {}),
    });
    window.dispatchEvent(new Event("tetsujin-board-read"));
  } catch {
    /* 既読化に失敗してもバッジが残るだけなので握りつぶす */
  }
}
