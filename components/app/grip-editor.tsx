"use client";

// ============================================================
// ひとこと（メンバー一覧に出る短い自己紹介）
// ============================================================
// 実体は members.grip。設定画面の奥にあって 439名中9名しか書いていない。
// 一覧に出るのはこの文なので、一覧を見に来る人が一番目にする。
// ∴ マイページの上で、その場で書けるようにする。
//
// 🔴 未記入のときだけ促す。書けば黙って編集欄に変わる。
//    「閉じる」を付けないのは、書けば自然に役目が終わるから
//    （閉じたまま書かれない状態を作らない）。
//
// 名刺の「一言」とは別物。あちらは名刺カードに載る文で、
// これは一覧に出る1行。両方に同じ文を書いている人が実際にいたので、
// 名前と説明で区別できるようにしてある。
// ============================================================

import { useEffect, useState } from "react";
import { MessageSquare, Check, Loader2, Pencil } from "lucide-react";
import { useCurrentMember } from "@/lib/current-member";

const MAX = 60;

export function GripEditor() {
  const me = useCurrentMember();
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const g = me?.grip ?? "";
    setSaved(g);
    setValue(g);
  }, [me?.grip]);

  if (!me) return null;

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grip: value.trim() }),
      });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) setError(body?.error ?? "保存できませんでした");
      else {
        setSaved(value.trim());
        setOpen(false);
      }
    } catch {
      setError("保存できませんでした（通信エラー）");
    }
    setSaving(false);
  };

  // 書いてあって編集もしていないときは、静かに1行出すだけ
  if (saved && !open) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6 flex items-center gap-3">
        <span className="w-9 h-9 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center flex-shrink-0">
          <MessageSquare className="w-4 h-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] text-gray-400">ひとこと（メンバー一覧に出ます）</span>
          <span className="block text-sm text-gray-800 truncate">{saved}</span>
        </span>
        <button
          onClick={() => setOpen(true)}
          className="p-2 text-gray-300 hover:text-gray-600 rounded-lg hover:bg-gray-50 flex-shrink-0"
          aria-label="ひとことを編集"
        >
          <Pencil className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border shadow-sm p-5 mb-6 ${
        saved ? "bg-white border-gray-100" : "bg-white border-[var(--tetsu-pink)]/30"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-xl bg-[var(--tetsu-pink-pale)] text-[var(--tetsu-pink)] flex items-center justify-center flex-shrink-0">
          <MessageSquare className="w-4 h-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900">
            {saved ? "ひとことを編集" : "ひとことを書きませんか"}
          </p>
          <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
            メンバー一覧であなたの名前の下に出る1行です。名刺の「一言」とは別で、
            ここは短く書いてください。
          </p>

          <input
            value={value}
            onChange={(e) => setValue(e.target.value.slice(0, MAX))}
            placeholder="例：なんでも聞いてください／飲み友、壁打ち大歓迎！"
            className="w-full mt-3 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-gray-400">
              {value.length}/{MAX}
            </span>
            <div className="flex gap-2">
              {saved && (
                <button
                  onClick={() => {
                    setValue(saved);
                    setOpen(false);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50"
                >
                  やめる
                </button>
              )}
              <button
                onClick={save}
                disabled={saving || !value.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 disabled:opacity-30"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                保存
              </button>
            </div>
          </div>
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
