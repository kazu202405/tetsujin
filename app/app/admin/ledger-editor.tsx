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

import { useEffect, useState } from "react";
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
  const [plans, setPlans] = useState<{ code: string; label: string; stripe_price_id: string | null }[]>([]);

  // プランの選択肢は開いたときに取る（一覧では使わない）
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/admin/billing-plans", { cache: "no-store" })
      .then(async (res) => (res.ok ? await res.json() : null))
      .then((body) => {
        if (!cancelled && body) setPlans(body.plans);
      })
      .catch(() => {
        /* 取れなければ選択肢が空になるだけ */
      });
    return () => {
      cancelled = true;
    };
  }, [open]);
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
    billing_plan_code: row.billing_plan_code ?? "",
    billing_starts_on: row.billing_starts_on ?? "",
    billing_exempt: row.billing_exempt ?? false,
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
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
      billing_plan_code: form.billing_plan_code || null,
      billing_starts_on: form.billing_starts_on || null,
      billing_exempt: form.billing_exempt,
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

        {/* 会費免除。プラン未設定(空)＝「まだ決めていない」とは別物なので、
            無料の方は必ずこちらで表す。混ぜると未払い一覧が使えなくなる。 */}
        <label className="block sm:col-span-2 flex items-start gap-2.5 p-3 rounded-xl border border-gray-200 bg-gray-50 cursor-pointer">
          <input
            type="checkbox"
            checked={form.billing_exempt}
            onChange={(e) => set("billing_exempt", e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-emerald-600 flex-shrink-0"
          />
          <span className="min-w-0">
            <span className="block text-xs font-bold text-gray-900">会費を免除する（無料会員）</span>
            <span className="block text-[11px] text-gray-500 leading-relaxed mt-0.5">
              この方には請求しません。決済画面に進めなくなり、Stripeにも登録されません。
              下の「会費プラン」を空にするのとは意味が違います（空＝まだ金額を決めていない）。
            </span>
          </span>
        </label>

        {/* 会費。プランを入れないとこの方は決済に進めない（＝誤った金額を請求しない） */}
        <label className="block">
          <span className="block text-[11px] text-gray-500 mb-1">会費プラン</span>
          <select
            value={form.billing_plan_code}
            onChange={(e) => set("billing_plan_code", e.target.value)}
            disabled={form.billing_exempt}
            className={INPUT + (form.billing_exempt ? " opacity-50" : "")}
          >
            <option value="">未設定（決済に進めません）</option>
            {plans.map((p) => (
              <option key={p.code} value={p.code}>
                {p.label}
                {p.stripe_price_id ? "" : "（価格ID未設定）"}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="block text-[11px] text-gray-500 mb-1">
            課金開始日<span className="text-gray-400">（この日まで請求しません）</span>
          </span>
          <input
            type="date"
            value={form.billing_starts_on}
            onChange={(e) => set("billing_starts_on", e.target.value)}
            disabled={form.billing_exempt}
            className={INPUT + (form.billing_exempt ? " opacity-50" : "")}
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
