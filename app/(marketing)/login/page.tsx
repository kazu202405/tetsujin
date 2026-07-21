"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn, Mail, Lock, AlertCircle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

// ログイン画面
// - Supabase接続済み … メール＋パスワードで実際に認証する（依頼主決定 2026-07-21）
// - Supabase未接続   … 従来どおりmock（何を入れてもマイページへ）＝実機デモを止めないため
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ログイン後の戻り先（middlewareが ?next= を付ける）
  const nextPath = searchParams.get("next") ?? "/app/mypage";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // mockモード：接続情報がない間は従来どおり素通し
    if (!isSupabaseConfigured) {
      router.push("/app/mypage");
      return;
    }

    if (!email || !password) {
      setError("メールアドレスとパスワードを入力してください。");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (signInError) {
      // Supabaseの英語メッセージをそのまま出さず、会員に伝わる日本語にする
      const message =
        signInError.message === "Invalid login credentials"
          ? "メールアドレスまたはパスワードが違います。"
          : signInError.message === "Email not confirmed"
            ? "メールの確認が済んでいません。届いている確認メールのリンクを開いてください。"
            : "ログインできませんでした。時間をおいて もう一度お試しください。";
      setError(message);
      return;
    }

    // Server Component 側にも新しいセッションを反映させる
    router.push(nextPath);
    router.refresh();
  };

  return (
    <section className="min-h-screen flex items-center justify-center bg-[var(--tetsu-warm)] pt-24 pb-16 px-4">
      <div className="w-full max-w-md">
        {/* ロゴ */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-[var(--tetsu-pink)] rounded-2xl flex items-center justify-center mb-3">
            <span className="text-white text-lg font-extrabold">T</span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">ログイン</h1>
          <p className="text-sm text-gray-500 mt-1">TETSUJIN会 メンバーページ</p>
        </div>

        {/* ログインカード */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* エラー表示 */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 leading-relaxed">{error}</p>
              </div>
            )}

            {/* メールアドレス */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                メールアドレス
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="example@email.com"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--tetsu-pink)] focus:border-transparent focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* パスワード */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                パスワード
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--tetsu-pink)] focus:border-transparent focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* ログインボタン */}
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[var(--tetsu-pink)] text-white rounded-full text-base font-bold hover:bg-[var(--tetsu-pink-light)] transition-all shadow-lg shadow-pink-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  ログイン中...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  ログイン
                </>
              )}
            </button>
          </form>

          {/* 体験版の注記（mockモードのときだけ） */}
          {!isSupabaseConfigured && (
            <p className="text-center text-xs text-gray-400 mt-5 leading-relaxed">
              ※ 現在は体験版です。
              <br />
              メールアドレス・パスワードは入力せずにログインできます。
            </p>
          )}
        </div>

        {/* 新規登録への導線 */}
        <p className="text-center text-sm text-gray-500 mt-6">
          {isSupabaseConfigured ? (
            <>
              アカウントをお持ちでない方は{" "}
              <Link
                href="/signup"
                className="font-bold text-[var(--tetsu-pink)] hover:underline"
              >
                新規登録
              </Link>
            </>
          ) : (
            <>
              まだ会員でない方は{" "}
              <Link
                href="/contact"
                className="font-bold text-[var(--tetsu-pink)] hover:underline"
              >
                入会のお問い合わせ
              </Link>
            </>
          )}
        </p>
      </div>
    </section>
  );
}

export default function LoginPage() {
  // useSearchParams を使うため Suspense で包む（Next.js の要件）
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--tetsu-warm)]" />}>
      <LoginForm />
    </Suspense>
  );
}
