import { GoalManager } from "@/components/goals/GoalManager";
import { getSavingsGoals } from "@/lib/queries";

// 目標貯金。目標の作成・編集と、各目標への「貯金する」（支出として記録）を提供。
// 月セレクタには連動しない（全期間の貯金合計で進捗を表示）。
export default async function GoalsPage() {
  const goals = await getSavingsGoals();
  return <GoalManager goals={goals} />;
}
