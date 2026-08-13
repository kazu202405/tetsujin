// ============================================================
// 画面右下のトースト
// ============================================================
// 自動保存のように「何度も起きる通知」を出すため、既定では1件だけを
// 差し替えていく（連続保存でトーストが積み上がらないようにする）。
//
// 🔴 z-index は詳細モーダル(z-50)より前に出すこと。
//    管理画面の操作（権限の変更・備考の保存・退会）は全てモーダルの中で行うため、
//    同じ z-50 だと結果が裏に隠れて「押しても無言」に見える。
// ============================================================
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastMessage {
  type: ToastType;
  text: string;
}

export interface ToastItem extends ToastMessage {
  id: string;
}

const DISMISS_MS = 4000;
// エラーは読んで対処する時間が要るので長めに出す
const ERROR_DISMISS_MS = 8000;

export function useToasts() {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seqRef = useRef(0);

  const showToast = useCallback((text: string, type: ToastType = "success") => {
    seqRef.current += 1;
    setToast({ id: `t${seqRef.current}`, type, text });
  }, []);

  const hideToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    if (!toast) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(
      () => setToast(null),
      toast.type === "error" ? ERROR_DISMISS_MS : DISMISS_MS,
    );
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast]);

  return { toast, showToast, hideToast };
}

const STYLES: Record<ToastType, string> = {
  success: "bg-green-600 text-white",
  error: "bg-red-600 text-white",
  info: "bg-gray-800 text-white",
};

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <Check className="w-4 h-4" />,
  error: <X className="w-4 h-4" />,
  info: <Info className="w-4 h-4" />,
};

export function ToastStack({
  toast,
  onClose,
}: {
  toast: ToastMessage | null;
  onClose?: () => void;
}) {
  if (!toast) return null;
  return (
    <div
      // スマホは下タブがあるので少し持ち上げる。モーダル(z-50)より前に出す。
      className="fixed bottom-20 lg:bottom-4 right-4 z-[100] max-w-[calc(100vw-2rem)]"
      role={toast.type === "error" ? "alert" : "status"}
      aria-live={toast.type === "error" ? "assertive" : "polite"}
    >
      <div
        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium animate-[toastIn_180ms_ease-out] ${STYLES[toast.type]}`}
      >
        <span className="flex-shrink-0">{ICONS[toast.type]}</span>
        <span className="min-w-0">{toast.text}</span>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="閉じる"
            className="flex-shrink-0 -mr-1 p-1 rounded hover:bg-white/20 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
