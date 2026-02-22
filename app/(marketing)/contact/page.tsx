"use client";

import { useState } from "react";
import { PageHeader } from "@/components/marketing/page-header";
import { Send, CheckCircle } from "lucide-react";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <>
      <PageHeader title="入会希望＆お問い合わせ" breadcrumb="入会希望＆お問い合わせ" />

      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          {submitted ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-2xl font-extrabold text-gray-900 mb-3">
                送信完了しました
              </h2>
              <p className="text-gray-500">
                お問い合わせありがとうございます。内容を確認の上、ご連絡させていただきます。
              </p>
            </div>
          ) : (
            <div className="bg-[var(--tetsu-warm)] rounded-2xl p-8 sm:p-10 border border-gray-100">
              <h2 className="text-2xl font-extrabold text-gray-900 text-center mb-8">
                お問い合わせ
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* お名前 */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 bg-[var(--tetsu-pink)] text-white text-xs rounded font-bold">
                        必須
                      </span>
                      お名前
                    </span>
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--tetsu-pink)] focus:border-transparent transition-all"
                    placeholder="山田 太郎"
                  />
                </div>

                {/* 電話番号 */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 bg-[var(--tetsu-pink)] text-white text-xs rounded font-bold">
                        必須
                      </span>
                      お電話番号
                    </span>
                  </label>
                  <input
                    type="tel"
                    required
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--tetsu-pink)] focus:border-transparent transition-all"
                    placeholder="090-1234-5678"
                  />
                </div>

                {/* メールアドレス */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 bg-[var(--tetsu-pink)] text-white text-xs rounded font-bold">
                        必須
                      </span>
                      メールアドレス
                    </span>
                  </label>
                  <input
                    type="email"
                    required
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--tetsu-pink)] focus:border-transparent transition-all"
                    placeholder="example@email.com"
                  />
                </div>

                {/* お問い合わせ内容 */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 bg-[var(--tetsu-pink)] text-white text-xs rounded font-bold">
                        必須
                      </span>
                      お問い合わせ内容
                    </span>
                  </label>
                  <div className="flex gap-4 mb-3">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-[var(--tetsu-pink)] border-gray-300 rounded focus:ring-[var(--tetsu-pink)]"
                      />
                      <span className="text-sm text-gray-700">お問い合わせ</span>
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-[var(--tetsu-pink)] border-gray-300 rounded focus:ring-[var(--tetsu-pink)]"
                      />
                      <span className="text-sm text-gray-700">ご入会希望</span>
                    </label>
                  </div>
                  <textarea
                    rows={5}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--tetsu-pink)] focus:border-transparent transition-all resize-none"
                    placeholder="お問い合わせ内容をご記入ください"
                  />
                </div>

                {/* 送信ボタン */}
                <div className="text-center pt-4">
                  <button
                    type="submit"
                    className="group inline-flex items-center gap-2 px-10 py-4 bg-[var(--tetsu-pink)] text-white rounded-full text-base font-bold hover:bg-[var(--tetsu-pink-light)] transition-all shadow-lg shadow-pink-200"
                  >
                    送信
                    <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
