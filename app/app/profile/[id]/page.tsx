"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, UserX } from "lucide-react";
import { getMemberProfile, MemberProfile } from "@/lib/dashboard-data";
import {
  ProfileSheetCard,
  ProfileSheetData,
} from "@/components/app/profile-sheet-card";
import { SocialLinksSection } from "@/components/app/social-links-section";
import { CURRENT_USER_ID, isConnectedWithMe } from "@/lib/connections-data";
import { useIsWithdrawn } from "@/lib/withdrawal-data";

// メンバーごとに少しだけ色を変える（メンバー本人のテーマ設定が無いため id から決定）
const SHEET_PALETTE = [
  "#2a2a3e",
  "#2b4a8c",
  "#1a6b6b",
  "#a0522d",
  "#b83560",
  "#6b2d6b",
  "#5c3d1e",
  "#2a6b45",
];

// メンバープロフィール → シート表示データ（ある項目だけ・無い欄は空でカード側が非表示）
function toSheetData(profile: MemberProfile): ProfileSheetData {
  const story = profile.profileStory;
  const myHistory = story?.origin
    ? [story.origin, story.turning, story.now].filter(Boolean).join("\n\n")
    : profile.headline ?? "";
  const hitokoto =
    story?.coreValues && story.coreValues.length > 0
      ? story.coreValues.map((v) => `●${v}`).join("\n")
      : story?.values ?? profile.headline ?? "";

  return {
    memberNumber: "",
    nameKanji: profile.name,
    nameFurigana: "",
    nickname: "",
    job: [profile.roleTitle, profile.jobTitle].filter(Boolean).join("\n"),
    location: "",
    hobbies: story?.passion ?? "",
    myHistory,
    tetsujinBenefit: "",
    hitokoto,
    lineUrl: "",
    instagramUrl: "",
    photoUrl: profile.photoUrl,
  };
}

export default function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const profile = getMemberProfile(id);
  const isWithdrawn = useIsWithdrawn(id, profile?.isWithdrawn);

  // カードをコンテナ幅に合わせてスケーリング
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const w = wrapRef.current;
    if (!w) return;
    const update = () => setScale(Math.min(1, w.clientWidth / 595));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(w);
    return () => observer.disconnect();
  }, [isWithdrawn]);

  if (!profile) return notFound();

  // 退会済みメンバー：名前と業種のみ表示、他はマスク
  if (isWithdrawn) {
    return (
      <div className="min-h-screen">
        <div className="sticky top-14 lg:top-0 z-30 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Link
              href="/app/members"
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              メンバー一覧に戻る
            </Link>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gray-100 flex items-center justify-center">
              <UserX className="w-9 h-9 text-gray-400" />
            </div>
            <h1
              className="text-2xl font-bold text-gray-600 mb-2"
              style={{ fontFamily: "'Noto Serif JP', serif" }}
            >
              {profile.name}
            </h1>
            <p className="text-xs text-gray-400 mb-6">{profile.industry}</p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-50 text-gray-500 text-sm">
              <UserX className="w-4 h-4" />
              このメンバーは退会済みです
            </div>
          </div>
        </div>
      </div>
    );
  }

  const sheetData = toSheetData(profile);
  const primaryColor = SHEET_PALETTE[Number(id) % SHEET_PALETTE.length] ?? SHEET_PALETTE[0];

  return (
    <div className="min-h-screen">
      {/* Header bar */}
      <div className="sticky top-14 lg:top-0 z-30 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/app/members"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            メンバー一覧に戻る
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24 space-y-6">
        {/* プロフィールシート（閲覧専用） */}
        <div ref={wrapRef} className="flex justify-center">
          <ProfileSheetCard
            data={sheetData}
            primaryColor={primaryColor}
            scale={scale}
          />
        </div>

        {/* SNS・リンク（開示申請フロー） */}
        <SocialLinksSection
          viewerMode={{
            links: profile.socialLinks,
            isConnected: isConnectedWithMe(id),
            isOwner: id === CURRENT_USER_ID,
            viewerId: CURRENT_USER_ID,
            ownerId: id,
          }}
        />
      </div>
    </div>
  );
}
