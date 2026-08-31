"use client";

// ============================================================
// 会員（一覧＋詳細＋運営操作）
// ============================================================
// 以前は「会員管理（操作）」「会員DB（閲覧）」「生会員DB（Excel取込の検算）」の
// 3タブに分かれていた。データがExcel由来だった頃は
// 「見る側」と「操作する側」が別物だったための分割で、
// いまは同じ members テーブル1つなので統合した。
// ============================================================

import { useEffect, useMemo, useState } from "react";
import { Search, UserCog, UserX, RotateCcw, Handshake, X } from "lucide-react";
import { MemberAvatar } from "@/components/app/member-avatar";
import { RoleBadge } from "@/components/app/role-badge";
import { ToastStack, type ToastMessage } from "@/components/app/toast";
import { isOwnerRole, roleLabelOf } from "@/lib/member-roles";
import { useCurrentMember } from "@/lib/current-member";
import { type MemberDbRow, formatStartMonth, useMembersDb } from "./members-data";
import { MemberList, type MemberSort } from "./member-list";
import { LedgerEditor } from "./ledger-editor";
import { RenewalLink } from "./renewal-link";
import { BillingPlansPanel } from "./billing-plans-panel";

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/** 626名を一度に描画すると重いので、既定はこの件数まで（検索で絞り込む運用） */
const PAGE_SIZE = 100;

type MemberFilter = "all" | "active" | "withdrawn" | "login" | "no_contact" | "no_referrer_link";

export function MemberTab({ focusMemberId }: { focusMemberId?: string | null }) {
  const { rows, loadStatus } = useMembersDb();
  // 権限の変更は管理者だけ。運営には操作UIを出さない（APIとDBでも弾いている）
  const canChangeRole = isOwnerRole(useCurrentMember()?.role);

  // 更新結果をその場で反映するための上書き（再取得なしで一覧に効かせる）
  const [overrides, setOverrides] = useState<Record<string, Partial<MemberDbRow>>>({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<MemberFilter>("all");
  const [sort, setSort] = useState<MemberSort>("member_no");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<ToastMessage | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  // 他のタブ（メンバーの状況・参加状況）から会員を指定して開かれたとき。
  // 気になる人を見つけた場所から、名前を覚えて検索し直さずに詳細へ入れるようにする。
  useEffect(() => {
    if (focusMemberId) setDetailId(focusMemberId);
  }, [focusMemberId]);

  const merged: MemberDbRow[] = useMemo(
    () => (rows ?? []).map((r) => (overrides[r.id] ? { ...r, ...overrides[r.id] } : r)),
    [rows, overrides]
  );

  const counts = useMemo(
    () => ({
      total: merged.length,
      active: merged.filter((r) => !r.is_withdrawn).length,
      withdrawn: merged.filter((r) => r.is_withdrawn).length,
      login: merged.filter((r) => r.auth_user_id).length,
      noContact: merged.filter((r) => !r.email && !r.phone).length,
      // 台帳に紹介者の記載はあるが、まだ会員と紐づけていない人
      noReferrerLink: merged.filter((r) => r.referrer && !r.referrer_member_id).length,
    }),
    [merged]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = merged;

    if (filter === "active") list = list.filter((r) => !r.is_withdrawn);
    if (filter === "withdrawn") list = list.filter((r) => r.is_withdrawn);
    if (filter === "login") list = list.filter((r) => r.auth_user_id);
    if (filter === "no_contact") list = list.filter((r) => !r.email && !r.phone);
    if (filter === "no_referrer_link")
      list = list.filter((r) => r.referrer && !r.referrer_member_id);

    if (q) {
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.nickname ?? "").toLowerCase().includes(q) ||
          (r.job ?? "").toLowerCase().includes(q) ||
          (r.email ?? "").toLowerCase().includes(q) ||
          (r.phone ?? "").includes(q) ||
          (r.referrer ?? "").toLowerCase().includes(q) ||
          String(r.member_no ?? "").includes(q)
      );
    }

    const noAsNumber = (v: MemberDbRow["member_no"]) =>
      typeof v === "number" ? v : Number.MAX_SAFE_INTEGER;

    // 更新状況は「対応が要るもの」から並べる（運営が上から片付けられるように）
    const renewalOrder: Record<string, number> = {
      入金待ち: 0,
      返事待ち: 1,
      未更新: 2,
      更新済: 3,
      退会: 4,
    };

    return [...list].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "ja");
      if (sort === "renewal") {
        const key = (r: MemberDbRow) => renewalOrder[r.renewal_status ?? ""] ?? 9;
        return key(a) - key(b);
      }
      if (sort === "price") return (b.price ?? 0) - (a.price ?? 0);
      if (sort === "start") {
        const key = (r: MemberDbRow) => (r.start_year ?? 0) * 100 + (r.start_month ?? 0);
        return key(b) - key(a);
      }
      return noAsNumber(a.member_no) - noAsNumber(b.member_no);
    });
  }, [merged, search, filter, sort]);

  const visible = filtered.slice(0, visibleCount);
  const detail = detailId ? merged.find((r) => r.id === detailId) ?? null : null;

  // ---------- 運営操作 ----------
  const applyPatch = async (
    row: MemberDbRow,
    body: Record<string, unknown>,
    optimistic: Partial<MemberDbRow>,
    successText: string
  ): Promise<boolean> => {
    setSavingId(row.id);
    setMessage(null);
    const response = await fetch(`/api/admin/members/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = (await response.json().catch(() => null)) as {
      error?: string;
      billing?: { canceled: boolean; message?: string };
    } | null;
    setSavingId(null);

    if (!response.ok) {
      setMessage({ type: "error", text: result?.error || "更新できませんでした" });
      return false;
    }
    setOverrides((cur) => ({ ...cur, [row.id]: { ...cur[row.id], ...optimistic } }));

    // 🔴 退会はできたが会費の解約に失敗した場合は、成功のトーストで流さない。
    //    そのままだと引き落としが続くので、運営が手で止める必要があると伝える。
    if (result?.billing && !result.billing.canceled) {
      setMessage({ type: "error", text: result.billing.message ?? "会費の解約に失敗しました" });
      return true;
    }
    setMessage({
      type: "success",
      text: result?.billing?.canceled ? `${successText}（会費の引き落としも停止しました）` : successText,
    });
    return true;
  };

  const changeRole = async (row: MemberDbRow, role: MemberDbRow["role"]) => {
    if (row.role === role) return;
    setSavingId(row.id);
    setMessage(null);
    const response = await fetch(`/api/admin/members/${row.id}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const result = (await response.json().catch(() => null)) as { error?: string } | null;
    setSavingId(null);
    if (!response.ok) {
      setMessage({ type: "error", text: result?.error || "権限を変更できませんでした" });
      return;
    }
    setOverrides((cur) => ({ ...cur, [row.id]: { ...cur[row.id], role } }));
    setMessage({
      type: "success",
      text: `${row.name}さんの権限を「${roleLabelOf(role)}」にしました`,
    });
  };

  const linkReferrer = async (row: MemberDbRow, referrerMemberId: string | null) => {
    setSavingId(row.id);
    setMessage(null);
    const response = await fetch(`/api/admin/members/${row.id}/referrer`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referrerMemberId }),
    });
    const result = (await response.json().catch(() => null)) as { error?: string } | null;
    setSavingId(null);
    if (!response.ok) {
      setMessage({ type: "error", text: result?.error || "紹介者を更新できませんでした" });
      return;
    }
    setOverrides((cur) => ({
      ...cur,
      [row.id]: { ...cur[row.id], referrer_member_id: referrerMemberId },
    }));
    setMessage({
      type: "success",
      text: referrerMemberId ? "紹介者を紐づけました" : "紹介者の紐づけを解除しました",
    });
  };

  if (loadStatus === "loading") {
    return <div className="text-center text-gray-400 py-20">読み込み中...</div>;
  }
  if (loadStatus === "error") {
    return <div className="text-center text-red-600 py-20">会員データを取得できませんでした。</div>;
  }

  const filterChips: { key: MemberFilter; label: string; count: number }[] = [
    { key: "all", label: "全員", count: counts.total },
    { key: "active", label: "在籍", count: counts.active },
    { key: "withdrawn", label: "退会", count: counts.withdrawn },
    { key: "login", label: "ログインあり", count: counts.login },
    { key: "no_contact", label: "連絡先なし", count: counts.noContact },
    { key: "no_referrer_link", label: "紹介者 未紐づけ", count: counts.noReferrerLink },
  ];

  return (
    <>
      {/* マッチング（充足率・選択肢）は「マッチング」タブへ移した。
          会員を見に来た人にとっては、会員テーブルより先に別の表が
          出てくる形になっていたため。 */}
      <BillingPlansPanel />

      <div className="flex items-start gap-2 p-4 mb-6 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 leading-relaxed">
        <UserCog className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>
          会員をクリックすると詳細と操作（退会・備考・権限・紹介者の紐づけ）が開きます。退会は運営側でのみ処理します（本人からの退会ボタンはありません）。
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {filterChips.map((chip) => (
          <button
            key={chip.key}
            onClick={() => {
              setFilter(chip.key);
              setVisibleCount(PAGE_SIZE);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filter === chip.key
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
            }`}
          >
            {chip.label}
            <span className={filter === chip.key ? "text-gray-300" : "text-gray-400"}>
              {chip.count}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            placeholder="名前・会員番号・職業・メール・電話・紹介者で検索..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as MemberSort)}
          className="px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-900"
          aria-label="並び替え"
        >
          <option value="member_no">会員番号順</option>
          <option value="name">氏名順</option>
          <option value="start">入会が新しい順</option>
          <option value="renewal">更新状況（要対応から）</option>
          <option value="price">入会時金額が高い順</option>
        </select>
      </div>

      {/* 操作の多くは詳細モーダルの中で行うため、結果は画面最前面のトーストで出す */}
      <ToastStack toast={message} onClose={() => setMessage(null)} />

      <p className="text-xs text-gray-400 mb-3">
        {filtered.length}件中 {visible.length}件を表示
      </p>

      <MemberList
        rows={visible}
        roleLabelOf={roleLabelOf}
        sort={sort}
        onSort={(key) => {
          setSort(key);
          setVisibleCount(PAGE_SIZE);
        }}
        onSelect={setDetailId}
      />

      {visible.length < filtered.length && (
        <button
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          className="mt-3 w-full py-3 rounded-2xl border border-gray-200 bg-white text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
        >
          さらに{Math.min(PAGE_SIZE, filtered.length - visible.length)}件を表示
        </button>
      )}


      {detail && (
        <MemberDetailModal
          row={detail}
          all={merged}
          saving={savingId === detail.id}
          onClose={() => setDetailId(null)}
          onPatch={applyPatch}
          onChangeRole={changeRole}
          onLinkReferrer={linkReferrer}
          canChangeRole={canChangeRole}
        />
      )}
    </>
  );
}

// ============================================================
// 詳細＋操作
// ============================================================
function MemberDetailModal({
  row,
  all,
  saving,
  onClose,
  onPatch,
  onChangeRole,
  onLinkReferrer,
  canChangeRole,
}: {
  row: MemberDbRow;
  all: MemberDbRow[];
  saving: boolean;
  onClose: () => void;
  onPatch: (
    row: MemberDbRow,
    body: Record<string, unknown>,
    optimistic: Partial<MemberDbRow>,
    successText: string
  ) => Promise<boolean>;
  onChangeRole: (row: MemberDbRow, role: MemberDbRow["role"]) => void;
  onLinkReferrer: (row: MemberDbRow, referrerMemberId: string | null) => void;
  canChangeRole: boolean;
}) {
  const [noteDraft, setNoteDraft] = useState(row.admin_note ?? "");
  const [withdrawing, setWithdrawing] = useState(false);
  const [reason, setReason] = useState("");
  const [referrerOpen, setReferrerOpen] = useState(false);
  const [referrerSearch, setReferrerSearch] = useState(row.referrer ?? "");

  const fields: { label: string; value: string | number | null; mono?: boolean }[] = [
    { label: "会員番号", value: row.member_no, mono: true },
    { label: "呼び名", value: row.nickname },
    { label: "メールアドレス", value: row.email, mono: true },
    { label: "電話番号", value: row.phone, mono: true },
    { label: "性別", value: row.gender },
    { label: "年代", value: row.age_range },
    { label: "職業", value: row.job },
    { label: "法人・個人", value: row.membership_type },
    { label: "ひとこと", value: row.grip },
    { label: "参加頻度", value: row.frequency },
    { label: "スタート", value: formatStartMonth(row) },
    { label: "更新状況", value: row.renewal_status },
    { label: "更新時金額", value: row.renewal_fee != null ? `¥${row.renewal_fee.toLocaleString()}` : null },
    { label: "入会時金額", value: row.price != null ? `¥${row.price.toLocaleString()}` : null },
    { label: "紹介料", value: row.referral_fee != null ? `¥${row.referral_fee.toLocaleString()}` : null },
    { label: "更新メモ", value: row.renewal_note ?? null },
    { label: "支払方法", value: row.payment_method },
    { label: "紹介者（台帳の記載）", value: row.referrer },
    { label: "フォーム送信日", value: row.contact_submitted_at ? fmtDate(row.contact_submitted_at) : null },
    {
      label: "データ出典",
      value:
        row.source === "both" ? "名簿＋連絡先" : row.source === "member_only" ? "名簿のみ" : "連絡先のみ",
    },
    { label: "名簿シート", value: row.import_sheet },
    { label: "ログイン", value: row.auth_user_id ? "あり" : "なし" },
    { label: "退会日", value: row.withdrawn_at ? fmtDate(row.withdrawn_at) : null },
    { label: "退会理由", value: row.withdrawal_reason ?? null },
    { label: "ID", value: row.id, mono: true },
  ];

  const referrerCandidates = all
    .filter((c) => c.id !== row.id)
    .filter((c) => {
      const q = referrerSearch.trim().toLowerCase();
      return !q || c.name.toLowerCase().includes(q);
    })
    .slice(0, 30);

  const linkedReferrer = row.referrer_member_id
    ? all.find((c) => c.id === row.referrer_member_id)
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200">
          <MemberAvatar name={row.name} url={row.avatar_url} grayscale={row.is_withdrawn} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-gray-900 truncate">{row.name}</h3>
              {row.is_withdrawn ? (
                <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-bold border border-red-200">
                  退会
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-600 text-[10px] font-bold border border-green-200">
                  在籍
                </span>
              )}
              <RoleBadge role={roleLabelOf(row.role)} />
            </div>
            <p className="text-xs text-gray-500 truncate">{row.job || "職業未登録"}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-6">
          {/* 運営操作 */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-gray-900">運営操作</h4>

            {/* 権限。
                まだログインしていない会員にも設定できる。
                運営を先に決めておけば、その人がログインした時点で運営として入れる。

                変更できるのは管理者だけ。運営には読み取り専用で見せる
                （選べないものを押せる形で出すと、押してから断られて分かりにくい）。 */}
            <div className="flex items-start gap-3">
              <span className="text-xs text-gray-500 w-20 flex-shrink-0 pt-2">権限</span>
              <div className="min-w-0">
                {canChangeRole ? (
                  <select
                    value={row.role}
                    onChange={(e) => onChangeRole(row, e.target.value as MemberDbRow["role"])}
                    disabled={saving}
                    className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-50"
                  >
                    <option value="user">一般</option>
                    <option value="manager">部長</option>
                    <option value="admin">運営</option>
                    <option value="owner">管理者（全権限）</option>
                  </select>
                ) : (
                  <p className="px-3 py-2 rounded-xl border border-gray-100 bg-gray-50 text-sm font-bold text-gray-600 inline-block">
                    {roleLabelOf(row.role)}
                  </p>
                )}
                {!canChangeRole && (
                  <p className="mt-1.5 text-[11px] text-gray-400">
                    権限の変更は管理者のみが行えます。
                  </p>
                )}
                {canChangeRole && !row.auth_user_id && (
                  <p className="mt-1.5 text-[11px] text-gray-400">
                    {row.email
                      ? `まだログインしていません。${row.email} でアカウントを作ると、この権限のまま入れます。`
                      : "まだログインしていません。メールアドレスを登録しておくと、その方がアカウントを作ったときにこの権限のまま入れます。"}
                  </p>
                )}
              </div>
            </div>

            {/* 紹介者 */}
            <div className="flex items-start gap-3">
              <span className="text-xs text-gray-500 w-20 flex-shrink-0 pt-2">紹介者</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-gray-700">
                    {linkedReferrer ? (
                      <>
                        {linkedReferrer.name}
                        <span className="text-green-600 text-xs ml-1">（紐づけ済み）</span>
                      </>
                    ) : row.referrer ? (
                      <>
                        {row.referrer}
                        <span className="text-amber-600 text-xs ml-1">（未紐づけ）</span>
                      </>
                    ) : (
                      <span className="text-gray-400">記載なし</span>
                    )}
                  </span>
                  <button
                    onClick={() => setReferrerOpen((v) => !v)}
                    className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 underline"
                  >
                    <Handshake className="w-3 h-3" />
                    {referrerOpen ? "閉じる" : "会員に紐づける"}
                  </button>
                </div>

                {referrerOpen && (
                  <div className="mt-2 border border-gray-200 rounded-xl p-3">
                    <input
                      value={referrerSearch}
                      onChange={(e) => setReferrerSearch(e.target.value)}
                      placeholder="会員を名前で検索"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 mb-2"
                    />
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {referrerCandidates.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => onLinkReferrer(row, c.id)}
                          disabled={saving}
                          className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors disabled:opacity-50 ${
                            row.referrer_member_id === c.id
                              ? "bg-green-50 border border-green-200"
                              : "hover:bg-gray-50 border border-transparent"
                          }`}
                        >
                          <MemberAvatar name={c.name} url={c.avatar_url} size="sm" />
                          <span className="text-sm text-gray-800 truncate">{c.name}</span>
                          {c.member_no != null && (
                            <span className="text-[10px] text-gray-400 ml-auto">
                              No.{c.member_no}
                            </span>
                          )}
                        </button>
                      ))}
                      {referrerCandidates.length === 0 && (
                        <p className="text-center text-xs text-gray-400 py-4">
                          該当する会員が見つかりません
                        </p>
                      )}
                    </div>
                    {row.referrer_member_id && (
                      <button
                        onClick={() => onLinkReferrer(row, null)}
                        disabled={saving}
                        className="mt-2 text-xs text-gray-400 hover:text-gray-600 underline disabled:opacity-50"
                      >
                        紐づけを解除
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 備考 */}
            <div className="flex items-start gap-3">
              <span className="text-xs text-gray-500 w-20 flex-shrink-0 pt-2">備考</span>
              <div className="flex-1">
                <textarea
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  rows={2}
                  placeholder="運営用のメモ（会員には表示されません）"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
                <button
                  onClick={() =>
                    onPatch(
                      row,
                      { admin_note: noteDraft.trim() },
                      { admin_note: noteDraft.trim() || null },
                      "備考を保存しました"
                    )
                  }
                  disabled={saving || noteDraft === (row.admin_note ?? "")}
                  className="mt-2 px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 transition-colors disabled:opacity-30"
                >
                  備考を保存
                </button>
              </div>
            </div>

            {/* 退会 / 復帰 */}
            <div className="flex items-start gap-3">
              <span className="text-xs text-gray-500 w-20 flex-shrink-0 pt-2">在籍</span>
              <div className="flex-1">
                {row.is_withdrawn ? (
                  <button
                    onClick={() =>
                      onPatch(
                        row,
                        { is_withdrawn: false },
                        { is_withdrawn: false, withdrawn_at: null, withdrawal_reason: null },
                        `${row.name}さんを復帰させました`
                      )
                    }
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    復帰させる
                  </button>
                ) : withdrawing ? (
                  <div className="space-y-2">
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={2}
                      placeholder="退会理由（任意・運営メモ）例: 本人都合・LINEにて申請"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                    />
                    <p className="text-[11px] text-gray-400">
                      一覧・プロフィール・紹介ツリーから非公開になります（名前は記録として残ります）。あとから復帰できます。
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setWithdrawing(false);
                          setReason("");
                        }}
                        className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50"
                      >
                        やめる
                      </button>
                      <button
                        onClick={async () => {
                          const ok = await onPatch(
                            row,
                            { is_withdrawn: true, withdrawal_reason: reason.trim() },
                            {
                              is_withdrawn: true,
                              withdrawn_at: new Date().toISOString(),
                              withdrawal_reason: reason.trim() || null,
                            },
                            `${row.name}さんを退会にしました`
                          );
                          if (ok) {
                            setWithdrawing(false);
                            setReason("");
                          }
                        }}
                        disabled={saving}
                        className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors disabled:opacity-60"
                      >
                        退会にする
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setWithdrawing(true)}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-200 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    退会させる
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 継続の方へ送る更新リンク */}
          <RenewalLink row={row} />

          {/* 台帳の編集 */}
          <LedgerEditor row={row} saving={saving} onPatch={onPatch} />

          {/* 全項目 */}
          <div>
            <h4 className="text-sm font-bold text-gray-900 mb-3">登録内容</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              {fields.map((f) => (
                <div key={f.label} className="border-b border-gray-100 pb-2">
                  <p className="text-[11px] text-gray-400 mb-0.5">{f.label}</p>
                  <p className={`text-sm text-gray-900 break-words ${f.mono ? "font-mono" : ""}`}>
                    {f.value == null || f.value === "" ? (
                      <span className="text-gray-300">—</span>
                    ) : (
                      String(f.value)
                    )}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
