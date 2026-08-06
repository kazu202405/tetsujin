// ============================================================
// 入力量に合わせて高さが伸びる textarea
// ============================================================
// 固定 rows + resize-none だと、改行した瞬間に前の行が
// スクロールして見えなくなり「改行できていない」ように見える。
// 中身の高さに合わせて自動で伸ばすことでそれを避ける。
// ============================================================
"use client";

import { useLayoutEffect, useRef } from "react";

export function AutoTextarea({
  value,
  onChange,
  placeholder,
  className = "",
  minRows = 2,
  maxRows,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** 空のときの高さ（行数） */
  minRows?: number;
  /** これ以上は伸ばさず中でスクロールさせる（省略時は無制限） */
  maxRows?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // 値が変わるたびに高さを測り直す。
  // 先に auto に戻さないと、縮めたときに高さが残ってしまう。
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.style.height = "auto";

    const styles = window.getComputedStyle(el);
    const lineHeight = parseFloat(styles.lineHeight) || 20;
    const padding = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
    const border = parseFloat(styles.borderTopWidth) + parseFloat(styles.borderBottomWidth);

    const min = lineHeight * minRows + padding + border;
    const max = maxRows ? lineHeight * maxRows + padding + border : Infinity;
    const next = Math.min(Math.max(el.scrollHeight + border, min), max);

    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight + border > max ? "auto" : "hidden";
  }, [value, minRows, maxRows]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={minRows}
      className={`${className} resize-none overflow-hidden`}
    />
  );
}
