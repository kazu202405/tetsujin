// ============================================================
// はじめてガイド（マイページ上部）
// ============================================================
// 並びは「顔が見えて、人と繋がる」順（依頼主決定 2026-08-08）。
// 写真と名刺を先頭に置くのは、それが無いと掲示板でもメンバー一覧でも
// 「誰か分からない人」になってしまい、後の5つが空回りするため。
//
// 完了は毎回 実データから数える（フラグを持たない）。
// フラグにすると「やったのに消えた」「やってないのに完了」がすぐ起きる。
//
// 閉じたかどうかだけ会員の行に持つ＝スマホとPCで進捗が揃い、
// 機種変しても最初から出てこない（旧版は端末の localStorage だった）。
// ============================================================
"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, X, ChevronRight } from "lucide-react";
import { useCachedResource, setCached } from "@/lib/client-cache";

export interface OnboardingProgress {
  hasAvatar: boolean;
  hasSheet: boolean;
  hasSocialLink: boolean;
  visitedBoard: boolean;
  hasPost: boolean;
  joinedEvent: boolean;
  hasConnection: boolean;
  dismissed: boolean;
}

const CACHE_KEY = "onboarding";

// 取れていないうちはガイドを出さない（ちらついて閉じ損なうのを防ぐ）
const UNKNOWN: OnboardingProgress = {
  hasAvatar: false,
  hasSheet: false,
  hasSocialLink: false,
  visitedBoard: false,
  hasPost: false,
  joinedEvent: false,
  hasConnection: false,
  dismissed: true,
};

export function OnboardingChecklist() {
  const { data, status, reload } = useCachedResource<OnboardingProgress>(
    CACHE_KEY,
    "/api/me/onboarding",
    UNKNOWN,
  );
  const [closing, setClosing] = useState(false);

  const steps: { key: string; label: string; hint: string; done: boolean; href: string }[] = [
    {
      key: "avatar",
      label: "プロフィール写真を登録する",
      hint: "掲示板やメンバー一覧で顔が出ます",
      done: data.hasAvatar,
      href: "/app/settings",
    },
    {
      key: "sheet",
      label: "プロフィールシートを作る",
      hint: "あなたの名刺になります",
      done: data.hasSheet,
      href: "/app/mypage/profile-sheet",
    },
    {
      // 🔴 これが無いと、マッチングで相手を見つけても連絡する手段が無い。
      //    申請を受けた側も、承認画面で「教えられるものがありません」になる。
      key: "social",
      label: "連絡先（LINEなど）を登録する",
      hint: "連絡先を聞かれたとき、どれを教えるか選べます",
      done: data.hasSocialLink,
      href: "/app/mypage/profile-sheet#sns",
    },
    {
      key: "board",
      label: "掲示板を見る",
      hint: "会の動きはここに集まります",
      done: data.visitedBoard,
      href: "/app/board",
    },
    {
      key: "post",
      label: "掲示板に投稿してみる",
      hint: "ひとこと自己紹介でも十分です",
      done: data.hasPost,
      href: "/app/board",
    },
    {
      key: "event",
      label: "会に参加する",
      hint: "予定を見て申し込めます",
      done: data.joinedEvent,
      href: "/app/post",
    },
    // 「会った人を記録する」は依頼主判断で2026-09-04にガイドから外した。
    // 出会い記録そのものは残っている（サイドバー／下タブの「出会い」）が、
    // 会に参加した分は自動で並ぶだけで connections には保存されないため、
    // 会に出ても永久に埋まらない項目になっていた。
    // API は has_connection を返し続けている＝戻すときはここに足すだけ。
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;

  const dismiss = async () => {
    setClosing(true);
    // 押した瞬間に消す。保存の返事を待たせない。
    setCached<OnboardingProgress>(CACHE_KEY, { ...data, dismissed: true });
    try {
      await fetch("/api/me/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dismissed: true }),
      });
    } catch {
      /* 保存できなくても、次に開いたときにまた出るだけ */
    }
    await reload();
    setClosing(false);
  };

  if (status === "loading" || data.dismissed || allDone || closing) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 mb-8">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-gray-900">はじめてガイド</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {doneCount}/{steps.length} 完了
          </p>
        </div>
        <button
          onClick={dismiss}
          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors flex-shrink-0"
          aria-label="ガイドを閉じる"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="h-1.5 w-full rounded-full bg-gray-100 mb-4 overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--tetsu-pink)] transition-all"
          style={{ width: `${(doneCount / steps.length) * 100}%` }}
        />
      </div>

      <ol className="space-y-1.5">
        {steps.map((step, i) => (
          <li key={step.key}>
            <Link href={step.href}>
              <div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                  step.done ? "bg-gray-50" : "hover:bg-[var(--tetsu-pink-pale)]"
                }`}
              >
                {step.done ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />
                )}
                <span className="flex-1 min-w-0">
                  <span
                    className={`block text-sm ${
                      step.done ? "text-gray-400 line-through" : "text-gray-800 font-medium"
                    }`}
                  >
                    <span className="text-gray-400 mr-1.5">{i + 1}.</span>
                    {step.label}
                  </span>
                  {!step.done && (
                    <span className="block text-[11px] text-gray-400 mt-0.5">{step.hint}</span>
                  )}
                </span>
                {!step.done && <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />}
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
