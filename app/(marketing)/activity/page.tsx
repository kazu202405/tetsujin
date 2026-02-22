"use client";

import { PageHeader } from "@/components/marketing/page-header";
import { ContactCTA } from "@/components/marketing/contact-cta";
import { Calendar, Monitor, Music, Gamepad2 } from "lucide-react";

export default function ActivityPage() {
  return (
    <>
      <PageHeader title="活動内容" breadcrumb="活動内容" />

      {/* 交流会セクション */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[var(--tetsu-pink-pale)] rounded-full text-sm font-bold text-[var(--tetsu-pink)] mb-4">
              <Calendar className="w-4 h-4" />
              交流会
            </div>
          </div>

          {/* オフライン交流会 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div className="bg-[var(--tetsu-warm)] rounded-2xl p-8 border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 bg-[var(--tetsu-pink)] rounded-xl flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-extrabold text-gray-900">
                  月に3回 オフライン通常交流会
                </h3>
              </div>
              <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
                <p>
                  月に3回開催される交流会。新大阪と天王寺は、毎月どちらかが、メンバーさんのみの10〜15人の交流会になります！
                </p>
                <p>
                  着席してお話できるので、より落ち着いて会話することができ仲が深まります。
                </p>
                <div className="bg-white rounded-xl p-4 space-y-1">
                  <p className="font-bold text-gray-900">開催場所</p>
                  <p>・新大阪 ココプラザ会議室</p>
                  <p>・天王寺 阿倍野機民センター</p>
                  <p>・梅田 第2ビル（60人大規模交流会）</p>
                </div>
                <div className="flex gap-4 pt-2">
                  <div className="bg-[var(--tetsu-pink-pale)] rounded-lg px-4 py-2 text-center">
                    <p className="text-xs text-gray-500">会員様</p>
                    <p className="text-lg font-extrabold text-[var(--tetsu-pink)]">500円</p>
                  </div>
                  <div className="bg-gray-100 rounded-lg px-4 py-2 text-center">
                    <p className="text-xs text-gray-500">ビジター様</p>
                    <p className="text-lg font-extrabold text-gray-700">2,500円</p>
                  </div>
                </div>
              </div>
            </div>

            {/* オンライン交流会 */}
            <div className="bg-[var(--tetsu-warm)] rounded-2xl p-8 border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 bg-[var(--tetsu-orange)] rounded-xl flex items-center justify-center">
                  <Monitor className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-extrabold text-gray-900">
                  月2回 ZOOMオンライン交流会
                </h3>
              </div>
              <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
                <p>
                  好きな時に自由参加。耳だけ参加もOK！
                </p>
                <p>
                  気軽にメンバーさんと仲良くなったり、告知もできます！
                </p>
                <div className="bg-white rounded-xl p-4">
                  <div className="bg-[var(--tetsu-pink-pale)] rounded-lg px-4 py-2 text-center inline-block">
                    <p className="text-xs text-gray-500">会員様限定</p>
                    <p className="text-lg font-extrabold text-[var(--tetsu-pink)]">無料</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 部活セクション */}
      <section className="py-16 sm:py-24 bg-[var(--tetsu-warm-pink)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white rounded-full text-sm font-bold text-[var(--tetsu-pink)] mb-4 shadow-sm">
              部活動
            </div>
          </div>
          <p className="text-center text-gray-600 leading-relaxed max-w-2xl mx-auto mb-12">
            ビジネス的要素だけで繋がるのではなく、趣味ベース的要素でも繋がれる場があるのがTETSUJIN会の魅力のひとつ。
            フランクな関係からの繋がりで、最終的にビジネスに繋がる実績も多数あり。
            プライベートで付き合える方を見つけることもできます。
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              {
                name: "ママ部",
                emoji: "👶",
                desc: "普段子ども連れで自由が効かない。交流会に参加したいが、子ども連れはどこも禁止。ママ会ならお子様連れwelcome！起業家が多数属しているので、ビジネス交流もリフレッシュ交流も叶います。もちろんパパも大歓迎！",
                color: "bg-pink-50",
              },
              {
                name: "軽音部",
                emoji: "🎸",
                desc: "音楽は人と人を繋ぐ！そんな想いも持った熱い部長を筆頭に勢いのあるバンドです。ジャンルは問いません！楽器ができなくても、歌を歌うのが好き！で入部OK！音楽好きは集まれー♪",
                color: "bg-orange-50",
              },
              {
                name: "ゴルフ部",
                emoji: "⛳",
                desc: "不定期でシミュレーションゴルフに行ったり、年に数回コンペも開催。飲み会なんかもあったり！幅広い年代の方と一緒にラウンドする機会はなかなかないのでは？！とっても楽しい部活です。",
                color: "bg-green-50",
              },
              {
                name: "テニス部",
                emoji: "🎾",
                desc: "初心者の方も大歓迎！複数の大会で優勝経験のある部長を筆頭に、みんな丁寧に優しく教えてくれます。目的は楽しむこと🎾 スポーツで心も体もリフレッシュさせましょう～！",
                color: "bg-yellow-50",
              },
              {
                name: "ポーカー部",
                emoji: "♠️",
                desc: "1度は経験があるという方が多いのでは？基本的に心理戦ですが、実は経営者スキルを高めるのに効果的なポーカー！楽しみながら、ビジネススキル高めちゃいましょう～！",
                color: "bg-blue-50",
              },
            ].map((club) => (
              <div
                key={club.name}
                className={`card-hover bg-white rounded-2xl p-6 shadow-sm`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{club.emoji}</span>
                  <h3 className="text-base font-extrabold text-gray-900">{club.name}</h3>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">{club.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 bg-white rounded-2xl p-6 shadow-sm">
            <ul className="space-y-2 text-sm text-gray-600">
              <li>✓ 部長は、会員からの自薦で成り立っております。</li>
              <li>✓ 新しい部を作ることが可能。(運営陣による審査有)</li>
              <li>✓ 入部は会員の自由</li>
              <li>✓ 入部に関して部費はかかりません</li>
              <li>✓ 複数入部も大歓迎</li>
            </ul>
          </div>
        </div>
      </section>

      <ContactCTA />
    </>
  );
}
