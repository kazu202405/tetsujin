"use client";

// ============================================================
// 運営：マッチング状況
// ============================================================
// 🔴 上に充足率を出すのが本体。
//    マッチングが動くかはコードでなくデータで決まるので、
//    「まだ誰も地域を入れていない」を運営が最初に見られる必要がある。
//    ここが空のまま「候補が出ない」と言われるのを防ぐ。
// ============================================================

import { useEffect, useState } from "react";
import { Users, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";

interface Pair {
  seeker_id: string;
  seeker_name: string;
  candidate_id: string;
  candidate_name: string;
  score: number;
  matched: string[];
}

interface Stats {
  total_members: number;
  with_profile: number;
  with_wants: number;
  with_region: number;
  with_industry: number;
  with_position: number;
}

function Bar({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="text-[11px] text-gray-500">{label}</span>
        <span className="text-[11px] font-bold text-gray-900">
          {value}名<span className="text-gray-400 font-normal">（{pct}%）</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full ${pct === 0 ? "bg-red-400" : pct < 30 ? "bg-amber-400" : "bg-emerald-500"}`}
          style={{ width: `${Math.max(pct, pct === 0 ? 0 : 2)}%` }}
        />
      </div>
    </div>
  );
}

export function MatchingPanel() {
  const [open, setOpen] = useState(false);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/admin/matching", { cache: "no-store" })
      .then(async (res) => (res.ok ? await res.json() : null))
      .then((body) => {
        if (body) {
          setPairs(body.pairs as Pair[]);
          setStats(body.stats as Stats | null);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [open]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 px-4 py-3 mb-4 rounded-2xl border border-gray-200 bg-white text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <Users className="w-4 h-4 text-gray-400" />
        マッチング状況
        <ChevronDown className="w-4 h-4 text-gray-300 ml-auto" />
      </button>
    );
  }

  const total = stats?.total_members ?? 0;

  return (
    <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-5">
      <button
        onClick={() => setOpen(false)}
        className="w-full flex items-center gap-2 text-sm font-bold text-gray-900 mb-4"
      >
        <Users className="w-4 h-4 text-gray-400" />
        マッチング状況
        <ChevronUp className="w-4 h-4 text-gray-300 ml-auto" />
      </button>

      {loading ? (
        <div className="h-40 rounded-xl bg-gray-50 animate-pulse" />
      ) : (
        <>
          {/* 充足率 */}
          {stats && (
            <div className="mb-5">
              <p className="text-xs font-bold text-gray-900 mb-1">設定の埋まり具合</p>
              <p className="text-[11px] text-gray-400 leading-relaxed mb-3">
                在籍{total}名のうち何名が入れたか。
                <b className="text-gray-600">
                  ここが埋まらないとマッチングは動きません。
                </b>
              </p>
              <div className="space-y-2.5">
                <Bar label="自分のことを登録した" value={stats.with_profile} total={total} />
                <Bar label="探している条件を登録した" value={stats.with_wants} total={total} />
                <Bar label="立場を入れた" value={stats.with_position} total={total} />
                <Bar label="業種を入れた" value={stats.with_industry} total={total} />
                <Bar label="地域を入れた" value={stats.with_region} total={total} />
              </div>
            </div>
          )}

          {/* 組み合わせ */}
          <p className="text-xs font-bold text-gray-900 mb-1">つながりそうな組み合わせ</p>
          <p className="text-[11px] text-gray-400 leading-relaxed mb-3">
            探している人ごとに上位3名まで。点数は条件が重なった数です。
            テーマ交流会を企画するときの材料にも使えます。
          </p>

          {pairs.length === 0 ? (
            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-3 leading-relaxed">
              まだ組み合わせがありません。
              {stats && stats.with_wants === 0
                ? "「探している条件」を登録した方がいないためです。"
                : "条件に重なりのある方がいないためです。"}
            </p>
          ) : (
            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {pairs.map((p) => (
                <div
                  key={`${p.seeker_id}-${p.candidate_id}`}
                  className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-100 text-xs"
                >
                  <span className="font-bold text-gray-900 truncate">{p.seeker_name}</span>
                  <ArrowRight className="w-3 h-3 text-gray-300 flex-shrink-0" />
                  <span className="text-gray-700 truncate">{p.candidate_name}</span>
                  <span className="ml-auto flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[10px] text-gray-400 hidden sm:inline">
                      {p.matched.join("・")}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-gray-900 text-white text-[10px] font-bold">
                      {p.score}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
