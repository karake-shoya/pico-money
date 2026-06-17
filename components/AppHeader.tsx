"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { LogOut, Wallet } from "lucide-react";
import { normalizeMonth } from "@/lib/format";
import { logout } from "@/lib/actions/auth";

// 全ページ共通ヘッダー。月セレクタで ?month を切り替え、各ページが同じ月を参照する。
export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const month = normalizeMonth(searchParams.get("month"));

  function onChangeMonth(value: string) {
    const params = new URLSearchParams(searchParams);
    params.set("month", value);
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <header className="sticky top-0 z-10 border-b border-[var(--color-line)] bg-[var(--color-surface)]/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[480px] items-center justify-between px-4">
        <span className="flex items-center gap-1.5 font-bold tracking-tight">
          <Wallet className="h-5 w-5 text-[var(--color-brand)]" strokeWidth={2} />
          <span>Pico Money</span>
        </span>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={month}
            onChange={(e) => onChangeMonth(e.target.value)}
            aria-label="対象月"
            className={`tabular h-9 rounded-lg border border-[var(--color-line)] bg-[var(--color-bg)] px-2 text-sm outline-none ${
              isPending ? "opacity-60" : ""
            }`}
          />
          <form action={logout}>
            <button
              type="submit"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-muted)] active:bg-[var(--color-bg)]"
              aria-label="ログアウト"
            >
              <LogOut className="h-[18px] w-[18px]" strokeWidth={1.8} />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
