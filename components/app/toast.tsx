// ============================================================
// 画面右下のトースト
// ============================================================
// 自動保存のように「何度も起きる通知」を出すため、既定では1件だけを
// 差し替えていく（連続保存でトーストが積み上がらないようにする）。
// ============================================================
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  text: string;
}

const DISMISS_MS = 2500;

export function useToasts() {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seqRef = useRef(0);

  const showToast = useCallback((text: string, type: ToastType = "success") => {
    seqRef.current += 1;
    setToast({ id: `t${seqRef.current}`, type, text });
  }, []);

  useEffect(() => {
    if (!toast) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), DISMISS_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast]);

  return { toast, showToast };
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

export function ToastStack({ toast }: { toast: ToastItem | null }) {
  if (!toast) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50" role="status" aria-live="polite">
      <div
        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium ${STYLES[toast.type]}`}
      >
        {ICONS[toast.type]}
        {toast.text}
      </div>
    </div>
  );
}
