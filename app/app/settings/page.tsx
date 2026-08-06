"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  User,
  Bell,
  CreditCard,
  Check,
  MessageCircle,
  RotateCcw,
} from "lucide-react";
import { PushNotificationSetup } from "@/components/app/push-notification-setup";
import { AvatarUpload } from "@/components/app/avatar-upload";
import { resetOnboardingDemo } from "@/lib/onboarding-data";
import { useCurrentMember } from "@/lib/current-member";

export default function SettingsPage() {
  const currentMember = useCurrentMember();
  const [saved, setSaved] = useState(false);
  const [notifications, setNotifications] = useState({
    newRecommendation: true,
    eventInvite: true,
    newConnection: true,
    weeklyDigest: false,
  });
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const displayName = currentMember?.name ?? "会員";
  const initial = displayName.trim().charAt(0) || "T";

  // 本人が変更してよいのは一言（グリップ）だけ
  const [grip, setGrip] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<
    { type: "success" | "error"; text: string } | null
  >(null);

  useEffect(() => {
    setGrip(currentMember?.grip ?? "");
  }, [currentMember?.grip]);

  const saveProfile = async () => {
    setSavingProfile(true);
    setProfileMessage(null);
    try {
      const response = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grip }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setProfileMessage({ type: "error", text: body?.error || "保存できませんでした" });
      } else {
        setProfileMessage({ type: "success", text: "保存しました" });
      }
    } catch {
      setProfileMessage({ type: "error", text: "保存できませんでした（通信エラー）" });
    }
    setSavingProfile(false);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleResetOnboarding = () => {
    resetOnboardingDemo();
    setResetConfirm(false);
    setResetDone(true);
    setTimeout(() => setResetDone(false), 4000);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-14 lg:top-0 z-30 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-xl font-bold text-gray-900">設定</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* プロフィール写真（実データ：Storageへアップロード） */}
        <AvatarUpload />

        {/* Profile */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
          <h2 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
            <User className="w-5 h-5 text-gray-400" />
            プロフィール
          </h2>
          <div className="space-y-5">
            {/* 会員台帳が正本の項目は表示のみ（本人が書き換えると台帳と食い違うため） */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">氏名</label>
                <div className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-600">
                  {displayName}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  会員種別
                </label>
                <div className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-600">
                  {currentMember?.membership_type || "未設定"}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">一言</label>
              <input
                type="text"
                value={grip}
                onChange={(e) => setGrip(e.target.value)}
                placeholder="メンバー一覧に表示される短い紹介文"
                className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                メールアドレス
              </label>
              <div className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-600">
                {currentMember?.email || "未登録"}
              </div>
            </div>

            <p className="text-[11px] text-gray-400 leading-relaxed">
              氏名・会員種別・メールアドレスは会員台帳で管理しています（メールはログインIDも兼ねています）。
              変更が必要な場合は運営へご連絡ください。職業やニックネームは
              <Link href="/app/mypage/profile-sheet" className="text-gray-600 underline mx-1">
                プロフィールシート
              </Link>
              から編集できます。
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={saveProfile}
                disabled={savingProfile}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-60"
              >
                {savingProfile ? "保存中..." : "保存"}
              </button>
              {profileMessage && (
                <span
                  className={`text-xs ${
                    profileMessage.type === "success" ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {profileMessage.text}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
          <h2 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
            <Bell className="w-5 h-5 text-gray-400" />
            通知設定
          </h2>
          <div className="space-y-4">
            {[
              { key: "newRecommendation" as const, label: "新しいおすすめ投稿", desc: "フォロー中のメンバーが投稿した時" },
              { key: "eventInvite" as const, label: "会への招待", desc: "新しいイベントに招待された時" },
              { key: "newConnection" as const, label: "新しいつながり", desc: "メンバーがあなたを紹介した時" },
              { key: "weeklyDigest" as const, label: "週間ダイジェスト", desc: "毎週月曜にコミュニティの動きをまとめて配信" },
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between py-2"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {item.label}
                  </p>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
                <button
                  onClick={() =>
                    setNotifications((prev) => ({
                      ...prev,
                      [item.key]: !prev[item.key],
                    }))
                  }
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    notifications[item.key] ? "bg-amber-500" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      notifications[item.key] ? "translate-x-5" : ""
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 端末プッシュ通知（PWA / Web Push） */}
        <PushNotificationSetup />

        {/* Plan */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
          <h2 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-gray-400" />
            プラン・お支払い
          </h2>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl mb-4">
            <div>
              <p className="text-sm font-bold text-gray-900">
                スタンダードプラン
              </p>
              <p className="text-xs text-gray-500">月額 ¥3,980（税込）</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
              有効
            </span>
          </div>
          <p className="text-xs text-gray-400">
            次回請求日: 2026年3月14日 ・ Visa **** 4242
          </p>
        </div>

        {/* Save */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-gray-900 text-white font-bold hover:bg-gray-800 transition-colors"
          >
            {saved ? (
              <>
                <Check className="w-4 h-4" />
                保存しました
              </>
            ) : (
              "変更を保存"
            )}
          </button>
        </div>

        {/* 退会について（運営のみが処理。本人はLINEで申請） */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
          <h2 className="text-base font-bold text-gray-900 mb-2">退会について</h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-5">
            退会をご希望の場合は、運営までLINEでご連絡ください。担当者が手続きを承ります。
            退会後もお名前は記録として残りますが、プロフィールは非公開になります。
          </p>
          {/* TODO: 運営の公式LINE URL に差し替え（現状は仮値） */}
          <a
            href="https://line.me/R/ti/p/@tetsujin"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-[#06C755] hover:opacity-90 transition-opacity"
          >
            <MessageCircle className="w-4 h-4" />
            LINEで退会を相談する
          </a>
        </div>

        {/* はじめてガイドのリセット（デモ・動作確認用） */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
          <h2 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-gray-400" />
            はじめてガイドをもう一度見る
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-5">
            マイページ上部の「はじめてガイド」を、新規会員と同じ全ステップ未完了（0/6）の状態に戻します。デモ・動作確認用の機能です。
            <br />
            <span className="text-xs text-gray-400">
              ※ あなたのイベント参加・作成したプロフィール・掲示板の閲覧記録・送信した開示申請がクリアされます（他の人から届いた開示申請は残ります）。
            </span>
          </p>
          {!resetConfirm ? (
            <button
              onClick={() => setResetConfirm(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              はじめてガイドをリセット
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <p className="text-sm font-medium text-gray-900">
                初回状態に戻します。よろしいですか？
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleResetOnboarding}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-[var(--tetsu-pink)] hover:opacity-90 transition-opacity"
                >
                  はい、リセット
                </button>
                <button
                  onClick={() => setResetConfirm(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}
          {resetDone && (
            <p className="mt-3 text-sm font-medium text-green-600 flex items-center gap-1.5">
              <Check className="w-4 h-4" />
              リセットしました。マイページでご確認ください。
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
