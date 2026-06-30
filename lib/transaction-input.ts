// 取引入力のバリデーション（純粋関数）。Server Action から分離し単体テスト可能にする。
import type { TxType } from "@/lib/types";

// FormData から取り出した生の文字列フィールド
export type RawTxInput = {
  type: string;
  date: string;
  category_id: string;
  amount: string;
  memo: string;
  goal_id?: string; // 目標への貯金時のみ。空文字/未指定は通常の取引。
};

// 検証済みの取引入力
export type ParsedTxInput = {
  type: TxType;
  date: string;
  category_id: string;
  amount: number;
  memo: string | null;
  goal_id: string | null;
};

export type ParseResult =
  | { ok: true; value: ParsedTxInput }
  | { ok: false; error: string };

// 取引入力を検証する。金額は正の整数のみ（小数・カンマ・記号は不可）。
export function parseTransactionInput(raw: RawTxInput): ParseResult {
  const type = raw.type;
  const date = raw.date;
  const category_id = raw.category_id;
  const amountRaw = raw.amount;
  const memo = raw.memo.trim();
  const goal_id = raw.goal_id?.trim() ? raw.goal_id.trim() : null;

  if (type !== "income" && type !== "expense") {
    return { ok: false, error: "収入/支出の区分が不正です。" };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, error: "日付を入力してください。" };
  }
  if (!category_id) {
    return { ok: false, error: "カテゴリを選択してください。" };
  }
  if (!/^\d+$/.test(amountRaw)) {
    return { ok: false, error: "金額は正の整数で入力してください。" };
  }
  const amount = Number(amountRaw);
  if (!Number.isInteger(amount) || amount <= 0) {
    return { ok: false, error: "金額は1以上の整数で入力してください。" };
  }

  return {
    ok: true,
    value: {
      type,
      date,
      category_id,
      amount,
      memo: memo === "" ? null : memo,
      goal_id,
    },
  };
}
