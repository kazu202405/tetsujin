// ============================================================
// @ で宛先の候補が出る入力欄
// ============================================================
// これはあくまで入力の補助。宛先を決めているのはサーバー側で、
// 本文に書かれた「@名前」を DB が会員名と突き合わせて解決する。
//
// 🔴 「候補から選ばないと届かない」形にはしない。候補を出す仕組みは
//    選んだ人しか救わず、手で打った人が黙って届かなくなる（過去に
//    /stock の銘柄検索で同じ穴を踏んだ）。ここで選んでも、手で
//    最後まで打っても、結果は同じ本文になる＝どちらでも届く。
//
// 候補に出すのは「ログインできる会員」だけ（/api/board/mentionable）。
// 選べるのに届かない人を並べない。
// ============================================================
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AtSign, Users } from "lucide-react";
import { AutoTextarea } from "@/components/app/auto-textarea";
import { useCachedResource } from "@/lib/client-cache";

interface Mentionable {
  id: string;
  name: string;
  nickname: string | null;
}

const CACHE_KEY = "mentionable";
const EMPTY: Mentionable[] = [];

/** 候補に出す最大件数。多すぎると入力欄が隠れる。 */
const MAX_SUGGESTIONS = 6;

/** @all の説明。DB側（mentions_everyone）が見る綴りと必ず揃える。 */
const EVERYONE = { key: "all", label: "all", hint: "この掲示板の全員に通知します" };

/**
 * カーソル直前の「@〜」を取り出す。
 * 空白・改行で切れる。@ の直後（まだ何も打っていない状態）も拾う。
 */
function activeQuery(value: string, caret: number): { start: number; query: string } | null {
  const before = value.slice(0, caret);
  const at = before.lastIndexOf("@");
  if (at < 0) return null;
  const query = before.slice(at + 1);
  // 空白や改行をまたいだら、もうその @ の入力ではない
  if (/[\s\n]/.test(query)) return null;
  // メールアドレスの途中（xxx@yyy）で候補を出さない
  if (at > 0 && /[A-Za-z0-9._%+-]/.test(before[at - 1])) return null;
  return { start: at, query };
}

export function MentionTextarea({
  value,
  onChange,
  placeholder,
  className = "",
  minRows = 2,
  maxRows,
  onKeyDownExtra,
  wrapperClassName = "",
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** 候補を重ねる器に付ける class（flex-1 など、並びの都合はここへ） */
  wrapperClassName?: string;
  autoFocus?: boolean;
  minRows?: number;
  maxRows?: number;
  /**
   * 候補が出ていないときだけ呼ばれる追加のキー操作（Ctrl/⌘+Enterで送信など）。
   * 候補が出ている間は Enter を候補の決定に使うため、ここへは渡さない。
   * 渡してしまうと「相手を選んだつもりが送信された」が起きる。
   */
  onKeyDownExtra?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}) {
  const { data: members } = useCachedResource<Mentionable[]>(
    CACHE_KEY,
    "/api/board/mentionable",
    EMPTY,
  );
  const wrapRef = useRef<HTMLDivElement>(null);
  const [caret, setCaret] = useState(0);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const active = useMemo(() => (open ? activeQuery(value, caret) : null), [open, value, caret]);

  const matches = useMemo(() => {
    if (!active) return [];
    const q = active.query.toLowerCase();
    const people = members
      .filter(
        (m) =>
          !q ||
          m.name.toLowerCase().includes(q) ||
          (m.nickname ?? "").toLowerCase().includes(q),
      )
      .slice(0, MAX_SUGGESTIONS);
    const everyone = !q || EVERYONE.label.startsWith(q) ? [EVERYONE] : [];
    return [...everyone, ...people] as (Mentionable | typeof EVERYONE)[];
  }, [active, members]);

  // 候補が入れ替わったら先頭に戻す（前の位置が残ると意図しない相手を選ぶ）
  useEffect(() => setHighlight(0), [active?.query]);

  // 入力欄の外を触ったら閉じる
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const insert = (label: string) => {
    if (!active) return;
    // 末尾に空白を足す。付けないと次に打った文字が名前の一部になり、
    // サーバー側の突き合わせが「@五島一将です」で当たらなくなる。
    const next = value.slice(0, active.start) + "@" + label + " " + value.slice(caret);
    onChange(next);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!active || matches.length === 0) {
      onKeyDownExtra?.(e);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + matches.length) % matches.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      // 🔴 候補が出ている間だけ Enter を横取りする。
      //    常に奪うと、ふつうの改行ができなくなる。
      e.preventDefault();
      const picked = matches[highlight];
      insert("label" in picked ? picked.label : picked.name);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  const syncCaret = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    setCaret(el.selectionStart ?? 0);
    setOpen(true);
  };

  return (
    <div ref={wrapRef} className={`relative ${wrapperClassName}`}>
      <div
        onKeyDown={onKeyDown as unknown as React.KeyboardEventHandler<HTMLDivElement>}
        onKeyUp={(e) => syncCaret(e.target as HTMLTextAreaElement)}
        onClick={(e) => syncCaret(e.target as HTMLTextAreaElement)}
      >
        <AutoTextarea
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={className}
          minRows={minRows}
          maxRows={maxRows}
          autoFocus={autoFocus}
        />
      </div>

      {active && matches.length > 0 && (
        <ul className="absolute z-40 left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-white rounded-xl border border-gray-200 shadow-lg py-1">
          {matches.map((m, i) => {
            const isEveryone = "label" in m;
            const label = isEveryone ? m.label : m.name;
            return (
              <li key={isEveryone ? "@all" : m.id}>
                <button
                  type="button"
                  // onClick より先に blur が走って候補が閉じるのを防ぐ
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insert(label)}
                  onMouseEnter={() => setHighlight(i)}
                  className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors ${
                    i === highlight ? "bg-[var(--tetsu-pink-pale)]" : "hover:bg-gray-50"
                  }`}
                >
                  {isEveryone ? (
                    <Users className="w-4 h-4 text-[var(--tetsu-pink)] flex-shrink-0" />
                  ) : (
                    <AtSign className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}
                  <span className="text-sm font-medium text-gray-800 truncate">@{label}</span>
                  {isEveryone ? (
                    <span className="text-[11px] text-gray-400 truncate">{m.hint}</span>
                  ) : (
                    m.nickname && (
                      <span className="text-[11px] text-gray-400 truncate">{m.nickname}</span>
                    )
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
