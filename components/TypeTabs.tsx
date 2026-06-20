"use client";

import type { TxType } from "@/lib/types";

export function TypeTabs({
  value,
  onChange,
  bordered = false,
}: {
  value: TxType;
  onChange: (type: TxType) => void;
  bordered?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-2 border-b border-[var(--color-line)] ${
        bordered ? "-mx-5 -mt-1" : ""
      }`}
    >
      {(["expense", "income"] as const).map((t) => {
        const active = value === t;
        const activeColor =
          t === "expense" ? "var(--color-expense)" : "var(--color-income)";
        return (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            className="relative h-12 text-sm font-semibold transition"
            style={{
              color: active ? activeColor : "var(--color-muted)",
            }}
          >
            {t === "expense" ? "支出" : "収入"}
            <span
              className="absolute inset-x-0 -bottom-px h-0.5 rounded-full"
              style={{ background: active ? activeColor : "transparent" }}
            />
          </button>
        );
      })}
    </div>
  );
}
