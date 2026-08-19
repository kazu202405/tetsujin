"use client";

// ============================================================
// 今月のおすすめ（月3人まで）
// ============================================================
// 🔴 0人のときに何も出さないのが一番まずい。
//    会員は「壊れている」のか「自分がまだ設定していない」のか分からない。
//    ∴ 理由と、次にやることを必ず出す。
// ============================================================

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, ChevronRight, Settings2 } from "lucide-react";
import { MemberAvatar } from "@/components/app/member-avatar";

interface Suggestion {
  id: string;
  name: string;
  job: string | null;
  score: number;
  matched: string[];
  avatarUrl: string | null;
}

export function MatchingSuggestions() {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [wantsFilled, setWantsFilled] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/me/matching/suggestions", { cache: "no-store" })
      .then(async (res) => (res.ok ? await res.json() : null))
      .then((body) => {
        if (body) {
          setItems(body.suggestions as Suggestion[]);
          setWantsFilled(body.wantsFilled ?? 0);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="h-40 rounded-2xl bg-white animate-pulse mb-6" />;
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[var(--tetsu-pink)]" />
          今月のおすすめ
        </h3>
        <Link
          href="/app/mypage/matching"
          className="text-[11px] text-gray-400 hover:text-gray-700 inline-flex items-center gap-1"
        >
          <Settings2 className="w-3 h-3" />
          条件を変える
        </Link>
      </div>

      {items.length === 0 ? (
        // 🔴 「候補なし」だけだと会員は次に何をすればいいか分からない。
        //    設定が空なのか、条件が厳しすぎるのかで案内を変える。
        wantsFilled === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-gray-600 mb-1">まだ条件を設定していません</p>
            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
              どんな人とつながりたいかを登録すると、
              <br />
              毎月おすすめの方をご紹介します。
            </p>
            <Link
              href="/app/mypage/matching"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800"
            >
              条件を設定する
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-gray-600 mb-1">条件に合う方が見つかりませんでした</p>
            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
              「必須条件」を外すか、条件を減らすと見つかりやすくなります。
            </p>
            <Link
              href="/app/mypage/matching"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50"
            >
              条件を見直す
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )
      ) : (
        <div className="space-y-2">
          {items.map((s) => (
            <Link
              key={s.id}
              href={`/app/profile/${s.id}`}
              className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <MemberAvatar name={s.name} url={s.avatarUrl} className="w-11 h-11 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-900 truncate">{s.name}</p>
                {s.job && <p className="text-[11px] text-gray-500 truncate">{s.job}</p>}
                {/* なぜこの人が出たかを必ず出す。理由が見えないと納得されない。 */}
                {s.matched.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {s.matched.map((m) => (
                      <span
                        key={m}
                        className="px-1.5 py-0.5 rounded bg-[var(--tetsu-warm)] text-[10px] text-gray-600"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
            </Link>
          ))}
          <p className="text-[11px] text-gray-400 pt-1 leading-relaxed">
            条件に近い方を毎月3名までご紹介します。来月には別の方をご紹介します。
          </p>
        </div>
      )}
    </div>
  );
}
