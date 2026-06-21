// サーバー側のデータ取得・集計（RLS により自動的に自分のデータのみ対象）
import { unstable_cache } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAnonClient } from '@/lib/supabase/anon';
import { monthRange, shiftMonth, shiftWeek, weekRange } from '@/lib/format';
import {
  aggregateCategoryBreakdown,
  aggregateMonthlySummaries,
  buildMonthlyReport,
  summarize,
  type CategoryRow,
} from '@/lib/summary';
import type {
  Budget,
  Category,
  CategorySlice,
  MonthlyReport,
  MonthlySummary,
  PushSubscriptionRow,
  RecurringWithCategory,
  TransactionSearchFilters,
  TransactionWithCategory,
  TxType,
} from '@/lib/types';

// 共通カテゴリ（user_id IS NULL・全ユーザー共通・事実上不変）はキャッシュする。
// 匿名クライアントで取得するため cookies に依存せず unstable_cache に乗せられる。
// カテゴリ構成を変えた場合は revalidateTag('categories') で破棄する。
const getCommonCategories = unstable_cache(
  async (): Promise<Category[]> => {
    const supabase = createAnonClient();
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .is('user_id', null)
      .order('type', { ascending: true })
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return (data ?? []) as Category[];
  },
  ['common-categories'],
  { tags: ['categories'], revalidate: 3600 }
);

// 表示可能なカテゴリ一覧（共通＝キャッシュ＋自分定義＝RLS取得）。type, sort_order 順。
export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const [common, userRes] = await Promise.all([
    getCommonCategories(),
    supabase
      .from('categories')
      .select('*')
      .not('user_id', 'is', null)
      .order('type', { ascending: true })
      .order('sort_order', { ascending: true }),
  ]);
  if (userRes.error) throw userRes.error;
  const userCats = (userRes.data ?? []) as Category[];
  // DB 側の一括ソート（type 昇順 → sort_order 昇順）をマージ後に再現する。
  return [...common, ...userCats].sort((a, b) =>
    a.type === b.type ? a.sort_order - b.sort_order : a.type < b.type ? -1 : 1
  );
}

// カテゴリ別の月予算（本人分）。毎月共通のためフィルタ不要。
export async function getBudgets(): Promise<Budget[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('budgets').select('*');
  if (error) throw error;
  return (data ?? []) as Budget[];
}

// 指定月の取引（日付降順）。カテゴリ情報を結合。
export async function getTransactionsForMonth(
  month: string
): Promise<TransactionWithCategory[]> {
  const supabase = await createClient();
  const { start, end } = monthRange(month);
  const { data, error } = await supabase
    .from('transactions')
    .select('*, category:categories(id, name, icon, type, sort_order)')
    .gte('date', start)
    .lt('date', end)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as TransactionWithCategory[];
}

// 取引の横断検索（月に縛られない全期間）。指定されたフィルタのみ AND で適用。
// RLS により本人分のみが対象。安全のため最大 500 件に制限する。
export async function searchTransactions(
  filters: TransactionSearchFilters
): Promise<TransactionWithCategory[]> {
  const supabase = await createClient();
  let query = supabase
    .from('transactions')
    .select('*, category:categories(id, name, icon, type, sort_order)');

  const keyword = filters.keyword?.trim();
  if (keyword) {
    // % と _ は LIKE のワイルドカードなのでエスケープしてから部分一致。
    const escaped = keyword.replace(/[\\%_]/g, (c) => `\\${c}`);
    query = query.ilike('memo', `%${escaped}%`);
  }
  if (filters.type) query = query.eq('type', filters.type);
  if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
  if (filters.dateFrom) query = query.gte('date', filters.dateFrom);
  if (filters.dateTo) query = query.lte('date', filters.dateTo);
  if (filters.amountMin != null) query = query.gte('amount', filters.amountMin);
  if (filters.amountMax != null) query = query.lte('amount', filters.amountMax);

  const { data, error } = await query
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as unknown as TransactionWithCategory[];
}

// 任意期間 [start, end) の収支サマリー（収入 / 支出 / 収支 / 貯蓄率）。
async function summaryForRange(
  start: string,
  end: string
): Promise<MonthlySummary> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('transactions')
    .select('type, amount')
    .gte('date', start)
    .lt('date', end);
  if (error) throw error;
  return summarize(data ?? []);
}

// 月次サマリー（収入 / 支出 / 収支 / 貯蓄率）
export async function getMonthlySummary(
  month: string
): Promise<MonthlySummary> {
  const { start, end } = monthRange(month);
  return summaryForRange(start, end);
}

// 指定月リストを覆う期間の取引（date, type, amount）を1クエリで取得する共通処理。
async function fetchDatedRows(months: string[]) {
  const supabase = await createClient();
  const { start } = monthRange(months[0]);
  const { end } = monthRange(months[months.length - 1]);
  const { data, error } = await supabase
    .from('transactions')
    .select('date, type, amount')
    .gte('date', start)
    .lt('date', end);
  if (error) throw error;
  return data ?? [];
}

// 指定月リストそれぞれの月次サマリーをまとめて取得。ホームのカルーセル先読み用。
export async function getMonthlySummaries(
  months: string[]
): Promise<Record<string, MonthlySummary>> {
  return aggregateMonthlySummaries(await fetchDatedRows(months), months);
}

// 固定費テンプレート一覧（カテゴリ結合）。日付順。
export async function getRecurringTransactions(): Promise<RecurringWithCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('recurring_transactions')
    .select('*, category:categories(id, name, icon, type, sort_order)')
    .order('day', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as RecurringWithCategory[];
}

// 本人の Web Push 購読（最新1件）。リマインダー設定 UI の初期表示用。
// 端末ごとに endpoint が異なるため厳密には端末別だが、設定画面では
// 「直近に登録した購読」を代表として時刻・有効状態を表示する。
export async function getMyPushSubscription(): Promise<PushSubscriptionRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as PushSubscriptionRow | null;
}

// 任意期間 [start, end) のカテゴリ別内訳（指定 type）。
async function categoryBreakdownForRange(
  start: string,
  end: string,
  type: TxType
): Promise<CategorySlice[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('transactions')
    .select('amount, category:categories(id, name, icon, sort_order)')
    .eq('type', type)
    .gte('date', start)
    .lt('date', end);
  if (error) throw error;

  return aggregateCategoryBreakdown((data ?? []) as unknown as CategoryRow[]);
}

// カテゴリ別内訳（円グラフ用）。選択月・指定 type の合計を金額降順で。
export async function getCategoryBreakdown(
  month: string,
  type: TxType
): Promise<CategorySlice[]> {
  const { start, end } = monthRange(month);
  return categoryBreakdownForRange(start, end, type);
}

// 月次振り返りレポート（指定月の実績まとめ・前月比・支出上位・予算超過）。
// 当月/前月のサマリー、当月の支出内訳、カテゴリ別予算をまとめて取得し集計する。
export async function getMonthlyReport(month: string): Promise<MonthlyReport> {
  const prev = shiftMonth(month, -1);
  const [current, previous, expenseByCategory, budgets] = await Promise.all([
    getMonthlySummary(month),
    getMonthlySummary(prev),
    getCategoryBreakdown(month, 'expense'),
    getBudgets(),
  ]);
  // categoryId → 予算額のマップ。
  const budgetByCategory: Record<string, number> = {};
  for (const b of budgets) budgetByCategory[b.category_id] = b.amount;

  return buildMonthlyReport(current, previous, expenseByCategory, budgetByCategory);
}

// 週次振り返りレポート（週は月曜始まり・weekStart は 'YYYY-MM-DD'）。
// 予算は月次のため週次では扱わない（buildMonthlyReport に空の予算を渡し overBudget は空になる）。
export async function getWeeklyReport(weekStart: string): Promise<MonthlyReport> {
  const cur = weekRange(weekStart);
  const prevWeek = weekRange(shiftWeek(weekStart, -1));
  const [current, previous, expenseByCategory] = await Promise.all([
    summaryForRange(cur.start, cur.end),
    summaryForRange(prevWeek.start, prevWeek.end),
    categoryBreakdownForRange(cur.start, cur.end, 'expense'),
  ]);

  return buildMonthlyReport(current, previous, expenseByCategory, {});
}
