import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SearchControls } from "@/components/transaction/SearchControls";
import { TransactionItem } from "@/components/transaction/TransactionItem";
import { getCategories, searchTransactions } from "@/lib/queries";
import { formatYen } from "@/lib/format";
import type { TransactionSearchFilters, TxType } from "@/lib/types";

// 取引の横断検索（全期間）。ヘッダーの月セレクタには連動しない。
// 絞り込み条件は searchParams（?q / type / cat / from / to / min / max）で受け取る。
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    type?: string;
    cat?: string;
    from?: string;
    to?: string;
    min?: string;
    max?: string;
  }>;
}) {
  const sp = await searchParams;

  // searchParams → フィルタへ正規化（不正値は無視）。
  const toInt = (v: string | undefined) => {
    if (!v) return undefined;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined;
  };
  const filters: TransactionSearchFilters = {
    keyword: sp.q?.trim() || undefined,
    type: sp.type === "income" || sp.type === "expense" ? (sp.type as TxType) : undefined,
    categoryId: sp.cat || undefined,
    dateFrom: sp.from || undefined,
    dateTo: sp.to || undefined,
    amountMin: toInt(sp.min),
    amountMax: toInt(sp.max),
  };
  const hasFilter = Object.values(filters).some((v) => v !== undefined);

  const [categories, results] = await Promise.all([
    getCategories(),
    hasFilter ? searchTransactions(filters) : Promise.resolve([]),
  ]);

  // 収入は＋、支出は−で合算した収支。
  const total = results.reduce(
    (sum, tx) => sum + (tx.type === "income" ? tx.amount : -tx.amount),
    0,
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Link
          href="/transactions"
          aria-label="入出金に戻る"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-muted)] active:bg-[var(--color-bg)]"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">取引を検索</h1>
      </div>

      {/* 絞り込みが変わるたび key で再マウントし、非制御入力(defaultValue)を
          現在の searchParams に同期させる（クリア・ブラウザ戻る/進む対策）。 */}
      <SearchControls
        key={JSON.stringify(filters)}
        categories={categories}
        initial={filters}
      />

      {!hasFilter ? (
        <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-12 text-center text-sm text-[var(--color-muted)]">
          条件を指定して検索してください。
          <br />
          月をまたいだ全期間の取引が対象です。
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-12 text-center text-sm text-[var(--color-muted)]">
          条件に一致する取引がありません。
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between px-1 text-sm">
            <span className="text-[var(--color-muted)]">
              {results.length}件{results.length >= 500 && "（上限）"}
            </span>
            <span
              className={`tabular font-semibold ${
                total >= 0
                  ? "text-[var(--color-income)]"
                  : "text-[var(--color-expense)]"
              }`}
            >
              {total >= 0 ? "+" : "-"}
              {formatYen(total)}
            </span>
          </div>
          <ul className="space-y-2">
            {results.map((tx) => (
              <TransactionItem key={tx.id} tx={tx} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
