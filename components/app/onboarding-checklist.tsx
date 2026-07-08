// 使い始めチェックリスト（マイページ上部）
// - 6ステップ。完了は各ストアから自動判定（説明動画のみクリックで完了扱い）。
// - × で閉じられる（tetsujin-onboarding-dismissed）。全ステップ完了で自動的に非表示。
// - 動画は素材未提供のためプレースホルダ（準備中）。
//   TODO: 実際の説明動画 URL が用意でき次第、VideoModal の src を差し替える。
"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, X, Play, ChevronRight } from "lucide-react";
import { CURRENT_USER_ID } from "@/lib/connections-data";
import { useJoinedEventIds } from "@/lib/event-participation";
import { useBoardVisited } from "@/lib/board-data";
import { useHasOwnSheet } from "@/lib/profile-sheet-data";
import { useDisclosureRequests } from "@/lib/disclosure-data";
import {
  useOnboardingFlags,
  markOnboardingVideoWatched,
  dismissOnboarding,
} from "@/lib/onboarding-data";

interface StepDef {
  key: string;
  label: string;
  done: boolean;
  href?: string; // リンクで飛ぶステップ
  onClick?: () => void; // 動画などその場で完了するステップ
}

export function OnboardingChecklist() {
  const { mounted, videoWatched, dismissed } = useOnboardingFlags();
  const joinedIds = useJoinedEventIds();
  const boardVisited = useBoardVisited();
  const hasSheet = useHasOwnSheet(CURRENT_USER_ID);
  const requests = useDisclosureRequests();
  const [showVideo, setShowVideo] = useState(false);

  // 自分が出した開示申請が1件でもあるか
  const hasSentRequest = requests.some(
    (r) => r.fromMemberId === CURRENT_USER_ID
  );

  const steps: StepDef[] = [
    {
      key: "video",
      label: "説明動画を見る",
      done: videoWatched,
      onClick: () => {
        setShowVideo(true);
        markOnboardingVideoWatched();
      },
    },
    {
      key: "join1",
      label: "イベントに参加する",
      done: joinedIds.size > 0,
      href: "/app/post",
    },
    {
      key: "board",
      label: "掲示板を見る",
      done: boardVisited,
      href: "/app/board",
    },
    {
      key: "profile",
      label: "プロフィールを作成する",
      done: hasSheet,
      href: "/app/mypage/profile-sheet",
    },
    {
      key: "join2",
      label: "別のイベントにも参加する",
      done: joinedIds.size >= 2,
      href: "/app/post",
    },
    {
      key: "disclosure",
      label: "誰かに開示申請する",
      done: hasSentRequest,
      href: "/app/members",
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;

  // SSR/初期描画では出さない（hydration mismatch 回避）。閉じた or 全完了なら非表示。
  if (!mounted || dismissed || allDone) {
    return (
      <>
        {showVideo && <VideoModal onClose={() => setShowVideo(false)} />}
      </>
    );
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 mb-8">
        {/* ヘッダー */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-gray-900">
              はじめてガイド
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              6ステップでTETSUJIN会を使いこなそう（{doneCount}/{steps.length}）
            </p>
          </div>
          <button
            onClick={dismissOnboarding}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors flex-shrink-0"
            aria-label="ガイドを閉じる"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 進捗バー */}
        <div className="h-1.5 w-full rounded-full bg-gray-100 mb-4 overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--tetsu-pink)] transition-all"
            style={{ width: `${(doneCount / steps.length) * 100}%` }}
          />
        </div>

        {/* ステップ一覧 */}
        <ol className="space-y-1.5">
          {steps.map((step, i) => {
            const inner = (
              <div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                  step.done
                    ? "bg-gray-50"
                    : "hover:bg-[var(--tetsu-pink-pale)]"
                }`}
              >
                {step.done ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                ) : step.key === "video" ? (
                  <Play className="w-5 h-5 text-[var(--tetsu-pink)] flex-shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />
                )}
                <span
                  className={`text-sm flex-1 ${
                    step.done
                      ? "text-gray-400 line-through"
                      : "text-gray-800 font-medium"
                  }`}
                >
                  <span className="text-gray-400 mr-1.5">{i + 1}.</span>
                  {step.label}
                </span>
                {!step.done && (
                  <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                )}
              </div>
            );

            if (step.href) {
              return (
                <li key={step.key}>
                  <Link href={step.href}>{inner}</Link>
                </li>
              );
            }
            return (
              <li key={step.key}>
                <button onClick={step.onClick} className="w-full text-left">
                  {inner}
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {showVideo && <VideoModal onClose={() => setShowVideo(false)} />}
    </>
  );
}

// 説明動画のプレースホルダモーダル（素材未提供のため準備中）
// TODO: 実際の説明動画（YouTube 等）が用意でき次第、この中身を差し替える。
function VideoModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">TETSUJIN会の使い方</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="閉じる"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* 動画プレースホルダ（16:9） */}
        <div className="aspect-video bg-gray-100 flex flex-col items-center justify-center gap-2">
          <Play className="w-10 h-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-400">説明動画は準備中です</p>
          <p className="text-xs text-gray-300">
            近日公開予定。もうしばらくお待ちください。
          </p>
        </div>
        <div className="px-5 py-4">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
