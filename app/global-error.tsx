"use client";

// ============================================================
// ルートレイアウト自体が落ちたときの最後の受け皿
// ============================================================
// app/error.tsx はレイアウトの内側でしか効かない。
// レイアウトやプロバイダが例外を投げると error.tsx は描画されず、
// Next.js の既定画面（英語・無地）が出る。ここがその1段外側。
//
// html / body を自分で描く必要がある（レイアウトが動いていないため）。
// ∴ Tailwind に頼らず inline style で書く。
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ja">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f9fafb",
          fontFamily:
            "system-ui, -apple-system, 'Hiragino Sans', 'Noto Sans JP', sans-serif",
          padding: "16px",
        }}
      >
        <div
          style={{
            maxWidth: "420px",
            width: "100%",
            background: "#fff",
            border: "1px solid #f3f4f6",
            borderRadius: "16px",
            padding: "32px",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "18px", fontWeight: 800, color: "#111827", margin: "0 0 12px" }}>
            エラーが発生しました
          </h1>
          <p style={{ fontSize: "14px", color: "#4b5563", lineHeight: 1.8, margin: "0 0 24px" }}>
            一時的な問題の可能性があります。
            <br />
            お手数ですが、もう一度お試しください。
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "12px",
              border: "none",
              background: "#e94b8a",
              color: "#fff",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            もう一度試す
          </button>
          <p style={{ fontSize: "12px", color: "#9ca3af", margin: "24px 0 0", lineHeight: 1.7 }}>
            繰り返し表示される場合は運営までご連絡ください。
            {error.digest && (
              <>
                <br />
                <span style={{ fontFamily: "monospace", fontSize: "11px" }}>
                  エラーID: {error.digest}
                </span>
              </>
            )}
          </p>
        </div>
      </body>
    </html>
  );
}
