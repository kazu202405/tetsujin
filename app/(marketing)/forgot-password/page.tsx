"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("メールアドレスを入力してください。");
      return;
    }

    setLoading(true);
    const { error: resetError } = await createClient().auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: `${window.location.origin}/reset-password` },
    );
    setLoading(false);

    if (resetError) {
      setError("再設定メールを送信できませんでした。時間をおいて、もう一度お試しください。");
      return;
    }
    setSent(true);
  };

  return (
    <section className="min-h-screen flex items-center justify-center bg-[var(--tetsu-warm)] pt-24 pb-16 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          {sent ? (
            <div className="text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-4" />
              <h1 className="text-xl font-extrabold text-gray-900 mb-3">メールを送信しました</h1>
              <p className="text-sm text-gray-600 leading-relaxed mb-6">
                入力したメールアドレスへ、パスワード再設定用のリンクを送りました。
              </p>
              <Link href="/login" className="font-bold text-[var(--tetsu-pink)] hover:underline">
                ログイン画面へ戻る
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-extrabold text-gray-900 text-center mb-2">パスワードを忘れた方</h1>
              <p className="text-sm text-gray-500 text-center leading-relaxed mb-7">
                登録済みのメールアドレスへ再設定リンクを送ります。
              </p>
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-3">{error}</p>}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">メールアドレス</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="email"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--tetsu-pink)]"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[var(--tetsu-pink)] text-white rounded-full font-bold disabled:opacity-60"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  再設定メールを送る
                </button>
              </form>
              <Link href="/login" className="mt-6 flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-gray-900">
                <ArrowLeft className="w-4 h-4" />
                ログイン画面へ戻る
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
