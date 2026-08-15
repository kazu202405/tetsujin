"use client";

// ============================================================
// 人物をプロフィールへ飛ばすリンク
// ============================================================
// 会員の顔や名前は「押したら誰か分かる」のが基本。押せない場所があると、
// 参加の承認やイベントの参加可否を名前だけで判断させることになる。
//
// id が無いときはリンクにしない。運営名義の会など主催者が会員行に
// 紐づかないケースがあり、/app/profile/ だけの壊れたURLを踏ませないため。
// ============================================================

import Link from "next/link";

export function PersonLink({
  id,
  children,
  className = "",
  title,
}: {
  id: string | null | undefined;
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  if (!id) {
    return (
      <span className={className} title={title}>
        {children}
      </span>
    );
  }
  return (
    <Link
      href={`/app/profile/${id}`}
      className={`${className} hover:opacity-80 transition-opacity`}
      title={title}
      // カード全体が押せる場所に置くことがあるので、親のクリックを止める
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </Link>
  );
}
