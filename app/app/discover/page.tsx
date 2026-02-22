"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, MapPin, UtensilsCrossed, Shield, SlidersHorizontal } from "lucide-react";
import { getAllRecommendations, DiscoverRecommendation } from "@/lib/dashboard-data";

const tagFilters = ["すべて", "接待・会食向き", "経営者同士の会食", "一人で集中", "カジュアル", "大人数OK", "個室あり", "ヘルシー", "ワインが充実"];
const genreFilters = ["すべて", "寿司", "和食", "フレンチ", "イタリアン", "焼肉", "焼鳥", "カフェ", "ワインバー", "自然食", "天ぷら", "日本料理", "蕎麦"];

function RecommendationCard({ rec }: { rec: DiscoverRecommendation }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-6">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-base font-bold text-gray-900">{rec.restaurantName}</h3>
          <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
            <MapPin className="w-3.5 h-3.5" /><span>{rec.area}</span>
            <span className="text-gray-300">|</span><span>{rec.genre}</span>
          </div>
        </div>
        <UtensilsCrossed className="w-5 h-5 text-amber-400 flex-shrink-0" />
      </div>
      <p className="text-sm text-gray-600 leading-relaxed mb-4">{rec.story}</p>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {rec.contextTags.map((tag) => (
          <span key={tag} className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[11px] font-medium border border-amber-200">{tag}</span>
        ))}
      </div>
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <Link href={`/app/profile/${rec.memberId}`} className="flex items-center gap-2.5 group">
          <img src={rec.memberPhotoUrl} alt={rec.memberName} className="w-8 h-8 rounded-full object-cover border-2 border-white shadow ring-1 ring-gray-100" />
          <p className="text-sm font-bold text-gray-800 group-hover:text-amber-700 transition-colors">{rec.memberName}</p>
        </Link>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200">
          <Shield className="w-3 h-3 text-amber-500" />
          <span className="text-[11px] font-bold text-amber-700">{rec.memberTrustScore}</span>
        </div>
      </div>
    </div>
  );
}

export default function DiscoverPage() {
  const allRecs = useMemo(() => getAllRecommendations(), []);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTag, setActiveTag] = useState("すべて");
  const [activeGenre, setActiveGenre] = useState("すべて");
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    return allRecs.filter((rec) => {
      const matchesSearch = !searchQuery || rec.restaurantName.includes(searchQuery) || rec.area.includes(searchQuery) || rec.memberName.includes(searchQuery) || rec.story.includes(searchQuery);
      const matchesTag = activeTag === "すべて" || rec.contextTags.includes(activeTag);
      const matchesGenre = activeGenre === "すべて" || rec.genre.includes(activeGenre);
      return matchesSearch && matchesTag && matchesGenre;
    });
  }, [allRecs, searchQuery, activeTag, activeGenre]);

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-10 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">発見する</h1>
              <p className="text-sm text-gray-500 mt-0.5">信頼できる人のおすすめからお店を探す</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="店名・エリア・人名で検索..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
              </div>
              <button onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${showFilters ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}>
                <SlidersHorizontal className="w-4 h-4" /><span className="hidden sm:inline">絞り込み</span>
              </button>
            </div>
          </div>
          <div className="flex gap-2 mt-4 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
            {tagFilters.map((tag) => (
              <button key={tag} onClick={() => setActiveTag(tag)}
                className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeTag === tag ? "bg-amber-500 text-white" : "bg-white text-gray-600 border border-gray-200 hover:border-amber-300"}`}>
                {tag}
              </button>
            ))}
          </div>
          {showFilters && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs font-medium text-gray-500 mb-2">ジャンル</p>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                {genreFilters.map((genre) => (
                  <button key={genre} onClick={() => setActiveGenre(genre)}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${activeGenre === genre ? "bg-gray-900 text-white" : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"}`}>
                    {genre}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-sm text-gray-400 mb-6">{filtered.length}件のおすすめ</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((rec) => (<RecommendationCard key={rec.id} rec={rec} />))}
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-20">
            <UtensilsCrossed className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">該当するおすすめが見つかりません</p>
          </div>
        )}
      </div>
    </div>
  );
}
