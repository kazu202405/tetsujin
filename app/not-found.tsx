import Link from "next/link";
import { SearchX } from "lucide-react";

// 404。これが無いと Next.js の既定画面（英語・無地）が出る。
// 会員がURLを打ち間違えたときや、削除された投稿・会のリンクを踏んだときに来る。
export default function NotFound() {
  return (
    <section className="min-h-[70vh] flex items-center justify-center px-4 py-16 bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-5">
          <SearchX className="w-6 h-6 text-gray-400" />
        </div>

        <h1 className="text-lg font-extrabold text-gray-900 mb-3">
          ページが見つかりません
        </h1>

        <p className="text-sm text-gray-600 leading-relaxed mb-6">
          URLが変わったか、削除された可能性があります。
        </p>

        <Link
          href="/app/mypage"
          className="inline-block w-full py-3 rounded-xl bg-[var(--tetsu-pink)] text-white text-sm font-bold hover:opacity-90 transition-opacity"
        >
          マイページへ戻る
        </Link>
      </div>
    </section>
  );
}
