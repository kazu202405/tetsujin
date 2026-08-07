"use client";

// ============================================================
// 紐づけ先の会員を選ぶ（入会申請の承認）
// ============================================================
// 台帳にメールが入っていない会員は、申請のメールと自動で一致しない。
// そのまま承認すると同じ人が2行できてしまうため、
// 運営が「この人です」と選べるようにする。
//
// 番号と氏名が並んでいれば判別できる、という前提で作っている。
// ============================================================

import { useEffect, useState } from "react";
import { Search, Link2, X } from "lucide-react";

export interface MemberHit {
  id: string;
  member_no: number | null;
  name: string;
  email: string | null;
  phone: string | null;
  job: string | null;
  is_withdrawn: boolean;
  has_account: boolean;
}

export function MemberPicker({
  defaultQuery,
  selected,
  onSelect,
  onCancel,
}: {
  /** 申請者の氏名。だいたい同姓同名で見つかるので初期値に入れる。 */
  defaultQuery: string;
  selected: MemberHit | null;
  onSelect: (member: MemberHit | null) => void;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState(defaultQuery);
  const [hits, setHits] = useState<MemberHit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const text = query.trim();
    if (!text) {
      setHits([]);
      return;
    }
    // 打つたびに投げると無駄なので少し待つ
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/admin/members/search?q=${encodeURIComponent(text)}`,
          { cache: "no-store" },
        );
        const body = response.ok ? ((await response.json()) as MemberHit[]) : [];
        if (!cancelled) setHits(body);
      } catch {
        if (!cancelled) setHits([]);
      }
      if (!cancelled) setLoading(false);
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  if (selected) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 border border-blue-200">
        <Link2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
        <span className="text-sm text-blue-900 flex-1 min-w-0 truncate">
          {selected.member_no != null && (
            <span className="font-mono text-xs text-blue-500 mr-1.5">
              No.{selected.member_no}
            </span>
          )}
          {selected.name} に紐づけます
        </span>
        <button
          onClick={() => onSelect(null)}
          className="text-blue-400 hover:text-blue-700"
          title="選び直す"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-gray-700">紐づける会員を選ぶ</p>
        <button onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600">
          やめる
        </button>
      </div>

      <div className="relative mb-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="会員番号 または 氏名"
          autoFocus
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
        {hits.map((hit) => (
          <button
            key={hit.id}
            onClick={() => onSelect(hit)}
            className="w-full flex items-center gap-3 px-2 py-2 text-left hover:bg-gray-50 rounded-lg"
          >
            <span className="font-mono text-xs text-gray-400 w-12 text-right flex-shrink-0">
              {hit.member_no ?? "—"}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm text-gray-900 truncate">
                {hit.name}
                {hit.is_withdrawn && (
                  <span className="ml-1.5 text-[10px] text-red-500">退会</span>
                )}
              </span>
              <span className="block text-[11px] text-gray-400 truncate">
                {hit.email || hit.phone || "連絡先なし"}
                {hit.job ? `・${hit.job}` : ""}
              </span>
            </span>
            {/* 既にログインしている人に別の申請を紐づけるのは、たいてい人違い */}
            {hit.has_account && (
              <span className="text-[10px] text-amber-600 flex-shrink-0">
                アカウント有
              </span>
            )}
          </button>
        ))}

        {!loading && query.trim() && hits.length === 0 && (
          <p className="text-xs text-gray-400 py-4 text-center">
            見つかりません。新規の方であれば「新しい会員として追加」で承認してください。
          </p>
        )}
        {loading && <p className="text-xs text-gray-400 py-4 text-center">検索中...</p>}
      </div>
    </div>
  );
}
