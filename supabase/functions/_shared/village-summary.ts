// ポポルの村（poporu-village）へ渡す家計の集計（純粋関数）。
//
// 🔴 返すのは合計額と件数だけ。取引明細・カテゴリ名・メモ・目標名・目標 id は一切外へ出さない。
//    村は「量だけを見る面」なので、量以外を持たせない設計がそのまま漏洩対策になる。
//
// 🔴 Deno（Edge Function）から import するため、このファイルは Deno 固有 API も
//    パスエイリアス（@/）も使わない。lib/format.ts を参照できないため月送りは自前で持つが、
//    ズレは tests/village-summary.test.ts が lastNMonths と突き合わせて検出する。

// 推移として返す月数（村の詳細パネルは月粒度で最大12コマ）
const TREND_MONTHS = 12;

// 「直近30日」の窓（today を含む）
const RECENT_DAYS = 30;

export type VillageTxRow = {
  date: string; // YYYY-MM-DD（JST 前提の date 型）
  type: "income" | "expense";
  amount: number;
  goal_id: string | null; // 非 null = 目標への貯金（振替）
};

export type VillageSavingsGoal = {
  id: string;
  target_amount: number;
};

export type VillageInput = {
  transactions: VillageTxRow[];
  budgetAmounts: number[]; // budgets.amount のみ。カテゴリ名は運ばない
  savingsGoals: VillageSavingsGoal[];
};

export type VillageMonth = {
  month: string; // YYYY-MM
  income: number;
  expense: number; // 消費支出（貯金は含まない）
  savings: number; // 目標への貯金
};

export type VillageSummary = {
  today: string;
  record: {
    totalDays: number; // 記録した日数
    totalMonths: number; // 記録した月数
    last30Days: number; // 直近30日の記録日数
    lastDate: string | null; // 最終記録日（村の沈み判定）
  };
  monthly: VillageMonth[]; // 直近12ヶ月・古い順
  budget: {
    month: string;
    total: number; // 予算合計（未設定なら 0）
    spent: number; // 当月の消費支出
    monthsWithinBudget: number; // 予算内に収めた月数
    monthsMeasured: number; // 判定できた月数（分母）
  };
  savings: {
    goalCount: number;
    target: number; // 目標額の合計（未設定なら 0）
    saved: number; // 貯金済みの合計
  };
};

// YYYY-MM を delta ヶ月ずらす（負値で過去方向）。lib/format.ts の shiftMonth と同じ結果を返す。
function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const total = y * 12 + (m - 1) + delta;
  const year = Math.floor(total / 12);
  const monthIndex = total - year * 12; // 負の剰余を避ける
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

// YYYY-MM-DD を delta 日ずらす。UTC で計算し、実行環境のタイムゾーンに依存させない。
function shiftDate(date: string, delta: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d) + delta * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

export function buildVillageSummary(
  input: VillageInput,
  today: string
): VillageSummary {
  // 🔴 today より後の取引は捨てる。未来日付を最終記録日に採ると
  //    「今日記録した」ことになり、放置していても棟が沈まなくなる。
  const rows = input.transactions.filter((r) => r.date <= today);

  const currentMonth = today.slice(0, 7);
  const months: string[] = [];
  for (let i = TREND_MONTHS - 1; i >= 0; i--) {
    months.push(shiftMonth(currentMonth, -i));
  }

  const monthly = new Map<string, VillageMonth>();
  for (const month of months) {
    monthly.set(month, { month, income: 0, expense: 0, savings: 0 });
  }

  const goalIds = new Set(input.savingsGoals.map((g) => g.id));
  const recordedDays = new Set<string>();
  const recordedMonths = new Set<string>();
  // 消費支出を1件でも記録した月。予算の達成判定はこれを分母にする（下記）。
  const monthsWithSpending = new Set<string>();
  const windowStart = shiftDate(today, -(RECENT_DAYS - 1));
  const recentDays = new Set<string>();
  let lastDate: string | null = null;
  let saved = 0;

  for (const r of rows) {
    recordedDays.add(r.date);
    recordedMonths.add(r.date.slice(0, 7));
    if (r.date >= windowStart) recentDays.add(r.date);
    if (lastDate === null || r.date > lastDate) lastDate = r.date;

    // 目標への貯金は消費支出から分離する（lib/queries.ts の集計と判定基準を揃える）。
    const isSavings = r.type === "expense" && r.goal_id !== null;
    if (isSavings && goalIds.has(r.goal_id!)) saved += r.amount;
    if (r.type === "expense" && !isSavings) monthsWithSpending.add(r.date.slice(0, 7));

    const bucket = monthly.get(r.date.slice(0, 7));
    if (!bucket) continue; // 12ヶ月より古い取引は推移に載せない（累積には数える）
    if (r.type === "income") bucket.income += r.amount;
    else if (isSavings) bucket.savings += r.amount;
    else bucket.expense += r.amount;
  }

  const budgetTotal = input.budgetAmounts.reduce((sum, a) => sum + a, 0);

  // 予算の達成月は「確定した月」だけで数える。
  // ⚠ 当月は月途中なので除く（月末に超える月を先に達成として光らせない）。
  // 🔴 消費支出を記録しなかった月は除く。収入だけ記録して放置した月は消費が 0 になり、
  //    そのままだと「記録が途切れた月ほど予算を守った」と逆向きの嘘をつく。
  // ⚠ 予算が未設定なら分母を作らない（0/N の嘘を出さない）。
  let monthsMeasured = 0;
  let monthsWithinBudget = 0;
  if (budgetTotal > 0) {
    for (const month of months) {
      if (month === currentMonth) continue;
      if (!monthsWithSpending.has(month)) continue;
      monthsMeasured++;
      if (monthly.get(month)!.expense <= budgetTotal) monthsWithinBudget++;
    }
  }

  return {
    today,
    record: {
      totalDays: recordedDays.size,
      totalMonths: recordedMonths.size,
      last30Days: recentDays.size,
      lastDate,
    },
    monthly: months.map((m) => monthly.get(m)!),
    budget: {
      month: currentMonth,
      total: budgetTotal,
      spent: monthly.get(currentMonth)!.expense,
      monthsWithinBudget,
      monthsMeasured,
    },
    savings: {
      goalCount: input.savingsGoals.length,
      target: input.savingsGoals.reduce((sum, g) => sum + g.target_amount, 0),
      saved,
    },
  };
}
