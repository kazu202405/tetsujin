// ============================================================
// お願いごとの表紙（ジャンルごとの図版）
// ============================================================
// 🔴 写真の任意アップロードにしない。
//    このコミュニティは441名中5名しか顔写真を登録していない。
//    依頼のたびに画像を用意してもらえる前提は立たず、
//    「写真あり」と「写真なし」が混ざると、画像が無かった頃より見づらくなる。
//
// ∴ ジャンルごとの図版を必ず出す。写真を入れた人だけ差し替わる形にする。
//    こうすれば一覧が揃わなくなることが起きない。
//
// 🔴 色は付けない（グレー系の濃淡だけ）。
//    一覧で色を使っているのは「急ぎ」の赤だけなので、
//    表紙が色を持つとその赤が埋もれる。
//    絵は「何の依頼か」を形で伝えるためのもので、色分けの手段ではない。
//
// 外部画像を読まずSVGで描く。読み込みが増えず、拡大しても粗くならない。
// ============================================================

const STROKE = "#9CA3AF"; // gray-400
const FILL = "#E5E7EB"; // gray-200
const GROUND = "#F3F4F6"; // gray-100

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 320 130"
      className="w-full h-full"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <rect width="320" height="130" fill={GROUND} />
      {children}
    </svg>
  );
}

/** デザイン：アートボードと色見本 */
function DesignCover() {
  return (
    <Frame>
      <rect x="96" y="30" width="86" height="70" rx="4" fill="#fff" stroke={STROKE} strokeWidth="2" />
      <circle cx="122" cy="54" r="10" fill={FILL} />
      <path d="M108 88 L132 64 L152 88 Z" fill={FILL} />
      <rect x="196" y="38" width="18" height="18" rx="3" fill={FILL} />
      <rect x="196" y="62" width="18" height="18" rx="3" fill="#fff" stroke={STROKE} strokeWidth="1.5" />
      <rect x="196" y="86" width="18" height="18" rx="3" fill={FILL} />
      <path d="M232 96 L246 44 L258 96" stroke={STROKE} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M237 78 h16" stroke={STROKE} strokeWidth="2" strokeLinecap="round" />
    </Frame>
  );
}

/** 文章・発信：書類とペン */
function WritingCover() {
  return (
    <Frame>
      <rect x="104" y="24" width="74" height="94" rx="4" fill="#fff" stroke={STROKE} strokeWidth="2" />
      {[44, 58, 72, 86, 100].map((y, i) => (
        <rect key={y} x="116" y={y} width={i === 4 ? 30 : 50} height="4" rx="2" fill={FILL} />
      ))}
      <path
        d="M206 96 L204 76 L246 34 a8 8 0 0 1 12 10 L216 88 Z"
        fill="#fff"
        stroke={STROKE}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M204 76 L216 88" stroke={STROKE} strokeWidth="2" />
    </Frame>
  );
}

/** 仕入れ・外注：箱とタグ */
function SupplyCover() {
  return (
    <Frame>
      <path d="M92 52 L136 32 L180 52 L136 72 Z" fill="#fff" stroke={STROKE} strokeWidth="2" strokeLinejoin="round" />
      <path d="M92 52 L92 96 L136 116 L136 72 Z" fill={FILL} stroke={STROKE} strokeWidth="2" strokeLinejoin="round" />
      <path d="M180 52 L180 96 L136 116 L136 72 Z" fill="#fff" stroke={STROKE} strokeWidth="2" strokeLinejoin="round" />
      <rect x="204" y="46" width="56" height="38" rx="4" fill="#fff" stroke={STROKE} strokeWidth="2" transform="rotate(-8 232 65)" />
      <circle cx="215" cy="58" r="4" fill={STROKE} transform="rotate(-8 232 65)" />
      <rect x="226" y="54" width="26" height="4" rx="2" fill={FILL} transform="rotate(-8 232 65)" />
      <rect x="226" y="66" width="18" height="4" rx="2" fill={FILL} transform="rotate(-8 232 65)" />
    </Frame>
  );
}

/** 人・採用：ふたりの人 */
function HiringCover() {
  return (
    <Frame>
      <circle cx="126" cy="48" r="17" fill="#fff" stroke={STROKE} strokeWidth="2" />
      <path d="M96 108 a30 30 0 0 1 60 0 Z" fill="#fff" stroke={STROKE} strokeWidth="2" strokeLinejoin="round" />
      <circle cx="196" cy="56" r="14" fill={FILL} stroke={STROKE} strokeWidth="2" />
      <path d="M172 108 a24 24 0 0 1 48 0 Z" fill={FILL} stroke={STROKE} strokeWidth="2" strokeLinejoin="round" />
      <circle cx="252" cy="62" r="11" fill="#fff" stroke={STROKE} strokeWidth="1.5" />
      <path d="M234 108 a18 18 0 0 1 36 0 Z" fill="#fff" stroke={STROKE} strokeWidth="1.5" strokeLinejoin="round" />
    </Frame>
  );
}

/** お金・士業：電卓とグラフ */
function FinanceCover() {
  return (
    <Frame>
      <rect x="94" y="26" width="66" height="92" rx="6" fill="#fff" stroke={STROKE} strokeWidth="2" />
      <rect x="106" y="38" width="42" height="16" rx="2" fill={FILL} />
      {[0, 1, 2].map((r) =>
        [0, 1, 2].map((c) => (
          <rect
            key={`${r}-${c}`}
            x={106 + c * 15}
            y={64 + r * 15}
            width="11"
            height="11"
            rx="2"
            fill={FILL}
          />
        )),
      )}
      <rect x="184" y="84" width="18" height="30" rx="2" fill={FILL} />
      <rect x="210" y="62" width="18" height="52" rx="2" fill="#fff" stroke={STROKE} strokeWidth="2" />
      <rect x="236" y="42" width="18" height="72" rx="2" fill={FILL} />
      <path d="M186 74 L219 52 L245 34" stroke={STROKE} strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="245" cy="34" r="4" fill={STROKE} />
    </Frame>
  );
}

const COVERS: Record<string, () => React.ReactElement> = {
  design: DesignCover,
  writing: WritingCover,
  supply: SupplyCover,
  hiring: HiringCover,
  finance: FinanceCover,
};

export function QuestCover({
  kind,
  imageUrl,
  className = "",
}: {
  kind: string;
  /** 依頼した人が写真を入れた場合はこちらが優先される（将来） */
  imageUrl?: string | null;
  className?: string;
}) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={imageUrl} alt="" className={`w-full h-full object-cover ${className}`} />
    );
  }
  const Cover = COVERS[kind] ?? DesignCover;
  return (
    <div className={className}>
      <Cover />
    </div>
  );
}
