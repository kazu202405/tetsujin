"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Search, User, Sparkles } from "lucide-react";
import { RoleBadge } from "@/components/app/role-badge";
import { roleLabelOf, type MemberRoleCode } from "@/lib/member-roles";
import { MemberAvatar } from "@/components/app/member-avatar";
import { useCachedResource } from "@/lib/client-cache";
import { LoadingRows } from "@/components/app/skeleton";
import { useCurrentMember } from "@/lib/current-member";
import { Tags, ChevronRight } from "lucide-react";

const EMPTY_MEMBERS: DirectoryMember[] = [];

type DirectoryMember = {
  id: string;
  member_no: number | null;
  name: string;
  nickname: string | null;
  job: string | null;
  grip: string | null;
  membership_type: string | null;
  role: MemberRoleCode;
  avatar_url?: string | null;
  /** 本人が「つながりの設定」で選んだ業種の表示名。未設定なら空 */
  industries: string[];
  /** 🔴 入会日ではない。名簿を取り込んだ日が入っている人が436名いる */
  created_at: string;
};

// カードを押すとその人のプロフィールシートへ。
// 一覧から人を見に行く導線はここだけなので、リンクが無いと
// 会員は他のメンバーの中身に辿り着けない。
function MemberCard({ member }: { member: DirectoryMember }) {
  return (
    <Link
      href={`/app/profile/${member.id}`}
      className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:border-gray-300 hover:shadow-md transition-all"
      // 🔴 441人ぶんのカードを一度に描くと、スクロールも絞り込みも重くなる。
      //    画面の外にあるカードの中身はブラウザに描かせない。
      //    高さの目安を渡すのは、描かない分だけスクロールバーが
      //    伸び縮みして位置が飛ぶのを防ぐため。
      style={{ contentVisibility: "auto", containIntrinsicSize: "0 84px" }}
    >
      <MemberAvatar
        name={member.name}
        url={member.avatar_url}
        className="w-11 h-11 ring-1 ring-gray-100"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-bold text-gray-900 truncate">{member.name}</h3>
          {member.role !== "user" && <RoleBadge role={roleLabelOf(member.role)} />}
          {member.membership_type && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              member.membership_type === "法人"
                ? "bg-blue-50 text-blue-600"
                : "bg-gray-50 text-gray-500"
            }`}>
              {member.membership_type}
            </span>
          )}
        </div>
        {member.nickname && <p className="text-[11px] text-gray-400 truncate mt-0.5">{member.nickname}</p>}
        {member.job && <p className="text-xs text-gray-500 truncate mt-0.5">{member.job}</p>}
        {member.grip && <p className="text-xs text-gray-400 truncate mt-0.5">{member.grip}</p>}
        {member.industries.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {member.industries.map((label) => (
              <span
                key={label}
                className="px-1.5 py-0.5 rounded bg-[var(--tetsu-warm)] text-[10px] text-gray-600"
              >
                {label}
              </span>
            ))}
          </div>
        )}
      </div>
      {member.member_no != null && (
        <span className="text-[10px] font-mono text-gray-300 flex-shrink-0">#{member.member_no}</span>
      )}
    </Link>
  );
}

export default function MembersPage() {
  // 2回目以降は覚えている内容をすぐ出す（下タブで行き来しても待たない）
  const { data: loaded, status } = useCachedResource<DirectoryMember[]>(
    "members-directory",
    "/api/members",
    EMPTY_MEMBERS,
  );
  const members = status === "loading" ? null : loaded;
  const loadError = status === "error";
  const [searchQuery, setSearchQuery] = useState("");
  const [memberTypeFilter, setMemberTypeFilter] = useState<"全て" | "法人" | "個人">("全て");
  const [industryFilter, setIndustryFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"number" | "newest">("number");
  const me = useCurrentMember();

  // 🔴 業種で探せる画面に来た人が、自分は探されない側にいると気づける場所。
  //    一覧に自分の行も入っているので、そこから見る（別のAPIを増やさない）。
  //    登録すれば自然に消えるので、閉じるボタンは付けない。
  const myIndustriesEmpty = useMemo(() => {
    if (!members || !me) return false;
    const mine = members.find((m) => m.id === me.id);
    return Boolean(mine) && mine!.industries.length === 0;
  }, [members, me]);

  // 🔴 出すのは「実際に誰かが選んでいる業種」だけ。24項目を並べると
  //    ほとんどが0件のまま出て、空っぽさだけが目立つ。
  //    件数を添えるのは、0件でないことを見せるためではなく、
  //    「まだ誰も入れていない」を壊れていると誤解させないため。
  const industries = useMemo(() => {
    const count = new Map<string, number>();
    for (const m of members ?? []) {
      for (const label of m.industries) count.set(label, (count.get(label) ?? 0) + 1);
    }
    return [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ja"));
  }, [members]);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const list = (members ?? []).filter((member) => {
      const matchesType =
        memberTypeFilter === "全て" || member.membership_type === memberTypeFilter;
      const matchesIndustry = !industryFilter || member.industries.includes(industryFilter);
      const matchesSearch =
        !query ||
        member.name.toLowerCase().includes(query) ||
        member.nickname?.toLowerCase().includes(query) ||
        member.job?.toLowerCase().includes(query) ||
        member.grip?.toLowerCase().includes(query) ||
        // 業種名でも引けるようにする（「不動産」と打った人の期待に合う）
        member.industries.some((i) => i.toLowerCase().includes(query)) ||
        String(member.member_no ?? "").includes(query);
      return matchesType && matchesIndustry && Boolean(matchesSearch);
    });

    if (sortBy === "number") return list;

    // 🔴 新しい順。ただし既存会員は436名が取込日で同着になるので、
    //    同じ日のときは会員番号の大きい順にする。
    //    これから承認で入る人は created_at が実際の日付になるので上に出る。
    return [...list].sort((a, b) => {
      const d = b.created_at.localeCompare(a.created_at);
      if (d !== 0) return d;
      return (b.member_no ?? -1) - (a.member_no ?? -1);
    });
  }, [members, memberTypeFilter, industryFilter, searchQuery, sortBy]);

  return (
    <div className="min-h-screen">
      <div className="sticky top-14 lg:top-0 z-30 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">コミュニティメンバー</h1>
            {members && <span className="text-xs text-gray-400">{members.length}人</span>}
            <div className="flex gap-1 flex-shrink-0 ml-auto">
              {/* 並び順。挨拶チャンネルの代わりに「最近入った人」を見る場所になる */}
              <button
                onClick={() => setSortBy(sortBy === "newest" ? "number" : "newest")}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors mr-1 ${
                  sortBy === "newest"
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-500 border border-gray-200"
                }`}
                title="最近入った方が上に出ます（既存の会員は会員番号の大きい順）"
              >
                <Sparkles className="w-3 h-3" />
                新しい順
              </button>
              {(["全て", "法人", "個人"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setMemberTypeFilter(type)}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                    memberTypeFilter === type
                      ? "bg-gray-900 text-white"
                      : "bg-white text-gray-500 border border-gray-200"
                  }`}
                >
                  {type === "法人" && <Building2 className="w-3 h-3" />}
                  {type === "個人" && <User className="w-3 h-3" />}
                  {type}
                </button>
              ))}
            </div>
          </div>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="名前・呼び名・職業・業種・会員番号で検索..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          {/* 業種。誰も選んでいない業種は出さない（0件が並ぶと空っぽさだけが目立つ） */}
          {industries.length > 0 && (
            <div className="flex gap-1.5 mt-3 overflow-x-auto pb-0.5">
              <button
                onClick={() => setIndustryFilter(null)}
                className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap flex-shrink-0 transition-colors ${
                  industryFilter === null
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-500 border border-gray-200"
                }`}
              >
                業種すべて
              </button>
              {industries.map(([label, count]) => (
                <button
                  key={label}
                  onClick={() => setIndustryFilter(industryFilter === label ? null : label)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap flex-shrink-0 transition-colors ${
                    industryFilter === label
                      ? "bg-gray-900 text-white"
                      : "bg-white text-gray-500 border border-gray-200"
                  }`}
                >
                  {label}
                  <span className="ml-1 font-normal text-gray-400">{count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24">
        {myIndustriesEmpty && (
          <Link href="/app/mypage/matching" className="block mb-6 group">
            <div className="bg-white rounded-2xl border border-[var(--tetsu-pink)]/30 shadow-sm p-4 flex items-center gap-3 hover:border-[var(--tetsu-pink)]/60 transition-colors">
              <span className="w-9 h-9 rounded-xl bg-[var(--tetsu-pink-pale)] text-[var(--tetsu-pink)] flex items-center justify-center flex-shrink-0">
                <Tags className="w-4 h-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-gray-900">
                  あなたの業種を登録しませんか
                </span>
                <span className="block text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                  登録すると、この一覧で業種から探してもらえるようになります。
                </span>
              </span>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[var(--tetsu-pink)] flex-shrink-0" />
            </div>
          </Link>
        )}

        {members === null ? (
          <LoadingRows rows={6} />
        ) : loadError ? (
          <p className="text-center text-red-600 py-20">メンバー一覧を取得できませんでした。</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map((member) => <MemberCard key={member.id} member={member} />)}
          </div>
        )}
        {members && !loadError && filtered.length === 0 && (
          <p className="text-center text-gray-400 py-20">該当するメンバーが見つかりません</p>
        )}
      </div>
    </div>
  );
}
