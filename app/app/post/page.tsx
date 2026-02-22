"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ImagePlus,
  MapPin,
  UtensilsCrossed,
  Tag,
  PenSquare,
  Check,
} from "lucide-react";

const genreOptions = [
  "和食", "寿司", "フレンチ", "イタリアン", "中華",
  "焼肉", "焼鳥", "蕎麦・うどん", "カフェ", "バー・ワインバー",
  "自然食", "その他",
];

const contextTagOptions = [
  "接待・会食向き", "経営者同士の会食", "一人で集中", "カジュアル",
  "大人数OK", "個室あり", "ヘルシー", "ワインが充実", "和食",
];

export default function PostPage() {
  const [submitted, setSubmitted] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedGenre, setSelectedGenre] = useState("");

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            おすすめを投稿しました
          </h1>
          <p className="text-gray-600 leading-relaxed mb-8">
            あなたのストーリーがコミュニティに共有されました。
            <br />
            信頼の輪が広がっていきます。
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => { setSubmitted(false); setSelectedTags([]); setSelectedGenre(""); }}
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gray-900 text-white font-bold hover:bg-gray-800 transition-colors"
            >
              もう1件投稿する
            </button>
            <Link
              href="/app/dashboard"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors"
            >
              ダッシュボードへ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-10 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-xl font-bold text-gray-900">おすすめを投稿する</h1>
          <p className="text-sm text-gray-500 mt-1">あなたのストーリーで、信頼できるお店を紹介しましょう</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
            <h2 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5 text-amber-500" />
              お店の情報
            </h2>
            <div className="space-y-5">
              <div>
                <label htmlFor="restaurant-name" className="block text-sm font-medium text-gray-700 mb-1.5">
                  お店の名前 <span className="text-red-400">*</span>
                </label>
                <input type="text" id="restaurant-name" required placeholder="例: 鮨 さいとう"
                  className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="area" className="block text-sm font-medium text-gray-700 mb-1.5">
                    <MapPin className="w-4 h-4 inline mr-1" />エリア <span className="text-red-400">*</span>
                  </label>
                  <input type="text" id="area" required placeholder="例: 大阪・北新地"
                    className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm" />
                </div>
                <div>
                  <label htmlFor="genre" className="block text-sm font-medium text-gray-700 mb-1.5">
                    ジャンル <span className="text-red-400">*</span>
                  </label>
                  <select id="genre" required value={selectedGenre} onChange={(e) => setSelectedGenre(e.target.value)}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white">
                    <option value="">選択してください</option>
                    {genreOptions.map((g) => (<option key={g} value={g}>{g}</option>))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
            <h2 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
              <PenSquare className="w-5 h-5 text-amber-500" />
              あなたのストーリー
            </h2>
            <div className="space-y-5">
              <div>
                <label htmlFor="story" className="block text-sm font-medium text-gray-700 mb-1.5">
                  なぜこのお店を薦めるのか <span className="text-red-400">*</span>
                </label>
                <p className="text-xs text-gray-400 mb-2">スコアではなくストーリーで伝えましょう。</p>
                <textarea id="story" required rows={5}
                  placeholder="例: 大切な商談の前日に訪れた一軒。大将の丁寧な仕事に心が落ち着き、翌日の商談は見事に成功。"
                  className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">写真（任意）</label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-gray-300 transition-colors cursor-pointer">
                  <ImagePlus className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">クリックして写真を追加</p>
                  <p className="text-xs text-gray-300 mt-1">JPG, PNG（最大5MB）</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
            <h2 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Tag className="w-5 h-5 text-amber-500" />
              コンテキストタグ
            </h2>
            <p className="text-xs text-gray-400 mb-5">このお店はどんなシーンにおすすめですか？（複数選択可）</p>
            <div className="flex flex-wrap gap-2">
              {contextTagOptions.map((tag) => (
                <button key={tag} type="button" onClick={() => toggleTag(tag)}
                  className={`inline-flex items-center px-3.5 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedTags.includes(tag) ? "bg-amber-500 text-white border border-amber-500" : "bg-white text-gray-600 border border-gray-200 hover:border-amber-300"
                  }`}>
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
            <Link href="/app/dashboard" className="inline-flex items-center justify-center px-6 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors">
              キャンセル
            </Link>
            <button type="submit" className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-gray-900 text-white font-bold hover:bg-gray-800 transition-colors">
              <PenSquare className="w-4 h-4" />投稿する
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
