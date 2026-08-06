"use client";

// ============================================================
// おすすめ（会員が投稿するお店）
// ============================================================
// 旧mockは固定のお店リストだった。会員が自分で投稿し、
// 誰のおすすめかが分かる形にしている。
// ============================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, MapPin, UtensilsCrossed, Plus, Trash2, X } from "lucide-react";
import { MemberAvatar } from "@/components/app/member-avatar";
import { AutoTextarea } from "@/components/app/auto-textarea";

interface RecommendationItem {
  id: string;
  restaurantName: string;
  area: string;
  genre: string;
  story: string;
  tags: string[];
  createdAt: string;
  isMine: boolean;
  member: {
    id: string;
    name: string;
    job: string;
    avatarUrl: string | null;
    isWithdrawn: boolean;
  };
}

export default function DiscoverPage() {
  const [items, setItems] = useState<RecommendationItem[]>([]);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [search, setSearch] = useState("");
  const [activeGenre, setActiveGenre] = useState("すべて");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const [restaurantName, setRestaurantName] = useState("");
  const [area, setArea] = useState("");
  const [genre, setGenre] = useState("");
  const [story, setStory] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/recommendations", { cache: "no-store" });
      if (!response.ok) throw new Error("failed");
      setItems((await response.json()) as RecommendationItem[]);
      setStatus("loaded");
    } catch {
      setItems([]);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // ジャンルは投稿された内容から作る（固定リストにしない）
  const genres = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => i.genre && set.add(i.genre));
    return ["すべて", ...Array.from(set).sort()];
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items
      .filter((i) => activeGenre === "すべて" || i.genre === activeGenre)
      .filter(
        (i) =>
          !q ||
          i.restaurantName.toLowerCase().includes(q) ||
          i.area.toLowerCase().includes(q) ||
          i.story.toLowerCase().includes(q) ||
          i.member.name.toLowerCase().includes(q)
      );
  }, [items, search, activeGenre]);

  const submit = async () => {
    if (!restaurantName.trim()) {
      setError("お店の名前を入力してください");
      return;
    }
    setSaving(true);
    setError(null);
    const response = await fetch("/api/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurantName,
        area,
        genre,
        story,
        tags: tagsInput
          .split(/[,、\s]+/)
          .map((t) => t.trim())
          .filter(Boolean),
      }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error || "投稿できませんでした");
      return;
    }
    setRestaurantName("");
    setArea("");
    setGenre("");
    setStory("");
    setTagsInput("");
    setShowForm(false);
    await load();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const response = await fetch(`/api/recommendations/${deleteTarget}`, { method: "DELETE" });
    setDeleteTarget(null);
    if (!response.ok) {
      setError("削除できませんでした");
      return;
    }
    await load();
  };

  return (
    <div className="min-h-screen">
      <div className="sticky top-14 lg:top-0 z-30 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">おすすめ</h1>
              <p className="text-sm text-gray-500 mt-0.5">メンバーおすすめのお店</p>
            </div>
            <button
              onClick={() => setShowForm((v) => !v)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              投稿する
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24">
        {error && (
          <p className="mb-4 text-sm bg-red-50 text-red-700 rounded-xl px-4 py-3">{error}</p>
        )}

        {showForm && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6 space-y-3">
            <input
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              placeholder="お店の名前"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="エリア（例: 大阪・北新地）"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
              <input
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="ジャンル（例: 寿司）"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <AutoTextarea
              value={story}
              onChange={setStory}
              minRows={3}
              placeholder="どんなときに使えるお店か、ひとこと"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="タグ（スペース区切り。例: 接待 個室あり）"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                やめる
              </button>
              <button
                onClick={submit}
                disabled={saving || !restaurantName.trim()}
                className="px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-40"
              >
                {saving ? "投稿中..." : "投稿する"}
              </button>
            </div>
          </div>
        )}

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="お店・エリア・投稿者で検索..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        {genres.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {genres.map((g) => (
              <button
                key={g}
                onClick={() => setActiveGenre(g)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  activeGenre === g
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        )}

        {status === "loading" && (
          <p className="text-center text-gray-400 py-20 text-sm">読み込み中...</p>
        )}
        {status === "error" && (
          <p className="text-center text-red-600 py-20 text-sm">おすすめを取得できませんでした。</p>
        )}

        {status === "loaded" && (
          <div className="space-y-4">
            {filtered.map((rec) => (
              <div
                key={rec.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-gray-900">{rec.restaurantName}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5 flex-wrap">
                      {rec.area && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {rec.area}
                        </span>
                      )}
                      {rec.genre && (
                        <>
                          <span className="text-gray-300">|</span>
                          <span className="inline-flex items-center gap-1">
                            <UtensilsCrossed className="w-3.5 h-3.5" />
                            {rec.genre}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {rec.isMine && (
                    <button
                      onClick={() => setDeleteTarget(rec.id)}
                      className="p-2 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0"
                      aria-label="削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {rec.story && (
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-3">
                    {rec.story}
                  </p>
                )}

                {rec.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {rec.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 border border-gray-200 text-[10px]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                  {rec.member.isWithdrawn ? (
                    <MemberAvatar name={rec.member.name} url={rec.member.avatarUrl} size="sm" grayscale />
                  ) : (
                    <Link href={`/app/profile/${rec.member.id}`}>
                      <MemberAvatar name={rec.member.name} url={rec.member.avatarUrl} size="sm" />
                    </Link>
                  )}
                  <span className="text-xs text-gray-500">
                    {rec.member.name}さんのおすすめ
                  </span>
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                <UtensilsCrossed className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">
                  {items.length === 0 ? "まだ投稿がありません" : "条件に合うお店がありません"}
                </p>
                {items.length === 0 && (
                  <p className="text-xs text-gray-300 mt-1">
                    お気に入りのお店を「投稿する」から教えてください
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-gray-900">この投稿を削除しますか？</h2>
              <button
                onClick={() => setDeleteTarget(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-3 justify-end mt-5">
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
