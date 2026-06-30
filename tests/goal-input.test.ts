import { describe, expect, it } from "vitest";
import { parseGoalInput } from "@/lib/goal-input";

describe("parseGoalInput", () => {
  it("正常な入力を検証して返す（期限あり）", () => {
    expect(
      parseGoalInput({ name: "旅行", target_amount: "300000", deadline: "2026-12-31" })
    ).toEqual({
      ok: true,
      value: { name: "旅行", target_amount: 300000, deadline: "2026-12-31" },
    });
  });
  it("期限は任意（空文字は null）", () => {
    const r = parseGoalInput({ name: "緊急資金", target_amount: "100000", deadline: "" });
    expect(r).toEqual({
      ok: true,
      value: { name: "緊急資金", target_amount: 100000, deadline: null },
    });
  });
  it("名前は前後の空白を除去する", () => {
    const r = parseGoalInput({ name: "  車  ", target_amount: "500000", deadline: "" });
    expect(r.ok && r.value.name).toBe("車");
  });
  it("名前が空ならエラー", () => {
    expect(parseGoalInput({ name: "  ", target_amount: "1000", deadline: "" }).ok).toBe(false);
  });
  it("名前が20文字超ならエラー", () => {
    const r = parseGoalInput({ name: "あ".repeat(21), target_amount: "1000", deadline: "" });
    expect(r.ok).toBe(false);
  });
  it("目標額が0・負・非整数ならエラー", () => {
    expect(parseGoalInput({ name: "x", target_amount: "0", deadline: "" }).ok).toBe(false);
    expect(parseGoalInput({ name: "x", target_amount: "-100", deadline: "" }).ok).toBe(false);
    expect(parseGoalInput({ name: "x", target_amount: "1000.5", deadline: "" }).ok).toBe(false);
    expect(parseGoalInput({ name: "x", target_amount: "1,000", deadline: "" }).ok).toBe(false);
  });
  it("期限の形式が不正ならエラー", () => {
    expect(parseGoalInput({ name: "x", target_amount: "1000", deadline: "2026/12/31" }).ok).toBe(false);
  });
});
