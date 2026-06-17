import { describe, expect, it } from "vitest";
import {
  aggregateCategoryBreakdown,
  aggregateMonthlyBars,
  aggregateMonthlySummaries,
  summarize,
  type CategoryRow,
  type DatedRow,
} from "@/lib/summary";

describe("summarize", () => {
  it("収入・支出・収支・貯蓄率を集計する", () => {
    const result = summarize([
      { type: "income", amount: 300000 },
      { type: "income", amount: 50000 },
      { type: "expense", amount: 140000 },
    ]);
    expect(result).toEqual({
      income: 350000,
      expense: 140000,
      balance: 210000,
      savingsRate: 60, // 210000 / 350000 = 60%
    });
  });
  it("収入0なら貯蓄率は0", () => {
    expect(summarize([{ type: "expense", amount: 1000 }])).toEqual({
      income: 0,
      expense: 1000,
      balance: -1000,
      savingsRate: 0,
    });
  });
  it("支出超過なら貯蓄率は負", () => {
    const r = summarize([
      { type: "income", amount: 100 },
      { type: "expense", amount: 200 },
    ]);
    expect(r.balance).toBe(-100);
    expect(r.savingsRate).toBe(-100);
  });
  it("空配列はすべて0", () => {
    expect(summarize([])).toEqual({
      income: 0,
      expense: 0,
      balance: 0,
      savingsRate: 0,
    });
  });
});

describe("aggregateMonthlyBars", () => {
  const months = ["2026-05", "2026-06"];
  it("月ごとに収入・支出を割り当てる", () => {
    const rows: DatedRow[] = [
      { date: "2026-05-10", type: "income", amount: 1000 },
      { date: "2026-05-20", type: "expense", amount: 400 },
      { date: "2026-06-01", type: "expense", amount: 700 },
    ];
    expect(aggregateMonthlyBars(rows, months)).toEqual([
      { month: "2026-05", income: 1000, expense: 400 },
      { month: "2026-06", income: 0, expense: 700 },
    ]);
  });
  it("対象月リスト外の行は無視する", () => {
    const rows: DatedRow[] = [
      { date: "2026-04-30", type: "income", amount: 9999 },
    ];
    expect(aggregateMonthlyBars(rows, months)).toEqual([
      { month: "2026-05", income: 0, expense: 0 },
      { month: "2026-06", income: 0, expense: 0 },
    ]);
  });
});

describe("aggregateMonthlySummaries", () => {
  const months = ["2026-05", "2026-06"];
  it("月ごとに収入/支出/収支/貯蓄率を算出する", () => {
    const rows: DatedRow[] = [
      { date: "2026-05-10", type: "income", amount: 1000 },
      { date: "2026-05-20", type: "expense", amount: 400 },
      { date: "2026-06-01", type: "expense", amount: 700 },
    ];
    expect(aggregateMonthlySummaries(rows, months)).toEqual({
      "2026-05": { income: 1000, expense: 400, balance: 600, savingsRate: 60 },
      "2026-06": { income: 0, expense: 700, balance: -700, savingsRate: 0 },
    });
  });
  it("対象月リスト外の行は無視し、データの無い月は0で埋める", () => {
    const rows: DatedRow[] = [
      { date: "2026-04-30", type: "income", amount: 9999 },
    ];
    expect(aggregateMonthlySummaries(rows, months)).toEqual({
      "2026-05": { income: 0, expense: 0, balance: 0, savingsRate: 0 },
      "2026-06": { income: 0, expense: 0, balance: 0, savingsRate: 0 },
    });
  });
});

describe("aggregateCategoryBreakdown", () => {
  it("カテゴリ別に合算し金額降順で返す", () => {
    const rows: CategoryRow[] = [
      { amount: 300, category: { id: "a", name: "食費", icon: "🍜" } },
      { amount: 700, category: { id: "b", name: "娯楽", icon: "🎮" } },
      { amount: 200, category: { id: "a", name: "食費", icon: "🍜" } },
    ];
    expect(aggregateCategoryBreakdown(rows)).toEqual([
      { categoryId: "b", name: "娯楽", icon: "🎮", amount: 700 },
      { categoryId: "a", name: "食費", icon: "🍜", amount: 500 },
    ]);
  });
  it("category が null の行は不明としてまとめる", () => {
    const rows: CategoryRow[] = [{ amount: 100, category: null }];
    expect(aggregateCategoryBreakdown(rows)).toEqual([
      { categoryId: "unknown", name: "不明", icon: null, amount: 100 },
    ]);
  });
});
