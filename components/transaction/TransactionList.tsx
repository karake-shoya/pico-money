"use client";

import { useMemo, useState } from "react";
import { LayoutGrid, Search, X, type LucideIcon } from "lucide-react";
import { TransactionItem } from "./TransactionItem";
import { categoryIcon } from "@/lib/category-icon";
import { formatYen } from "@/lib/format";
import type { TransactionWithCategory, TxType } from "@/lib/types";

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
  // メモ・カテゴリ名のテキスト検索（カテゴリ絞り込みと AND で併用）
  const [query, setQuery] = useState("");

  // 出現するカテゴリを集計（件数）。
  // 支出グループ→収入グループの順に、各グループ内は sort_order 順で並べる
  // （getCategories と同じ並び。type を見ずに sort_order だけで並べると
  //  収入・支出の sort_order がともに 1 始まりのため交互に混在してしまう）。
  const categories = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        icon: string | null;
        count: number;
        type: TxType | null;
        sortOrder: number;
      }
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
          type: tx.category?.type ?? null,
          sortOrder: tx.category?.sort_order ?? 999,
        });
      }
    }
    return [...map.values()].sort((a, b) =>
      a.type === b.type
        ? a.sortOrder - b.sortOrder
        : (a.type ?? "zzz") < (b.type ?? "zzz")
          ? -1
          : 1
    );
  }, [transactions]);

  // 支出・収入で行を分けて表示するためにグループ分けする。
  // type が不明なカテゴリ（旧データ等）は支出側にまとめる。
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type !== "income"),
    [categories]
  );
  const incomeCategories = useMemo(
    () => categories.filter((c) => c.type === "income"),
    [categories]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter((tx) => {
      // カテゴリ絞り込み
      if (selected !== null && (tx.category?.id ?? "unknown") !== selected) {
        return false;
      }
      // テキスト検索（メモ・カテゴリ名のいずれかに含まれる）
      if (q !== "") {
        const haystack = `${tx.memo ?? ""} ${tx.category?.name ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, selected, query]);

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
      {/* メモ・カテゴリ名の検索 */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="メモ・カテゴリ名で検索"
          className="w-full rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] py-2 pl-9 pr-9 text-base text-[var(--color-ink)] outline-none placeholder:text-[var(--color-muted)] focus:border-[var(--color-brand)]"
        />
        {query !== "" && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="検索をクリア"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-[var(--color-muted)] transition active:scale-90"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* カテゴリフィルタ。支出・収入で行を分けて横スクロール表示する。 */}
      <div className="space-y-2">
        {/* 支出の行（先頭に「すべて」チップを置く） */}
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <Chip
            active={selected === null}
            onClick={() => setSelected(null)}
            icon={LayoutGrid}
            label="すべて"
            count={transactions.length}
          />
          {expenseCategories.map((c) => (
            <Chip
              key={c.id}
              active={selected === c.id}
              onClick={() => setSelected(c.id)}
              icon={categoryIcon(c.name)}
              label={c.name}
              count={c.count}
            />
          ))}
        </div>

        {/* 収入の行（収入カテゴリが存在する場合のみ表示） */}
        {incomeCategories.length > 0 && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {incomeCategories.map((c) => (
              <Chip
                key={c.id}
                active={selected === c.id}
                onClick={() => setSelected(c.id)}
                icon={categoryIcon(c.name)}
                label={c.name}
                count={c.count}
              />
            ))}
          </div>
        )}
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

      {filtered.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-12 text-center text-sm text-[var(--color-muted)]">
          条件に一致する取引がありません。
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((tx) => (
            <TransactionItem key={tx.id} tx={tx} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  icon: Icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm transition ${
        active
          ? "border-[var(--color-brand)] bg-[var(--color-brand)] text-white"
          : "border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink)]"
      }`}
    >
      <Icon className="h-4 w-4" strokeWidth={1.8} />
      {label}
      <span className={active ? "opacity-80" : "text-[var(--color-muted)]"}>
        {count}
      </span>
    </button>
  );
}
