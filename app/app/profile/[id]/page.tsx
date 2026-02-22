"use client";

import { use, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  ChevronDown,
  UtensilsCrossed,
  Briefcase,
  Heart,
  Sparkles,
  Users,
  GraduationCap,
  Zap,
  Clock,
  Quote,
} from "lucide-react";
import { getMemberProfile } from "@/lib/dashboard-data";

export default function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const profile = getMemberProfile(id);
  const [showRecs, setShowRecs] = useState(false);

  if (!profile) return notFound();

  return (
    <div className="min-h-screen">
      {/* Header bar */}
      <div className="sticky top-0 z-10 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/app/dashboard"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            メンバー一覧に戻る
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile header */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 mb-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <img
              src={profile.photoUrl}
              alt={profile.name}
              className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg ring-1 ring-gray-100"
            />
            <div className="flex-1 min-w-0">
              <h1
                className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1"
                style={{ fontFamily: "'Noto Serif JP', serif" }}
              >
                {profile.name}
              </h1>
              <p className="text-gray-500 mb-4">
                {profile.roleTitle} / {profile.jobTitle}
              </p>

              {/* Context tags */}
              <div className="flex flex-wrap gap-2">
                {profile.contextTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Headline */}
          <p className="mt-6 text-lg text-gray-700 leading-relaxed border-l-4 border-amber-300 pl-4">
            {profile.headline}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Story timeline */}
            {profile.profileStory?.origin && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                <h2 className="text-lg font-bold text-gray-900 mb-6">ストーリー</h2>
                <div className="relative pl-8 space-y-6">
                  {/* Timeline line */}
                  <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-amber-300 via-amber-200 to-gray-200" />
                  {[
                    { label: "きっかけ", text: profile.profileStory.origin, icon: Briefcase, color: "bg-amber-50 text-amber-600" },
                    { label: "転機", text: profile.profileStory.turning, icon: Zap, color: "bg-orange-50 text-orange-500" },
                    { label: "今", text: profile.profileStory.now, icon: Clock, color: "bg-blue-50 text-blue-500" },
                  ].map((item) => (
                    <div key={item.label} className="relative">
                      <div className="absolute -left-8 top-0.5 w-6 h-6 rounded-full bg-white border-2 border-amber-300 flex items-center justify-center">
                        <item.icon className="w-3 h-3 text-amber-500" />
                      </div>
                      <p className="text-[11px] font-bold text-gray-400 mb-1">{item.label}</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Personality */}
            {profile.profileStory?.passion && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                <h2 className="text-lg font-bold text-gray-900 mb-6">{profile.name}さんについて</h2>
                <div className="space-y-5">
                  {[
                    { label: "好きなもの", text: profile.profileStory.passion, icon: Heart, bg: "bg-pink-50", iconColor: "text-pink-500" },
                    { label: "大事にしていること", text: profile.profileStory.values, icon: Sparkles, bg: "bg-blue-50", iconColor: "text-blue-500" },
                    { label: "学生の頃はどんな子供だった？", text: profile.profileStory.childhood, icon: GraduationCap, bg: "bg-purple-50", iconColor: "text-purple-500" },
                    { label: "こんな人と繋がりたい", text: profile.profileStory.lookingFor, icon: Users, bg: "bg-green-50", iconColor: "text-green-600" },
                  ].map((item) => (
                    <div key={item.label} className="flex gap-3">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center`}>
                        <item.icon className={`w-4 h-4 ${item.iconColor}`} />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-gray-400 mb-1">{item.label}</p>
                        <p className="text-sm text-gray-700 leading-relaxed">{item.text}</p>
                      </div>
                    </div>
                  ))}

                  {/* 大切にしていること（3つ） */}
                  {profile.profileStory.coreValues?.[0] && (
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-gray-400 mb-2">大切にしていること</p>
                        <ol className="space-y-1.5">
                          {profile.profileStory.coreValues.map((value, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-700 leading-relaxed">
                              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-100 text-amber-600 text-[10px] font-bold flex items-center justify-center mt-0.5">
                                {i + 1}
                              </span>
                              {value}
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Endorsements */}
            {profile.profileStory?.endorsements?.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                <h2 className="text-lg font-bold text-gray-900 mb-6">
                  「{profile.name}さんはこんな人」
                </h2>
                <div className="space-y-5">
                  {profile.profileStory.endorsements.map((e) => (
                    <div key={e.fromId} className="bg-gray-50 rounded-xl p-5">
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {e.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-start gap-2 mb-3">
                        <Quote className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-gray-600 leading-relaxed">{e.comment}</p>
                      </div>
                      <Link href={`/app/profile/${e.fromId}`} className="flex items-center gap-2 group">
                        <img src={e.fromPhotoUrl} alt={e.fromName} className="w-6 h-6 rounded-full object-cover" />
                        <span className="text-xs text-gray-500 group-hover:text-amber-700 transition-colors">{e.fromName}</span>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations (collapsible) */}
            {profile.recommendations.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                <button
                  onClick={() => setShowRecs(!showRecs)}
                  className="w-full flex items-center justify-between p-6 hover:bg-gray-50/50 transition-colors rounded-2xl"
                >
                  <div className="flex items-center gap-2">
                    <UtensilsCrossed className="w-5 h-5 text-amber-500" />
                    <span className="text-base font-bold text-gray-900">
                      {profile.name}さんのおすすめ
                    </span>
                    <span className="text-xs text-gray-400 ml-1">
                      {profile.recommendations.length}件
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      showRecs ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {showRecs && (
                  <div className="px-6 pb-6 space-y-4">
                    {profile.recommendations.map((rec) => (
                      <div
                        key={rec.id}
                        className="border border-gray-100 rounded-xl p-5 hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <h3 className="font-bold text-gray-900">
                              {rec.restaurantName}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
                              <MapPin className="w-3.5 h-3.5" />
                              <span>{rec.area}</span>
                              <span className="text-gray-300">|</span>
                              <span>{rec.genre}</span>
                            </div>
                          </div>
                          <UtensilsCrossed className="w-5 h-5 text-amber-400 flex-shrink-0" />
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed mb-3">
                          {rec.story}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {rec.contextTags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[11px] font-medium"
                            >
                              {tag}
                            </span>
                          ))}
                          <span className="text-[11px] text-gray-400 ml-auto">
                            {rec.postedAt}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Referral chain */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-sm font-bold text-gray-900 mb-4">
                紹介チェーン
              </h2>
              <div className="space-y-0">
                {profile.referralChain.map((name, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-amber-400 border-2 border-amber-200" />
                      {i < profile.referralChain.length - 1 && (
                        <div className="w-0.5 h-6 bg-amber-200" />
                      )}
                      {i === profile.referralChain.length - 1 && (
                        <div className="w-0.5 h-6 bg-amber-200" />
                      )}
                    </div>
                    <span className="text-sm text-gray-600 -mt-0.5">
                      {name}
                    </span>
                  </div>
                ))}
                {/* Current member */}
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-gray-900 border-2 border-gray-700" />
                  </div>
                  <span className="text-sm font-bold text-gray-900 -mt-0.5">
                    {profile.name}
                  </span>
                </div>
              </div>
            </div>

            {/* Services */}
            {profile.servicesSummary && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-sm font-bold text-gray-900 mb-3">
                  サービス
                </h2>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {profile.servicesSummary}
                </p>
              </div>
            )}

            {/* Industry */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-sm font-bold text-gray-900 mb-3">業種</h2>
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm font-medium">
                {profile.industry}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
