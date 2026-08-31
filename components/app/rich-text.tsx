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

function Mentions({ text }: { text: string }) {
  return (
    <>
      {text.split(/(@\S+)/g).map((part, i) =>
        part.startsWith("@") ? (
          <span key={i} className="text-amber-600 font-bold">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

/** 会員が書いた文章を、URLはリンク・@は色付きにして表示する */
export function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split(URL_RE).map((part, i) => {
        if (!/^https?:\/\//i.test(part)) return <Mentions key={i} text={part} />;
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
