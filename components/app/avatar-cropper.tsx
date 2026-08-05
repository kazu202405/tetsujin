// ============================================================
// プロフィール写真のトリミング（ドラッグで位置調整・スライダーで拡大）
// ============================================================
// アイコンは丸く小さく表示されるため、元画像をそのまま上げると
// 顔が切れたり中心からずれたりする。確定前にここで位置と大きさを決める。
//
// 出力は 512×512 の JPEG に統一する（元画像がどれだけ大きくても軽くなる）。
// 外部ライブラリは使わず、canvas への描画だけで完結させている。
// ============================================================
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Move, X, ZoomIn } from "lucide-react";

/** 操作エリア（正方形）の一辺。スマホ幅(320px)でも収まるサイズ。 */
const CROP_SIZE = 260;
/** 保存する画像の一辺。 */
const OUTPUT_SIZE = 512;
const MAX_ZOOM = 4;

interface Offset {
  x: number;
  y: number;
}

export function AvatarCropper({
  file,
  onCancel,
  onConfirm,
}: {
  file: File;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; origin: Offset } | null>(null);

  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 画像を読み込み、正方形いっぱいに収まる倍率で中央に置く
  useEffect(() => {
    // 開発時は効果が2回走り、1回目の後始末で URL が無効化される。
    // その古い Image の onerror でエラー表示が出てしまうため、
    // 破棄済みの読み込み結果は無視する。
    let cancelled = false;

    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    setError(null);

    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      imageRef.current = img;
      setNatural({ w: img.naturalWidth, h: img.naturalHeight });
      // cover 相当の倍率で中央寄せ
      const base = Math.max(CROP_SIZE / img.naturalWidth, CROP_SIZE / img.naturalHeight);
      setZoom(1);
      setOffset({
        x: (CROP_SIZE - img.naturalWidth * base) / 2,
        y: (CROP_SIZE - img.naturalHeight * base) / 2,
      });
    };
    img.onerror = () => {
      if (cancelled) return;
      setError("画像を読み込めませんでした");
    };
    img.src = url;

    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  // 正方形が必ず画像で埋まるように、はみ出しを止める
  const clamp = useCallback(
    (next: Offset, scale: number, size: { w: number; h: number }): Offset => {
      const drawnW = size.w * scale;
      const drawnH = size.h * scale;
      return {
        x: Math.min(0, Math.max(CROP_SIZE - drawnW, next.x)),
        y: Math.min(0, Math.max(CROP_SIZE - drawnH, next.y)),
      };
    },
    []
  );

  const baseScale = natural
    ? Math.max(CROP_SIZE / natural.w, CROP_SIZE / natural.h)
    : 1;
  const scale = baseScale * zoom;

  // 拡大時は正方形の中心を保つ（端に飛ばないように）
  const handleZoom = (nextZoom: number) => {
    if (!natural) return;
    const nextScale = baseScale * nextZoom;
    const centerX = (CROP_SIZE / 2 - offset.x) / scale;
    const centerY = (CROP_SIZE / 2 - offset.y) / scale;
    const next = {
      x: CROP_SIZE / 2 - centerX * nextScale,
      y: CROP_SIZE / 2 - centerY * nextScale,
    };
    setZoom(nextZoom);
    setOffset(clamp(next, nextScale, natural));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origin: offset };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || !natural) return;
    const { startX, startY, origin } = dragRef.current;
    setOffset(
      clamp(
        { x: origin.x + (e.clientX - startX), y: origin.y + (e.clientY - startY) },
        scale,
        natural
      )
    );
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragRef.current = null;
  };

  const handleConfirm = () => {
    const img = imageRef.current;
    if (!img || !natural) return;
    setWorking(true);
    setError(null);

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setWorking(false);
      setError("画像を書き出せませんでした");
      return;
    }

    // JPEGは透明を扱えないため下地を白で塗る
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    // 画面上の配置をそのまま出力サイズへ拡大して描く
    const ratio = OUTPUT_SIZE / CROP_SIZE;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      img,
      offset.x * ratio,
      offset.y * ratio,
      natural.w * scale * ratio,
      natural.h * scale * ratio
    );

    canvas.toBlob(
      (blob) => {
        setWorking(false);
        if (!blob) {
          setError("画像を書き出せませんでした");
          return;
        }
        onConfirm(blob);
      },
      "image/jpeg",
      0.9
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 sm:p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-bold text-gray-900">写真の位置を調整</h3>
          <button
            onClick={onCancel}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="閉じる"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-4 flex items-center gap-1.5">
          <Move className="w-3.5 h-3.5 flex-shrink-0" />
          ドラッグで位置、スライダーで大きさを調整できます
        </p>
        <p className="text-[11px] text-gray-400 mb-3">
          枠の中が保存されます（掲示板などでは丸く表示されます）
        </p>

        {/* 操作エリア（丸い部分が実際に表示される範囲） */}
        <div className="flex justify-center">
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className="relative overflow-hidden bg-gray-100 rounded-xl cursor-grab active:cursor-grabbing touch-none select-none"
            style={{ width: CROP_SIZE, height: CROP_SIZE }}
          >
            {objectUrl && natural && (
              <img
                src={objectUrl}
                alt=""
                draggable={false}
                className="absolute max-w-none pointer-events-none"
                style={{
                  left: offset.x,
                  top: offset.y,
                  width: natural.w * scale,
                  height: natural.h * scale,
                }}
              />
            )}
            {/* 切り取り範囲の枠。プロフィールシートは四角で使うため正方形で切る
                （掲示板などの丸アイコンは、この正方形を丸く見せているだけ）。 */}
            <div className="absolute inset-0 pointer-events-none rounded-xl ring-2 ring-white/70 ring-inset" />
          </div>
        </div>

        {/* 拡大スライダー */}
        <div className="flex items-center gap-3 mt-4">
          <ZoomIn className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => handleZoom(Number(e.target.value))}
            className="flex-1 accent-gray-900"
            aria-label="拡大"
          />
        </div>

        {error && (
          <p className="mt-4 text-xs bg-red-50 text-red-700 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex gap-3 justify-end mt-5">
          <button
            onClick={onCancel}
            disabled={working}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            やめる
          </button>
          <button
            onClick={handleConfirm}
            disabled={working || !natural}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {working && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            この範囲で保存
          </button>
        </div>
      </div>
    </div>
  );
}
