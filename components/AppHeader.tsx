"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Settings, Wallet } from "lucide-react";
import { useMonth } from "@/components/MonthProvider";
import { logout } from "@/lib/actions/auth";

const HOME_PATH = "/"; // カルーセルで先読み表示するページ（月変更で再取得不要）

// 全ページ共通ヘッダー。月セレクタで共有の月(MonthContext)を切り替える。
// ホームはカルーセルが先読みデータで反映するためサーバー再取得は不要(navigate:false)。
// グラフ/明細(Server Component)はデータ再取得が必要なため navigate:true。
export function AppHeader() {
  const pathname = usePathname();
  const { month, setMonth } = useMonth();

  function onChangeMonth(value: string) {
    // ホームはカルーセルが先読みデータで即反映するため再取得不要。
    // 他ページ(Server Component)は月変更でデータ再取得が必要。
    setMonth(value, { navigate: pathname !== HOME_PATH });
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
            className="tabular h-9 rounded-lg border border-[var(--color-line)] bg-[var(--color-bg)] px-2 text-sm outline-none"
          />
          <Link
            href="/settings"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-muted)] active:bg-[var(--color-bg)]"
            aria-label="設定"
          >
            <Settings className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </Link>
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
