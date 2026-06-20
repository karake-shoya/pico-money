import { describe, expect, it } from "vitest";
import {
  dateLabel,
  daysInMonth,
  formatSignedYen,
  formatYen,
  lastNMonths,
  monthLabel,
  monthRange,
  normalizeMonth,
  shiftMonth,
} from "@/lib/format";

describe("formatYen", () => {
  it("3桁区切りの円表記にする", () => {
    expect(formatYen(1234567)).toBe("¥1,234,567");
  });
  it("負数も絶対値で表記する（符号は付けない）", () => {
    expect(formatYen(-500)).toBe("¥500");
  });
  it("0は¥0", () => {
    expect(formatYen(0)).toBe("¥0");
  });
});

describe("formatSignedYen", () => {
  it("正は + を付ける", () => {
    expect(formatSignedYen(1000)).toBe("+¥1,000");
  });
  it("負は - を付ける", () => {
    expect(formatSignedYen(-1000)).toBe("-¥1,000");
  });
  it("0は符号なし", () => {
    expect(formatSignedYen(0)).toBe("¥0");
  });
});

describe("normalizeMonth", () => {
  it("妥当な YYYY-MM はそのまま返す", () => {
    expect(normalizeMonth("2026-06")).toBe("2026-06");
  });
  it("不正な値は当月にフォールバックする", () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    expect(normalizeMonth("2026/6")).toBe(expected);
    expect(normalizeMonth(undefined)).toBe(expected);
    expect(normalizeMonth(null)).toBe(expected);
    expect(normalizeMonth("")).toBe(expected);
  });
});

describe("monthRange", () => {
  it("月初から翌月初までの半開区間を返す", () => {
    expect(monthRange("2026-06")).toEqual({
      start: "2026-06-01",
      end: "2026-07-01",
    });
  });
  it("12月は翌年1月へ繰り上がる", () => {
    expect(monthRange("2026-12")).toEqual({
      start: "2026-12-01",
      end: "2027-01-01",
    });
  });
  it("1桁の月もゼロ埋めする", () => {
    expect(monthRange("2026-01")).toEqual({
      start: "2026-01-01",
      end: "2026-02-01",
    });
  });
});

describe("daysInMonth", () => {
  it("月ごとの日数を返す", () => {
    expect(daysInMonth("2026-01")).toBe(31);
    expect(daysInMonth("2026-06")).toBe(30);
  });
  it("2月の日数（平年28日・閏年29日）", () => {
    expect(daysInMonth("2026-02")).toBe(28);
    expect(daysInMonth("2028-02")).toBe(29);
  });
});

describe("shiftMonth", () => {
  it("翌月・前月へ移動する", () => {
    expect(shiftMonth("2026-06", 1)).toBe("2026-07");
    expect(shiftMonth("2026-06", -1)).toBe("2026-05");
  });
  it("年をまたぐ", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });
  it("複数月のずらしも可能", () => {
    expect(shiftMonth("2026-06", -6)).toBe("2025-12");
  });
});

describe("lastNMonths", () => {
  it("基準月を含む直近n月を古い順で返す", () => {
    expect(lastNMonths("2026-06", 6)).toEqual([
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
    ]);
  });
  it("年をまたいでも正しく遡る", () => {
    expect(lastNMonths("2026-02", 4)).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
  });
});

describe("ラベル整形", () => {
  it("monthLabel は 和文の年月", () => {
    expect(monthLabel("2026-06")).toBe("2026年6月");
  });
  it("dateLabel は 月/日(曜日)", () => {
    // 2026-06-17 は水曜日
    expect(dateLabel("2026-06-17")).toBe("6/17(水)");
  });
});
