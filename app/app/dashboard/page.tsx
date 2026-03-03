"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Search, ChevronRight, Building2, User, ChevronDown, X } from "lucide-react";
import {
  dashboardMembers,
  industryFilters,
  DashboardMember,
} from "@/lib/dashboard-data";

function MemberCard({ member }: { member: DashboardMember }) {
  return (
    <Link
      href={`/app/profile/${member.id}`}
      className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-4 group"
    >
      <img
        src={member.photoUrl}
        alt={member.name}
        className="w-11 h-11 rounded-full object-cover border-2 border-white shadow ring-1 ring-gray-100 flex-shrink-0"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-gray-900 truncate group-hover:text-amber-700 transition-colors">
            {member.name}
          </h3>
          <span className="text-[11px] text-gray-400 flex-shrink-0">
            {member.jobTitle}
          </span>
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
              member.memberType === "法人"
                ? "bg-blue-50 text-blue-600"
                : "bg-gray-50 text-gray-500"
            }`}
          >
            {member.memberType}
          </span>
        </div>
        <p className="text-xs text-gray-500 truncate mt-0.5">
          {member.headline}
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-amber-500 transition-colors flex-shrink-0" />
    </Link>
  );
}

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("全員");
  const [memberTypeFilter, setMemberTypeFilter] = useState<"全て" | "法人" | "個人">("全て");
  const [genreOpen, setGenreOpen] = useState(false);
  const [genreSearch, setGenreSearch] = useState("");
  const genreRef = useRef<HTMLDivElement>(null);

  // ドロップダウン外クリックで閉じる
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (genreRef.current && !genreRef.current.contains(e.target as Node)) {
        setGenreOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filteredGenres = industryFilters.filter(
    (g) => g === "全員" || g.includes(genreSearch)
  );

  const filtered = dashboardMembers.filter((m) => {
    const matchesSearch =
      !searchQuery ||
      m.name.includes(searchQuery) ||
      m.jobTitle.includes(searchQuery) ||
      m.headline.includes(searchQuery);

    const matchesFilter =
      activeFilter === "全員" || m.industry === activeFilter;

    const matchesMemberType =
      memberTypeFilter === "全て" || m.memberType === memberTypeFilter;

    return matchesSearch && matchesFilter && matchesMemberType;
  });

  return (
    <div className="min-h-screen">
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-xl font-bold text-gray-900">
              コミュニティメンバー
            </h1>
            {/* 検索 */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="名前・職種で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
          </div>

          {/* フィルター */}
          <div className="flex items-center gap-3 mt-4">
            {/* ジャンルドロップダウン */}
            <div ref={genreRef} className="relative flex-1">
              <button
                onClick={() => { setGenreOpen(!genreOpen); setGenreSearch(""); }}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors w-full sm:w-auto ${
                  activeFilter !== "全員"
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span className="truncate">{activeFilter === "全員" ? "ジャンルで絞り込み" : activeFilter}</span>
                {activeFilter !== "全員" ? (
                  <X
                    className="w-3.5 h-3.5 flex-shrink-0 hover:opacity-70"
                    onClick={(e) => { e.stopPropagation(); setActiveFilter("全員"); setGenreOpen(false); }}
                  />
                ) : (
                  <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${genreOpen ? "rotate-180" : ""}`} />
                )}
              </button>

              {genreOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl border border-gray-200 shadow-lg z-20 overflow-hidden">
                  {/* 検索入力 */}
                  <div className="p-2 border-b border-gray-100">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="ジャンルを検索..."
                        value={genreSearch}
                        onChange={(e) => setGenreSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        autoFocus
                      />
                    </div>
                  </div>
                  {/* ジャンルリスト */}
                  <div className="max-h-60 overflow-y-auto py-1">
                    {filteredGenres.map((genre) => (
                      <button
                        key={genre}
                        onClick={() => { setActiveFilter(genre); setGenreOpen(false); }}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                          activeFilter === genre
                            ? "bg-gray-900 text-white"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {genre}
                      </button>
                    ))}
                    {filteredGenres.length === 0 && (
                      <p className="px-4 py-3 text-sm text-gray-400 text-center">該当なし</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 法人/個人フィルタ */}
            <div className="flex gap-1 flex-shrink-0 border-l border-gray-200 pl-3">
              {(["全て", "法人", "個人"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setMemberTypeFilter(type)}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                    memberTypeFilter === type
                      ? "bg-gray-900 text-white"
                      : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {type === "法人" && <Building2 className="w-3 h-3" />}
                  {type === "個人" && <User className="w-3 h-3" />}
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* メンバーグリッド */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((member) => (
            <MemberCard key={member.id} member={member} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-400">該当するメンバーが見つかりません</p>
          </div>
        )}
      </div>
    </div>
  );
}
