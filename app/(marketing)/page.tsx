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
} from "lucide-react";

/* ──────────────── ヒーロー ──────────────── */
function HeroSection() {
  return (
    <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden bg-[var(--tetsu-black)]">
      {/* 背景装飾 */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--tetsu-red)]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[var(--tetsu-gold)]/5 rounded-full blur-[100px]" />
      </div>

      {/* グリッドパターン */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* バッジ */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full mb-8">
          <span className="w-1.5 h-1.5 bg-[var(--tetsu-red)] rounded-full animate-pulse" />
          <span className="text-xs text-gray-400 font-medium tracking-wide">
            会員数 120名突破 — 新規メンバー募集中
          </span>
        </div>

        {/* メインコピー */}
        <h1 className="heading-serif text-4xl sm:text-5xl lg:text-6xl font-semibold text-white leading-tight mb-6">
          誠実と信頼で
          <br />
          <span className="text-[var(--tetsu-gold)]">人脈</span>を広げる
        </h1>

        <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          異業種の経営者が集い、互いの事業を高め合う。
          <br className="hidden sm:block" />
          TETSUJIN会は、本気のつながりを生む場所です。
        </p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#join"
            className="group inline-flex items-center gap-2 px-8 py-3.5 bg-white text-[var(--tetsu-black)] rounded-full text-sm font-bold hover:bg-gray-100 transition-colors"
          >
            入会について詳しく見る
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </a>
          <Link
            href="/app/dashboard"
            className="inline-flex items-center gap-2 px-8 py-3.5 border border-white/20 text-white rounded-full text-sm font-medium hover:bg-white/5 transition-colors"
          >
            会員ログイン
          </Link>
        </div>

        {/* 数字 */}
        <div className="flex items-center justify-center gap-12 mt-16 pt-8 border-t border-white/10">
          {[
            { num: "120+", label: "メンバー" },
            { num: "10+", label: "月間交流会" },
            { num: "24h", label: "オンライン連携" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-white">
                {stat.num}
              </p>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* スクロール指示 */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <span className="text-[10px] text-gray-500 tracking-widest uppercase">
          scroll
        </span>
        <div className="w-px h-8 bg-gradient-to-b from-gray-500 to-transparent" />
      </div>
    </section>
  );
}

/* ──────────────── TETSUJIN会とは ──────────────── */
function AboutSection() {
  return (
    <section id="about" className="py-24 sm:py-32 bg-white relative">
      <div className="section-divider" />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-xs font-semibold tracking-[0.2em] text-[var(--tetsu-red)] uppercase mb-3">
            About
          </p>
          <h2 className="heading-serif text-3xl sm:text-4xl font-semibold text-gray-900 mb-6">
            TETSUJIN会とは
          </h2>
          <p className="text-gray-500 leading-relaxed max-w-2xl mx-auto">
            各業界で実績を積んだ経営者たちが、業種の垣根を越えてつながるコミュニティ。
            信頼できる仲間との出会いが、あなたのビジネスを次のステージへ導きます。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: Handshake,
              title: "信頼ベース",
              desc: "紹介制だからこそ実現する、本気のつながり。全員が実名・実業のプロフェッショナルです。",
            },
            {
              icon: Users,
              title: "異業種交流",
              desc: "IT、飲食、不動産、医療、金融…業界の壁を越えた対話が、新たな発想を生みます。",
            },
            {
              icon: MessageCircle,
              title: "相互支援",
              desc: "ビジネスの課題をシェアし、お互いの強みで助け合う。一人では辿り着けない解決策へ。",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="card-hover bg-[var(--tetsu-warm)] rounded-2xl p-8 text-center"
            >
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mx-auto mb-5 shadow-sm">
                <item.icon className="w-5 h-5 text-[var(--tetsu-black)]" />
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
      </div>
    </section>
  );
}

/* ──────────────── できること ──────────────── */
function FeaturesSection() {
  const features = [
    {
      icon: Calendar,
      title: "月10回以上のオフライン交流会",
      desc: "食事会、勉強会、スポーツイベントなど多彩な形式。気軽に参加でき、自然な関係構築ができます。",
      accent: "bg-blue-50 text-blue-600",
    },
    {
      icon: MessageCircle,
      title: "24時間オンライン連携",
      desc: "Discordを活用したリアルタイムコミュニケーション。ビジネスの相談も、日常の雑談も。",
      accent: "bg-emerald-50 text-emerald-600",
    },
    {
      icon: Megaphone,
      title: "マルシェ・イベント開催サポート",
      desc: "メンバー主催のイベントや出店を、コミュニティ全体でバックアップ。集客から運営まで支援します。",
      accent: "bg-amber-50 text-amber-600",
    },
    {
      icon: Briefcase,
      title: "部活・プロジェクト組織",
      desc: "ゴルフ部、ワイン部、読書会など趣味の繋がりから、共同プロジェクトまで。深い絆が生まれます。",
      accent: "bg-purple-50 text-purple-600",
    },
  ];

  return (
    <section
      id="features"
      className="py-24 sm:py-32 bg-[var(--tetsu-warm)] relative"
    >
      <div className="section-divider" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-xs font-semibold tracking-[0.2em] text-[var(--tetsu-red)] uppercase mb-3">
            Features
          </p>
          <h2 className="heading-serif text-3xl sm:text-4xl font-semibold text-gray-900 mb-4">
            TETSUJINでできること
          </h2>
          <p className="text-gray-500 max-w-lg mx-auto">
            オフラインとオンラインを組み合わせた、多彩な活動プログラム
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {features.map((f, i) => (
            <div
              key={i}
              className="card-hover bg-white rounded-2xl p-7 border border-gray-100"
            >
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 ${f.accent}`}
              >
                <f.icon className="w-5 h-5" />
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
      </div>
    </section>
  );
}

/* ──────────────── 入会特典 ──────────────── */
function BenefitsSection() {
  const benefits = [
    {
      icon: UserPlus,
      title: "プロフィール掲載で紹介が広がる",
      desc: "会員専用のプロフィールページが作成され、メンバー同士の紹介が自然に生まれます。",
    },
    {
      icon: Megaphone,
      title: "イベント告知・集客機能",
      desc: "あなたのイベントやセミナーを、信頼度の高いコミュニティ内で効率的に告知できます。",
    },
    {
      icon: Briefcase,
      title: "人材募集・業務提携",
      desc: "信頼できる仲間からの紹介で、質の高い人材獲得やビジネスパートナーシップを実現。",
    },
  ];

  return (
    <section className="py-24 sm:py-32 bg-white relative">
      <div className="section-divider" />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-xs font-semibold tracking-[0.2em] text-[var(--tetsu-red)] uppercase mb-3">
            Benefits
          </p>
          <h2 className="heading-serif text-3xl sm:text-4xl font-semibold text-gray-900 mb-4">
            入会特典
          </h2>
        </div>

        <div className="space-y-5">
          {benefits.map((b, i) => (
            <div
              key={i}
              className="card-hover flex items-start gap-5 bg-[var(--tetsu-warm)] rounded-2xl p-7"
            >
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                <b.icon className="w-5 h-5 text-[var(--tetsu-black)]" />
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
      name: "K.S.",
      age: "40代",
      role: "IT企業 代表",
      photo: "https://images.unsplash.com/photo-1619193597120-1d1edb42e34b?w=400&h=400&fit=crop&crop=face",
      text: "異業種の経営者と本音で話せる場は貴重。TETSUJIN会で出会った仲間から紹介をもらい、大きなプロジェクトにつながりました。",
      stars: 5,
    },
    {
      name: "E.Y.",
      age: "30代",
      role: "飲食店オーナー",
      photo: "https://images.unsplash.com/photo-1613020092739-5d01102e080b?w=400&h=400&fit=crop&crop=face",
      text: "コロナ禍で孤立していた時、このコミュニティに救われました。経営の悩みを分かち合える仲間がいることの心強さは、何物にも代えがたいです。",
      stars: 5,
    },
    {
      name: "T.W.",
      age: "50代",
      role: "不動産会社 社長",
      photo: "https://images.unsplash.com/photo-1590799159581-0ef74a3bac90?w=400&h=400&fit=crop&crop=face",
      text: "長年、同業者の集まりばかりだった自分にとって、視野が一気に広がる経験でした。新しいビジネスモデルのヒントをたくさんもらっています。",
      stars: 5,
    },
  ];

  return (
    <section
      id="voices"
      className="py-24 sm:py-32 bg-[var(--tetsu-warm)] relative"
    >
      <div className="section-divider" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-xs font-semibold tracking-[0.2em] text-[var(--tetsu-red)] uppercase mb-3">
            Voices
          </p>
          <h2 className="heading-serif text-3xl sm:text-4xl font-semibold text-gray-900 mb-4">
            メンバーの声
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {voices.map((v, i) => (
            <div
              key={i}
              className="card-hover bg-white rounded-2xl p-7 border border-gray-100 flex flex-col"
            >
              <Quote className="w-6 h-6 text-[var(--tetsu-red)]/20 mb-4" />
              <p className="text-sm text-gray-600 leading-relaxed flex-1 mb-6">
                {v.text}
              </p>
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: v.stars }).map((_, si) => (
                  <Star
                    key={si}
                    className="w-3.5 h-3.5 fill-amber-400 text-amber-400"
                  />
                ))}
              </div>
              <div className="flex items-center gap-3">
                <img
                  src={v.photo}
                  alt={v.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <p className="text-sm font-bold text-gray-900">{v.name}</p>
                  <p className="text-xs text-gray-400">
                    {v.age} / {v.role}
                  </p>
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
    <section
      id="join"
      className="py-24 sm:py-32 bg-[var(--tetsu-black)] relative overflow-hidden"
    >
      {/* 装飾 */}
      <div className="absolute top-1/3 right-0 w-72 h-72 bg-[var(--tetsu-red)]/5 rounded-full blur-[100px]" />
      <div className="absolute bottom-0 left-1/4 w-60 h-60 bg-[var(--tetsu-gold)]/5 rounded-full blur-[80px]" />

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-xs font-semibold tracking-[0.2em] text-[var(--tetsu-gold)] uppercase mb-4">
          Join Us
        </p>
        <h2 className="heading-serif text-3xl sm:text-4xl font-semibold text-white mb-6">
          あなたも、TETSUJIN会へ
        </h2>
        <p className="text-gray-400 leading-relaxed mb-10 max-w-xl mx-auto">
          まずはお気軽にお問い合わせください。
          既存メンバーからの紹介、または入会希望フォームより
          ご連絡いただけます。
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#"
            className="group inline-flex items-center gap-2 px-8 py-3.5 bg-white text-[var(--tetsu-black)] rounded-full text-sm font-bold hover:bg-gray-100 transition-colors"
          >
            入会希望・お問い合わせ
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </a>
          <a
            href="https://www.instagram.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-3.5 border border-white/20 text-white rounded-full text-sm font-medium hover:bg-white/5 transition-colors"
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
      <div className="noise-overlay" />
      <HeroSection />
      <AboutSection />
      <FeaturesSection />
      <BenefitsSection />
      <VoicesSection />
      <CTASection />
    </>
  );
}
