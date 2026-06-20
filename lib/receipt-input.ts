// レシート読み取り結果の正規化（純粋関数）。Server Action から分離し単体テスト可能にする。
import type { Category } from "@/lib/types";

// Claude が返す生の抽出結果（型は信用せず unknown 寄りで受ける）。
export type RawReceiptResult = {
  amount?: number | string | null;
  date?: string | null;
  category_id?: string | null;
  store?: string | null;
  memo?: string | null;
};

// 取引フォームのプリフィル（新規入力の初期値）。レシートは支出固定。
export type ReceiptPrefill = {
  type: "expense";
  amount: number; // 0 = 金額未取得（フォーム側で未入力扱い）
  date: string; // YYYY-MM-DD
  category_id: string; // 未マッチ時は「未分類」のID（無ければ空）
  memo: string;
};

// 金額を正の整数に正規化する。通貨記号・カンマは除去し、小数は四捨五入。取れなければ 0。
function normalizeAmount(raw: unknown): number {
  if (typeof raw === "number") {
    return Number.isFinite(raw) && raw > 0 ? Math.round(raw) : 0;
  }
  if (typeof raw === "string") {
    // 記号・カンマ・空白を除いたうえで、小数を含む数値として解釈する
    // （桁の連結を避けるため [^\d] の一括除去はしない）。
    const cleaned = raw.replace(/[,\s¥￥円]/g, "");
    const n = Number.parseFloat(cleaned);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
  }
  return 0;
}

// 日付を YYYY-MM-DD に正規化する。形式不正・実在しない日付なら fallback（当日）。
function normalizeDate(raw: unknown, today: string): string {
  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    // ロールオーバー（例: 2026-02-30）を弾く。
    if (
      dt.getFullYear() === y &&
      dt.getMonth() === m - 1 &&
      dt.getDate() === d
    ) {
      return raw;
    }
  }
  return today;
}

// 抽出結果をフォーム用プリフィルへ正規化する。
// category_id が既存の支出カテゴリに一致しなければ「未分類」へフォールバックする。
export function normalizeReceipt(
  raw: RawReceiptResult,
  categories: Category[],
  today: string
): ReceiptPrefill {
  const expenseCats = categories.filter((c) => c.type === "expense");
  const unmatchedId = expenseCats.find((c) => c.name === "未分類")?.id ?? "";

  const rawCat = typeof raw.category_id === "string" ? raw.category_id : "";
  const matched = expenseCats.find((c) => c.id === rawCat);
  const category_id = matched ? matched.id : unmatchedId;

  // 店名（store）を優先し、品目メモ（memo）を補助として結合する。
  const store = typeof raw.store === "string" ? raw.store.trim() : "";
  const memoRaw = typeof raw.memo === "string" ? raw.memo.trim() : "";
  const memo = [store, memoRaw].filter(Boolean).join(" ").slice(0, 100);

  return {
    type: "expense",
    amount: normalizeAmount(raw.amount),
    date: normalizeDate(raw.date, today),
    category_id,
    memo,
  };
}
