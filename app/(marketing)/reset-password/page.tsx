"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const supabase = useMemo(() => createClient(), []);
  const [checking, setChecking] = useState(true);
  const [validSession, setValidSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setValidSession(Boolean(data.session));
      setChecking(false);
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" || session) {
        setValidSession(true);
        setChecking(false);
      }
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("パスワードは8文字以上にしてください。");
      return;
    }
    if (password !== confirmation) {
      setError("確認用パスワードが一致しません。");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setLoading(false);
      setError("パスワードを変更できませんでした。再設定メールをもう一度送信してください。");
      return;
    }
    await supabase.auth.signOut();
    setLoading(false);
    setCompleted(true);
  };

  return (
    <section className="min-h-screen flex items-center justify-center bg-[var(--tetsu-warm)] pt-24 pb-16 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        {checking ? (
          <div className="flex items-center justify-center gap-2 py-12 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            リンクを確認しています...
          </div>
        ) : completed ? (
          <div className="text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-4" />
            <h1 className="text-xl font-extrabold text-gray-900 mb-3">パスワードを変更しました</h1>
            <Link href="/login" className="font-bold text-[var(--tetsu-pink)] hover:underline">
              新しいパスワードでログインする
            </Link>
          </div>
        ) : !validSession ? (
          <div className="text-center">
            <h1 className="text-xl font-extrabold text-gray-900 mb-3">リンクを確認できませんでした</h1>
            <p className="text-sm text-gray-600 mb-6">リンクの有効期限が切れている可能性があります。</p>
            <Link href="/forgot-password" className="font-bold text-[var(--tetsu-pink)] hover:underline">
              再設定メールをもう一度送る
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-extrabold text-gray-900 text-center mb-2">新しいパスワード</h1>
            <p className="text-sm text-gray-500 text-center mb-7">8文字以上で設定してください。</p>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-3">{error}</p>}
              {[{ label: "新しいパスワード", value: password, set: setPassword }, { label: "新しいパスワード（確認）", value: confirmation, set: setConfirmation }].map((field) => (
                <div key={field.label}>
                  <label className="block text-sm font-bold text-gray-900 mb-2">{field.label}</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      value={field.value}
                      onChange={(event) => field.set(event.target.value)}
                      autoComplete="new-password"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--tetsu-pink)]"
                    />
                  </div>
                </div>
              ))}
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[var(--tetsu-pink)] text-white rounded-full font-bold disabled:opacity-60"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                パスワードを変更する
              </button>
            </form>
          </>
        )}
      </div>
    </section>
  );
}
