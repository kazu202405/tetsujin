"use client";

import { PageHeader } from "@/components/marketing/page-header";
import { ContactCTA } from "@/components/marketing/contact-cta";
import { AlertTriangle, Check } from "lucide-react";

export default function CostPage() {
  return (
    <>
      <PageHeader title="料金" breadcrumb="料金" />

      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 料金表 */}
          <div className="mb-16">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 text-center mb-8">
              料金
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
              <div className="bg-[var(--tetsu-warm)] rounded-2xl p-8 text-center border border-gray-100">
                <p className="text-sm text-gray-500 mb-2">個人事業主様</p>
                <p className="text-3xl font-extrabold text-[var(--tetsu-pink)]">¥1,650</p>
                <p className="text-sm text-gray-500 mt-1">/ 月（年払い）</p>
                <p className="text-xs text-gray-400 mt-2">× 12ヶ月</p>
              </div>
              <div className="bg-[var(--tetsu-warm)] rounded-2xl p-8 text-center border border-gray-100">
                <p className="text-sm text-gray-500 mb-2">法人事業主様</p>
                <p className="text-3xl font-extrabold text-[var(--tetsu-orange)]">¥2,500</p>
                <p className="text-sm text-gray-500 mt-1">/ 月（年払い）</p>
                <p className="text-xs text-gray-400 mt-2">× 12ヶ月</p>
              </div>
            </div>

            <div className="bg-[var(--tetsu-pink-pale)] rounded-2xl p-6 text-center mb-6">
              <p className="text-sm text-gray-500">入会費</p>
              <p className="text-2xl font-extrabold text-[var(--tetsu-pink)]">無料</p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-600">途中で退会しても返金はされません。</p>
            </div>
          </div>

          {/* 入会の流れ */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 text-center mb-10">
              TETSUJIN会入会の流れ
            </h2>

            <div className="space-y-0">
              {[
                {
                  step: "1",
                  title: "代表と面談 or 交流会にて招待",
                  desc: "ご入会前に、当会代表が面談をさせていただきますので、不安やお悩みも事前にしっかり解消でき安心です。",
                },
                {
                  step: "2",
                  title: "お申し込みフォーム入力",
                  desc: "面談後、ご入会が決まりましたら、簡単なお申込みフォームをご入力いただきます。",
                },
                {
                  step: "3",
                  title: "ご入金",
                  desc: "3日以内のご入金をお願いしております。",
                },
                {
                  step: "4",
                  title: "プロフィールシート作成",
                  desc: "メンバーさんにご自身のことを知っていただくため、プロフィールシート作成していただきます。（定型あり）",
                },
                {
                  step: "5",
                  title: "LINE・Discordに招待",
                  desc: "LINE・Discordにご招待させていただきますので、自己紹介をお願いいたします。",
                },
                {
                  step: "✓",
                  title: "TETSUJINメンバー！",
                  desc: "これであなたもTETSUJINメンバー！じゃんじゃん交流してください！",
                  highlight: true,
                },
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  {/* ステップライン */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        item.highlight
                          ? "bg-[var(--tetsu-pink)] text-white"
                          : "bg-[var(--tetsu-pink-pale)] text-[var(--tetsu-pink)]"
                      }`}
                    >
                      {item.highlight ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <span className="font-extrabold text-sm">{item.step}</span>
                      )}
                    </div>
                    {i < 5 && (
                      <div className="w-0.5 h-8 bg-[var(--tetsu-pink-pale)]" />
                    )}
                  </div>
                  {/* コンテンツ */}
                  <div className="pb-6">
                    <h3
                      className={`font-bold mb-1 ${
                        item.highlight
                          ? "text-[var(--tetsu-pink)] text-lg"
                          : "text-gray-900"
                      }`}
                    >
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <ContactCTA />
    </>
  );
}
