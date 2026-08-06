// ============================================================
// 出会い記録のクライアント側データアクセス
// ============================================================
// 記録は本人のメモ。相手には中身を見せず、「つながっている」事実だけが
// SNSリンクの公開範囲（つながり済みのみ）の判定に効く。
// ============================================================
"use client";

import { useCallback, useEffect, useState } from "react";

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
  const [connections, setConnections] = useState<ConnectionRecord[]>([]);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");

  const reload = useCallback(async () => {
    try {
      const response = await fetch("/api/connections", { cache: "no-store" });
      if (!response.ok) throw new Error("failed");
      setConnections((await response.json()) as ConnectionRecord[]);
      setStatus("loaded");
    } catch {
      setConnections([]);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { connections, status, reload };
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

export function useConnectionTags() {
  const [tags, setTags] = useState<string[]>([]);

  const reload = useCallback(async () => {
    try {
      const response = await fetch("/api/connections/tags", { cache: "no-store" });
      if (!response.ok) throw new Error("failed");
      setTags((await response.json()) as string[]);
    } catch {
      setTags([]);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { tags, reload };
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
