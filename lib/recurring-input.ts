// 固定費入力のバリデーション（純粋関数）。Server Action から分離し単体テスト可能にする。
import type { TxType } from '@/lib/types';

export type RawRecurringInput = {
  type: string;
  category_id: string;
  amount: string;
  memo: string;
  day: string;
};

export type ParsedRecurringInput = {
  type: TxType;
  category_id: string;
  amount: number;
  memo: string | null;
  day: number;
};

export type ParseRecurringResult =
  | { ok: true; value: ParsedRecurringInput }
  | { ok: false; error: string };

export function parseRecurringInput(raw: RawRecurringInput): ParseRecurringResult {
  const { type, category_id, memo: rawMemo } = raw;
  const memo = rawMemo.trim();

  if (type !== 'income' && type !== 'expense') {
    return { ok: false, error: '収入/支出の区分が不正です。' };
  }
  if (!category_id) {
    return { ok: false, error: 'カテゴリを選択してください。' };
  }
  if (!/^\d+$/.test(raw.amount)) {
    return { ok: false, error: '金額は正の整数で入力してください。' };
  }
  const amount = Number(raw.amount);
  if (!Number.isInteger(amount) || amount <= 0) {
    return { ok: false, error: '金額は1以上の整数で入力してください。' };
  }
  if (!/^\d+$/.test(raw.day)) {
    return { ok: false, error: '日付を選択してください。' };
  }
  const day = Number(raw.day);
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    return { ok: false, error: '日付は1〜31の範囲で入力してください。' };
  }

  return {
    ok: true,
    value: {
      type: type as TxType,
      category_id,
      amount,
      memo: memo === '' ? null : memo,
      day,
    },
  };
}
