"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  User,
  Bell,
  Check,
  MessageCircle,
  RotateCcw,
} from "lucide-react";
import { PushNotificationSetup } from "@/components/app/push-notification-setup";
import { AvatarUpload } from "@/components/app/avatar-upload";
import { BillingSection } from "@/components/app/billing-section";
import { clearClientCache } from "@/lib/client-cache";
import { useCurrentMember } from "@/lib/current-member";

const FIELD =
  "block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent";

export default function SettingsPage() {
  const currentMember = useCurrentMember();
  // 通知の受け取り設定（種類ごと）。押した時点で保存する。
  const [prefs, setPrefs] = useState({
    board: true,
    events: true,
    connections: true,
    weekly_digest: false,
  });
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsMessage, setPrefsMessage] = useState<
    { type: "success" | "error"; text: string } | null
  >(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me/notification-prefs", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("failed");
        const body = (await res.json()) as typeof prefs;
        if (!cancelled) setPrefs(body);
      })
      .catch(() => {
        /* 取れなければ既定のまま表示する */
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleNotificationPref = async (key: keyof typeof prefs) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next); // 先に画面へ反映してから保存する
    setSavingPrefs(true);
    setPrefsMessage(null);
    try {
      const response = await fetch("/api/me/notification-prefs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!response.ok) {
        setPrefs(prefs); // 失敗したら元に戻す
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setPrefsMessage({ type: "error", text: body?.error || "保存できませんでした" });
      } else {
        setPrefsMessage({ type: "success", text: "保存しました" });
      }
    } catch {
      setPrefs(prefs);
      setPrefsMessage({ type: "error", text: "保存できませんでした（通信エラー）" });
    }
    setSavingPrefs(false);
  };
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const displayName = currentMember?.name ?? "会員";
  const initial = displayName.trim().charAt(0) || "T";

  // 自分の氏名・連絡先・一言は本人が直せる。
  // 会員番号・会員種別・入会年月などは契約の事実なので運営が管理する。
  const [grip, setGrip] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<
    { type: "success" | "error"; text: string } | null
  >(null);

  useEffect(() => {
    setGrip(currentMember?.grip ?? "");
    setName(currentMember?.name ?? "");
    setEmail(currentMember?.email ?? "");
    setPhone(currentMember?.phone ?? "");
  }, [currentMember?.grip, currentMember?.name, currentMember?.email, currentMember?.phone]);

  const saveProfile = async () => {
    setSavingProfile(true);
    setProfileMessage(null);
    try {
      const response = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grip, name, email, phone }),
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

  // 各ステップの完了は実データから数えているので、ここで戻せるのは
  // 「閉じた」状態だけ。済んでいるステップは済んだままガイドが戻る。
  const handleResetOnboarding = async () => {
    setResetConfirm(false);
    try {
      await fetch("/api/me/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dismissed: false }),
      });
      clearClientCache();
    } catch {
      /* 失敗しても表示が戻らないだけ */
    }
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">氏名</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={FIELD}
                />
              </div>
              <div>
                {/* 会員種別は契約の内容なので運営が管理する */}
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  会員種別
                </label>
                <div className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-600">
                  {currentMember?.membership_type || "未設定"}
                </div>
              </div>
            </div>

            <div>
              {/* 🔴 名刺の「一言」と同じ名前だったので区別できず、両方に同じ文を
                     書いている人が実際にいた。こちらは一覧に出る短い方。 */}
              <label className="block text-sm font-medium text-gray-700 mb-1.5">ひとこと</label>
              <input
                type="text"
                value={grip}
                onChange={(e) => setGrip(e.target.value)}
                placeholder="例：なんでも聞いてください／飲み友、壁打ち大歓迎！"
                className={FIELD}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  メールアドレス
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="未登録"
                  className={FIELD}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  電話番号
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="未登録"
                  className={FIELD}
                />
              </div>
            </div>

            <p className="text-[11px] text-gray-400 leading-relaxed">
              メールアドレスは運営からのご連絡先です。ここを変えてもログインに使うメールアドレスは変わりません。
              会員番号・会員種別・入会時期は運営が管理しています。職業やニックネームは
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
            {(
              [
                {
                  key: "board",
                  label: "掲示板",
                  desc: "自分の投稿にコメント・返信・いいねがあった時",
                },
                {
                  key: "events",
                  label: "会（イベント）",
                  desc: "参加の申し込み・承認、フォロー中のシリーズの新しい会",
                },
                {
                  key: "connections",
                  label: "つながり",
                  desc: "出会いを記録された時、SNS開示の申請と承認",
                },
                {
                  key: "weekly_digest",
                  label: "週間ダイジェスト",
                  desc: "毎週月曜にコミュニティの動きをまとめて受け取る",
                },
              ] as const
            ).map((item) => (
              <div key={item.key} className="flex items-center justify-between py-2 gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
                <button
                  onClick={() => toggleNotificationPref(item.key)}
                  disabled={savingPrefs}
                  className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-60 ${
                    prefs[item.key] ? "bg-amber-500" : "bg-gray-200"
                  }`}
                  aria-label={item.label}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      prefs[item.key] ? "translate-x-5" : ""
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>

          <p className="mt-4 text-[11px] text-gray-400 leading-relaxed">
            オフにした種類は、アプリ内のお知らせにも端末の通知にも届かなくなります。
            運営からのお知らせと会費のご案内は、大切な内容のため常にお届けします。
          </p>

          {prefsMessage && (
            <p
              className={`mt-3 text-xs ${
                prefsMessage.type === "success" ? "text-green-600" : "text-red-600"
              }`}
            >
              {prefsMessage.text}
            </p>
          )}
        </div>

        {/* 端末プッシュ通知（PWA / Web Push） */}
        <PushNotificationSetup />

        <BillingSection withdrawn={Boolean(currentMember?.is_withdrawn)} />

        {/* 各セクションがその場で保存するため、まとめて保存するボタンは置かない
            （押しても何も起きないボタンがあると、保存できたと誤解される） */}
        <div className="flex justify-end">
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

        {/* はじめてガイドをもう一度出す */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
          <h2 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-gray-400" />
            はじめてガイドをもう一度見る
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-5">
            いちど閉じた「はじめてガイド」を、マイページにもう一度表示します。すでに済んでいるステップは完了のままです。
          </p>
          {!resetConfirm ? (
            <button
              onClick={() => setResetConfirm(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              はじめてガイドを表示する
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <p className="text-sm font-medium text-gray-900">
                マイページに表示します。よろしいですか？
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleResetOnboarding}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-[var(--tetsu-pink)] hover:opacity-90 transition-opacity"
                >
                  はい、表示する
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
              マイページに表示しました。
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
