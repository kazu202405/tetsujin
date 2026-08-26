"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw } from "lucide-react";

// ============================================================
// 予期しないエラーの受け皿（App Router のエラー境界）
// ============================================================
// これが無いと Next.js の既定画面（英語・無地）がそのまま会員に出る。
//
// 🔴 error.message は画面に出さない。
//    本番ビルドではNext.jsが内容を伏せてくれるが、それに頼らず自分で伏せる。
//    サーバー側の例外文にはテーブル名・カラム名・接続先が混じることがあり、
//    「何が壊れているか」の手がかりを外部に渡すことになる。
//    調査に使うのは digest（サーバーログの同じIDに対応する）。
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 中身はサーバーログに出ているので、ここではブラウザ側に痕跡だけ残す
    console.error("unhandled error", error.digest ?? "(no digest)");
  }, [error]);

  return (
    <section className="min-h-[70vh] flex items-center justify-center px-4 py-16 bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="w-6 h-6 text-red-500" />
        </div>

        <h1 className="text-lg font-extrabold text-gray-900 mb-3">
          エラーが発生しました
        </h1>

        <p className="text-sm text-gray-600 leading-relaxed mb-6">
          一時的な問題の可能性があります。
          <br />
          お手数ですが、もう一度お試しください。
        </p>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={reset}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--tetsu-pink)] text-white text-sm font-bold hover:opacity-90 transition-opacity"
          >
            <RotateCw className="w-4 h-4" />
            もう一度試す
          </button>
          <Link
            href="/app/mypage"
            className="w-full py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-bold hover:border-gray-300 transition-colors"
          >
            マイページへ戻る
          </Link>
        </div>

        <p className="text-xs text-gray-400 mt-6 leading-relaxed">
          繰り返し表示される場合は運営までご連絡ください。
          {error.digest && (
            <>
              <br />
              <span className="font-mono text-[11px]">
                エラーID: {error.digest}
              </span>
            </>
          )}
        </p>
      </div>
    </section>
  );
}
