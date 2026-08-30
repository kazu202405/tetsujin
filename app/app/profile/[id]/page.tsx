"use client";

// ============================================================
// 他の会員のプロフィール（名刺シート閲覧）
// ============================================================
// 以前は mock の人物データ（id 1〜10）しか引けず、実会員のUUIDを渡すと
// 404 になっていた。/api/profile/[id] 経由の実データに置き換えている。
// ============================================================

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, UserX } from "lucide-react";
import { ProfileSheetCard, type ProfileSheetData } from "@/components/app/profile-sheet-card";
import { SocialLinksSection } from "@/components/app/social-links-section";
import { ConnectionRequestButton } from "@/components/app/connection-request-button";
import { RoleBadge } from "@/components/app/role-badge";
import { roleLabelOf, type MemberRoleCode } from "@/lib/member-roles";

interface ProfileResponse extends ProfileSheetData {
  id: string;
  memberNo: number | null;
  name: string;
  membershipType: string | null;
  role: MemberRoleCode;
  isWithdrawn: boolean;
  isMe: boolean;
  avatarUrl: string | null;
  genre: string;
  industry: string;
  themeColor: string;
}

export default function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "loaded" | "notfound" | "error">("loading");

  // カードをコンテナ幅に合わせてスケーリング
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    fetch(`/api/profile/${id}`, { cache: "no-store" })
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 404) {
          setStatus("notfound");
          return;
        }
        if (!res.ok) {
          setStatus("error");
          return;
        }
        setProfile((await res.json()) as ProfileResponse);
        setStatus("loaded");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    const w = wrapRef.current;
    if (!w) return;
    const update = () => setScale(Math.min(1, w.clientWidth / 595));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(w);
    return () => observer.disconnect();
  }, [status]);

  const header = (
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
  );

  if (status === "loading") {
    return (
      <div className="min-h-screen">
        {header}
        <p className="text-center text-gray-400 py-24 text-sm">読み込み中...</p>
      </div>
    );
  }

  if (status === "notfound" || status === "error" || !profile) {
    return (
      <div className="min-h-screen">
        {header}
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <p className="text-sm text-gray-500">
              {status === "notfound"
                ? "このメンバーは見つかりませんでした"
                : "プロフィールを取得できませんでした"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 退会済みメンバー：名前と業種のみ表示、他はマスク
  if (profile.isWithdrawn) {
    return (
      <div className="min-h-screen">
        {header}
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
            {profile.membershipType && (
              <p className="text-xs text-gray-400 mb-6">{profile.membershipType}</p>
            )}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-50 text-gray-500 text-sm">
              <UserX className="w-4 h-4" />
              このメンバーは退会済みです
            </div>
          </div>
        </div>
      </div>
    );
  }

  const sheetData: ProfileSheetData = {
    memberNumber: profile.memberNo != null ? String(profile.memberNo) : "",
    nameKanji: profile.name,
    nameFurigana: profile.nameFurigana,
    nickname: profile.nickname,
    job: profile.job,
    location: profile.location,
    hobbies: profile.hobbies,
    myHistory: profile.myHistory,
    tetsujinBenefit: profile.tetsujinBenefit,
    hitokoto: profile.hitokoto,
    snsLinks: profile.snsLinks,
    photoUrl: profile.avatarUrl ?? "",
  };

  return (
    <div className="min-h-screen">
      {header}

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24 space-y-6">
        {profile.role !== "user" && (
          <div className="flex justify-center">
            <RoleBadge role={roleLabelOf(profile.role)} />
          </div>
        )}

        <div ref={wrapRef} className="flex justify-center">
          <ProfileSheetCard
            data={sheetData}
            primaryColor={profile.themeColor}
            scale={scale}
          />
        </div>

        {/* つながり申請。シートを読んだ直後がいちばん申し込みたい瞬間なので、
            連絡先(SNS)より前に置く。 */}
        {!profile.isMe && (
          <div className="flex justify-center">
            <ConnectionRequestButton memberId={profile.id} memberName={profile.name} />
          </div>
        )}

        {/* SNS・リンク（教えてもらった分だけ。残りは上のつながり申請から） */}
        {!profile.isMe && <SocialLinksSection viewerMode={{ ownerId: profile.id }} />}

        {profile.isMe && (
          <p className="text-center text-xs text-gray-400">
            これは自分のシートです。
            <Link href="/app/mypage/profile-sheet" className="text-gray-600 underline ml-1">
              編集する
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
