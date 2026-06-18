import { describe, expect, test } from 'vitest';
import { parseCategoryInput, type RawCategoryInput } from '@/lib/category-input';

function input(overrides: Partial<RawCategoryInput> = {}): RawCategoryInput {
  return {
    name: '交際費',
    type: 'expense',
    ...overrides,
  };
}

describe('parseCategoryInput', () => {
  test('正常な支出カテゴリを受け付ける', () => {
    const result = parseCategoryInput(input());
    expect(result).toEqual({
      ok: true,
      value: { name: '交際費', type: 'expense' },
    });
  });

  test('正常な収入カテゴリを受け付ける', () => {
    const result = parseCategoryInput(input({ name: '副収入', type: 'income' }));
    expect(result).toEqual({
      ok: true,
      value: { name: '副収入', type: 'income' },
    });
  });

  test('不正なタイプを拒否', () => {
    const result = parseCategoryInput(input({ type: 'invalid' }));
    expect(result).toEqual({ ok: false, error: '収入/支出の区分が不正です。' });
  });

  test('空のカテゴリ名を拒否', () => {
    const result = parseCategoryInput(input({ name: '' }));
    expect(result).toEqual({ ok: false, error: 'カテゴリ名を入力してください。' });
  });

  test('空白のみのカテゴリ名を拒否', () => {
    const result = parseCategoryInput(input({ name: '   ' }));
    expect(result).toEqual({ ok: false, error: 'カテゴリ名を入力してください。' });
  });

  test('21文字以上のカテゴリ名を拒否', () => {
    const result = parseCategoryInput(input({ name: 'あ'.repeat(21) }));
    expect(result).toEqual({ ok: false, error: 'カテゴリ名は20文字以内で入力してください。' });
  });

  test('20文字ちょうどのカテゴリ名を受け付ける', () => {
    const result = parseCategoryInput(input({ name: 'あ'.repeat(20) }));
    expect(result.ok).toBe(true);
  });

  test('前後の空白をトリムする', () => {
    const result = parseCategoryInput(input({ name: '  交際費  ' }));
    expect(result.ok && result.value.name).toBe('交際費');
  });
});
