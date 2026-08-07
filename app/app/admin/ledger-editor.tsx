"use client";

// ============================================================
// 台帳の編集（運営のみ）
// ============================================================
// Excelを廃してアプリが会員管理のマスターになったため、
// 運営がここで直せないと修正手段が無くなる。
//
// メールアドレスは「サインアップ時にどの会員行へ紐づけるか」の鍵。
// ここを埋めておくと、その方がアカウントを作ったときに
// 新しい行が作られず、既存の会員行に自動で繋がる。
// ============================================================

import { useState } from "react";
import { Pencil } from "lucide-react";
import type { MemberDbRow } from "./members-data";

const INPUT =
  "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900";

export function LedgerEditor({
  row,
  saving,
  onPatch,
}: {
  row: MemberDbRow;
  saving: boolean;
  onPatch: (
    row: MemberDbRow,
    body: Record<string, unknown>,
    optimistic: Partial<MemberDbRow>,
    successText: string
  ) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: row.name ?? "",
    member_no: row.member_no != null ? String(row.member_no) : "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    nickname: row.nickname ?? "",
    job: row.job ?? "",
    membership_type: row.membership_type ?? "",
    start_year: row.start_year != null ? String(row.start_year) : "",
    start_month: row.start_month != null ? String(row.start_month) : "",
    renewal_status: row.renewal_status ?? "",
    price: row.price != null ? String(row.price) : "",
    referrer: row.referrer ?? "",
  });

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

  const save = async () => {
    const body = {
      name: form.name.trim(),
      member_no: numOrNull(form.member_no),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      nickname: form.nickname.trim() || null,
      job: form.job.trim() || null,
      membership_type: form.membership_type || null,
      start_year: numOrNull(form.start_year),
      start_month: numOrNull(form.start_month),
      renewal_status: form.renewal_status || null,
      price: numOrNull(form.price),
      referrer: form.referrer.trim() || null,
    };
    const ok = await onPatch(
      row,
      body,
      body as Partial<MemberDbRow>,
      `${body.name}さんの登録内容を保存しました`
    );
    if (ok) setOpen(false);
  };

  if (!open) {
    return (
      <div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
          登録内容を編集
        </button>
        {!row.email && (
          <p className="mt-2 text-[11px] text-amber-600">
            メールアドレスが未登録です。入れておくと、この方がアカウントを作ったときに自動でこの会員に紐づきます。
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-xl p-4">
      <h4 className="text-sm font-bold text-gray-900 mb-3">登録内容を編集</h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-[11px] text-gray-500 mb-1">氏名</span>
          <input value={form.name} onChange={(e) => set("name", e.target.value)} className={INPUT} />
        </label>

        <label className="block">
          <span className="block text-[11px] text-gray-500 mb-1">会員番号</span>
          <input
            value={form.member_no}
            onChange={(e) => set("member_no", e.target.value)}
            inputMode="numeric"
            placeholder="未採番"
            className={INPUT}
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="block text-[11px] text-gray-500 mb-1">
            メールアドレス
            <span className="text-gray-400">（アカウント紐づけの鍵）</span>
          </span>
          <input
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            type="email"
            placeholder="未登録"
            className={INPUT + " font-mono"}
          />
        </label>

        <label className="block">
          <span className="block text-[11px] text-gray-500 mb-1">電話番号</span>
          <input
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="未登録"
            className={INPUT + " font-mono"}
          />
        </label>

        <label className="block">
          <span className="block text-[11px] text-gray-500 mb-1">呼び名</span>
          <input
            value={form.nickname}
            onChange={(e) => set("nickname", e.target.value)}
            className={INPUT}
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="block text-[11px] text-gray-500 mb-1">職業</span>
          <input value={form.job} onChange={(e) => set("job", e.target.value)} className={INPUT} />
        </label>

        <label className="block">
          <span className="block text-[11px] text-gray-500 mb-1">会員種別</span>
          <select
            value={form.membership_type}
            onChange={(e) => set("membership_type", e.target.value)}
            className={INPUT}
          >
            <option value="">未設定</option>
            <option value="法人">法人</option>
            <option value="個人">個人</option>
          </select>
        </label>

        <label className="block">
          <span className="block text-[11px] text-gray-500 mb-1">更新状況</span>
          <select
            value={form.renewal_status}
            onChange={(e) => set("renewal_status", e.target.value)}
            className={INPUT}
          >
            <option value="">未設定</option>
            <option value="未更新">未更新</option>
            <option value="更新済">更新済</option>
            <option value="返事待ち">返事待ち</option>
            <option value="入金待ち">入金待ち</option>
            <option value="退会">退会</option>
          </select>
        </label>

        <label className="block">
          <span className="block text-[11px] text-gray-500 mb-1">開始年</span>
          <input
            value={form.start_year}
            onChange={(e) => set("start_year", e.target.value)}
            inputMode="numeric"
            placeholder="2025"
            className={INPUT}
          />
        </label>

        <label className="block">
          <span className="block text-[11px] text-gray-500 mb-1">開始月</span>
          <input
            value={form.start_month}
            onChange={(e) => set("start_month", e.target.value)}
            inputMode="numeric"
            placeholder="4"
            className={INPUT}
          />
        </label>

        <label className="block">
          <span className="block text-[11px] text-gray-500 mb-1">入会時金額</span>
          <input
            value={form.price}
            onChange={(e) => set("price", e.target.value)}
            inputMode="numeric"
            placeholder="19800"
            className={INPUT}
          />
        </label>

        <label className="block">
          <span className="block text-[11px] text-gray-500 mb-1">紹介者（記載のまま）</span>
          <input
            value={form.referrer}
            onChange={(e) => set("referrer", e.target.value)}
            className={INPUT}
          />
        </label>
      </div>

      <div className="flex gap-2 justify-end mt-4">
        <button
          onClick={() => setOpen(false)}
          className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          やめる
        </button>
        <button
          onClick={save}
          disabled={saving || !form.name.trim()}
          className="px-5 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 transition-colors disabled:opacity-40"
        >
          保存
        </button>
      </div>
    </div>
  );
}
