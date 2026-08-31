"use client";

// ============================================================
// 運営：つながりの選択肢を足す・直す・消す
// ============================================================
// 🔴 この画面が本当に守るべきものは「消す操作」ひとつ。
//    code は会員のデータ（選択の配列）が指している名前で、外部キーが無い。
//    消したり変えたりすると、会員の選択が迷子になっても誰にも見えない。
//    ∴ code は作ったあと変えられない。使われている選択肢は消せない。
//    代わりに「使う」を外せば、新しく選ばれなくなる。
//
// 判定はDB側（admin_delete_matching_option）が持っている。ここは
// 押せないようにして、理由を先に見せるだけ。
// ============================================================

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Loader2, Save, AlertCircle, Tags } from "lucide-react";

interface Option {
  category: string;
  code: string;
  label: string;
  isSales: boolean;
  sortOrder: number;
  isActive: boolean;
  usedCount: number;
}

// 並びは会員の「つながりの設定」と同じにする（探すときの頭の順番に合わせる）
const CATEGORIES: { code: string; label: string; note?: string }[] = [
  {
    code: "purpose",
    label: "つながりたい目的",
    note: "「営業目的」を付けた項目は、申請を受けた相手に先に表示されます",
  },
  { code: "position", label: "立場・事業形態" },
  { code: "industry", label: "業種" },
  { code: "region", label: "地域" },
  { code: "lifestyle", label: "ライフスタイル" },
  { code: "hobby", label: "趣味・好きなこと" },
  { code: "interest", label: "興味・関心" },
  {
    code: "age_range",
    label: "年代",
    note: "コードは会員台帳の年代に合わせてあります。増減させると突き合わせが外れて候補が出なくなります",
  },
  {
    code: "gender",
    label: "性別",
    note: "コードは会員台帳の値（男 / 女）そのものです。表示名だけ変えてください",
  },
];

export function MatchingOptionsPanel() {
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("purpose");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // 打っている途中の値。保存を押すまで送らない（1文字ごとに保存すると
  // 途中の状態が全会員に見えるし、消しかけの表示名が残る）
  const [drafts, setDrafts] = useState<Record<string, { label: string; sortOrder: string }>>({});
  const [newCode, setNewCode] = useState("");
  const [newLabel, setNewLabel] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/matching-options", { cache: "no-store" });
      const body = (await res.json().catch(() => null)) as
        | { options?: Option[]; error?: string }
        | null;
      if (!res.ok) setError(body?.error ?? "選択肢を取得できませんでした");
      else {
        setOptions(body?.options ?? []);
        setDrafts({});
      }
    } catch {
      setError("選択肢を取得できませんでした（通信エラー）");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = options.filter((o) => o.category === category);
  const meta = CATEGORIES.find((c) => c.code === category);
  const keyOf = (o: Option) => `${o.category}:${o.code}`;

  const save = async (o: Option, patch: Partial<Option>) => {
    setBusy(keyOf(o));
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/matching-options", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: o.category,
          code: o.code,
          label: patch.label ?? o.label,
          isSales: patch.isSales ?? o.isSales,
          sortOrder: patch.sortOrder ?? o.sortOrder,
          isActive: patch.isActive ?? o.isActive,
        }),
      });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) setError(body?.error ?? "保存できませんでした");
      else await load();
    } catch {
      setError("保存できませんでした（通信エラー）");
    }
    setBusy(null);
  };

  const remove = async (o: Option) => {
    setBusy(keyOf(o));
    setError(null);
    setNotice(null);
    try {
      const query = `category=${encodeURIComponent(o.category)}&code=${encodeURIComponent(o.code)}`;
      const res = await fetch(`/api/admin/matching-options?${query}`, { method: "DELETE" });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) setError(body?.error ?? "削除できませんでした");
      else {
        setNotice(`「${o.label}」を削除しました`);
        await load();
      }
    } catch {
      setError("削除できませんでした（通信エラー）");
    }
    setBusy(null);
  };

  const add = async () => {
    const code = newCode.trim();
    const label = newLabel.trim();
    if (!code || !label) {
      setError("コードと表示名を入れてください");
      return;
    }
    if (rows.some((o) => o.code === code)) {
      setError("そのコードはこのカテゴリに既にあります");
      return;
    }
    setBusy("new");
    setError(null);
    setNotice(null);
    // 末尾に置く。既存の並びを崩さないよう、いまの最大値の次にする。
    const nextSort = rows.reduce((max, o) => Math.max(max, o.sortOrder), 0) + 10;
    try {
      const res = await fetch("/api/admin/matching-options", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, code, label, sortOrder: nextSort, isActive: true }),
      });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) setError(body?.error ?? "追加できませんでした");
      else {
        setNewCode("");
        setNewLabel("");
        setNotice(`「${label}」を追加しました`);
        await load();
      }
    } catch {
      setError("追加できませんでした（通信エラー）");
    }
    setBusy(null);
  };

  if (loading) return <div className="h-40 rounded-2xl bg-white animate-pulse mb-6" />;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 mb-6">
      <h2 className="text-sm font-bold text-gray-900 mb-1 flex items-center gap-2">
        <Tags className="w-4 h-4 text-[var(--tetsu-pink)]" />
        つながりの選択肢
      </h2>
      <p className="text-[11px] text-gray-400 mb-4 leading-relaxed">
        マイページの「つながりの設定」に出る選択肢です。ここでの変更はすぐ全会員に反映されます。
        左の数字は並び順（小さいほど先）。10・20・30 と空けてあるのは、あとから間に挿し込めるようにするためです。
      </p>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {CATEGORIES.map((c) => {
          const count = options.filter((o) => o.category === c.code).length;
          const on = category === c.code;
          return (
            <button
              key={c.code}
              onClick={() => {
                setCategory(c.code);
                setError(null);
                setNotice(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                on
                  ? "bg-gray-900 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {c.label}
              <span className={`ml-1 font-normal ${on ? "text-gray-400" : "text-gray-400"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {meta?.note && (
        <p className="flex items-start gap-2 mb-4 text-[11px] text-amber-800 bg-amber-50 rounded-lg px-3 py-2 leading-relaxed">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          {meta.note}
        </p>
      )}

      {error && <p className="mb-3 text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      {notice && (
        <p className="mb-3 text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">{notice}</p>
      )}

      <div className="space-y-2 mb-5">
        {rows.length === 0 && (
          <p className="text-xs text-gray-500 bg-gray-50 rounded-xl px-4 py-5 text-center">
            このカテゴリの選択肢はまだありません
          </p>
        )}

        {rows.map((o) => {
          const k = keyOf(o);
          const draft = drafts[k] ?? { label: o.label, sortOrder: String(o.sortOrder) };
          const dirty = draft.label !== o.label || draft.sortOrder !== String(o.sortOrder);
          return (
            <div
              key={k}
              className={`rounded-xl border px-3 py-2.5 ${
                o.isActive ? "border-gray-200" : "border-gray-200 bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  value={draft.sortOrder}
                  onChange={(e) =>
                    setDrafts((p) => ({ ...p, [k]: { ...draft, sortOrder: e.target.value } }))
                  }
                  inputMode="numeric"
                  aria-label="並び順"
                  title="並び順（小さいほど先）。10・20・30 と数字を空けてあるのは、あとから間に挿し込めるようにするためです。1・2・3 だと間に入れるときに全部振り直しになります"
                  className="w-14 px-2 py-1.5 rounded-lg border border-gray-200 text-xs text-center focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
                <input
                  value={draft.label}
                  onChange={(e) =>
                    setDrafts((p) => ({ ...p, [k]: { ...draft, label: e.target.value } }))
                  }
                  aria-label="表示名"
                  className="flex-1 min-w-[10rem] px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
                {/* code は会員のデータが指す名前。読むためだけに出す。 */}
                <code className="text-[10px] text-gray-400 px-1.5 py-1 rounded bg-gray-50 border border-gray-100">
                  {o.code}
                </code>

                {dirty && (
                  <button
                    onClick={() =>
                      save(o, {
                        label: draft.label,
                        sortOrder: Number.parseInt(draft.sortOrder, 10) || 0,
                      })
                    }
                    disabled={busy === k}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-900 text-white text-[11px] font-bold hover:bg-gray-800 disabled:opacity-40"
                  >
                    {busy === k ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Save className="w-3 h-3" />
                    )}
                    保存
                  </button>
                )}

                <label className="inline-flex items-center gap-1.5 text-[11px] text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={o.isActive}
                    onChange={() => save(o, { isActive: !o.isActive })}
                    disabled={busy === k}
                    className="w-3.5 h-3.5 accent-gray-900"
                  />
                  使う
                </label>

                {category === "purpose" && (
                  <label className="inline-flex items-center gap-1.5 text-[11px] text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={o.isSales}
                      onChange={() => save(o, { isSales: !o.isSales })}
                      disabled={busy === k}
                      className="w-3.5 h-3.5 accent-amber-500"
                    />
                    営業目的
                  </label>
                )}

                {/* 使われている選択肢は消させない（DB側でも同じ判定をしている） */}
                <button
                  onClick={() => remove(o)}
                  disabled={busy === k || o.usedCount > 0}
                  title={
                    o.usedCount > 0
                      ? `${o.usedCount}名が選んでいるため削除できません。「使う」を外すと新しく選ばれなくなります`
                      : "削除する"
                  }
                  className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {o.usedCount > 0 && (
                <p className="text-[10px] text-gray-400 mt-1.5 pl-1">
                  {o.usedCount}名が選んでいます
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t border-gray-100 pt-4">
        <p className="text-[11px] font-bold text-gray-700 mb-2">
          「{meta?.label}」に選択肢を足す
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="表示名（例：京都）"
            className="flex-1 min-w-[10rem] px-2.5 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          <input
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            placeholder="コード（例：kyoto／京都 でも可）"
            className="w-40 px-2.5 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          <button
            onClick={add}
            disabled={busy === "new"}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--tetsu-pink)] text-white text-xs font-bold hover:opacity-90 disabled:opacity-40"
          >
            {busy === "new" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            追加
          </button>
        </div>
        {/* 🔴 「半角英数字で」と書いていたが、DBが弾いているのは空白とカンマだけ。
               実際、年代は 20代 / 30代、性別は 男 / 女 と日本語のコードが入っている
               （会員台帳の値と一致させる必要があるため）。守られていない決まりを
               書くと、他の注意書きまで信用されなくなる。 */}
        <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">
          <strong>表示名</strong>は会員に見える文字で、いつでも直せます。
          <strong>コード</strong>は会員のデータに保存される名前で、
          <strong>あとから変えられません</strong>
          （変えると、それを選んでいた人の設定が黙って外れます）。
          コードは画面に出ないので、意味が分かれば何でも構いません。空白とカンマだけ使えません。
        </p>
      </div>
    </div>
  );
}
