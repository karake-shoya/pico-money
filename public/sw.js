// Pico Money Service Worker
// 記録忘れリマインダーの Web Push を受信して通知を表示する。
// 静的ファイルとして /sw.js で配信される（Next のビルド対象外）。

// プッシュ受信 → 通知表示
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = payload.title || "Pico Money";
  const options = {
    body: payload.body || "今日の家計簿はもう記録しましたか？",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: payload.url || "/" },
    // 通知種別ごとに tag を分け、リマインダーと月次レポートが互いを上書きしないようにする。
    tag: payload.tag || "pico-money-reminder",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 通知タップ → 既存タブにフォーカス、無ければ新規に開く
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus();
            if ("navigate" in client) client.navigate(targetUrl);
            return;
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      })
  );
});
