// ============================================================
// 出会い記録のクライアント側データアクセス
// ============================================================
// 記録は本人のメモ。相手には中身を見せず、「つながっている」事実だけが
// SNSリンクの公開範囲（つながり済みのみ）の判定に効く。
// ============================================================
"use client";

import { useCallback, useEffect, useState } from "react";
import { useCachedResource } from "./client-cache";

export interface ConnectionPerson {
  id: string;
  name: string;
  job: string;
  avatarUrl: string | null;
  isWithdrawn: boolean;
}

export interface ConnectionRecord {
  id: string;
  occasion: string;
  metOn: string | null;
  location: string;
  note: string;
  tags: string[];
  createdAt: string;
  person: ConnectionPerson;
}

export interface ConnectionInput {
  personId: string;
  occasion?: string;
  metOn?: string;
  location?: string;
  note?: string;
  tags?: string[];
}

async function readError(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error || fallback;
}

export function useConnections() {
  // 2回目以降は覚えている内容をすぐ出し、裏で取り直す
  const { data, status, reload } = useCachedResource<ConnectionRecord[]>(
    "connections",
    "/api/connections",
    EMPTY_CONNECTIONS,
  );
  return { connections: data, status, reload };
}

export async function createConnection(
  input: ConnectionInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await fetch("/api/connections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    return { ok: false, error: await readError(response, "記録できませんでした") };
  }
  return { ok: true };
}

export async function updateConnection(
  id: string,
  input: Omit<ConnectionInput, "personId">,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await fetch(`/api/connections/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    return { ok: false, error: await readError(response, "更新できませんでした") };
  }
  return { ok: true };
}

export async function deleteConnection(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await fetch(`/api/connections/${id}`, { method: "DELETE" });
  if (!response.ok) {
    return { ok: false, error: await readError(response, "削除できませんでした") };
  }
  return { ok: true };
}

// ============ タグ ============

/** 既定のタグ。会員が追加したタグと合わせて選択肢にする。 */
export const DEFAULT_CONNECTION_TAGS = ["コラボ可能性", "商談中", "紹介予定"];

// 参照が毎回変わらないよう定数にする（フックの依存が安定する）
const EMPTY_CONNECTIONS: ConnectionRecord[] = [];
const EMPTY_TAGS: string[] = [];

export function useConnectionTags() {
  const { data, reload } = useCachedResource<string[]>(
    "connection-tags",
    "/api/connections/tags",
    EMPTY_TAGS,
  );
  return { tags: data, reload };
}

export async function addConnectionTag(tag: string): Promise<boolean> {
  const response = await fetch("/api/connections/tags", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tag }),
  });
  return response.ok;
}

export async function removeConnectionTag(tag: string): Promise<boolean> {
  const response = await fetch(`/api/connections/tags?tag=${encodeURIComponent(tag)}`, {
    method: "DELETE",
  });
  return response.ok;
}
