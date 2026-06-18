// 固定費テンプレートから当月分の取引を自動生成する純粋ロジック。
// DB アクセスは呼び出し側（Server Action）で行い、ここではデータ変換のみ担う。

// 指定月の末日を返す（例: '2026-02' → 28）
export function lastDayOfMonth(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

// テンプレートの day を指定月の実在日に丸める（例: day=31, month='2026-02' → 28）
export function clampDay(day: number, month: string): number {
  return Math.min(day, lastDayOfMonth(month));
}

// テンプレートの day と month から YYYY-MM-DD を生成する
export function recurringDate(day: number, month: string): string {
  const clamped = clampDay(day, month);
  return `${month}-${String(clamped).padStart(2, '0')}`;
}

export type RecurringTemplate = {
  id: string;
  type: 'income' | 'expense';
  category_id: string;
  amount: number;
  memo: string | null;
  day: number;
};

export type GeneratedTransaction = {
  type: string;
  category_id: string;
  amount: number;
  memo: string | null;
  date: string;
  recurring_id: string;
};

// 未生成のテンプレートから取引データを生成する
export function buildTransactions(
  templates: RecurringTemplate[],
  alreadyGeneratedIds: Set<string>,
  month: string,
): GeneratedTransaction[] {
  return templates
    .filter((t) => !alreadyGeneratedIds.has(t.id))
    .map((t) => ({
      type: t.type,
      category_id: t.category_id,
      amount: t.amount,
      memo: t.memo,
      date: recurringDate(t.day, month),
      recurring_id: t.id,
    }));
}
