import Link from "next/link";
import { Search } from "lucide-react";
import { CsvButtons } from "@/components/transaction/CsvButtons";
import { MonthNav } from "@/components/MonthNav";
import { TransactionList } from "@/components/transaction/TransactionList";
import { getTransactionsForMonth, getCategories } from "@/lib/queries";
import { normalizeMonth } from "@/lib/format";

// 入出金（明細リスト）。選択中の月の取引を日付降順で表示。
// ?cat=<categoryId> が指定されていれば、そのカテゴリで初期絞り込みする（家計簿からのドリルダウン）。
export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; cat?: string }>;
}) {
  const { month: monthParam, cat } = await searchParams;
  const month = normalizeMonth(monthParam);
  const [transactions, categories] = await Promise.all([
    getTransactionsForMonth(month),
    getCategories(),
  ]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <MonthNav />
        <div className="flex items-center gap-2">
          <Link
            href="/search"
            aria-label="取引を検索"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-muted)] active:bg-[var(--color-bg)]"
          >
            <Search className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </Link>
          <CsvButtons transactions={transactions} month={month} categories={categories} />
          <p className="text-sm text-[var(--color-muted)]">
            {transactions.length}件
          </p>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-12 text-center text-sm text-[var(--color-muted)]">
          この月の取引はまだありません。
          <br />
          下の「＋」から登録できます。
        </div>
      ) : (
        <TransactionList transactions={transactions} initialCategoryId={cat} />
      )}

      <p className="px-1 text-center text-xs text-[var(--color-muted)]">
        行をタップで編集 ・ 左スワイプで削除
      </p>
    </div>
  );
}
