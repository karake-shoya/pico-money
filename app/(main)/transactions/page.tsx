import { TransactionList } from "@/components/transaction/TransactionList";
import { getTransactionsForMonth } from "@/lib/queries";
import { monthLabel, normalizeMonth } from "@/lib/format";

// 明細リスト。選択中の月の取引を日付降順で表示。
export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const month = normalizeMonth(monthParam);
  const transactions = await getTransactionsForMonth(month);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--color-muted)]">
          {monthLabel(month)}の明細
        </p>
        <p className="text-sm text-[var(--color-muted)]">
          {transactions.length}件
        </p>
      </div>

      {transactions.length === 0 ? (
        <div className="rounded-[var(--radius-card)] bg-[var(--color-surface)] px-4 py-12 text-center text-sm text-[var(--color-muted)] shadow-sm">
          この月の取引はまだありません。
          <br />
          下の「＋」から登録できます。
        </div>
      ) : (
        <TransactionList transactions={transactions} />
      )}

      <p className="px-1 text-center text-xs text-[var(--color-muted)]">
        行をタップで編集 ・ 左スワイプで削除
      </p>
    </div>
  );
}
