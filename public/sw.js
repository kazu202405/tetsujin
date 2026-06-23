/*
 * テツジン会 PWA Service Worker（通知の土台）
 *
 * 役割:
 *  - PWA としてインストール可能にする要件のひとつ
 *  - 将来の Web Push 受信（push イベント）
 *  - 通知クリックで該当ページを開く
 *
 * 注意:
 *  実際のサーバ配信（購読情報を保存 → サーバから push 送信）は
 *  Supabase バックエンド連携（入金後）で実装する。
 *  現状はローカルのテスト通知（registration.showNotification）で
 *  「端末に通知が出るか」を実機確認できる段階。
 */

self.addEventListener("install", () => {
  // 新しい SW を即時有効化
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// 将来の Web Push 受信（サーバからのプッシュ）
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "TETSUJIN会", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "TETSUJIN会";
  const options = {
    body: data.body || "",
    icon: "/icon.svg",
    badge: "/icon.svg",
    data: { url: data.url || "/app/notifications" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// 通知クリック → 既存タブにフォーカス or 新規で開く
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl =
    (event.notification.data && event.notification.data.url) ||
    "/app/notifications";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            if ("navigate" in client) client.navigate(targetUrl);
            return client.focus();
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      })
  );
});
