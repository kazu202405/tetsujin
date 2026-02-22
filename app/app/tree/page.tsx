"use client";

import { useState } from "react";
import Link from "next/link";
import { Shield, Users, ChevronDown, ChevronRight } from "lucide-react";
import { referralTree, TreeNode } from "@/lib/dashboard-data";

function TreeNodeCard({ node, depth }: { node: TreeNode; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children.length > 0;
  const isRoot = node.id === "0";

  return (
    <li className="relative">
      <div className="flex items-start gap-3 py-2">
        <div className="relative flex flex-col items-center flex-shrink-0 mt-1">
          <div className={`w-3 h-3 rounded-full border-2 ${isRoot ? "bg-gray-900 border-gray-700" : "bg-amber-400 border-amber-300"}`} />
        </div>
        <div className="flex-1 min-w-0">
          {isRoot ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white">
              <Users className="w-4 h-4" />
              <span className="text-sm font-bold">{node.name}</span>
            </div>
          ) : (
            <Link href={`/app/profile/${node.id}`}
              className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md hover:border-amber-200 transition-all group">
              <img src={node.photoUrl} alt={node.name} className="w-9 h-9 rounded-full object-cover border-2 border-white shadow ring-1 ring-gray-100" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 group-hover:text-amber-700 transition-colors truncate">{node.name}</p>
                <p className="text-[11px] text-gray-500 truncate">{node.roleTitle}</p>
              </div>
              <div className="flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 flex-shrink-0">
                <Shield className="w-3 h-3 text-amber-500" />
                <span className="text-[11px] font-bold text-amber-700">{node.trustScore}</span>
              </div>
            </Link>
          )}
          {hasChildren && (
            <button onClick={() => setExpanded(!expanded)}
              className="inline-flex items-center gap-1 mt-1.5 ml-1 text-[11px] text-gray-400 hover:text-gray-600 transition-colors">
              {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              {expanded ? "折りたたむ" : `${node.children.length}人の紹介メンバー`}
            </button>
          )}
        </div>
      </div>
      {hasChildren && expanded && (
        <ul className="ml-[5px] pl-5 border-l-2 border-amber-200 space-y-0">
          {node.children.map((child) => (
            <TreeNodeCard key={child.id} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

function TreeStats() {
  const countNodes = (node: TreeNode): number => 1 + node.children.reduce((sum, c) => sum + countNodes(c), 0);
  const maxDepth = (node: TreeNode): number => node.children.length === 0 ? 0 : 1 + Math.max(...node.children.map(maxDepth));
  const total = countNodes(referralTree) - 1;
  const depth = maxDepth(referralTree);

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
        <p className="text-2xl font-bold text-gray-900">{total}</p>
        <p className="text-xs text-gray-500 mt-1">メンバー数</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
        <p className="text-2xl font-bold text-gray-900">{depth}</p>
        <p className="text-xs text-gray-500 mt-1">最大深度</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
        <p className="text-2xl font-bold text-amber-600">100%</p>
        <p className="text-xs text-gray-500 mt-1">紹介率</p>
      </div>
    </div>
  );
}

export default function TreePage() {
  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-10 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-xl font-bold text-gray-900">紹介ツリー</h1>
          <p className="text-sm text-gray-500 mt-1">信頼の連鎖 — 誰が誰を紹介したかを可視化</p>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8"><TreeStats /></div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
          <ul className="space-y-0">
            <TreeNodeCard node={referralTree} depth={0} />
          </ul>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-6 text-xs text-gray-400 px-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-900 border-2 border-gray-700" /><span>創設メンバー</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-400 border-2 border-amber-300" /><span>紹介されたメンバー</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-0 border-t-2 border-amber-200" /><span>紹介の繋がり</span>
          </div>
        </div>
      </div>
    </div>
  );
}
