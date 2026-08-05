// ============================================================
// 会員のアイコン表示（写真 → 無ければ頭文字）
// ============================================================
// 会員台帳626名に写真データは無く、これから各自がアップロードしていく。
// ∴ 写真が無い状態が長く続く前提で、頭文字アイコンを正式なフォールバックにする。
// 写真は非公開バケットのため url はサーバー側で発行した署名URLを渡すこと。
// ============================================================
"use client";

import { useState } from "react";

/** 氏名から表示する頭文字（姓の1文字）。取れなければ "T"。 */
function initialOf(name: string): string {
  const trimmed = name.trim();
  return trimmed.charAt(0) || "T";
}

/** 氏名から安定した色を決める（同じ人はいつも同じ色になる）。 */
const PALETTE = [
  "bg-amber-100 text-amber-700",
  "bg-pink-100 text-pink-700",
  "bg-blue-100 text-blue-700",
  "bg-green-100 text-green-700",
  "bg-purple-100 text-purple-700",
  "bg-teal-100 text-teal-700",
  "bg-indigo-100 text-indigo-700",
  "bg-rose-100 text-rose-700",
];

function paletteOf(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 100000;
  }
  return PALETTE[hash % PALETTE.length];
}

export function MemberAvatar({
  name,
  url,
  size = "md",
  grayscale = false,
  className = "",
}: {
  name: string;
  url?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  grayscale?: boolean;
  className?: string;
}) {
  // 署名URLの期限切れなどで画像が壊れたら頭文字へ落とす
  const [failed, setFailed] = useState(false);

  const sizeCls = {
    xs: "w-6 h-6 text-[10px]",
    sm: "w-7 h-7 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-16 h-16 text-xl",
  }[size];

  const base = `${sizeCls} rounded-full flex-shrink-0 ${grayscale ? "grayscale" : ""} ${className}`;

  if (url && !failed) {
    return (
      <img
        src={url}
        alt={name}
        onError={() => setFailed(true)}
        className={`${base} object-cover border-2 border-white shadow`}
      />
    );
  }

  return (
    <div
      className={`${base} ${paletteOf(name)} flex items-center justify-center font-bold border-2 border-white shadow`}
      aria-label={name}
    >
      {initialOf(name)}
    </div>
  );
}
