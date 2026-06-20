"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { Bell } from "lucide-react";
import {
  savePushSubscription,
  updateReminderTime,
  updateMonthlyReportEnabled,
  deletePushSubscription,
} from "@/lib/actions/notifications";
import type { PushSubscriptionRow } from "@/lib/types";

// VAPID 公開鍵（base64url）を applicationServerKey 用の Uint8Array に変換する。
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

// ブラウザが Web Push に対応しているか。useSyncExternalStore で
// サーバー（true）／クライアント（実値）を切り替え、ハイドレーション不一致を避ける。
function checkSupported(): boolean {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}
const noopSubscribe = () => () => {};

export function ReminderSettings({
  initial,
}: {
  initial: PushSubscriptionRow | null;
}) {
  const [enabled, setEnabled] = useState(initial?.enabled ?? false);
  const [monthlyEnabled, setMonthlyEnabled] = useState(
    initial?.monthly_report_enabled ?? true
  );
  // DB の 'HH:MM:SS' → input[type=time] 用 'HH:MM'
  const [time, setTime] = useState(
    initial?.reminder_time?.slice(0, 5) ?? "21:00"
  );
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const supported = useSyncExternalStore(noopSubscribe, checkSupported, () => true);

  function fail(msg: string) {
    setMessage(msg);
  }

  // トグル ON: 許可要求 → 購読 → DB 保存
  async function enable() {
    setMessage(null);
    if (!supported) return fail("このブラウザは通知に対応していません。");
    if (!VAPID_PUBLIC_KEY)
      return fail("通知キーが未設定です（管理者に連絡してください）。");

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return fail("通知が許可されませんでした。ブラウザの設定をご確認ください。");
    }

    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    const json = sub.toJSON();
    const keys = json.keys ?? {};
    if (!json.endpoint || !keys.p256dh || !keys.auth) {
      return fail("購読情報の取得に失敗しました。");
    }

    startTransition(async () => {
      const res = await savePushSubscription(
        { endpoint: json.endpoint!, p256dh: keys.p256dh!, auth: keys.auth! },
        time
      );
      if (res && "error" in res) return fail(res.error);
      setEnabled(true);
      setMessage("リマインダーをオンにしました。");
    });
  }

  // トグル OFF: 購読解除 → DB 削除
  async function disable() {
    setMessage(null);
    if (supported) {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        startTransition(async () => {
          const res = await deletePushSubscription(endpoint);
          if (res && "error" in res) return fail(res.error);
          setEnabled(false);
          setMessage("リマインダーをオフにしました。");
        });
        return;
      }
    }
    setEnabled(false);
  }

  function toggle() {
    if (isPending) return;
    if (enabled) void disable();
    else void enable();
  }

  // 時刻変更（オン時のみ反映）
  function onTimeChange(next: string) {
    setTime(next);
    if (!enabled) return;
    startTransition(async () => {
      const res = await updateReminderTime(next);
      if (res && "error" in res) setMessage(res.error);
    });
  }

  // 月次レポート通知の ON/OFF（購読がある＝リマインダー有効時のみ操作可）
  function toggleMonthly() {
    if (isPending || !enabled) return;
    const next = !monthlyEnabled;
    setMonthlyEnabled(next);
    startTransition(async () => {
      const res = await updateMonthlyReportEnabled(next);
      if (res && "error" in res) {
        setMonthlyEnabled(!next); // 失敗時はロールバック
        setMessage(res.error);
      }
    });
  }

  return (
    <section className="space-y-3 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-lg font-bold">
          <Bell className="h-4 w-4 text-[var(--color-muted)]" />
          記録忘れリマインダー
        </h2>
        {/* トグルスイッチ */}
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="リマインダーの有効/無効"
          onClick={toggle}
          disabled={isPending}
          className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50 ${
            enabled ? "bg-[var(--color-brand)]" : "bg-[var(--color-line)]"
          }`}
        >
          <span
            className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white transition-transform ${
              enabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      <p className="text-sm text-[var(--color-muted)]">
        毎日この時刻に、まだ記録していなければ通知でお知らせします。
      </p>

      {/* 通知時刻 */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">通知時刻</span>
        <input
          type="time"
          value={time}
          onChange={(e) => onTimeChange(e.target.value)}
          disabled={isPending}
          className="rounded-lg border border-[var(--color-line)] bg-[var(--color-bg)] px-3 py-1.5 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-brand)] disabled:opacity-50"
        />
      </div>

      {/* 月次振り返りレポート（リマインダー有効時のみ操作可） */}
      <div className="flex items-center justify-between border-t border-[var(--color-line)] pt-3">
        <div className="pr-3">
          <span className="text-sm font-medium">月次レポートを通知</span>
          <p className="text-xs text-[var(--color-muted)]">
            毎月初めに先月の振り返り（収支・前月比・予算超過）をお届けします。
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={monthlyEnabled && enabled}
          aria-label="月次レポート通知の有効/無効"
          onClick={toggleMonthly}
          disabled={isPending || !enabled}
          className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-40 ${
            monthlyEnabled && enabled
              ? "bg-[var(--color-brand)]"
              : "bg-[var(--color-line)]"
          }`}
        >
          <span
            className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white transition-transform ${
              monthlyEnabled && enabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {message && (
        <p className="text-xs text-[var(--color-muted)]">{message}</p>
      )}

      {!supported && (
        <p className="text-xs text-[var(--color-expense)]">
          このブラウザは通知に対応していません。
        </p>
      )}

      {/* iOS は PWA インストールが必要 */}
      <p className="text-xs text-[var(--color-muted)]">
        ※ iPhone / iPad では、ホーム画面に追加した状態でのみ通知が届きます。
      </p>
    </section>
  );
}
