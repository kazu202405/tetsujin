"use client";

// ============================================================
// 投稿画像を上げる前に、ブラウザ側で縮める
// ============================================================
// 🔴 なぜ要るか（2026-09-07 実測）
// ------------------------------------------------------------
// 投稿画像は原寸のまま保存していた。本番の5枚で合計6.1MB、
// いちばん大きいものが4.5MB。掲示板はそれを高さ192pxの枠に
// 押し込んで表示しているので、**見えない解像度を毎回ダウンロードしている**。
// スマホの写真は年々大きくなるので、放っておくと開くたびに重くなる。
//
// ∴ 長辺1600pxまで／JPEG品質85%に落としてから上げる。
//    画面で見るには十分で、多くの写真が数百KBに収まる。
//
// 🔴 縮小に失敗したら元のファイルをそのまま返す。
//    ここで例外を投げると「画像を選んだだけで投稿できない」になる。
//    重いまま上がるのは、投稿できないことよりずっとまし。
// 🔴 元から小さい画像は触らない。作り直すと逆に太ることがある
//    （PNGのイラストをJPEGにすると輪郭が汚れる、など）。
// ============================================================

/** これより長い辺は縮める */
const MAX_EDGE = 1600;
/** これより小さいファイルは触らない */
const SKIP_UNDER_BYTES = 500 * 1024;
const JPEG_QUALITY = 0.85;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("画像を読み込めませんでした"));
    };
    img.src = url;
  });
}

/**
 * 長辺 MAX_EDGE まで縮めた JPEG を返す。
 * 縮める必要が無い・できないときは元のファイルをそのまま返す。
 */
export async function shrinkImageForUpload(file: File): Promise<File> {
  try {
    if (typeof document === "undefined") return file;
    if (file.size <= SKIP_UNDER_BYTES) return file;

    const img = await loadImage(file);
    const longest = Math.max(img.naturalWidth, img.naturalHeight);
    if (!longest) return file;

    const scale = Math.min(1, MAX_EDGE / longest);
    const width = Math.round(img.naturalWidth * scale);
    const height = Math.round(img.naturalHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );
    if (!blob) return file;
    // 縮めたのに大きくなったなら元を使う（透過PNGなどで起こる）
    if (blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}
