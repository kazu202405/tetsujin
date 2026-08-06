/*
 * テツジン会 PWA Service Worker
 *
 * 役割:
 *  - PWA としてインストール可能にする要件のひとつ
 *  - サーバからの Web Push を受け取って通知を出す
 *  - 通知クリックで該当ページを開く
 *
 * 送信側の流れ:
 *  notifications へINSERT → Supabase の Database Webhook →
 *  /api/push/dispatch が購読先へ送信 → ここの push イベントで表示。
 *  受け取る中身は { title, body, url }。
 */

self.addEventListener("install", () => {
  // 新しい SW を即時有効化
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// サーバからのプッシュを受け取る
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
