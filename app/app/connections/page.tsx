"use client";

// ============================================================
// 出会い記録
// ============================================================
// 記録は本人のメモ。中身は相手にも他人にも見せない。
// 記録すると「つながっている」状態になり、相手の SNS リンクのうち
// 「つながり済みのみ」公開のものが見えるようになる。
// ============================================================

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Handshake,
  MapPin,
  CalendarDays,
  MessageSquare,
  Plus,
  Settings,
  X,
  Tag,
  Trash2,
  Search,
} from "lucide-react";
import { MemberAvatar } from "@/components/app/member-avatar";
import { AutoTextarea } from "@/components/app/auto-textarea";
import { ConnectionsHeader } from "./connections-header";
import {
  type ConnectionRecord,
  DEFAULT_CONNECTION_TAGS,
  addConnectionTag,
  createConnection,
  deleteConnection,
  removeConnectionTag,
  useConnectionTags,
  useConnections,
} from "@/lib/connections-api";
import { LoadingRows } from "@/components/app/skeleton";

interface DirectoryMember {
  id: string;
  name: string;
  job: string | null;
  avatar_url?: string | null;
}

function ConnectionCard({
  connection,
  onDelete,
}: {
  connection: ConnectionRecord;
  onDelete: (id: string) => void;
}) {
  const person = connection.person;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start gap-3">
        {person.isWithdrawn ? (
          <MemberAvatar name={person.name} url={person.avatarUrl} grayscale />
        ) : (
          <Link href={`/app/profile/${person.id}`}>
            <MemberAvatar name={person.name} url={person.avatarUrl} />
          </Link>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {person.isWithdrawn ? (
              <span className="text-sm font-bold text-gray-400">{person.name}（退会）</span>
            ) : (
              <Link
                href={`/app/profile/${person.id}`}
                className="text-sm font-bold text-gray-900 hover:text-amber-700 transition-colors"
              >
                {person.name}
              </Link>
            )}
            {person.job && <span className="text-xs text-gray-400">{person.job}</span>}
          </div>

          <div className="mt-2 space-y-1 text-xs text-gray-500">
            {connection.occasion && (
              <div className="flex items-center gap-1.5">
                <Handshake className="w-3.5 h-3.5 text-gray-400" />
                {connection.occasion}
              </div>
            )}
            {connection.metOn && (
              <div className="flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
                {connection.metOn}
              </div>
            )}
            {connection.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                {connection.location}
              </div>
            )}
          </div>

          {connection.note && (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 whitespace-pre-wrap">
              <MessageSquare className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
              <span>{connection.note}</span>
            </p>
          )}

          {connection.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {connection.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-medium"
                >
                  <Tag className="w-2.5 h-2.5" />
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => onDelete(connection.id)}
          className="p-2 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0"
          aria-label="削除"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function ConnectionsPage() {
  const { connections, status, reload } = useConnections();
  const { tags: customTags, reload: reloadTags } = useConnectionTags();

  const [activeTag, setActiveTag] = useState("すべて");
  const [showForm, setShowForm] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [newTagInput, setNewTagInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // 会員一覧（相手を選ぶため）
  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [memberSearch, setMemberSearch] = useState("");

  // 入力
  const [personId, setPersonId] = useState("");
  const [occasion, setOccasion] = useState("");
  const [metOn, setMetOn] = useState("");
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/members", { cache: "no-store" })
      .then(async (res) => (res.ok ? ((await res.json()) as DirectoryMember[]) : []))
      .then(setMembers)
      .catch(() => setMembers([]));
  }, []);

  const allTags = useMemo(() => {
    const used = new Set<string>();
    connections.forEach((c) => c.tags.forEach((t) => used.add(t)));
    customTags.forEach((t) => used.add(t));
    DEFAULT_CONNECTION_TAGS.forEach((t) => used.add(t));
    return Array.from(used).sort();
  }, [connections, customTags]);

  const filtered = useMemo(
    () =>
      activeTag === "すべて"
        ? connections
        : connections.filter((c) => c.tags.includes(activeTag)),
    [connections, activeTag]
  );

  const candidates = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    const list = q ? members.filter((m) => m.name.toLowerCase().includes(q)) : members;
    return list.slice(0, 20);
  }, [members, memberSearch]);

  const resetForm = () => {
    setPersonId("");
    setOccasion("");
    setMetOn("");
    setLocation("");
    setNote("");
    setSelectedTags([]);
    setMemberSearch("");
  };

  const submit = async () => {
    if (!personId) {
      setError("会った相手を選んでください");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await createConnection({
      personId,
      occasion,
      metOn,
      location,
      note,
      tags: selectedTags,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    resetForm();
    setShowForm(false);
    await reload();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const result = await deleteConnection(deleteTarget);
    setDeleteTarget(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    await reload();
  };

  return (
    <div className="min-h-screen">
      <ConnectionsHeader
        description="会った人を記録すると、その方の「つながり済みのみ」のSNSが見えます"
        action={
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            記録する
          </button>
        }
      />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24">
        {error && (
          <p className="mb-4 text-sm bg-red-50 text-red-700 rounded-xl px-4 py-3">{error}</p>
        )}

        {/* 記録フォーム */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                会った相手
              </label>
              {personId ? (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 rounded-xl">
                  <span className="text-sm text-gray-800 flex-1">
                    {members.find((m) => m.id === personId)?.name ?? "選択済み"}
                  </span>
                  <button
                    onClick={() => setPersonId("")}
                    className="text-xs text-gray-400 hover:text-gray-600 underline"
                  >
                    選び直す
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="名前で検索"
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                    />
                  </div>
                  <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                    {candidates.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setPersonId(m.id)}
                        className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 text-left transition-colors"
                      >
                        <MemberAvatar name={m.name} url={m.avatar_url} size="sm" />
                        <div className="min-w-0">
                          <p className="text-sm text-gray-800 truncate">{m.name}</p>
                          <p className="text-[11px] text-gray-400 truncate">{m.job || ""}</p>
                        </div>
                      </button>
                    ))}
                    {candidates.length === 0 && (
                      <p className="text-center text-xs text-gray-400 py-4">
                        該当する会員がいません
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">きっかけ</label>
                <input
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value)}
                  placeholder="例: 第12回 経営者グルメ会"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">日付</label>
                <input
                  type="date"
                  value={metOn}
                  onChange={(e) => setMetOn(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">場所</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="例: 鮨 まつもと（大阪・北新地）"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">メモ</label>
              <AutoTextarea
                value={note}
                onChange={setNote}
                minRows={3}
                placeholder="話した内容や次のアクションなど（自分だけに見えます）"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-gray-700">タグ</label>
                <button
                  onClick={() => setShowTagManager(true)}
                  className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600"
                >
                  <Settings className="w-3 h-3" />
                  タグを管理
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {allTags.map((tag) => {
                  const on = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() =>
                        setSelectedTags((prev) =>
                          on ? prev.filter((t) => t !== tag) : [...prev, tag]
                        )
                      }
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                        on
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                やめる
              </button>
              <button
                onClick={submit}
                disabled={saving || !personId}
                className="px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-40"
              >
                {saving ? "保存中..." : "記録する"}
              </button>
            </div>
          </div>
        )}

        {/* タグ絞り込み */}
        <div className="flex flex-wrap gap-2 mb-4">
          {["すべて", ...allTags].map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                activeTag === tag
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {status === "loading" && (
          <LoadingRows rows={4} />
        )}
        {status === "error" && (
          <p className="text-center text-red-600 py-20 text-sm">
            出会い記録を取得できませんでした。
          </p>
        )}

        {status === "loaded" && (
          <div className="space-y-3">
            {filtered.map((c) => (
              <ConnectionCard key={c.id} connection={c} onDelete={setDeleteTarget} />
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                <Handshake className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">
                  {connections.length === 0
                    ? "まだ記録がありません"
                    : "このタグの記録はありません"}
                </p>
                {connections.length === 0 && (
                  <p className="text-xs text-gray-300 mt-1">
                    会に参加したら「記録する」から残しておきましょう
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* タグ管理 */}
      {showTagManager && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowTagManager(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">タグを管理</h3>
              <button
                onClick={() => setShowTagManager(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1 mb-4 max-h-56 overflow-y-auto">
              {customTags.map((tag) => (
                <div
                  key={tag}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50"
                >
                  <Tag className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-sm text-gray-700 flex-1">{tag}</span>
                  <button
                    onClick={async () => {
                      await removeConnectionTag(tag);
                      await reloadTags();
                    }}
                    className="p-1 text-gray-300 hover:text-red-500 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {customTags.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">
                  追加したタグはまだありません
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <input
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                placeholder="新しいタグ"
                className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
              <button
                onClick={async () => {
                  const tag = newTagInput.trim();
                  if (!tag) return;
                  await addConnectionTag(tag);
                  setNewTagInput("");
                  await reloadTags();
                }}
                disabled={!newTagInput.trim()}
                className="px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-30"
              >
                追加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 削除確認 */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-bold text-gray-900 mb-2">この記録を削除しますか？</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-5">
              削除すると「つながり済み」ではなくなり、相手のSNSが見えなくなる場合があります。
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                やめる
              </button>
              <button
                onClick={confirmDelete}
                className="px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
