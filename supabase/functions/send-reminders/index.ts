// 記録忘れリマインダー送信 Edge Function（Deno ランタイム）。
// pg_cron が pg_net 経由で定期的に POST する。秘密ヘッダで呼び出し元を検証する。
//
// 処理:
//   ① now/today を Asia/Tokyo で算出
//   ② enabled かつ 当日未通知 かつ reminder_time<=now の購読を抽出
//   ③ そのユーザーが今日まだ記録していなければ Web Push を送信
//   ④ いずれの場合も last_notified_date=today にして当日の再処理を抑止
//   ⑤ 410/404（期限切れ購読）は行削除
//
// 必要な Edge secrets:
//   VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT / REMINDER_FUNCTION_SECRET
//   （SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY はランタイム既定で提供される）

import webpush from "npm:web-push@3.6.7";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com";
const FUNCTION_SECRET = Deno.env.get("REMINDER_FUNCTION_SECRET")!;

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Asia/Tokyo の 'YYYY-MM-DD' と 'HH:MM:SS' を返す
function nowInTokyo(): { today: string; time: string } {
  const now = new Date();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);
  return { today, time };
}

Deno.serve(async (req) => {
  // 呼び出し元検証
  if (req.headers.get("x-reminder-secret") !== FUNCTION_SECRET) {
    return new Response("unauthorized", { status: 401 });
  }

  const { today, time } = nowInTokyo();

  // ② 対象購読を抽出（当日未通知 かつ 指定時刻到達 かつ 有効）
  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth, last_notified_date")
    .eq("enabled", true)
    .lte("reminder_time", time)
    .or(`last_notified_date.is.null,last_notified_date.lt.${today}`);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  let sent = 0;
  let skipped = 0;
  let removed = 0;

  for (const sub of subs ?? []) {
    // ③ 今日の取引があるか
    const { count } = await admin
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", sub.user_id)
      .eq("date", today);

    const alreadyRecorded = (count ?? 0) > 0;

    if (!alreadyRecorded) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify({
            title: "Pico Money",
            body: "今日の家計簿はまだ記録していません。忘れずに入力しましょう。",
            url: "/",
          })
        );
        sent++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        // ⑤ 期限切れ購読は削除して次回以降の無駄送信を防ぐ
        if (status === 404 || status === 410) {
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
          removed++;
          continue;
        }
        // それ以外のエラーは last_notified_date を更新せず、次回再試行に委ねる
        continue;
      }
    } else {
      skipped++;
    }

    // ④ 当日の再処理抑止
    await admin
      .from("push_subscriptions")
      .update({ last_notified_date: today })
      .eq("id", sub.id);
  }

  return new Response(
    JSON.stringify({ today, time, candidates: subs?.length ?? 0, sent, skipped, removed }),
    { headers: { "content-type": "application/json" } }
  );
});
