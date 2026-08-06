"use client";

import { useEffect, useState } from "react";
import {
  Smartphone,
  Check,
  AlertCircle,
  Share,
  Plus,
  Bell,
  Loader2,
} from "lucide-react";

type PermState = "default" | "granted" | "denied" | "unsupported";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

/** VAPID公開鍵（base64url）をブラウザが要求するバイト列へ変換する */
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i += 1) view[i] = raw.charCodeAt(i);
  return buffer;
}

/**
 * 端末プッシュ通知（Web Push / PWA）の設定＆動作確認カード。
 *
 *  - Service Worker を登録
 *  - 通知の許可を取得
 *  - この端末を購読先としてサーバーへ登録（ここまでやると閉じていても届く）
 *  - ローカルのテスト通知で「端末に通知が出るか」を確認できる
 *
 * 🔴 iOS は Safari で開いただけでは通知不可。「ホーム画面に追加」して
 *    そのアイコンから開いた時だけ許可できる（iOS 16.4+）。その案内も出す。
 *    ∴ iPhone の会員に確実に届けたいなら LINE 公式アカウントの併用が要る。
 */
export function PushNotificationSetup() {
  const [mounted, setMounted] = useState(false);
  const [perm, setPerm] = useState<PermState>("default");
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  // この端末がサーバーに購読先として登録されているか
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    setMounted(true);
    const supported =
      typeof window !== "undefined" &&
      "Notification" in window &&
      "serviceWorker" in navigator;
    if (!supported) {
      setPerm("unsupported");
      return;
    }
    setPerm(Notification.permission as PermState);

    const ua = window.navigator.userAgent;
    setIsIOS(/iphone|ipad|ipod/i.test(ua));
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari 独自フラグ
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;
    setIsStandalone(standalone);

    // Service Worker 登録（push 受信と通知表示の土台）
    navigator.serviceWorker
      .register("/sw.js")
      .then(async () => {
        // すでにこの端末が購読済みかを見て表示を合わせる
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setSubscribed(Boolean(sub));
      })
      .catch(() => {
        /* 登録失敗時はテスト通知でエラー表示するので握りつぶし */
      });
  }, []);

  const requestPermission = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const result = (await Notification.requestPermission()) as PermState;
      setPerm(result);
      if (result === "denied") {
        setMsg(
          "通知がブロックされています。端末の「設定」アプリ → このアプリ → 通知 から許可してください。"
        );
        return;
      }
      if (result === "granted") {
        await subscribe();
      }
    } finally {
      setBusy(false);
    }
  };

  // この端末を購読先としてサーバーへ登録する。
  // ここまでやって初めて「アプリを開いていなくても届く」状態になる。
  const subscribe = async () => {
    if (!VAPID_PUBLIC_KEY) {
      setMsg("配信用のキーが未設定のため、この端末を登録できませんでした（運営にご連絡ください）。");
      return;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const sub =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        }));

      const json = sub.toJSON() as {
        endpoint?: string;
        keys?: { p256dh?: string; auth?: string };
      };

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
          userAgent: navigator.userAgent,
        }),
      });

      if (!response.ok) {
        setMsg("この端末の登録に失敗しました。時間をおいて再度お試しください。");
        return;
      }
      setSubscribed(true);
      setMsg("この端末で通知を受け取れるようになりました。");
    } catch {
      setMsg("この端末の登録に失敗しました。");
    }
  };

  const unsubscribe = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`, {
          method: "DELETE",
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
      setMsg("この端末への通知を止めました。");
    } catch {
      setMsg("解除に失敗しました。");
    } finally {
      setBusy(false);
    }
  };

  const sendTest = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification("TETSUJIN会", {
        body: "テスト通知です。これが届けば通知の準備はOKです 🎉",
        icon: "/icon.svg",
        badge: "/icon.svg",
        data: { url: "/app/notifications" },
      });
      setMsg("テスト通知を送りました。端末の通知センターを確認してください。");
    } catch {
      setMsg("テスト通知の送信に失敗しました。ページを再読み込みして再度お試しください。");
    } finally {
      setBusy(false);
    }
  };

  // hydration mismatch 回避（端末依存の判定はマウント後のみ）
  if (!mounted) return null;

  const iosNeedsInstall = isIOS && !isStandalone;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
      <h2 className="text-base font-bold text-gray-900 mb-1.5 flex items-center gap-2">
        <Smartphone className="w-5 h-5 text-gray-400" />
        端末プッシュ通知
      </h2>
      <p className="text-sm text-gray-500 mb-5 leading-relaxed">
        アプリを開いていない時でも、スマホ・PCの通知として受け取れます。
      </p>

      {/* 非対応ブラウザ */}
      {perm === "unsupported" && (
        <div className="flex items-start gap-2.5 p-4 rounded-xl bg-gray-50 text-sm text-gray-600">
          <AlertCircle className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
          <p>このブラウザは端末通知に対応していません。最新の Chrome / Safari でお試しください。</p>
        </div>
      )}

      {/* iOS: ホーム画面に追加が必要 */}
      {perm !== "unsupported" && iosNeedsInstall && (
        <div className="p-4 rounded-xl bg-[var(--tetsu-pink-pale)] border border-[var(--tetsu-pink)]/20">
          <p className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[var(--tetsu-pink)]" />
            iPhone / iPad はあと一手間だけ必要です
          </p>
          <p className="text-xs text-gray-600 mb-3 leading-relaxed">
            Safari で開いただけでは通知を受け取れません。下の手順で「ホーム画面に追加」して、
            <b>追加されたアイコンから開く</b>と、ここで通知を許可できるようになります。
          </p>
          <ol className="space-y-2 text-sm text-gray-700">
            <li className="flex items-center gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--tetsu-pink)] text-white text-xs font-bold flex items-center justify-center">1</span>
              下の <Share className="inline w-4 h-4 mx-0.5 text-gray-500" />（共有）をタップ
            </li>
            <li className="flex items-center gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--tetsu-pink)] text-white text-xs font-bold flex items-center justify-center">2</span>
              <Plus className="inline w-4 h-4 mx-0.5 text-gray-500" />「ホーム画面に追加」を選ぶ
            </li>
            <li className="flex items-center gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--tetsu-pink)] text-white text-xs font-bold flex items-center justify-center">3</span>
              ホーム画面の「TETSUJIN会」アイコンから開く
            </li>
            <li className="flex items-center gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--tetsu-pink)] text-white text-xs font-bold flex items-center justify-center">4</span>
              この画面に戻って「通知を許可する」をタップ
            </li>
          </ol>
        </div>
      )}

      {/* 許可前（対応端末・iOSはインストール済み） */}
      {perm !== "unsupported" && !iosNeedsInstall && perm === "default" && (
        <button
          onClick={requestPermission}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-[var(--tetsu-pink)] hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
          通知を許可する
        </button>
      )}

      {/* 許可済み: テスト通知 */}
      {perm !== "unsupported" && !iosNeedsInstall && perm === "granted" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-green-700">
            <Check className="w-4 h-4" />
            {subscribed
              ? "この端末で通知を受け取れます"
              : "通知は許可されています（この端末はまだ登録されていません）"}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {subscribed ? (
              <button
                onClick={unsubscribe}
                disabled={busy}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                この端末への通知を止める
              </button>
            ) : (
              <button
                onClick={() => {
                  setBusy(true);
                  void subscribe().finally(() => setBusy(false));
                }}
                disabled={busy}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-[var(--tetsu-pink)] hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
                この端末を登録する
              </button>
            )}

            <button
              onClick={sendTest}
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-gray-900 border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
              テスト通知を送る
            </button>
          </div>

          <p className="text-[11px] text-gray-400 leading-relaxed">
            「テスト通知」はこの端末の中だけで表示を確かめるものです。実際のお知らせ（コメント・参加申請・承認など）は、この端末を登録しておくとアプリを閉じていても届きます。
          </p>
        </div>
      )}

      {/* 拒否済み */}
      {perm !== "unsupported" && !iosNeedsInstall && perm === "denied" && (
        <div className="flex items-start gap-2.5 p-4 rounded-xl bg-gray-50 text-sm text-gray-600">
          <AlertCircle className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
          <p>通知がブロックされています。端末またはブラウザの設定から「TETSUJIN会」の通知を許可してください。</p>
        </div>
      )}

      {msg && <p className="mt-3 text-xs text-gray-500 leading-relaxed">{msg}</p>}

      {/* 開発メモ的な注記（実配信は今後） */}
      <p className="mt-5 pt-4 border-t border-gray-100 text-[11px] text-gray-400 leading-relaxed">
        ※ 現在は「通知が届くかの動作確認」段階です。新しい申請やイベントを自動でお知らせする配信機能は、今後の対応で追加します。
      </p>
    </div>
  );
}
