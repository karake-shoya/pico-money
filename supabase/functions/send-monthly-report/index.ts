// 月次振り返りレポート送信 Edge Function（Deno ランタイム）。
// pg_cron が pg_net 経由で定期的に POST する（毎日 朝1回などでよい。月内重複は last_report_month で抑止）。
//
// 処理:
//   ① 対象月 = JST の「先月」（YYYY-MM）
//   ② monthly_report_enabled かつ enabled かつ 当月未送信(last_report_month<対象月) の購読を抽出
//   ③ そのユーザーの対象月の集計（収支・貯蓄率・予算超過）を作り Web Push を送信
//   ④ last_report_month=対象月 にして当月の重複送信を抑止
//   ⑤ 410/404（期限切れ購読）は行削除
//
// 必要な Edge secrets（send-reminders と共通）:
//   VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT / REMINDER_FUNCTION_SECRET

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

const yen = (n: number) => "¥" + Math.abs(Math.round(n)).toLocaleString("en-US");
const signedYen = (n: number) =>
  (n > 0 ? "+" : n < 0 ? "-" : "") + yen(n);

// JST の「先月」を YYYY-MM と、その期間 [start, end)（YYYY-MM-DD）で返す。
function prevMonthInTokyo(): { month: string; start: string; end: string; label: string } {
  const todayJst = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [y, m] = todayJst.split("-").map(Number);
  // 先月
  const pm = m === 1 ? 12 : m - 1;
  const py = m === 1 ? y - 1 : y;
  const month = `${py}-${String(pm).padStart(2, "0")}`;
  const start = `${month}-01`;
  // 対象月の翌月＝当月初日
  const end = `${y}-${String(m).padStart(2, "0")}-01`;
  return { month, start, end, label: `${py}年${pm}月` };
}

// 対象ユーザー・対象月の集計から通知本文を組み立てる。
async function buildBody(
  userId: string,
  start: string,
  end: string,
  label: string
): Promise<string | null> {
  // 取引（収支とカテゴリ別支出）
  const { data: txs, error: txErr } = await admin
    .from("transactions")
    .select("type, amount, category:categories(id, name)")
    .eq("user_id", userId)
    .gte("date", start)
    .lt("date", end);
  if (txErr) throw txErr;
  if (!txs || txs.length === 0) return null; // 取引が無い月は送らない

  let income = 0;
  let expense = 0;
  const expenseByCat = new Map<string, { name: string; amount: number }>();
  for (const t of txs as unknown as {
    type: string;
    amount: number;
    category: { id: string; name: string } | null;
  }[]) {
    if (t.type === "income") {
      income += t.amount;
    } else {
      expense += t.amount;
      const id = t.category?.id ?? "unknown";
      const cur = expenseByCat.get(id);
      if (cur) cur.amount += t.amount;
      else expenseByCat.set(id, { name: t.category?.name ?? "不明", amount: t.amount });
    }
  }
  const balance = income - expense;
  const savingsRate = income > 0 ? Math.round((balance / income) * 100) : 0;

  // 予算超過カテゴリ（最大の1件をメッセージに含める）
  const { data: budgets, error: bErr } = await admin
    .from("budgets")
    .select("category_id, amount")
    .eq("user_id", userId);
  if (bErr) throw bErr;

  let topOver: { name: string; over: number } | null = null;
  for (const b of budgets ?? []) {
    if (!b.amount || b.amount <= 0) continue;
    const spent = expenseByCat.get(b.category_id)?.amount ?? 0;
    const over = spent - b.amount;
    if (over > 0 && (!topOver || over > topOver.over)) {
      topOver = { name: expenseByCat.get(b.category_id)!.name, over };
    }
  }

  let body = `${label}の収支：${signedYen(balance)}（貯蓄率${savingsRate}%）。`;
  body += topOver
    ? `${topOver.name}が予算を${yen(topOver.over)}超過しました。`
    : "予算超過したカテゴリはありませんでした。";
  return body;
}

Deno.serve(async (req) => {
  // 呼び出し元検証
  if (req.headers.get("x-reminder-secret") !== FUNCTION_SECRET) {
    return new Response("unauthorized", { status: 401 });
  }

  const { month, start, end, label } = prevMonthInTokyo();

  // ② 対象購読（月次有効・購読有効・対象月未送信）
  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .eq("enabled", true)
    .eq("monthly_report_enabled", true)
    .or(`last_report_month.is.null,last_report_month.lt.${month}`);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  let sent = 0;
  let skipped = 0;
  let removed = 0;

  // ユーザー単位で本文をメモ化（同一ユーザーが複数端末を持つ場合の重複集計を避ける）
  const bodyCache = new Map<string, string | null>();

  for (const sub of subs ?? []) {
    let body = bodyCache.get(sub.user_id);
    if (body === undefined) {
      body = await buildBody(sub.user_id, start, end, label);
      bodyCache.set(sub.user_id, body);
    }

    if (body === null) {
      // 取引が無い月は送らない。ただし当月の再評価を避けるため送信済み扱いにする。
      skipped++;
      await admin
        .from("push_subscriptions")
        .update({ last_report_month: month })
        .eq("id", sub.id);
      continue;
    }

    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify({
          title: "今月の振り返り",
          body,
          url: `/report?month=${month}`,
          tag: "pico-money-monthly",
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
      // それ以外のエラーは last_report_month を更新せず、次回再試行に委ねる
      continue;
    }

    // ④ 当月の重複送信抑止
    await admin
      .from("push_subscriptions")
      .update({ last_report_month: month })
      .eq("id", sub.id);
  }

  return new Response(
    JSON.stringify({ month, candidates: subs?.length ?? 0, sent, skipped, removed }),
    { headers: { "content-type": "application/json" } }
  );
});
