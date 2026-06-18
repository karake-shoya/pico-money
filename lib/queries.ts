// サーバー側のデータ取得・集計（RLS により自動的に自分のデータのみ対象）
import { unstable_cache } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAnonClient } from '@/lib/supabase/anon';
import { monthRange } from '@/lib/format';
import {
  aggregateCategoryBreakdown,
  aggregateMonthlySummaries,
  summarize,
  type CategoryRow,
} from '@/lib/summary';
import type {
  Budget,
  Category,
  CategorySlice,
  MonthlySummary,
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

// 月次サマリー（収入 / 支出 / 収支 / 貯蓄率）
export async function getMonthlySummary(
  month: string
): Promise<MonthlySummary> {
  const supabase = await createClient();
  const { start, end } = monthRange(month);
  const { data, error } = await supabase
    .from('transactions')
    .select('type, amount')
    .gte('date', start)
    .lt('date', end);
  if (error) throw error;
  return summarize(data ?? []);
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

// カテゴリ別内訳（円グラフ用）。選択月・指定 type の合計を金額降順で。
export async function getCategoryBreakdown(
  month: string,
  type: TxType
): Promise<CategorySlice[]> {
  const supabase = await createClient();
  const { start, end } = monthRange(month);
  const { data, error } = await supabase
    .from('transactions')
    .select('amount, category:categories(id, name, icon, sort_order)')
    .eq('type', type)
    .gte('date', start)
    .lt('date', end);
  if (error) throw error;

  return aggregateCategoryBreakdown((data ?? []) as unknown as CategoryRow[]);
}
