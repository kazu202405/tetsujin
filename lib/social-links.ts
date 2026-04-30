// SNSリンクの型・プラットフォーム定義・公開範囲フィルタ

export type SocialPlatform =
  | "line"
  | "instagram"
  | "x"
  | "facebook"
  | "website"
  | "other";

export type SocialVisibility = "public" | "connections" | "private";

export interface SocialLink {
  id: string;
  platform: SocialPlatform;
  label?: string;
  url: string;
  visibility: SocialVisibility;
}

// プラットフォームのメタ情報（UI表示用）
export const SOCIAL_PLATFORM_META: Record<
  SocialPlatform,
  { label: string; placeholder: string; color: string }
> = {
  line: {
    label: "LINE",
    placeholder: "https://line.me/ti/p/...",
    color: "bg-[#06C755]",
  },
  instagram: {
    label: "Instagram",
    placeholder: "https://www.instagram.com/...",
    color: "bg-gradient-to-br from-[#feda75] via-[#d62976] to-[#962fbf]",
  },
  x: {
    label: "X (Twitter)",
    placeholder: "https://x.com/...",
    color: "bg-black",
  },
  facebook: {
    label: "Facebook",
    placeholder: "https://www.facebook.com/...",
    color: "bg-[#1877F2]",
  },
  website: {
    label: "ウェブサイト",
    placeholder: "https://...",
    color: "bg-gray-700",
  },
  other: {
    label: "その他",
    placeholder: "https://...",
    color: "bg-gray-500",
  },
};

export const VISIBILITY_META: Record<
  SocialVisibility,
  { label: string; description: string }
> = {
  public: { label: "全員に公開", description: "メンバー全員に見えます" },
  connections: {
    label: "つながり済みのみ",
    description: "出会ったことのある人だけに見えます",
  },
  private: { label: "非公開", description: "自分だけに表示されます" },
};

// 閲覧者視点で見える SocialLink だけにフィルタ
export function filterVisibleLinks(
  links: SocialLink[],
  context: { isOwner: boolean; isConnected: boolean }
): SocialLink[] {
  if (context.isOwner) return links;
  return links.filter((link) => {
    if (link.visibility === "public") return true;
    if (link.visibility === "connections") return context.isConnected;
    return false;
  });
}
