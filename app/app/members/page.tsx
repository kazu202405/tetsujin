"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, Search, User } from "lucide-react";
import { dashboardMembers } from "@/lib/dashboard-data";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { RoleBadge } from "@/components/app/role-badge";

type DirectoryMember = {
  id: string;
  member_no: number | null;
  name: string;
  nickname: string | null;
  job: string | null;
  grip: string | null;
  membership_type: string | null;
  role: "admin" | "manager" | "user";
};

const mockDirectory: DirectoryMember[] = dashboardMembers
  .filter((member) => !member.isWithdrawn)
  .map((member) => ({
    id: member.id,
    member_no: Number(member.id) || null,
    name: member.name,
    nickname: null,
    job: member.jobTitle,
    grip: member.headline,
    membership_type: member.memberType,
    role: "user",
  }));

function roleLabel(role: DirectoryMember["role"]) {
  return role === "admin" ? "運営" : role === "manager" ? "部長" : "ユーザー";
}

function MemberCard({ member }: { member: DirectoryMember }) {
  const initial = member.name.trim().charAt(0) || "T";
  return (
    <div className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="w-11 h-11 rounded-full bg-[var(--tetsu-pink-pale)] text-[var(--tetsu-pink)] flex items-center justify-center font-extrabold border-2 border-white shadow ring-1 ring-gray-100 flex-shrink-0">
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-bold text-gray-900 truncate">{member.name}</h3>
          {member.role !== "user" && <RoleBadge role={roleLabel(member.role)} />}
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
      </div>
      {member.member_no != null && (
        <span className="text-[10px] font-mono text-gray-300 flex-shrink-0">#{member.member_no}</span>
      )}
    </div>
  );
}

export default function MembersPage() {
  const [members, setMembers] = useState<DirectoryMember[] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [memberTypeFilter, setMemberTypeFilter] = useState<"全て" | "法人" | "個人">("全て");
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setMembers(mockDirectory);
      return;
    }
    let active = true;
    fetch("/api/members", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("members fetch failed");
        return response.json();
      })
      .then((rows: DirectoryMember[]) => {
        if (active) setMembers(rows);
      })
      .catch(() => {
        if (active) {
          setLoadError(true);
          setMembers([]);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return (members ?? []).filter((member) => {
      const matchesType =
        memberTypeFilter === "全て" || member.membership_type === memberTypeFilter;
      const matchesSearch =
        !query ||
        member.name.toLowerCase().includes(query) ||
        member.nickname?.toLowerCase().includes(query) ||
        member.job?.toLowerCase().includes(query) ||
        member.grip?.toLowerCase().includes(query) ||
        String(member.member_no ?? "").includes(query);
      return matchesType && Boolean(matchesSearch);
    });
  }, [members, memberTypeFilter, searchQuery]);

  return (
    <div className="min-h-screen">
      <div className="sticky top-14 lg:top-0 z-30 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">コミュニティメンバー</h1>
            {members && <span className="text-xs text-gray-400">{members.length}人</span>}
            <div className="flex gap-1 flex-shrink-0 ml-auto">
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
              placeholder="名前・呼び名・職業・会員番号で検索..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24">
        {members === null ? (
          <p className="text-center text-gray-400 py-20">読み込み中...</p>
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
