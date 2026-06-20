import { describe, expect, it } from "vitest";
import { normalizeReceipt } from "@/lib/receipt-input";
import type { Category } from "@/lib/types";

// テスト用カテゴリ（支出 + 未分類 + 収入を1つ）
const cats: Category[] = [
  cat("c-food", "食費", "expense"),
  cat("c-home", "住居費", "expense"),
  cat("c-unc", "未分類", "expense"),
  cat("c-salary", "給与", "income"),
];

function cat(id: string, name: string, type: "income" | "expense"): Category {
  return {
    id,
    user_id: null,
    name,
    type,
    icon: null,
    sort_order: 1,
    is_default: true,
    created_at: "2026-01-01T00:00:00Z",
  };
}

const TODAY = "2026-06-20";

describe("normalizeReceipt", () => {
  it("妥当な抽出結果をプリフィルへ変換する", () => {
    const r = normalizeReceipt(
      { amount: 1280, date: "2026-06-18", category_id: "c-food", store: "スーパー", memo: "牛乳" },
      cats,
      TODAY
    );
    expect(r).toEqual({
      type: "expense",
      amount: 1280,
      date: "2026-06-18",
      category_id: "c-food",
      memo: "スーパー 牛乳",
    });
  });

  it("金額の記号・カンマ・小数を除去して整数化する", () => {
    expect(normalizeReceipt({ amount: "¥1,280" }, cats, TODAY).amount).toBe(1280);
    expect(normalizeReceipt({ amount: "1280円" }, cats, TODAY).amount).toBe(1280);
    expect(normalizeReceipt({ amount: "1280.0" }, cats, TODAY).amount).toBe(1280);
    expect(normalizeReceipt({ amount: 980.4 }, cats, TODAY).amount).toBe(980);
  });

  it("金額が取れない場合は 0 を返す", () => {
    expect(normalizeReceipt({ amount: null }, cats, TODAY).amount).toBe(0);
    expect(normalizeReceipt({ amount: "—" }, cats, TODAY).amount).toBe(0);
    expect(normalizeReceipt({}, cats, TODAY).amount).toBe(0);
  });

  it("不正な日付は当日にフォールバックする", () => {
    expect(normalizeReceipt({ date: "2026/06/18" }, cats, TODAY).date).toBe(TODAY);
    expect(normalizeReceipt({ date: "2026-02-30" }, cats, TODAY).date).toBe(TODAY);
    expect(normalizeReceipt({ date: null }, cats, TODAY).date).toBe(TODAY);
  });

  it("未マッチ・unmatched・存在しないIDは未分類へフォールバックする", () => {
    expect(normalizeReceipt({ category_id: "unmatched" }, cats, TODAY).category_id).toBe("c-unc");
    expect(normalizeReceipt({ category_id: "no-such" }, cats, TODAY).category_id).toBe("c-unc");
    expect(normalizeReceipt({ category_id: null }, cats, TODAY).category_id).toBe("c-unc");
    // 収入カテゴリのIDを返してきても支出カテゴリ外なので未分類
    expect(normalizeReceipt({ category_id: "c-salary" }, cats, TODAY).category_id).toBe("c-unc");
  });

  it("未分類カテゴリが無ければ category_id は空", () => {
    const noUnc = cats.filter((c) => c.name !== "未分類");
    expect(normalizeReceipt({ category_id: "no-such" }, noUnc, TODAY).category_id).toBe("");
  });
});
