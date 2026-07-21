"use client";

import { useState } from "react";
import Link from "next/link";
import { UserPlus, Mail, Lock, User, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

// 新規登録画面（動作確認用）
//
// 🔴 これは本番の入会導線ではない。
//    テツジン会は年契約の有料コミュニティ（個人19,800円／法人30,000円）であり、
//    本来は「入会申込(/register) → 入金確認 → 運営がアカウント発行」の順になるはず。
//    ここを公開したまま運用すると、入金していない人が会員ページに入れてしまう。
//    ∴ 本番の入会フローが決まるまでは動作確認専用として扱う。
//
// 補足: サインアップしたメールが既存会員のメールと一致する場合、
//       新しい会員行は作らず既存の行に紐づく（policies.sql の handle_new_auth_user）。
export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError("お名前を入力してください。");
    if (!email.trim()) return setError("メールアドレスを入力してください。");
    if (password.length < 8) return setError("パスワードは8文字以上で設定してください。");

    setLoading(true);
    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        // handle_new_auth_user が会員名として使う
        data: { name: name.trim() },
      },
    });
    setLoading(false);

    if (signUpError) {
      const message =
        signUpError.message === "User already registered"
          ? "このメールアドレスは既に登録されています。ログインをお試しください。"
          : signUpError.message.includes("Password")
            ? "パスワードが条件を満たしていません。8文字以上で設定してください。"
            : "登録できませんでした。時間をおいて もう一度お試しください。";
      setError(message);
      return;
    }

    setDone(true);
  };

  // 未接続のときは登録できない（mockでアカウントは作れないため明示する）
  if (!isSupabaseConfigured) {
    return (
      <section className="min-h-screen flex items-center justify-center bg-[var(--tetsu-warm)] pt-24 pb-16 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <h1 className="text-xl font-extrabold text-gray-900 mb-3">準備中です</h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            新規登録は現在準備中です。
            <br />
            入会をご希望の方は お問い合わせください。
          </p>
          <Link
            href="/contact"
            className="inline-block mt-6 px-6 py-3 bg-[var(--tetsu-pink)] text-white rounded-full text-sm font-bold hover:bg-[var(--tetsu-pink-light)] transition-all"
          >
            入会のお問い合わせ
          </Link>
        </div>
      </section>
    );
  }

  // 登録完了＝確認メール送信済み
  if (done) {
    return (
      <section className="min-h-screen flex items-center justify-center bg-[var(--tetsu-warm)] pt-24 pb-16 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h1 className="text-xl font-extrabold text-gray-900 mb-3">
            確認メールを送りました
          </h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            <span className="font-bold text-gray-900">{email}</span> 宛に
            確認メールをお送りしました。
            <br />
            メール内のリンクを開くと登録が完了します。
          </p>
          <p className="text-xs text-gray-400 mt-4 leading-relaxed">
            ※ 届かない場合は迷惑メールフォルダをご確認ください。
          </p>
          <Link
            href="/login"
            className="inline-block mt-6 px-6 py-3 bg-[var(--tetsu-pink)] text-white rounded-full text-sm font-bold hover:bg-[var(--tetsu-pink-light)] transition-all"
          >
            ログイン画面へ
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen flex items-center justify-center bg-[var(--tetsu-warm)] pt-24 pb-16 px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-[var(--tetsu-pink)] rounded-2xl flex items-center justify-center mb-3">
            <span className="text-white text-lg font-extrabold">T</span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">新規登録</h1>
          <p className="text-sm text-gray-500 mt-1">TETSUJIN会 メンバーページ</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 leading-relaxed">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">お名前</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  placeholder="鉄人 太郎"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--tetsu-pink)] focus:border-transparent focus:bg-white transition-all"
                />
              </div>
            </div>

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
                  autoComplete="new-password"
                  placeholder="8文字以上"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--tetsu-pink)] focus:border-transparent focus:bg-white transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[var(--tetsu-pink)] text-white rounded-full text-base font-bold hover:bg-[var(--tetsu-pink-light)] transition-all shadow-lg shadow-pink-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  登録中...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  登録する
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          既にアカウントをお持ちの方は{" "}
          <Link href="/login" className="font-bold text-[var(--tetsu-pink)] hover:underline">
            ログイン
          </Link>
        </p>
      </div>
    </section>
  );
}
