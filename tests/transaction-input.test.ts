import { describe, expect, it } from "vitest";
import {
  parseTransactionInput,
  type RawTxInput,
} from "@/lib/transaction-input";

// 妥当な入力のベース
const base: RawTxInput = {
  type: "expense",
  date: "2026-06-17",
  category_id: "cat-1",
  amount: "1200",
  memo: "ランチ",
};

describe("parseTransactionInput", () => {
  it("妥当な入力を検証済みの値に変換する", () => {
    const r = parseTransactionInput(base);
    expect(r).toEqual({
      ok: true,
      value: {
        type: "expense",
        date: "2026-06-17",
        category_id: "cat-1",
        amount: 1200,
        memo: "ランチ",
      },
    });
  });

  it("メモ未入力は null になる", () => {
    const r = parseTransactionInput({ ...base, memo: "   " });
    expect(r.ok && r.value.memo).toBeNull();
  });

  it("type が不正なら拒否", () => {
    const r = parseTransactionInput({ ...base, type: "xxx" });
    expect(r).toEqual({ ok: false, error: "収入/支出の区分が不正です。" });
  });

  it("日付形式が不正なら拒否", () => {
    expect(parseTransactionInput({ ...base, date: "2026/6/17" }).ok).toBe(false);
    expect(parseTransactionInput({ ...base, date: "" }).ok).toBe(false);
  });

  it("カテゴリ未選択なら拒否", () => {
    const r = parseTransactionInput({ ...base, category_id: "" });
    expect(r).toEqual({ ok: false, error: "カテゴリを選択してください。" });
  });

  it("金額が小数・記号・空なら拒否", () => {
    expect(parseTransactionInput({ ...base, amount: "12.5" }).ok).toBe(false);
    expect(parseTransactionInput({ ...base, amount: "1,000" }).ok).toBe(false);
    expect(parseTransactionInput({ ...base, amount: "-100" }).ok).toBe(false);
    expect(parseTransactionInput({ ...base, amount: "" }).ok).toBe(false);
    expect(parseTransactionInput({ ...base, amount: "abc" }).ok).toBe(false);
  });

  it("金額0は拒否（正の整数のみ）", () => {
    const r = parseTransactionInput({ ...base, amount: "0" });
    expect(r.ok).toBe(false);
  });

  it("収入区分も受け付ける", () => {
    const r = parseTransactionInput({ ...base, type: "income" });
    expect(r.ok && r.value.type).toBe("income");
  });
});
