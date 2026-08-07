"use client";

// ============================================================
// 会員一覧の表示（PC＝テーブル / スマホ＝カード）
// ============================================================
// 626名を扱う画面で実際にやるのは「行をまたいで見比べる」作業
// （更新していない人を探す・連絡先が無い人を拾う など）なので、
// 同じ項目が縦に揃うテーブルの方が速い。
//
// ただし狭い画面では横スクロールになって読みづらいため、
// スマホだけはカード表示に切り替えている。
// ============================================================

import { StickyNote, ChevronRight } from "lucide-react";
import { MemberAvatar } from "@/components/app/member-avatar";
import { RoleBadge } from "@/components/app/role-badge";
import type { MemberRole } from "@/lib/member-roles";
import { type MemberDbRow, formatStartMonth } from "./members-data";

export type MemberSort = "member_no" | "name" | "start" | "price" | "renewal";

const COLUMNS: { key: MemberSort | null; label: string; align?: "right" | "center" }[] = [
  { key: "member_no", label: "会員番号", align: "right" },
  { key: "name", label: "氏名" },
  { key: null, label: "種別", align: "center" },
  { key: null, label: "職業" },
  { key: null, label: "連絡先" },
  { key: "start", label: "入会" },
  { key: "renewal", label: "更新状況" },
  { key: null, label: "権限", align: "center" },
  { key: null, label: "状態", align: "center" },
  { key: null, label: "メモ", align: "center" },
];

function StatusBadge({ withdrawn }: { withdrawn: boolean }) {
  return withdrawn ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-bold border border-red-200">
      退会
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-50 text-green-600 text-[10px] font-bold border border-green-200">
      在籍
    </span>
  );
}

/** 運営メモの有無。本文は行の高さが崩れるので出さず、詳細で見る。
    マウスを乗せたときだけ本文が読めるようにしている。 */
function NoteMark({ row }: { row: MemberDbRow }) {
  if (!row.admin_note) return <span className="text-gray-200">—</span>;
  return (
    <span title={row.admin_note}>
      <StickyNote className="w-3.5 h-3.5 text-amber-500" />
    </span>
  );
}

function Contact({ row }: { row: MemberDbRow }) {
  if (!row.email && !row.phone) {
    return <span className="text-amber-600 text-xs">なし</span>;
  }
  return (
    <span className="block text-xs font-mono text-gray-600 truncate">
      {row.email || row.phone}
    </span>
  );
}

export function MemberList({
  rows,
  roleLabelOf,
  sort,
  onSort,
  onSelect,
}: {
  rows: MemberDbRow[];
  roleLabelOf: (role: MemberDbRow["role"]) => MemberRole;
  sort: MemberSort;
  onSort: (key: MemberSort) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <>
      {/* PC：テーブル */}
      <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              {COLUMNS.map((col) => (
                <th
                  key={col.label}
                  className={`px-3 py-3 text-xs font-bold whitespace-nowrap ${
                    col.align === "right"
                      ? "text-right"
                      : col.align === "center"
                        ? "text-center"
                        : "text-left"
                  } ${col.label === "氏名" ? "sticky left-0 z-20 bg-white border-r border-gray-200 min-w-[180px]" : ""}`}
                >
                  {col.key ? (
                    <button
                      onClick={() => onSort(col.key as MemberSort)}
                      className={`hover:text-gray-900 transition-colors ${
                        sort === col.key ? "text-amber-700" : "text-gray-600"
                      }`}
                      title="クリックで並び替え"
                    >
                      {col.label}
                      {sort === col.key && " ↓"}
                    </button>
                  ) : (
                    <span className="text-gray-600">{col.label}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr
                key={m.id}
                onClick={() => onSelect(m.id)}
                className="group border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
              >
                <td className="px-3 py-2.5 text-right font-mono text-xs text-gray-500 whitespace-nowrap">
                  {m.member_no ?? <span className="text-gray-300">—</span>}
                </td>

                <td className="sticky left-0 z-10 bg-white group-hover:bg-gray-50 border-r border-gray-200 px-3 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <MemberAvatar
                      name={m.name}
                      url={m.avatar_url}
                      size="sm"
                      grayscale={m.is_withdrawn}
                    />
                    <span className="text-sm text-gray-900 truncate">{m.name}</span>
                  </div>
                </td>

                <td className="px-3 py-2.5 text-center text-xs text-gray-600 whitespace-nowrap">
                  {m.membership_type ?? <span className="text-gray-300">—</span>}
                </td>

                <td className="px-3 py-2.5 max-w-[180px]">
                  <span className="block text-xs text-gray-600 truncate">
                    {m.job || <span className="text-gray-300">—</span>}
                  </span>
                </td>

                <td className="px-3 py-2.5 max-w-[200px]">
                  <Contact row={m} />
                </td>

                <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">
                  {formatStartMonth(m) ?? <span className="text-gray-300">—</span>}
                </td>

                <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">
                  {m.renewal_status ?? <span className="text-gray-300">—</span>}
                </td>

                {/* 権限はログイン前でも設定できるので常に出す。
                    まだログインしていないことは薄字で添える。 */}
                <td className="px-3 py-2.5 text-center whitespace-nowrap">
                  <RoleBadge role={roleLabelOf(m.role)} />
                  {!m.auth_user_id && (
                    <span className="block text-[10px] text-gray-300 mt-0.5">未ログイン</span>
                  )}
                </td>

                <td className="px-3 py-2.5 text-center whitespace-nowrap">
                  <StatusBadge withdrawn={m.is_withdrawn} />
                </td>

                <td className="px-3 py-2.5 text-center whitespace-nowrap">
                  <NoteMark row={m} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {rows.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-12">該当する会員がいません</p>
        )}
      </div>

      {/* スマホ：カード（テーブルは横に長すぎて読めないため） */}
      <div className="md:hidden space-y-2">
        {rows.map((m) => (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            className={`w-full flex items-center gap-3 p-4 bg-white rounded-2xl border shadow-sm text-left hover:border-gray-300 transition-colors ${
              m.is_withdrawn ? "border-red-100" : "border-gray-100"
            }`}
          >
            <MemberAvatar
              name={m.name}
              url={m.avatar_url}
              grayscale={m.is_withdrawn}
              className="ring-1 ring-gray-100"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-gray-900 truncate">{m.name}</span>
                {m.member_no != null && (
                  <span className="text-[10px] font-mono text-gray-400">No.{m.member_no}</span>
                )}
                <StatusBadge withdrawn={m.is_withdrawn} />
                <RoleBadge role={roleLabelOf(m.role)} />
                {!m.auth_user_id && (
                  <span className="text-[10px] text-gray-300">未ログイン</span>
                )}
              </div>
              <p className="text-xs text-gray-500 truncate mt-0.5">
                {m.job || "職業未登録"}
                {m.membership_type ? `・${m.membership_type}` : ""}
                {formatStartMonth(m) ? `・${formatStartMonth(m)}開始` : ""}
                {m.renewal_status ? `・${m.renewal_status}` : ""}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <Contact row={m} />
                <NoteMark row={m} />
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
          </button>
        ))}

        {rows.length === 0 && (
          <div className="text-center text-gray-400 py-12 text-sm">該当する会員がいません</div>
        )}
      </div>
    </>
  );
}
