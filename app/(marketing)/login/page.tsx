"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, Mail, Lock } from "lucide-react";

// ログイン画面（mock）
// - 体験版のため、何を入力しても（空でも）ログインでマイページへ遷移する。
// - TODO: 本認証は入金後に Supabase Auth（メール/パスワード or マジックリンク）で実装。
//   その際に app/app 配下へ認証ガードを追加する。
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // mock：入力値は検証せずマイページへ
    router.push("/app/mypage");
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
          <p className="text-sm text-gray-500 mt-1">
            TETSUJIN会 メンバーページ
          </p>
        </div>

        {/* ログインカード */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
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
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--tetsu-pink)] focus:border-transparent focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* ログインボタン */}
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[var(--tetsu-pink)] text-white rounded-full text-base font-bold hover:bg-[var(--tetsu-pink-light)] transition-all shadow-lg shadow-pink-200"
            >
              <LogIn className="w-4 h-4" />
              ログイン
            </button>
          </form>

          {/* 体験版の注記 */}
          <p className="text-center text-xs text-gray-400 mt-5 leading-relaxed">
            ※ 現在は体験版です。
            <br />
            メールアドレス・パスワードは入力せずにログインできます。
          </p>
        </div>

        {/* 新規登録への導線 */}
        <p className="text-center text-sm text-gray-500 mt-6">
          まだ会員でない方は{" "}
          <Link
            href="/contact"
            className="font-bold text-[var(--tetsu-pink)] hover:underline"
          >
            入会のお問い合わせ
          </Link>
        </p>
      </div>
    </section>
  );
}
