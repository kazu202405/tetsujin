"use client";

// ============================================================
// つながり申請を出す
// ============================================================
// 方針書6番の実装。目的の選択を必須にすることで
// 「営業目的を隠した接触」が構造的にできなくなる。
// 規約に書くだけでは守られないが、入力欄が必須なら隠せない。
//
// 「商品・サービスを提案したい」を選んだ場合は、
// 相手に営業目的だと先に伝わることをこの場で明示する。
// ============================================================

import { useEffect, useState } from "react";
import { Handshake, Loader2, X, AlertCircle, Check } from "lucide-react";

interface PurposeOption {
  code: string;
  label: string;
  is_sales: boolean;
}

export function ConnectionRequestButton({
  memberId,
  memberName,
}: {
  memberId: string;
  memberName: string;
}) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<PurposeOption[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [existing, setExisting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me/connection-requests", { cache: "no-store" })
      .then(async (res) => (res.ok ? await res.json() : null))
      .then((body) => {
        if (!body) return;
        setOptions(body.purposeOptions as PurposeOption[]);
        // すでにこの人とやりとりがあるなら、その状態を出す
        const mine = (body.requests as { direction: string; other: { id: string }; status: string }[])
          .filter((r) => r.direction === "sent" && r.other.id === memberId)
          .sort()[0];
        if (mine && (mine.status === "pending" || mine.status === "accepted")) {
          setExisting(mine.status);
        }
      })
      .catch(() => {
        /* 取れなくてもボタンは出す。押した時点でサーバー側が弾く */
      });
  }, [memberId]);

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/me/connection-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toMemberId: memberId, purposes: selected, message }),
      });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(body?.error ?? "申請できませんでした");
      } else {
        setDone(true);
        setExisting("pending");
      }
    } catch {
      setError("申請できませんでした（通信エラー）");
    }
    setSending(false);
  };

  const salesSelected = options.some((o) => o.is_sales && selected.includes(o.code));

  if (existing === "accepted") {
    return (
      <p className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-bold">
        <Check className="w-4 h-4" />
        つながっています
      </p>
    );
  }

  if (existing === "pending" || done) {
    return (
      <p className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-500 text-sm font-bold">
        申請中です
      </p>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[var(--tetsu-pink)] text-white text-sm font-bold hover:opacity-90 transition-opacity"
      >
        <Handshake className="w-4 h-4" />
        つながりを申請する
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3 mb-1">
        <h3 className="text-sm font-bold text-gray-900">{memberName}さんにつながりを申請</h3>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700">
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-[11px] text-gray-500 leading-relaxed mb-4">
        何のためにつながりたいかを伝えます。相手は内容を見てから決めます。
      </p>

      <p className="text-xs font-bold text-gray-700 mb-2">
        つながりたい目的<span className="text-[var(--tetsu-pink)] ml-1">必須</span>
      </p>
      <div className="flex flex-wrap gap-2 mb-4">
        {options.map((o) => {
          const on = selected.includes(o.code);
          return (
            <button
              key={o.code}
              type="button"
              onClick={() =>
                setSelected((s) => (on ? s.filter((c) => c !== o.code) : [...s, o.code]))
              }
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                on
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>

      {salesSelected && (
        <p className="flex items-start gap-2 mb-4 text-[11px] text-amber-800 bg-amber-50 rounded-lg px-3 py-2 leading-relaxed">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>
            <b>営業・提案が目的であることが相手に先に伝わります。</b>
            相手はそれを見たうえで、受けるかどうかを選びます。
          </span>
        </p>
      )}

      <p className="text-xs font-bold text-gray-700 mb-2">なぜつながりたいか</p>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="どんなことでご一緒したいか、簡単に書いてください"
        className="w-full px-3 py-2 mb-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
      />

      {error && (
        <p className="mb-3 text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <p className="text-[11px] text-gray-400 leading-relaxed mb-3">
        受けていただけた場合、おたがいの連絡先（「つながり済みのみ」に設定しているもの）が見えるようになります。
        <br />
        お返事が無いまま1週間が過ぎると、申請は自動的に取り下げられます。
      </p>

      <div className="flex justify-end gap-2">
        <button
          onClick={() => setOpen(false)}
          className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          やめる
        </button>
        <button
          onClick={send}
          disabled={sending || selected.length === 0}
          className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[var(--tetsu-pink)] text-white text-xs font-bold hover:opacity-90 disabled:opacity-40"
        >
          {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Handshake className="w-3.5 h-3.5" />}
          申請する
        </button>
      </div>
    </div>
  );
}
