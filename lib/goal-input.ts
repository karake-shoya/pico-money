// 貯金目標入力のバリデーション（純粋関数）。Server Action から分離し単体テスト可能にする。

// FormData から取り出した生の文字列フィールド
export type RawGoalInput = {
  name: string;
  target_amount: string;
  deadline: string; // 空文字 = 期限なし
};

// 検証済みの目標入力
export type ParsedGoalInput = {
  name: string;
  target_amount: number;
  deadline: string | null;
};

export type ParseGoalResult =
  | { ok: true; value: ParsedGoalInput }
  | { ok: false; error: string };

// 目標入力を検証する。名前必須（20文字以内）・目標額は正の整数・期限は任意の YYYY-MM-DD。
export function parseGoalInput(raw: RawGoalInput): ParseGoalResult {
  const name = raw.name.trim();
  const amountRaw = raw.target_amount.trim();
  const deadline = raw.deadline.trim();

  if (!name) {
    return { ok: false, error: "目標名を入力してください。" };
  }
  if (name.length > 20) {
    return { ok: false, error: "目標名は20文字以内で入力してください。" };
  }
  if (!/^\d+$/.test(amountRaw)) {
    return { ok: false, error: "目標額は正の整数で入力してください。" };
  }
  const target_amount = Number(amountRaw);
  if (!Number.isInteger(target_amount) || target_amount <= 0) {
    return { ok: false, error: "目標額は1以上の整数で入力してください。" };
  }
  if (deadline !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
    return { ok: false, error: "期限の日付が不正です。" };
  }

  return {
    ok: true,
    value: { name, target_amount, deadline: deadline === "" ? null : deadline },
  };
}
