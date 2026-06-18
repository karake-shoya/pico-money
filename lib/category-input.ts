// カテゴリ入力のバリデーション（純粋関数）。Server Action から分離し単体テスト可能にする。
import type { TxType } from '@/lib/types';

export type RawCategoryInput = {
  name: string;
  type: string;
};

export type ParsedCategoryInput = {
  name: string;
  type: TxType;
};

export type ParseCategoryResult =
  | { ok: true; value: ParsedCategoryInput }
  | { ok: false; error: string };

export function parseCategoryInput(raw: RawCategoryInput): ParseCategoryResult {
  const name = raw.name.trim();
  const { type } = raw;

  if (type !== 'income' && type !== 'expense') {
    return { ok: false, error: '収入/支出の区分が不正です。' };
  }
  if (!name) {
    return { ok: false, error: 'カテゴリ名を入力してください。' };
  }
  if (name.length > 20) {
    return { ok: false, error: 'カテゴリ名は20文字以内で入力してください。' };
  }

  return { ok: true, value: { name, type: type as TxType } };
}
