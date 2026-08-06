"use client";

// ============================================================
// つながり（運営向け）
// ============================================================
// 誰と誰が何回会っているかを一覧にする。
//
// 🔴 出会い記録のメモ本文は表示しない。
//    記録は「本人のメモであり相手にも他人にも見せない」設計で作っているため、
//    運営であっても中身は見せず、ペアと回数までにとどめている。
// ============================================================

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Users, Search, Info, Handshake } from "lucide-react";
import { MemberAvatar } from "@/components/app/member-avatar";

interface PairPerson {
  id: string;
  name: string;
  avatarUrl: string | null;
}

interface MeetingPair {
  a: PairPerson;
  b: PairPerson;
  count: number;
  lastMetOn: string | null;
}

export default function MembersAdminPage() {
  const [pairs, setPairs] = useState<MeetingPair[]>([]);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/meetings", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("failed");
        if (!cancelled) {
          setPairs((await res.json()) as MeetingPair[]);
          setStatus("loaded");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pairs;
    return pairs.filter(
      (p) => p.a.name.toLowerCase().includes(q) || p.b.name.toLowerCase().includes(q)
    );
  }, [pairs, search]);

  // 「よくつながっている人」の目安として、人ごとの相手数も出す
  const topMembers = useMemo(() => {
    const map = new Map<string, { person: PairPerson; partners: number; meetings: number }>();
    for (const pair of pairs) {
      for (const [person, _other] of [
        [pair.a, pair.b],
        [pair.b, pair.a],
      ] as const) {
        const entry = map.get(person.id) ?? { person, partners: 0, meetings: 0 };
        entry.partners += 1;
        entry.meetings += pair.count;
        map.set(person.id, entry);
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.partners - a.partners || b.meetings - a.meetings)
      .slice(0, 5);
  }, [pairs]);

  return (
    <div className="min-h-screen">
      <div className="sticky top-14 lg:top-0 z-30 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-xl font-bold text-gray-900">つながり</h1>
          <p className="text-sm text-gray-500 mt-0.5">誰と誰が会っているかの一覧</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24">
        <div className="flex items-start gap-2 p-4 mb-6 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 leading-relaxed">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            会員が「出会い」に記録した内容から集計しています。
            <strong>メモの中身は表示していません</strong>
            （本人だけのメモとして預かっているため）。運営が把握できるのは「誰と誰が何回会ったか」までです。
          </span>
        </div>

        {status === "loading" && (
          <p className="text-center text-gray-400 py-20 text-sm">読み込み中...</p>
        )}
        {status === "error" && (
          <p className="text-center text-red-600 py-20 text-sm">
            つながりを取得できませんでした。
          </p>
        )}

        {status === "loaded" && pairs.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <Handshake className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">まだ出会いの記録がありません</p>
            <p className="text-xs text-gray-400 mt-1">
              会員が「出会い」から記録すると、ここに集計されます
            </p>
          </div>
        )}

        {status === "loaded" && pairs.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-xs text-gray-500 mb-1">つながりの組み合わせ</p>
                <p className="text-2xl font-bold text-gray-900">{pairs.length}</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-xs text-gray-500 mb-1">のべ記録数</p>
                <p className="text-2xl font-bold text-gray-900">
                  {pairs.reduce((sum, p) => sum + p.count, 0)}
                </p>
              </div>
            </div>

            {topMembers.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
                <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  つながりが多いメンバー
                </h2>
                <div className="space-y-2">
                  {topMembers.map((m) => (
                    <div key={m.person.id} className="flex items-center gap-3">
                      <Link href={`/app/profile/${m.person.id}`}>
                        <MemberAvatar name={m.person.name} url={m.person.avatarUrl} size="sm" />
                      </Link>
                      <Link
                        href={`/app/profile/${m.person.id}`}
                        className="text-sm text-gray-800 hover:text-amber-700 transition-colors flex-1 truncate"
                      >
                        {m.person.name}
                      </Link>
                      <span className="text-xs text-gray-500">
                        {m.partners}人・のべ{m.meetings}回
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="名前で検索..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>

            <div className="space-y-2">
              {filtered.map((pair) => (
                <div
                  key={`${pair.a.id}-${pair.b.id}`}
                  className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <MemberAvatar name={pair.a.name} url={pair.a.avatarUrl} size="sm" />
                    <span className="text-sm text-gray-800 truncate">{pair.a.name}</span>
                  </div>

                  <Handshake className="w-4 h-4 text-gray-300 flex-shrink-0" />

                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <MemberAvatar name={pair.b.name} url={pair.b.avatarUrl} size="sm" />
                    <span className="text-sm text-gray-800 truncate">{pair.b.name}</span>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-gray-900">{pair.count}回</p>
                    {pair.lastMetOn && (
                      <p className="text-[10px] text-gray-400">{pair.lastMetOn}</p>
                    )}
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <p className="text-center text-sm text-gray-400 py-12">
                  該当するつながりがありません
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
