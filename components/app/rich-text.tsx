// ============================================================
// 会員が書いた文章の表示（URLをリンクに、@メンションを色付きに）
// ============================================================
// 🔴 リンクにしてよいのは http:// と https:// だけ。
//    `javascript:` を <a href> に入れると、踏んだ別の会員の画面で
//    そのまま動く。会員が会員を踏ませられるので、スキームを必ず見る。
//    （同じ穴がSNSリンクにあり 2026-08-31 に塞いだ）
//
// 🔴 文字そのものはReactが文字として描くので、書いた内容から
//    HTMLが差し込まれることはない。危ないのは href に入れる値だけ。
//
// 分解の順番はURLが先。メンションを先に切ると
// https://x.com/@name のようなURLが途中で割れる。
// ============================================================

// 🔴 空白だけで区切ると日本語では切れない。「…example.com。よろしく」の
//    ように、URLの直後に空白を置かず句読点で続けるのが普通なので、
//    全角の句読点・括弧もURLの終わりとして扱う。
//    半角英数字だけを許すことはできない（日本語ドメインやパスがあるため）。
import Link from "next/link";

const URL_RE = /(https?:\/\/[^\s。、！？「」『』（）【】〈〉《》・…]+)/gi;

// 🔴 日本語の文末はURLの直後に来る。「https://example.com。」を
//    そのままリンクにすると句点までURLに含まれて開けない。
//    末尾の記号は URL から外す（閉じ括弧は対応が取れているときだけ残す）。
const TRAILING = /[。、．，!?！？:;：；"'）)】」』〉》\]]+$/;

function splitTrailing(url: string): [string, string] {
  const m = url.match(TRAILING);
  if (!m) return [url, ""];
  let cut = m[0];
  // 括弧つきURL（Wikipediaなど）を壊さないよう、開き括弧と数が合うぶんは戻す
  const opens = (url.match(/\(/g) || []).length;
  const closes = (url.match(/\)/g) || []).length;
  if (closes <= opens) cut = cut.replace(/\)+$/, "");
  if (!cut) return [url, ""];
  return [url.slice(0, url.length - cut.length), cut];
}

/** 本文中で実際に届いた宛先。サーバーが解決したものだけが渡ってくる */
export interface ResolvedMention {
  id: string;
  name: string;
}

/** 全員宛ての合図。DB側（mentions_everyone）と同じ綴りを見る */
const EVERYONE_RE = /@all(?![a-zA-Z0-9_])|@全員/;

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// 🔴 2026-09-05まで、ここは @ に続く文字を無条件で色付けしていた。
//    宛先の解決も通知も無いので、書いた人は届いたと思い、書かれた人は
//    気づかない。「色が付く＝届く」という誤解だけが先にできていた。
//    ∴ サーバーが解決した宛先（と @all）だけを色付ける。
//    解決しなかった @なんとか は、ただの文字として出す。
function Mentions({
  text,
  mentions,
}: {
  text: string;
  mentions: ResolvedMention[];
}) {
  // 長い名前から先に当てる。「@田中」が「@田中太郎」を食わないように。
  const byName = [...mentions].sort((a, b) => b.name.length - a.name.length);
  const parts = byName.length
    ? `(${byName.map((m) => "@" + escapeRe(m.name)).join("|")}|${EVERYONE_RE.source})`
    : `(${EVERYONE_RE.source})`;
  const re = new RegExp(parts, "g");

  return (
    <>
      {text.split(re).map((part, i) => {
        if (!part) return null;
        const hit = byName.find((m) => part === "@" + m.name);
        if (hit) {
          return (
            <Link
              key={i}
              href={`/app/profile/${hit.id}`}
              className="text-amber-600 font-bold hover:underline"
            >
              {part}
            </Link>
          );
        }
        if (new RegExp(`^(?:${EVERYONE_RE.source})$`).test(part)) {
          return (
            <span key={i} className="text-amber-600 font-bold">
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

/**
 * 会員が書いた文章を、URLはリンク・メンションは色付きにして表示する。
 *
 * mentions を渡さない画面（プロフィール・お願いごと等）では、
 * @ はただの文字になる。そこにメンションの仕組みは無いので、
 * 色を付けると届くように見えてしまう。
 */
export function RichText({
  text,
  mentions = [],
}: {
  text: string;
  mentions?: ResolvedMention[];
}) {
  return (
    <>
      {text.split(URL_RE).map((part, i) => {
        if (!/^https?:\/\//i.test(part))
          return <Mentions key={i} text={part} mentions={mentions} />;
        const [href, tail] = splitTrailing(part);
        return (
          <span key={i}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              // 長いURLで横に伸びて表示が崩れないように折り返す
              className="text-blue-600 underline underline-offset-2 hover:text-blue-700 break-all"
            >
              {href}
            </a>
            {tail}
          </span>
        );
      })}
    </>
  );
}
