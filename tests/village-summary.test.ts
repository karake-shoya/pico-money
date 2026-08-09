import { describe, expect, it } from "vitest";
import { lastNMonths } from "@/lib/format";
import {
  buildVillageSummary,
  type VillageInput,
} from "../supabase/functions/_shared/village-summary";

// 基準日は固定。実装が「今日」を自分で決めないことを前提にしている。
const TODAY = "2026-08-10";

// 空の入力（各テストで必要な分だけ上書きする）
function input(over: Partial<VillageInput> = {}): VillageInput {
  return { transactions: [], budgetAmounts: [], savingsGoals: [], ...over };
}

describe("buildVillageSummary / 記録の量", () => {
  it("記録日数と記録月数を数え、最終記録日を返す", () => {
    const r = buildVillageSummary(
      input({
        transactions: [
          { date: "2026-07-03", type: "expense", amount: 1000, goal_id: null },
          { date: "2026-07-03", type: "expense", amount: 2000, goal_id: null },
          { date: "2026-07-20", type: "expense", amount: 3000, goal_id: null },
          { date: "2026-08-08", type: "expense", amount: 4000, goal_id: null },
        ],
      }),
      TODAY
    );
    // 同じ日の2件は1日、同じ月の2日は1ヶ月に丸める（単位を混ぜない）
    expect(r.record.totalDays).toBe(3);
    expect(r.record.totalMonths).toBe(2);
    expect(r.record.lastDate).toBe("2026-08-08");
  });

  it("記録がゼロなら最終記録日は null で、日数・月数は0", () => {
    const r = buildVillageSummary(input(), TODAY);
    expect(r.record).toEqual({
      totalDays: 0,
      totalMonths: 0,
      last30Days: 0,
      lastDate: null,
    });
  });

  it("直近30日の窓は today を含む30日間（30日前は入らない）", () => {
    const r = buildVillageSummary(
      input({
        transactions: [
          { date: "2026-08-10", type: "expense", amount: 1, goal_id: null }, // 当日
          { date: "2026-07-12", type: "expense", amount: 1, goal_id: null }, // 29日前＝入る
          { date: "2026-07-11", type: "expense", amount: 1, goal_id: null }, // 30日前＝入らない
        ],
      }),
      TODAY
    );
    expect(r.record.last30Days).toBe(2);
  });

  it("today より後の日付の取引は捨てる（最終記録日が未来に化けない）", () => {
    const r = buildVillageSummary(
      input({
        transactions: [
          { date: "2026-08-08", type: "expense", amount: 1000, goal_id: null },
          { date: "2026-12-31", type: "expense", amount: 9999, goal_id: null },
        ],
      }),
      TODAY
    );
    expect(r.record.lastDate).toBe("2026-08-08");
    expect(r.record.totalDays).toBe(1);
    // 金額も混ざらない
    const dec = r.monthly.find((m) => m.month === "2026-12");
    expect(dec).toBeUndefined();
  });
});

describe("buildVillageSummary / 月次の推移", () => {
  it("直近12ヶ月を古い順に並べ、取引の無い月もゼロで埋める", () => {
    const r = buildVillageSummary(input(), TODAY);
    expect(r.monthly).toHaveLength(12);
    expect(r.monthly[0].month).toBe("2025-09");
    expect(r.monthly[11].month).toBe("2026-08");
    expect(r.monthly[5]).toEqual({
      month: "2026-02",
      income: 0,
      expense: 0,
      savings: 0,
    });
  });

  it("月の並びは lib/format.ts の lastNMonths と一致する", () => {
    // _shared は Deno から import するため lib/format.ts を参照できず、
    // 月送りを自前で持っている。ズレたらここで落とす。
    const r = buildVillageSummary(input(), TODAY);
    expect(r.monthly.map((m) => m.month)).toEqual(lastNMonths("2026-08", 12));
  });

  it("goal_id 付きの支出は消費支出に混ざらず貯金として立つ", () => {
    const r = buildVillageSummary(
      input({
        transactions: [
          { date: "2026-08-01", type: "income", amount: 300000, goal_id: null },
          { date: "2026-08-02", type: "expense", amount: 100000, goal_id: null },
          { date: "2026-08-03", type: "expense", amount: 50000, goal_id: "g1" },
        ],
        savingsGoals: [{ id: "g1", target_amount: 200000 }],
      }),
      TODAY
    );
    const aug = r.monthly[11];
    expect(aug).toEqual({
      month: "2026-08",
      income: 300000,
      expense: 100000, // 貯金は含まない
      savings: 50000,
    });
  });
});

describe("buildVillageSummary / 予算", () => {
  const budgetAmounts = [30000, 20000]; // 合計 50000

  it("当月の予算合計と消費支出を返す（貯金は消費に含めない）", () => {
    const r = buildVillageSummary(
      input({
        budgetAmounts,
        transactions: [
          { date: "2026-08-02", type: "expense", amount: 12000, goal_id: null },
          { date: "2026-08-03", type: "expense", amount: 8000, goal_id: "g1" },
        ],
        savingsGoals: [{ id: "g1", target_amount: 100000 }],
      }),
      TODAY
    );
    expect(r.budget.month).toBe("2026-08");
    expect(r.budget.total).toBe(50000);
    expect(r.budget.spent).toBe(12000);
  });

  it("月途中の当月は達成月の分母に入れない", () => {
    const r = buildVillageSummary(
      input({
        budgetAmounts,
        transactions: [
          // 当月はまだ予算内だが、月末に超えるかは分からない
          { date: "2026-08-02", type: "expense", amount: 1000, goal_id: null },
          // 先月は予算内で確定
          { date: "2026-07-05", type: "expense", amount: 40000, goal_id: null },
        ],
      }),
      TODAY
    );
    expect(r.budget.monthsMeasured).toBe(1); // 7月だけ
    expect(r.budget.monthsWithinBudget).toBe(1);
  });

  it("予算を超えた月は達成に数えない", () => {
    const r = buildVillageSummary(
      input({
        budgetAmounts,
        transactions: [
          { date: "2026-07-05", type: "expense", amount: 60000, goal_id: null },
          { date: "2026-06-05", type: "expense", amount: 10000, goal_id: null },
        ],
      }),
      TODAY
    );
    expect(r.budget.monthsMeasured).toBe(2);
    expect(r.budget.monthsWithinBudget).toBe(1); // 6月のみ
  });

  it("記録の無い月は達成にも分母にも数えない（使わなかった月を成果にしない）", () => {
    const r = buildVillageSummary(
      input({
        budgetAmounts,
        transactions: [
          { date: "2026-07-05", type: "expense", amount: 10000, goal_id: null },
        ],
      }),
      TODAY
    );
    expect(r.budget.monthsMeasured).toBe(1);
  });

  it("収入だけ記録して支出を記録しなかった月は達成に数えない", () => {
    // 記録が途切れた月ほど「消費0＝予算内」で光る、という逆向きの嘘を防ぐ。
    const r = buildVillageSummary(
      input({
        budgetAmounts,
        transactions: [
          { date: "2026-06-25", type: "income", amount: 300000, goal_id: null },
          { date: "2026-06-26", type: "expense", amount: 5000, goal_id: "g1" }, // 貯金も消費ではない
          { date: "2026-07-05", type: "expense", amount: 10000, goal_id: null },
        ],
        savingsGoals: [{ id: "g1", target_amount: 100000 }],
      }),
      TODAY
    );
    expect(r.budget.monthsMeasured).toBe(1); // 7月だけ
    expect(r.budget.monthsWithinBudget).toBe(1);
  });

  it("予算が1件も無ければ分母を作らない（0/N の嘘を出さない）", () => {
    const r = buildVillageSummary(
      input({
        transactions: [
          { date: "2026-07-05", type: "expense", amount: 10000, goal_id: null },
        ],
      }),
      TODAY
    );
    expect(r.budget.total).toBe(0);
    expect(r.budget.monthsMeasured).toBe(0);
    expect(r.budget.monthsWithinBudget).toBe(0);
  });
});

describe("buildVillageSummary / 貯蓄目標", () => {
  it("目標額の合計と貯金済みの合計を返す", () => {
    const r = buildVillageSummary(
      input({
        savingsGoals: [
          { id: "g1", target_amount: 300000 },
          { id: "g2", target_amount: 200000 },
        ],
        transactions: [
          { date: "2026-06-01", type: "expense", amount: 50000, goal_id: "g1" },
          { date: "2026-07-01", type: "expense", amount: 30000, goal_id: "g2" },
        ],
      }),
      TODAY
    );
    expect(r.savings).toEqual({ goalCount: 2, target: 500000, saved: 80000 });
  });

  it("存在しない目標に紐づく貯金は数えない", () => {
    const r = buildVillageSummary(
      input({
        savingsGoals: [{ id: "g1", target_amount: 300000 }],
        transactions: [
          { date: "2026-06-01", type: "expense", amount: 50000, goal_id: "g1" },
          { date: "2026-06-02", type: "expense", amount: 70000, goal_id: "消えた目標" },
        ],
      }),
      TODAY
    );
    expect(r.savings.saved).toBe(50000);
  });

  it("目標が1件も無ければ分母を作らない", () => {
    const r = buildVillageSummary(input(), TODAY);
    expect(r.savings).toEqual({ goalCount: 0, target: 0, saved: 0 });
  });
});

describe("buildVillageSummary / 返す内容", () => {
  it("自由文（カテゴリ名・メモ）を一切含まない", () => {
    const r = buildVillageSummary(
      input({
        savingsGoals: [{ id: "g1", target_amount: 100 }],
        transactions: [
          { date: "2026-08-01", type: "expense", amount: 1, goal_id: "g1" },
        ],
      }),
      TODAY
    );
    // 目標 id すら外へ出さない（漏れても出るのは数字だけ、を型ではなく実物で固定する）
    expect(JSON.stringify(r)).not.toContain("g1");
  });
});
