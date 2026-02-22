"use client";

import Link from "next/link";
import {
  Users,
  Calendar,
  MessageCircle,
  Handshake,
  ArrowRight,
  Star,
  UserPlus,
  Megaphone,
  Briefcase,
  ChevronRight,
  Quote,
  PartyPopper,
  Smile,
  Heart,
  Music,
  Gamepad2,
} from "lucide-react";

/* ──────────────── ヒーロー ──────────────── */
function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-white">
      {/* 背景装飾 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-[var(--tetsu-pink-pale)] rounded-full" />
        <div className="absolute top-1/3 -left-16 w-64 h-64 bg-orange-50 rounded-full" />
        <div className="absolute bottom-10 right-1/4 w-48 h-48 bg-yellow-50 rounded-full" />
        <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-blue-50/50 rounded-full" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-16">
        {/* バッジ */}
        <div className="inline-flex items-center gap-2 px-5 py-2 bg-[var(--tetsu-pink-pale)] border border-pink-200 rounded-full mb-8">
          <PartyPopper className="w-4 h-4 text-[var(--tetsu-pink)]" />
          <span className="text-sm text-[var(--tetsu-pink)] font-bold">
            大阪を中心に約250人在籍中！随時メンバー募集中
          </span>
        </div>

        {/* メインコピー */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
          自分のために、
          <br />
          <span className="text-[var(--tetsu-pink)]">ひとのために</span>
        </h1>

        <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          誠実と信頼を基盤に人脈を広げるコミュニティ。
          <br className="hidden sm:block" />
          ビジネスでも、プライベートでも繋がれる場所です。
        </p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/contact"
            className="group inline-flex items-center gap-2 px-8 py-4 bg-[var(--tetsu-pink)] text-white rounded-full text-base font-bold hover:bg-[var(--tetsu-pink-light)] transition-all shadow-lg shadow-pink-200"
          >
            入会希望・お問い合わせ
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/about"
            className="inline-flex items-center gap-2 px-8 py-4 border-2 border-gray-200 text-gray-700 rounded-full text-base font-bold hover:border-[var(--tetsu-pink)] hover:text-[var(--tetsu-pink)] transition-all"
          >
            TETSUJIN会とは
          </Link>
        </div>

        {/* 数字 */}
        <div className="flex items-center justify-center gap-8 sm:gap-14 mt-16 pt-8">
          {[
            { num: "250+", label: "メンバー", color: "text-[var(--tetsu-pink)]" },
            { num: "10+", label: "月間交流会", color: "text-[var(--tetsu-orange)]" },
            { num: "¥1,650〜", label: "月会費", color: "text-blue-500" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className={`text-3xl sm:text-4xl font-extrabold ${stat.color}`}>
                {stat.num}
              </p>
              <p className="text-xs text-gray-400 mt-1 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* メンバー写真 */}
        <div className="flex items-center justify-center mt-10 mb-4">
          <div className="flex -space-x-3">
            {[
              "https://images.unsplash.com/photo-1630572780329-e051273e980f?w=100&h=100&fit=crop&crop=face",
              "https://images.unsplash.com/photo-1619193597120-1d1edb42e34b?w=100&h=100&fit=crop&crop=face",
              "https://images.unsplash.com/photo-1613020092739-5d01102e080b?w=100&h=100&fit=crop&crop=face",
              "https://images.unsplash.com/photo-1720467438431-c1b5659a933e?w=100&h=100&fit=crop&crop=face",
              "https://images.unsplash.com/photo-1624091844772-554661d10173?w=100&h=100&fit=crop&crop=face",
            ].map((url, i) => (
              <img
                key={i}
                src={url}
                alt=""
                className="w-10 h-10 rounded-full object-cover border-3 border-white shadow-sm"
              />
            ))}
          </div>
          <p className="text-sm text-gray-500 ml-3 font-medium">
            多彩な業種のメンバーが活躍中
          </p>
        </div>
      </div>
    </section>
  );
}

/* ──────────────── TETSUJIN会とは ──────────────── */
function AboutSection() {
  return (
    <section id="about" className="py-20 sm:py-28 bg-[var(--tetsu-warm-pink)] relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-white rounded-full text-sm font-bold text-[var(--tetsu-pink)] mb-4 shadow-sm">
            <Smile className="w-4 h-4" />
            About
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-5">
            TETSUJIN会って？
          </h2>
          <p className="text-gray-600 leading-relaxed max-w-2xl mx-auto font-bold text-lg mb-4">
            誠実と信頼を基盤に人脈を広げるコミュニティ
            <br />
            ビジネスでも、プライベートでも繋がれるコミュニティ
          </p>
          <p className="text-gray-500 leading-relaxed max-w-2xl mx-auto">
            異業種TETSUJIN会では 心と心で繋がり信用・信頼を築き、
            メンバーを大事にし合う事でビジネスが成功できるコミュニティです！
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              icon: Handshake,
              title: "信頼ベース",
              desc: "心と心で繋がり、信用・信頼を築く。誠実な関係性を大切にしています。",
              bg: "bg-pink-50",
              iconBg: "bg-[var(--tetsu-pink)]",
            },
            {
              icon: Users,
              title: "異業種交流",
              desc: "様々な業種のメンバーが集い、ビジネスでもプライベートでも繋がれます。",
              bg: "bg-orange-50",
              iconBg: "bg-[var(--tetsu-orange)]",
            },
            {
              icon: Heart,
              title: "相互支援",
              desc: "メンバーを大事にし合い、お互いのビジネスの成功をサポートします。",
              bg: "bg-blue-50",
              iconBg: "bg-blue-500",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="card-hover bg-white rounded-2xl p-7 text-center shadow-sm"
            >
              <div className={`w-12 h-12 ${item.iconBg} rounded-2xl flex items-center justify-center mx-auto mb-5`}>
                <item.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-2">
                {item.title}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link
            href="/about"
            className="group inline-flex items-center gap-2 px-6 py-3 bg-white text-[var(--tetsu-pink)] rounded-full text-sm font-bold hover:bg-[var(--tetsu-pink)] hover:text-white transition-all shadow-sm"
          >
            詳しくはこちら
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ──────────────── できること ──────────────── */
function FeaturesSection() {
  const features = [
    {
      icon: Calendar,
      title: "交流会に参加",
      desc: "通常交流会（大規模・小規模）、テニス・カラオケ・ゴルフ・ポーカー・登山交流会など、様々な交流会が行われており、メンバー価格で参加できます。",
      color: "bg-[var(--tetsu-pink)] text-white",
      num: "01",
    },
    {
      icon: MessageCircle,
      title: "オンラインで気軽に交流",
      desc: "グループLINEだけではなく、ディスコードを活用し、メンバー同士の交流の報告・紹介/依頼・イベントの告知・ボイスチャットなど、いつでも気軽に交流ができます。",
      color: "bg-[var(--tetsu-orange)] text-white",
      num: "02",
    },
    {
      icon: Megaphone,
      title: "マルシェ・イベント出店",
      desc: "TETSUJIN会主催のマルシェやイベントを開催。2025.3.9には、スパワールドで6,000人以上の大規模イベントを実施。メンバーは割安＆格安で出店できます！",
      color: "bg-[var(--tetsu-yellow)] text-gray-900",
      num: "03",
    },
    {
      icon: Briefcase,
      title: "部活でプライベートも充実",
      desc: "部活に入ってプライベートでも繋がれる♪ ゴルフ部・ママ部・軽音部・ポーカー部etc プライベートも充実！",
      color: "bg-blue-500 text-white",
      num: "04",
    },
  ];

  return (
    <section id="features" className="py-20 sm:py-28 bg-white relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[var(--tetsu-pink-pale)] rounded-full text-sm font-bold text-[var(--tetsu-pink)] mb-4">
            <PartyPopper className="w-4 h-4" />
            Features
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
            TETSUJIN会メンバーだけができること
          </h2>
          <p className="text-gray-500 max-w-lg mx-auto">
            TETSUJIN会ならではの充実した活動プログラム
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {features.map((f) => (
            <div
              key={f.num}
              className="card-hover bg-[var(--tetsu-warm)] rounded-2xl p-7 border border-gray-100"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${f.color}`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <span className="text-2xl font-extrabold text-gray-200">{f.num}</span>
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-2">
                {f.title}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link
            href="/activity"
            className="group inline-flex items-center gap-2 px-6 py-3 bg-[var(--tetsu-pink-pale)] text-[var(--tetsu-pink)] rounded-full text-sm font-bold hover:bg-[var(--tetsu-pink)] hover:text-white transition-all"
          >
            活動内容を詳しく見る
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ──────────────── 入会特典 ──────────────── */
function BenefitsSection() {
  const benefits = [
    {
      icon: UserPlus,
      title: "プロフィールシートで自己紹介",
      desc: "自分のプロフィールシートを作成してもらえ、それをもとに自己紹介するので、繋がりたい！というお声がメンバーさんから出てきたり、運営陣がご紹介させていただきます。",
      emoji: "🤝",
    },
    {
      icon: Megaphone,
      title: "イベント告知が無料でできる",
      desc: "ご自身のイベントやマルシェをご自由に、いつでも無料で告知できます。しかも、メンバーさんはイベントシェアに協力的！",
      emoji: "📢",
    },
    {
      icon: Briefcase,
      title: "気軽に募集・問い合わせ",
      desc: "〇〇できる人、したい人いませんか？とビジネスのことからプライベートな事まで気軽に募集や問い合わせができます！たくさんのアクティブな会員様がいるので、お困り事解決に至っております。",
      emoji: "💼",
    },
  ];

  return (
    <section className="py-20 sm:py-28 bg-[var(--tetsu-warm-pink)] relative">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-white rounded-full text-sm font-bold text-[var(--tetsu-pink)] mb-4 shadow-sm">
            <Star className="w-4 h-4" />
            Benefits
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
            入会特典
          </h2>
        </div>

        <div className="space-y-4">
          {benefits.map((b, i) => (
            <div
              key={i}
              className="card-hover flex items-start gap-5 bg-white rounded-2xl p-6 shadow-sm"
            >
              <div className="w-14 h-14 bg-[var(--tetsu-pink-pale)] rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl">
                {b.emoji}
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 mb-1">
                  {b.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {b.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────── メンバーの声 ──────────────── */
function VoicesSection() {
  const voices = [
    {
      name: "50代男性",
      role: "コンサルタント",
      photo: "https://images.unsplash.com/photo-1619193597120-1d1edb42e34b?w=400&h=400&fit=crop&crop=face",
      text: "がちがちのビジネスコミュニティではないので、癒しで居心地がいい。みんないい人ばかりで、お繋ぎしてくれるギブの人がたくさんいてる。",
      stars: 5,
    },
    {
      name: "40代女性",
      role: "美容・健康業",
      photo: "https://images.unsplash.com/photo-1613020092739-5d01102e080b?w=400&h=400&fit=crop&crop=face",
      text: "みんなが話をよく聞いてくれて、よく宣伝もしてくれる。困ったらテツジン会。Google先生みたいに、なにか投げかけるとすぐに何かしらの反応が返ってくる。",
      stars: 5,
    },
    {
      name: "30代女性",
      role: "デザイナー業",
      photo: "https://images.unsplash.com/photo-1624091844772-554661d10173?w=400&h=400&fit=crop&crop=face",
      text: "皆さん気さくで優しく、副業リスタートに最高の経験をさせてもらっています。支えあえる最高の仲間たちだなと思っております。それくらい大好きなコミュニティ。",
      stars: 5,
    },
  ];

  return (
    <section id="voices" className="py-20 sm:py-28 bg-white relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[var(--tetsu-pink-pale)] rounded-full text-sm font-bold text-[var(--tetsu-pink)] mb-4">
            <MessageCircle className="w-4 h-4" />
            Voices
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
            メンバーの声
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {voices.map((v, i) => (
            <div
              key={i}
              className="card-hover bg-[var(--tetsu-warm)] rounded-2xl p-7 border border-gray-100 flex flex-col"
            >
              <Quote className="w-8 h-8 text-[var(--tetsu-pink)]/15 mb-3" />
              <p className="text-sm text-gray-600 leading-relaxed flex-1 mb-5">
                {v.text}
              </p>
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: v.stars }).map((_, si) => (
                  <Star
                    key={si}
                    className="w-4 h-4 fill-[var(--tetsu-yellow)] text-[var(--tetsu-yellow)]"
                  />
                ))}
              </div>
              <div className="flex items-center gap-3">
                <img
                  src={v.photo}
                  alt={v.name}
                  className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-sm"
                />
                <div>
                  <p className="text-sm font-bold text-gray-900">{v.name}</p>
                  <p className="text-xs text-gray-400">{v.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────── CTA ──────────────── */
function CTASection() {
  return (
    <section id="join" className="py-20 sm:py-28 bg-gradient-to-br from-[var(--tetsu-pink)] to-[var(--tetsu-pink-light)] relative overflow-hidden">
      <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/3" />

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-white/20 rounded-full text-sm font-bold text-white mb-6">
          <Heart className="w-4 h-4" />
          Join Us
        </span>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-6">
          入会希望＆お問い合わせ
        </h2>
        <p className="text-white/80 leading-relaxed mb-10 max-w-xl mx-auto text-lg">
          ご入会希望やご質問などお気軽にお問い合わせください。
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/contact"
            className="group inline-flex items-center gap-2 px-8 py-4 bg-white text-[var(--tetsu-pink)] rounded-full text-base font-extrabold hover:bg-gray-50 transition-colors shadow-lg"
          >
            お問い合わせはこちら
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <a
            href="https://www.instagram.com/tetsujin_com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 border-2 border-white/40 text-white rounded-full text-base font-bold hover:bg-white/10 transition-colors"
          >
            Instagramを見る
          </a>
        </div>
      </div>
    </section>
  );
}

/* ──────────────── ページ本体 ──────────────── */
export default function HomePage() {
  return (
    <>
      <HeroSection />
      <AboutSection />
      <FeaturesSection />
      <BenefitsSection />
      <VoicesSection />
      <CTASection />
    </>
  );
}
