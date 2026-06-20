"use client";

import { useEffect } from "react";

// Service Worker（/sw.js）を登録する。Web Push の受信に必要。
// 対応ブラウザでのみ動作し、未対応環境では何もしない。
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // 登録失敗（非対応・非 https 等）は通知機能が使えないだけなので握りつぶす。
    });
  }, []);

  return null;
}
