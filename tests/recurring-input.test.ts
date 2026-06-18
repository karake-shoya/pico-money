import { describe, expect, test } from 'vitest';
import { parseRecurringInput, type RawRecurringInput } from '@/lib/recurring-input';

function input(overrides: Partial<RawRecurringInput> = {}): RawRecurringInput {
  return {
    type: 'expense',
    category_id: 'cat-1',
    amount: '10000',
    memo: '',
    day: '25',
    ...overrides,
  };
}

describe('parseRecurringInput', () => {
  test('正常な入力を受け付ける', () => {
    const result = parseRecurringInput(input());
    expect(result).toEqual({
      ok: true,
      value: {
        type: 'expense',
        category_id: 'cat-1',
        amount: 10000,
        memo: null,
        day: 25,
      },
    });
  });

  test('メモ付きの入力', () => {
    const result = parseRecurringInput(input({ memo: '家賃' }));
    expect(result).toEqual({
      ok: true,
      value: {
        type: 'expense',
        category_id: 'cat-1',
        amount: 10000,
        memo: '家賃',
        day: 25,
      },
    });
  });

  test('収入タイプを受け付ける', () => {
    const result = parseRecurringInput(input({ type: 'income' }));
    expect(result.ok).toBe(true);
  });

  test('不正なタイプを拒否', () => {
    const result = parseRecurringInput(input({ type: 'invalid' }));
    expect(result).toEqual({ ok: false, error: '収入/支出の区分が不正です。' });
  });

  test('カテゴリ未選択を拒否', () => {
    const result = parseRecurringInput(input({ category_id: '' }));
    expect(result).toEqual({ ok: false, error: 'カテゴリを選択してください。' });
  });

  test('金額0を拒否', () => {
    const result = parseRecurringInput(input({ amount: '0' }));
    expect(result).toEqual({ ok: false, error: '金額は1以上の整数で入力してください。' });
  });

  test('金額が非数値を拒否', () => {
    const result = parseRecurringInput(input({ amount: 'abc' }));
    expect(result).toEqual({ ok: false, error: '金額は正の整数で入力してください。' });
  });

  test('日付0を拒否', () => {
    const result = parseRecurringInput(input({ day: '0' }));
    expect(result).toEqual({ ok: false, error: '日付は1〜31の範囲で入力してください。' });
  });

  test('日付32を拒否', () => {
    const result = parseRecurringInput(input({ day: '32' }));
    expect(result).toEqual({ ok: false, error: '日付は1〜31の範囲で入力してください。' });
  });

  test('日付が非数値を拒否', () => {
    const result = parseRecurringInput(input({ day: 'abc' }));
    expect(result).toEqual({ ok: false, error: '日付を選択してください。' });
  });

  test('日付1と31の境界値を受け付ける', () => {
    expect(parseRecurringInput(input({ day: '1' })).ok).toBe(true);
    expect(parseRecurringInput(input({ day: '31' })).ok).toBe(true);
  });

  test('メモの前後空白をトリムする', () => {
    const result = parseRecurringInput(input({ memo: '  家賃  ' }));
    expect(result.ok && result.value.memo).toBe('家賃');
  });

  test('空白のみのメモはnullになる', () => {
    const result = parseRecurringInput(input({ memo: '   ' }));
    expect(result.ok && result.value.memo).toBeNull();
  });
});
