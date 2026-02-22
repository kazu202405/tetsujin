"use client";

import { PageHeader } from "@/components/marketing/page-header";
import { ContactCTA } from "@/components/marketing/contact-cta";
import { AlertTriangle } from "lucide-react";

export default function AboutPage() {
  return (
    <>
      <PageHeader title="TETSUJIN会とは" breadcrumb="TETSUJIN会とは" />

      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* キャッチコピー */}
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-6">
              自分のために、ひとのために
            </h2>
            <p className="text-lg text-gray-600 font-bold leading-relaxed">
              心と心で繋がり信用・信頼を築き
              <br />
              メンバーを大事にし合う事でビジネスが成功できる
            </p>
          </div>

          {/* 理念 */}
          <div className="mb-16">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 text-center mb-4">
              TETSUJIN会の理念
            </h2>
            <h3 className="text-xl sm:text-2xl font-bold text-[var(--tetsu-pink)] text-center mb-8">
              『繋がりを通じて、誠実と信頼を基盤に自己実現を叶える』
            </h3>
            <div className="bg-[var(--tetsu-warm)] rounded-2xl p-8 space-y-4 text-gray-600 leading-relaxed">
              <p>
                TETSUJIN会は、単なる人脈づくりではなく、人として信頼のおける関係性を構築することに重きを置いております。
              </p>
              <p>
                ビジネスにおいて信頼関係はとても大事で、それがあるからこそビジネスも成功します。
              </p>
              <p>
                また、ビジネス面だけでなく、プライベート面でも繋がれる場がたくさんあるので、いろんな面から人間関係の構築が可能です。
              </p>
              <p className="font-bold text-gray-900">
                安心できる環境の中で、自分の夢を叶えていきましょう！
              </p>
            </div>
          </div>

          {/* 方向性 */}
          <div className="mb-16">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 text-center mb-8">
              TETSUJIN会が目指す方向性
            </h2>
            <div className="space-y-4">
              {[
                {
                  num: "1",
                  text: "メンバー350人以上のコミュニティにし、より皆さまのニーズがマッチングできるコミュニティに！",
                },
                {
                  num: "2",
                  text: "5,000人〜10,000人規模の大きなマルシェをTETSUJIN主催で年2回開きます！皆様のビジネス展開ができる場を設けます！",
                },
                {
                  num: "3",
                  text: "何よりも、信頼できる仲間が増え、心が豊かになれる！そんなコミュニティに！",
                },
              ].map((item) => (
                <div
                  key={item.num}
                  className="flex items-start gap-4 bg-[var(--tetsu-warm-pink)] rounded-2xl p-6"
                >
                  <div className="w-10 h-10 bg-[var(--tetsu-pink)] rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-extrabold text-sm">{item.num}</span>
                  </div>
                  <p className="text-gray-700 leading-relaxed pt-1.5">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 代表紹介 */}
          <div className="mb-16">
            <div className="bg-[var(--tetsu-warm)] rounded-2xl p-8 sm:p-10">
              <div className="text-center mb-6">
                <div className="w-24 h-24 bg-[var(--tetsu-pink-pale)] rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-3xl">👩</span>
                </div>
                <h3 className="text-xl font-extrabold text-gray-900">川原 志保</h3>
                <p className="text-sm text-[var(--tetsu-pink)] font-bold">TETSUJIN会代表</p>
                <p className="text-xs text-gray-400 mt-1">Shiho Kawahara</p>
              </div>
              <div className="space-y-4 text-gray-600 leading-relaxed text-sm">
                <p className="font-bold text-gray-900 text-base text-center mb-4">
                  「人の繋がりや出会いで人生は変わる」
                </p>
                <p>
                  私自身がそうでした。元々、公務員をしており、このまま人生を終えるのか・・・と思っていたら、結婚を機に退職し、個人事業主になりました。
                </p>
                <p>
                  事業に悪戦苦闘しながら、人脈を広げようと日々出歩いていたら、コミュニティ運営をするきっかけとなる方と出会い、今に至る。
                </p>
                <p>
                  ここに来るまでにたくさんの人と出会い、たくさんの人とお話をしてきた。公務員をしていた自分が、まさかこんな人生を送るとは夢にも思いませんでした。
                </p>
                <p>
                  出会いって素晴らしい。皆様に、たくさんの出会いを提供できる仕事に出会えたことを喜びに感じています。
                </p>
                <p>
                  これからもTETSUJIN会をきっかけに、皆様の人生が豊かになれるお手伝いをしていきたく、日々精進してまいります。
                </p>
              </div>
            </div>
          </div>

          {/* 注意事項 */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-gray-900 mb-1">Warning</p>
              <p className="text-sm text-gray-600">
                当会では宗教や政治活動、ネットワークビジネスの方のご参加は、ご遠慮頂いております。
              </p>
            </div>
          </div>
        </div>
      </section>

      <ContactCTA />
    </>
  );
}
