// ============================================================
// 掲示板のクライアント側データアクセス
// ============================================================
// 実データは Supabase（posts / post_comments / post_likes / board_channels）。
// 画面はこのモジュール越しにだけ触る。
// ============================================================
"use client";

import { useCallback, useEffect, useState } from "react";
import type { ResolvedMention } from "@/components/app/rich-text";
import { dedupedFetch, getCached, setCached } from "@/lib/client-cache";

/** 解決済みのメンション宛先（色付けとリンクに使う） */
export type { ResolvedMention };
import { createClient } from "@/lib/supabase/client";
import { shrinkImageForUpload } from "@/lib/image-resize";
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
  /** 編集された投稿には日時が入る（画面に「編集済み」と出す） */
  editedAt: string | null;
  /** サーバーが解決した宛先。ここに無い @文字列 は色を付けない＝届いていない */
  mentions: ResolvedMention[];
  author: BoardAuthor;
}

export interface BoardComment {
  id: string;
  parentId: string | null;
  content: string;
  createdAt: string;
  isMine: boolean;
  editedAt: string | null;
  /** 削除済み。返信がぶら下がっていると会話が読めなくなるので行は残してある */
  isDeleted: boolean;
  likeCount: number;
  likedByMe: boolean;
  /** サーバーが解決した宛先。ここに無い @文字列 は色を付けない＝届いていない */
  mentions: ResolvedMention[];
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
const CHANNELS_KEY = "board-channels";

export function useBoardChannels() {
  const { data, status, reload, setData } = useCachedResource<BoardChannel[]>(
    CHANNELS_KEY,
    "/api/board/channels",
    EMPTY_CHANNELS,
  );

  /**
   * 既読にしたチャンネルのバッジだけ手元で0にする。
   *
   * 🔴 ここで取り直さない。既読化の直後に一覧を引き直すと、
   *    「たった今こちらが0にした」ことを確かめるためだけに1往復増える
   *    （チャンネルを切り替えるたびに毎回）。
   *    他の値は既読化では変わらないので、手元を直せば足りる。
   */
  // 🔴 依存に data を入れないこと。入れると一覧が変わるたびにこの関数の
  //    正体（参照）が変わり、これを依存に持つ画面側の useEffect が再実行され、
  //    その中で既読化 → 一覧が変わる → また再実行、と無限に回る。
  //    実際に1回踏んだ（2026-09-07・掲示板が posts と read を延々と叩いた）。
  //    ∴ 今の値は手元の控えから読み、依存は setData（Reactが固定）だけにする。
  const markChannelRead = useCallback(
    (channelId: string) => {
      const current = getCached<BoardChannel[]>(CHANNELS_KEY);
      const target = current?.find((c) => c.id === channelId);
      // 既に0なら何もしない（同じ値で書き換えて再描画を誘発しない）
      if (!current || !target || target.unread_count === 0) return;
      const next = current.map((c) =>
        c.id === channelId ? { ...c, unread_count: 0 } : c,
      );
      setCached(CHANNELS_KEY, next);
      setData(next);
    },
    [setData],
  );

  return { channels: data, status, reload, markChannelRead };
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

  // 掲示板は原寸を出さないので、上げる前に長辺1600pxまで縮める。
  // 失敗したら元のファイルがそのまま返る（投稿できなくなる方が困る）。
  const upload = await shrinkImageForUpload(file);

  const ext = upload.type === "image/png" ? "png" : upload.type === "image/webp" ? "webp" : "jpg";
  const path = `${memberId}/${Date.now()}.${ext}`;

  const { error } = await createClient()
    .storage.from(POST_IMAGE_BUCKET)
    .upload(path, upload, { cacheControl: "3600", upsert: false });

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

/** コメントのいいね。投稿のいいねと同じ形（付ける＝POST／外す＝DELETE）。 */
export async function toggleCommentLike(
  commentId: string,
  liked: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await fetch(`/api/board/comments/${commentId}/like`, {
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
        // サイドバーと下タブが同時に呼ぶので、取得だけまとめる
        const body = await dedupedFetch<{ unread: number }>(
          "board-unread",
          "/api/board/read",
        );
        if (!cancelled) setUnread(body.unread);
      } catch {
        if (!cancelled) setUnread(0);
      }
    };
    // 既読化した本人からは新しい件数が一緒に届く。
    // その場合は数えに行かない（1往復まるごと減る）。
    const onRead = (event: Event) => {
      const next = (event as CustomEvent<{ unread?: number | null }>).detail?.unread;
      if (typeof next === "number") {
        if (!cancelled) setUnread(next);
        return;
      }
      void load();
    };
    void load();
    window.addEventListener("tetsujin-board-read", onRead);
    return () => {
      cancelled = true;
      window.removeEventListener("tetsujin-board-read", onRead);
    };
  }, []);

  return unread;
}

/**
 * 掲示板を開いたときに既読化する。チャンネルを渡すとそのチャンネルだけ。
 * 既読化した直後の未読件数を返す（バッジを数え直すための往復を省くため）。
 */
export async function markBoardRead(channelId?: string): Promise<number | null> {
  try {
    const response = await fetch("/api/board/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(channelId ? { channelId } : {}),
    });
    const body = (await response.json().catch(() => null)) as { unread?: number | null } | null;
    const unread = typeof body?.unread === "number" ? body.unread : null;
    window.dispatchEvent(
      new CustomEvent("tetsujin-board-read", { detail: { unread } }),
    );
    return unread;
  } catch {
    /* 既読化に失敗してもバッジが残るだけなので握りつぶす */
    return null;
  }
}

// ============ 編集・削除 ============
// 判定はDB側（本人だけ編集できる／削除は本人か運営）。
// ここは呼ぶだけで、返ってきた理由をそのまま画面に渡す。

export async function editPost(
  id: string,
  content: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await fetch(`/api/board/posts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!response.ok) return { ok: false, error: await readError(response, "編集できませんでした") };
  return { ok: true };
}

export async function deletePost(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await fetch(`/api/board/posts/${id}`, { method: "DELETE" });
  if (!response.ok) return { ok: false, error: await readError(response, "削除できませんでした") };
  return { ok: true };
}

export async function editComment(
  id: string,
  content: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await fetch(`/api/board/comments/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!response.ok) return { ok: false, error: await readError(response, "編集できませんでした") };
  return { ok: true };
}

export async function deleteComment(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await fetch(`/api/board/comments/${id}`, { method: "DELETE" });
  if (!response.ok) return { ok: false, error: await readError(response, "削除できませんでした") };
  return { ok: true };
}
