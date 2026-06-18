// 予算入力のバリデーション（純粋関数）。Server Action から分離し単体テスト可能にする。

export type ParseBudgetResult =
  | { ok: true; amount: number } // 0 = 予算なし（削除）, 正 = 設定
  | { ok: false; error: string };

// 予算額の文字列を検証する。非負整数のみ（空文字は 0=未設定として扱う）。
// 小数・カンマ・記号・マイナスは不可。
export function parseBudgetAmount(raw: string): ParseBudgetResult {
  const trimmed = raw.trim();
  if (trimmed === "") return { ok: true, amount: 0 };
  if (!/^\d+$/.test(trimmed)) {
    return { ok: false, error: "予算は0以上の整数で入力してください。" };
  }
  const amount = Number(trimmed);
  if (!Number.isInteger(amount) || amount < 0) {
    return { ok: false, error: "予算は0以上の整数で入力してください。" };
  }
  return { ok: true, amount };
}
