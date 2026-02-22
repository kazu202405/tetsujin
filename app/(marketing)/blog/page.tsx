"use client";

import Link from "next/link";
import { PageHeader } from "@/components/marketing/page-header";
import { Calendar, Tag } from "lucide-react";

const blogPosts = [
  {
    id: "1",
    title: "7/17 大規模交流会【梅田】",
    date: "2025-07-22",
    category: "オフライン交流会",
    excerpt:
      "テツジン会ではオフラインの交流会が月に10回以上あります。その中でも、運営が主催の交流会（通常交流会）は月に３回あります。そのうち一回は大規模交流会をしており、60～70人規模で開催しております。着席型なので、ゆっくりお話できます。",
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop",
  },
  {
    id: "2",
    title: "4/6 100人お花見BBQ",
    date: "2025-07-22",
    category: "オフライン交流会",
    excerpt:
      "テツジン会のメンバーさんでお花見BBQを開催しました！メンバーさんの家族連れもOKなので、お子様からご家族で参加の方たちも！にぎやかにワイワイお酒とお肉を囲みながら４時間のお花見をしておりました！",
    image: "https://images.unsplash.com/photo-1529543544282-afb57be5c200?w=600&h=400&fit=crop",
  },
  {
    id: "3",
    title: "3/9 第1回大阪！繋がるマルシェ",
    date: "2025-03-16",
    category: "マルシェ",
    excerpt:
      "新世界にあるスパワールドさんの入り口前で、マルシェ50店舗と舞台発表のイベントをTETSUJIN会主催で開催いたしました！たくさんの人が集まり、トータル6,500人もの方がこの場に来場くださいました！",
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&h=400&fit=crop",
  },
];

const categories = ["オフライン交流会", "マルシェ"];

export default function BlogPage() {
  return (
    <>
      <PageHeader title="活動報告" breadcrumb="活動報告" />

      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* 記事一覧 */}
            <div className="lg:col-span-2 space-y-6">
              {blogPosts.map((post) => (
                <article
                  key={post.id}
                  className="card-hover bg-[var(--tetsu-warm)] rounded-2xl overflow-hidden border border-gray-100"
                >
                  <div className="sm:flex">
                    <div className="sm:w-48 h-48 sm:h-auto flex-shrink-0">
                      <img
                        src={post.image}
                        alt={post.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-6 flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                          <Calendar className="w-3 h-3" />
                          {post.date}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--tetsu-pink-pale)] text-[var(--tetsu-pink)] text-xs font-bold rounded-full">
                          <Tag className="w-3 h-3" />
                          {post.category}
                        </span>
                      </div>
                      <h2 className="text-lg font-extrabold text-gray-900 mb-2">
                        {post.title}
                      </h2>
                      <p className="text-sm text-gray-500 leading-relaxed line-clamp-3">
                        {post.excerpt}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* サイドバー */}
            <aside className="space-y-8">
              {/* カテゴリー */}
              <div className="bg-[var(--tetsu-warm)] rounded-2xl p-6 border border-gray-100">
                <h3 className="text-base font-extrabold text-gray-900 mb-4">カテゴリー</h3>
                <ul className="space-y-2">
                  {categories.map((cat) => (
                    <li key={cat}>
                      <span className="text-sm text-gray-600 hover:text-[var(--tetsu-pink)] transition-colors cursor-pointer">
                        {cat}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 最近の投稿 */}
              <div className="bg-[var(--tetsu-warm)] rounded-2xl p-6 border border-gray-100">
                <h3 className="text-base font-extrabold text-gray-900 mb-4">最近の投稿</h3>
                <ul className="space-y-4">
                  {blogPosts.map((post) => (
                    <li key={post.id} className="flex items-start gap-3">
                      <img
                        src={post.image}
                        alt={post.title}
                        className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                      />
                      <div>
                        <p className="text-sm font-bold text-gray-900 line-clamp-2">
                          {post.title}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">{post.date}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
