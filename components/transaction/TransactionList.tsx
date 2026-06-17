"use client";

import { useMemo, useState } from "react";
import { TransactionItem } from "./TransactionItem";
import { formatYen } from "@/lib/format";
import type { TransactionWithCategory } from "@/lib/types";

// その月の明細を、カテゴリ別フィルタチップ付きで表示する。
// initialCategoryId が渡された場合はそのカテゴリで初期絞り込み（家計簿からのドリルダウン）。
export function TransactionList({
  transactions,
  initialCategoryId,
}: {
  transactions: TransactionWithCategory[];
  initialCategoryId?: string;
}) {
  // null = すべて
  const [selected, setSelected] = useState<string | null>(
    initialCategoryId ?? null
  );

  // 出現するカテゴリを集計（件数・合計）。件数の多い順に並べる。
  const categories = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; icon: string | null; count: number }
    >();
    for (const tx of transactions) {
      const id = tx.category?.id ?? "unknown";
      const existing = map.get(id);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(id, {
          id,
          name: tx.category?.name ?? "不明",
          icon: tx.category?.icon ?? null,
          count: 1,
        });
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [transactions]);

  const filtered = useMemo(
    () =>
      selected === null
        ? transactions
        : transactions.filter((tx) => (tx.category?.id ?? "unknown") === selected),
    [transactions, selected]
  );

  // 選択中フィルタの合計（収入は＋、支出は−の絶対値合計ではなく差額で表示）
  const total = useMemo(
    () =>
      filtered.reduce(
        (sum, tx) => sum + (tx.type === "income" ? tx.amount : -tx.amount),
        0
      ),
    [filtered]
  );

  return (
    <div className="space-y-3">
      {/* カテゴリフィルタ（横スクロール） */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <Chip
          active={selected === null}
          onClick={() => setSelected(null)}
          label="すべて"
          count={transactions.length}
        />
        {categories.map((c) => (
          <Chip
            key={c.id}
            active={selected === c.id}
            onClick={() => setSelected(c.id)}
            label={`${c.icon ?? ""}${c.name}`}
            count={c.count}
          />
        ))}
      </div>

      {/* 選択中の合計 */}
      <div className="flex items-center justify-between px-1 text-sm">
        <span className="text-[var(--color-muted)]">{filtered.length}件</span>
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
        {filtered.map((tx) => (
          <TransactionItem key={tx.id} tx={tx} />
        ))}
      </ul>
    </div>
  );
}

function Chip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm transition ${
        active
          ? "border-[var(--color-brand)] bg-[var(--color-brand)] text-white"
          : "border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink)]"
      }`}
    >
      {label}
      <span className={active ? "ml-1 opacity-80" : "ml-1 text-[var(--color-muted)]"}>
        {count}
      </span>
    </button>
  );
}
