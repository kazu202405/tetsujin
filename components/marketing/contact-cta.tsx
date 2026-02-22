import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function ContactCTA() {
  return (
    <section className="py-16 bg-[var(--tetsu-warm-pink)]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl p-8 sm:p-10 text-center shadow-sm card-hover">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-3">
            入会希望＆お問い合わせ
          </h2>
          <p className="text-gray-500 mb-8">
            ご入会希望やご質問などお気軽にお問い合わせください
          </p>
          <Link
            href="/contact"
            className="group inline-flex items-center gap-2 px-8 py-4 bg-[var(--tetsu-pink)] text-white rounded-full text-base font-bold hover:bg-[var(--tetsu-pink-light)] transition-all shadow-lg shadow-pink-200"
          >
            お問い合わせはこちら
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}
