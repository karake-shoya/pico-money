import { describe, expect, it } from "vitest";
import { parseBudgetAmount } from "@/lib/budget-input";

describe("parseBudgetAmount", () => {
  it("空文字は 0（未設定）として扱う", () => {
    expect(parseBudgetAmount("")).toEqual({ ok: true, amount: 0 });
    expect(parseBudgetAmount("   ")).toEqual({ ok: true, amount: 0 });
  });

  it("正の整数を受け付ける", () => {
    expect(parseBudgetAmount("30000")).toEqual({ ok: true, amount: 30000 });
    expect(parseBudgetAmount("0")).toEqual({ ok: true, amount: 0 });
  });

  it("前後の空白を許容する", () => {
    expect(parseBudgetAmount(" 1200 ")).toEqual({ ok: true, amount: 1200 });
  });

  it("小数・カンマ・記号・マイナスは不可", () => {
    for (const bad of ["1000.5", "1,000", "¥1000", "-100", "1e3", "abc"]) {
      expect(parseBudgetAmount(bad).ok).toBe(false);
    }
  });
});
