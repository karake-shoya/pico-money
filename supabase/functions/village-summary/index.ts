// ポポルの村（poporu-village）へ家計の集計だけを渡す Edge Function（Deno ランタイム）。
// 村の collect が launchd から夜中に GET する。秘密ヘッダで呼び出し元を検証する。
//
// 🔴 返すのは合計額と件数だけ。取引明細・カテゴリ名・メモ・目標名は返さない。
//    トークンが漏れても出るのは合計額で、いつ何を買ったかは出ない。
//
// 処理:
//   ① 入口の判定（シークレット・メソッド・対象ユーザー）は _shared/village-guard.ts へ
//   ② transactions / budgets / savings_goals を本人分だけ読む
//   ③ 集計は _shared/village-summary.ts の純粋関数へ
//   このファイルに判断を残さないのは、Deno 側がテストの外にあるため。
//
// 必要な Edge secrets:
//   VILLAGE_FUNCTION_SECRET / VILLAGE_USER_ID
//   （SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY はランタイム既定で提供される）

import { createClient } from "jsr:@supabase/supabase-js@2";
import { guardRequest } from "../_shared/village-guard.ts";
import {
  buildVillageSummary,
  type VillageTxRow,
} from "../_shared/village-summary.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// ⚠ 未設定なら undefined のまま guardRequest へ渡す（! で握り潰すとフェイルクローズが型の上で消える）
const FUNCTION_SECRET = Deno.env.get("VILLAGE_FUNCTION_SECRET");
const USER_ID = Deno.env.get("VILLAGE_USER_ID");

// PostgREST の1回あたり取得件数。全期間を読むので上限で黙って切れないようページングする。
const PAGE_SIZE = 1000;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

// 今日の日付（Asia/Tokyo）。transactions.date は JST 前提の date 型。
function todayInTokyo(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// 全期間の取引をページングして取得する。
// 🔴 次ページへ進む幅は「要求件数」ではなく「実際に返ってきた件数」にする。
//    サーバ側の最大行数が PAGE_SIZE より小さいと、要求件数と比べる終了判定では
//    1ページ目で打ち切られ、累積が黙って過少になる。空ページで終わる形にすれば
//    上限がいくつでも正しく全件読む。
async function fetchAllTransactions(userId: string): Promise<VillageTxRow[]> {
  const rows: VillageTxRow[] = [];
  for (let from = 0; ; ) {
    const { data, error } = await admin
      .from("transactions")
      .select("date, type, amount, goal_id")
      .eq("user_id", userId)
      // ⚠ ページング中の並びは一意に定める。date だけだと同日の行の順序が
      //    ページ間で揺れ、取りこぼしと重複が起きる。
      .order("date", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const page = (data ?? []) as VillageTxRow[];
    if (page.length === 0) return rows;
    rows.push(...page);
    from += page.length;
  }
}

Deno.serve(async (req) => {
  // ① 入口の判定（テスト済み）
  const guard = guardRequest({
    method: req.method,
    secretHeader: req.headers.get("x-village-secret"),
    configuredSecret: FUNCTION_SECRET,
    userId: USER_ID,
  });
  if (!guard.ok) {
    return new Response(guard.body, { status: guard.status });
  }
  const userId = USER_ID!; // guard を通った時点で設定済み

  try {
    const [transactions, budgetsRes, goalsRes] = await Promise.all([
      fetchAllTransactions(userId),
      admin.from("budgets").select("amount").eq("user_id", userId),
      admin
        .from("savings_goals")
        .select("id, target_amount")
        .eq("user_id", userId),
    ]);
    if (budgetsRes.error) throw new Error(budgetsRes.error.message);
    if (goalsRes.error) throw new Error(goalsRes.error.message);

    // ③ 集計はテスト済みの純粋関数へ
    const summary = buildVillageSummary(
      {
        transactions,
        budgetAmounts: (budgetsRes.data ?? []).map(
          (b: { amount: number }) => b.amount
        ),
        savingsGoals: goalsRes.data ?? [],
      },
      todayInTokyo()
    );

    return json({ generatedAt: new Date().toISOString(), ...summary });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
