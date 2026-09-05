"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldAlert, ChevronRight, Clock, Loader2 } from "lucide-react";

// ============================================================
// ログインはできたが、会員として登録されていない人に出す画面
// ============================================================
// 2026-08-25 の修正で、サインアップしても名簿に無いメールアドレスなら
// 会員行は作られなくなった（migration 0029）。その結果ここに来る人が
// 生まれるので、行き止まりにせず次にやることを出す。
//
// 🔴 ここに来るのは「まったくの新規」だけではない。名簿にメールが
//    書かれていない在籍会員（2026-09-05 時点で99名）も、システムからは
//    区別がつかず必ずここに落ちる。∴ 文言は「入会申込」ではなく
//    「登録内容を教えてください」にする。すでに会員の人が
//    「入会を申し込め」と言われると手が止まる。
//
// 🔴 申請をもう出している人にフォームを勧めない。勧めると同じ人の申請が
//    2件並ぶ（2026-09-05 南山さんで実際に発生。案内どおり押しただけ）。
//    アプリで直接登録した人は 0049 が自動で申請を立てているので、
//    「もう出ている」状態が普通にある。
// ============================================================

type Status = "loading" | "none" | "pending" | "approved" | "rejected" | "unknown";

export function NotAMember({ email }: { email?: string | null }) {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me/signup-status", { cache: "no-store" })
      .then(async (res) => (res.ok ? await res.json() : null))
      .then((body) => {
        if (cancelled) return;
        setStatus((body?.application as Status) ?? "unknown");
      })
      // 取れなくても行き止まりにはしない。unknown として案内だけ出す。
      .catch(() => !cancelled && setStatus("unknown"));
    return () => {
      cancelled = true;
    };
  }, []);

  const waiting = status === "pending" || status === "approved";

  return (
    <section className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-5 ${
            waiting ? "bg-blue-50" : "bg-amber-50"
          }`}
        >
          {status === "loading" ? (
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          ) : waiting ? (
            <Clock className="w-6 h-6 text-blue-500" />
          ) : (
            <ShieldAlert className="w-6 h-6 text-amber-500" />
          )}
        </div>

        {waiting ? (
          <>
            <h1 className="text-lg font-extrabold text-gray-900 mb-3">
              運営が確認しています
            </h1>
            <p className="text-sm text-gray-600 leading-relaxed mb-6">
              ご登録を受け付けました。運営の確認が済みしだいご利用いただけます。
              {/* 承認されると自動で繋がるが、開いたままの画面は変わらない。
                  待てばいいのか何かするのか分からないと問い合わせになる。 */}
              <br />
              <span className="text-xs text-gray-500">
                承認されると、この画面を再読み込みするだけで入れます。
              </span>
            </p>
          </>
        ) : (
          <>
            <h1 className="text-lg font-extrabold text-gray-900 mb-3">
              ご登録内容を教えてください
            </h1>
            <p className="text-sm text-gray-600 leading-relaxed mb-6">
              アカウントは作成できました。
              ご利用いただくために、お名前やご連絡先などをお伺いします。
              <br />
              <span className="text-xs text-gray-500">
                すでに会員の方も、こちらからお願いします。運営が名簿と照合します。
              </span>
            </p>
          </>
        )}

        {email && (
          <p className="text-xs text-gray-500 break-all mb-6">
            ログイン中: {email}
          </p>
        )}

        {!waiting && status !== "loading" && (
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-1.5 w-full py-3 rounded-xl bg-[var(--tetsu-pink)] text-white text-sm font-bold hover:opacity-90 transition-opacity mb-4"
          >
            登録内容を入力する
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}

        {status === "rejected" && (
          <p className="text-xs text-gray-500 leading-relaxed mb-4">
            以前のお申し込みは承認されませんでした。
            お心当たりのない場合は運営までご連絡ください。
          </p>
        )}

        <p className="text-xs text-gray-500 leading-relaxed">
          お困りのことがあれば、運営までご連絡ください。
          <br />
          <a
            href="mailto:tetsujin.community@gmail.com"
            className="text-[var(--tetsu-pink)] font-bold hover:underline"
          >
            tetsujin.community@gmail.com
          </a>
        </p>
      </div>
    </section>
  );
}
