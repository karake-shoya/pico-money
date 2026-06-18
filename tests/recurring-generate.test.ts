import { describe, expect, test } from 'vitest';
import {
  lastDayOfMonth,
  clampDay,
  recurringDate,
  buildTransactions,
  type RecurringTemplate,
} from '@/lib/recurring-generate';

describe('lastDayOfMonth', () => {
  test('1月は31日', () => expect(lastDayOfMonth('2026-01')).toBe(31));
  test('2月（平年）は28日', () => expect(lastDayOfMonth('2026-02')).toBe(28));
  test('2月（閏年）は29日', () => expect(lastDayOfMonth('2024-02')).toBe(29));
  test('4月は30日', () => expect(lastDayOfMonth('2026-04')).toBe(30));
  test('12月は31日', () => expect(lastDayOfMonth('2026-12')).toBe(31));
});

describe('clampDay', () => {
  test('月末日以内はそのまま', () => expect(clampDay(15, '2026-02')).toBe(15));
  test('31日→2月は28日に丸める', () => expect(clampDay(31, '2026-02')).toBe(28));
  test('31日→4月は30日に丸める', () => expect(clampDay(31, '2026-04')).toBe(30));
  test('1日はどの月でも1', () => expect(clampDay(1, '2026-02')).toBe(1));
  test('閏年2月の29日はそのまま', () => expect(clampDay(29, '2024-02')).toBe(29));
});

describe('recurringDate', () => {
  test('通常の日付を生成', () => expect(recurringDate(25, '2026-06')).toBe('2026-06-25'));
  test('1桁日はゼロ埋め', () => expect(recurringDate(5, '2026-06')).toBe('2026-06-05'));
  test('31日→2月は月末に丸める', () => expect(recurringDate(31, '2026-02')).toBe('2026-02-28'));
});

describe('buildTransactions', () => {
  const templates: RecurringTemplate[] = [
    { id: 'r1', type: 'expense', category_id: 'c1', amount: 80000, memo: '家賃', day: 25 },
    { id: 'r2', type: 'expense', category_id: 'c2', amount: 1000, memo: null, day: 1 },
    { id: 'r3', type: 'income', category_id: 'c3', amount: 300000, memo: '給与', day: 25 },
  ];

  test('全テンプレートから取引を生成', () => {
    const result = buildTransactions(templates, new Set(), '2026-06');
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      type: 'expense',
      category_id: 'c1',
      amount: 80000,
      memo: '家賃',
      date: '2026-06-25',
      recurring_id: 'r1',
    });
  });

  test('生成済みテンプレートをスキップ', () => {
    const result = buildTransactions(templates, new Set(['r1', 'r3']), '2026-06');
    expect(result).toHaveLength(1);
    expect(result[0].recurring_id).toBe('r2');
  });

  test('全て生成済みなら空配列', () => {
    const result = buildTransactions(templates, new Set(['r1', 'r2', 'r3']), '2026-06');
    expect(result).toHaveLength(0);
  });

  test('テンプレートが空なら空配列', () => {
    const result = buildTransactions([], new Set(), '2026-06');
    expect(result).toHaveLength(0);
  });

  test('月末丸めが適用される', () => {
    const feb = buildTransactions(
      [{ id: 'r1', type: 'expense', category_id: 'c1', amount: 80000, memo: null, day: 31 }],
      new Set(),
      '2026-02',
    );
    expect(feb[0].date).toBe('2026-02-28');
  });
});
