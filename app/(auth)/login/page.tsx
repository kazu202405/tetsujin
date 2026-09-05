"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn, Mail, Lock, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isMockMode } from "@/lib/supabase/config";

// ログイン画面
// - Supabase接続済み … メール＋パスワードで実際に認証する（依頼主決定 2026-07-21）
// - Supabase未接続   … 従来どおりmock（何を入れてもマイページへ）＝実機デモを止めないため
const REMEMBERED_EMAIL_KEY = "tetsujin-remembered-email";
const REMEMBER_OFF_KEY = "tetsujin-remember-off";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // 前回ログインしたメールを覚えておくか（既定＝覚える）
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 前回のメールアドレスを入れておく。毎回打つのが一番の手間なので。
  // パスワードはここでは覚えない（端末のパスワード管理に任せる）。
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBERED_EMAIL_KEY);
      if (saved) setEmail(saved);
      else setRemember(localStorage.getItem(REMEMBER_OFF_KEY) !== "1");
    } catch {
      /* 使えない端末では何もしない */
    }
  }, []);

  // ログイン後の戻り先（middlewareが ?next= を付ける）
  // 🔴 ログイン後の戻り先は、必ず自サイト内のパスに限る（オープンリダイレクト対策）。
  //    検証せずに router.push へ渡すと
  //      /login?next=https://evil.example/fake
  //      /login?next=//evil.example      ← プロトコル相対。パスに見えるが別ホストになる
  //    が成立し、「tetsujin.vercel.app のログインリンク」を装った誘導ができてしまう。
  //    会員は正規のドメインでログインした直後に偽サイトへ飛ばされるので気づきにくい。
  //    ∴ 「/ で始まり、かつ // や /\ で始まらない」ものだけを通す。
  const safeNextPath = (raw: string | null): string => {
    if (!raw) return "/app/mypage";
    if (!raw.startsWith("/")) return "/app/mypage";
    if (raw.startsWith("//") || raw.startsWith("/\\")) return "/app/mypage";
    return raw;
  };
  const nextPath = safeNextPath(searchParams.get("next"));

  // middleware から ?error=config で戻された場合＝本番の接続情報が欠けている。
  // 会員には原因が分からないので、運営に連絡してもらう文言にする。
  const configError = searchParams.get("error") === "config";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // mockモード：開発中で接続情報がない間だけ素通し（本番では成立しない）
    if (isMockMode) {
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

    try {
      if (remember) {
        localStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim());
        localStorage.removeItem(REMEMBER_OFF_KEY);
      } else {
        localStorage.removeItem(REMEMBERED_EMAIL_KEY);
        localStorage.setItem(REMEMBER_OFF_KEY, "1");
      }
    } catch {
      /* 使えない端末では何もしない */
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
            {/* 接続設定の不備（middleware から戻された場合） */}
            {configError && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 leading-relaxed">
                  ただいまシステムの設定に問題が発生しているため、
                  メンバーページをご利用いただけません。
                  お手数ですが運営までご連絡ください。
                </p>
              </div>
            )}

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
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  inputMode="email"
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
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--tetsu-pink)] focus:border-transparent focus:bg-white transition-all"
                />
                {/* 打ち間違いは目で見て直せる方が早い */}
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex items-center justify-between mt-2">
                <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 accent-[var(--tetsu-pink)]"
                  />
                  メールアドレスを記憶する
                </label>
                {!isMockMode && (
                  <Link href="/forgot-password" className="text-xs font-bold text-[var(--tetsu-pink)] hover:underline">
                    パスワードを忘れた方
                  </Link>
                )}
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
          {isMockMode && (
            <p className="text-center text-xs text-gray-400 mt-5 leading-relaxed">
              ※ 現在は体験版です。
              <br />
              メールアドレス・パスワードは入力せずにログインできます。
            </p>
          )}
        </div>

        {/* 入口は2つある。本番で「新規登録」しか出していなかったため、
            まだ会員でない人は一度アカウントを作ってから
            「会員として登録されていません」に当たるまで、
            申込ページの存在に気づけなかった。両方を並べる。 */}
        <div className="text-center text-sm text-gray-500 mt-6 space-y-1.5">
          <p>
            すでに会員の方で、はじめてご利用の場合は{" "}
            <Link
              href="/signup"
              className="font-bold text-[var(--tetsu-pink)] hover:underline"
            >
              新規登録
            </Link>
          </p>
          <p>
            まだ会員でない方は{" "}
            <Link
              href="/register"
              className="font-bold text-[var(--tetsu-pink)] hover:underline"
            >
              入会のお申し込み
            </Link>
          </p>
        </div>
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
