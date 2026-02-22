"use client";

import { useState } from "react";
import { User, Bell, CreditCard, LogOut, Check } from "lucide-react";

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [notifications, setNotifications] = useState({
    newRecommendation: true,
    eventInvite: true,
    newConnection: true,
    weeklyDigest: false,
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-xl font-bold text-gray-900">設定</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Profile */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
          <h2 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
            <User className="w-5 h-5 text-gray-400" />
            プロフィール
          </h2>
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <img
                src="https://images.unsplash.com/photo-1630572780329-e051273e980f?w=400&h=400&fit=crop&crop=face"
                alt="田中 一郎"
                className="w-16 h-16 rounded-full object-cover border-2 border-white shadow ring-1 ring-gray-100"
              />
              <button className="text-sm font-medium text-gray-600 px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
                写真を変更
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  氏名
                </label>
                <input
                  type="text"
                  defaultValue="田中 一郎"
                  className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  役職
                </label>
                <input
                  type="text"
                  defaultValue="代表取締役"
                  className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                一言
              </label>
              <input
                type="text"
                defaultValue="人の可能性を信じ、組織を変える"
                className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                メールアドレス
              </label>
              <input
                type="email"
                defaultValue="tanaka@example.com"
                className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
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

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-between">
          <button className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors">
            <LogOut className="w-4 h-4" />
            退会する
          </button>
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
      </div>
    </div>
  );
}
