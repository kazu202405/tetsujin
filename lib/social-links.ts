// SNSリンクの型・プラットフォーム定義・公開範囲フィルタ

export type SocialPlatform =
  | "line"
  | "instagram"
  | "x"
  | "facebook"
  | "threads"
  | "note"
  | "website"
  | "other";

export type SocialVisibility = "public" | "approved" | "private";

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
  threads: {
    label: "Threads",
    placeholder: "https://www.threads.net/@...",
    color: "bg-black",
  },
  note: {
    label: "note",
    placeholder: "https://note.com/...",
    color: "bg-[#41C9B4]",
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
  approved: {
    label: "承認した人だけ",
    description: "つながり申請を受けたときに、自分が選んで教えた相手だけに見えます",
  },
  private: { label: "非公開", description: "自分だけに表示されます" },
};

// ============================================================
// URLの正規化と、リンクとして踏ませてよいかの判定
// ============================================================

const HTTP_SCHEME = /^https?:\/\//i;
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

// 🔴 https://line.me/ti/p/XXXX は、スマホで開いてもLINEアプリに渡らず
//    QRコードを載せたWebページが出る。見た人はそれをスクショして
//    別の端末で読み取るしかない。/R/ を挟んだ形がアプリを直接開く。
//    （PCで開いたときは今までどおりWebページに落ちる）
function toLineAppUrl(url: string): string {
  return url.replace(/^(https?:\/\/(?:www\.)?line\.me)\/ti\/p\//i, "$1/R/ti/p/");
}

/**
 * 保存する前に整える。受け付けられないものは null。
 *
 * 🔴 スキームを必ず見る。`javascript:` は <a href> に入れると
 *    クリックした人の画面でそのまま動く＝会員が別の会員を踏ませられる。
 *    「URLっぽい文字列か」では判定にならない。
 */
export function normalizeSocialUrl(platform: SocialPlatform, raw: string): string | null {
  const url = raw.trim();
  if (!url) return null;

  // スキームが無いものは https を補う。補わないと
  // <a href="line.me/ti/p/x"> がアプリ内の相対パスとして扱われ、
  // どこにも飛ばないのに壊れて見えない。
  const withScheme = HAS_SCHEME.test(url) ? url : `https://${url}`;
  if (!HTTP_SCHEME.test(withScheme)) return null;

  return platform === "line" ? toLineAppUrl(withScheme) : withScheme;
}

/**
 * 画面でリンクにするときのURL。踏ませてよくないものは null。
 *
 * 保存時にも同じことをしているが、ここでも見る。
 * 保存の検証が入る前に置かれた行が残っているし、
 * 「表示する側が確かめる」形にしておけば入口が増えても漏れない。
 */
export function socialHref(platform: SocialPlatform, url: string | null): string | null {
  const trimmed = (url ?? "").trim();
  if (!trimmed || !HTTP_SCHEME.test(trimmed)) return null;
  return platform === "line" ? toLineAppUrl(trimmed) : trimmed;
}
