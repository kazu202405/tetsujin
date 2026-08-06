"use client";

// ============================================================
// 紹介ツリー
// ============================================================
// 親子関係は members.referrer_member_id（運営が会員管理タブで紐づける列）から作る。
// 台帳の紹介者は名前のテキストで会員と繋がっていないため、
// 紐づけが済んだ分だけがツリーに現れる。
//
// 旧mockにあった「信頼スコア」は記録していないので出さない。
// ============================================================

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Users, ChevronDown, ChevronRight, Info } from "lucide-react";
import { MemberAvatar } from "@/components/app/member-avatar";

interface TreeMember {
  id: string;
  name: string;
  job: string;
  avatarUrl: string | null;
  isWithdrawn: boolean;
  memberNo: number | null;
  referrerId: string | null;
  referrerText: string;
}

interface TreeNode extends TreeMember {
  children: TreeNode[];
}

function NodeCard({ node, depth }: { node: TreeNode; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children.length > 0;

  return (
    <li className="relative">
      <div className="flex items-start gap-3 py-2">
        <div className="relative flex flex-col items-center flex-shrink-0 mt-3">
          <div className="w-3 h-3 rounded-full border-2 bg-amber-400 border-amber-300" />
        </div>

        <div className="flex-1 min-w-0">
          {node.isWithdrawn ? (
            <span className="inline-flex items-center gap-3 px-3 py-2 rounded-xl bg-white border border-gray-100 shadow-sm">
              <MemberAvatar name={node.name} url={node.avatarUrl} size="sm" grayscale />
              <span className="min-w-0">
                <span className="block text-sm font-bold text-gray-500 truncate">
                  {node.name}
                  <span className="ml-1 text-[10px] text-gray-400 font-normal">（退会）</span>
                </span>
              </span>
            </span>
          ) : (
            <Link
              href={`/app/profile/${node.id}`}
              className="inline-flex items-center gap-3 px-3 py-2 rounded-xl bg-white border border-gray-100 shadow-sm hover:border-amber-200 transition-colors group"
            >
              <MemberAvatar name={node.name} url={node.avatarUrl} size="sm" />
              <span className="min-w-0">
                <span className="block text-sm font-bold text-gray-900 group-hover:text-amber-700 transition-colors truncate">
                  {node.name}
                </span>
                {node.job && (
                  <span className="block text-[11px] text-gray-500 truncate">{node.job}</span>
                )}
              </span>
            </Link>
          )}

          {hasChildren && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="ml-2 inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
            >
              {expanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
              紹介した{node.children.length}人
            </button>
          )}

          {hasChildren && expanded && (
            <ul className="mt-1 ml-3 pl-4 border-l border-gray-200">
              {node.children.map((child) => (
                <NodeCard key={child.id} node={child} depth={depth + 1} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </li>
  );
}

export default function TreePage() {
  const [members, setMembers] = useState<TreeMember[]>([]);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/referral-tree", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("failed");
        if (!cancelled) {
          setMembers((await res.json()) as TreeMember[]);
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

  // 紹介者が紐づいている人だけでツリーを作る。
  // 紐づいていない人は根がバラバラになって読めないので別枠で件数だけ出す。
  const { roots, unlinkedCount } = useMemo(() => {
    const byId = new Map<string, TreeNode>();
    members.forEach((m) => byId.set(m.id, { ...m, children: [] }));

    const linkedIds = new Set<string>();
    members.forEach((m) => {
      if (m.referrerId && byId.has(m.referrerId)) {
        byId.get(m.referrerId)!.children.push(byId.get(m.id)!);
        linkedIds.add(m.id);
        linkedIds.add(m.referrerId);
      }
    });

    // ツリーに現れるのは「紹介した／されたことが紐づいている人」だけ
    const rootNodes = members
      .filter((m) => linkedIds.has(m.id) && !(m.referrerId && byId.has(m.referrerId)))
      .map((m) => byId.get(m.id)!);

    return {
      roots: rootNodes,
      unlinkedCount: members.filter((m) => !linkedIds.has(m.id)).length,
    };
  }, [members]);

  return (
    <div className="min-h-screen">
      <div className="sticky top-14 lg:top-0 z-30 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-xl font-bold text-gray-900">紹介ツリー</h1>
          <p className="text-sm text-gray-500 mt-0.5">誰が誰を紹介したかのつながり</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24">
        {status === "loading" && (
          <p className="text-center text-gray-400 py-20 text-sm">読み込み中...</p>
        )}
        {status === "error" && (
          <p className="text-center text-red-600 py-20 text-sm">
            紹介ツリーを取得できませんでした。
          </p>
        )}

        {status === "loaded" && (
          <>
            {unlinkedCount > 0 && (
              <div className="flex items-start gap-2 p-4 mb-6 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 leading-relaxed">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  紹介者がまだ会員と紐づいていない方が{unlinkedCount}人います。台帳の紹介者は
                  お名前のテキストで登録されているため、運営が「会員管理」から1人ずつ紐づけると
                  ここに反映されます。
                </span>
              </div>
            )}

            {roots.length > 0 ? (
              <ul className="space-y-1">
                {roots.map((node) => (
                  <NodeCard key={node.id} node={node} depth={0} />
                ))}
              </ul>
            ) : (
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">まだ紹介のつながりがありません</p>
                <p className="text-xs text-gray-400 mt-1">
                  運営が「会員管理」で紹介者を紐づけると、ここにツリーが表示されます
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
