"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const ITEMS = [
  { href: "/", label: "ホーム", icon: "🏠" },
  { href: "/transactions", label: "入出金", icon: "💴" },
  { href: "/charts", label: "家計簿", icon: "📒" },
] as const;

// 片手操作しやすい下部固定ナビ。選択中の月(?month)を保持して遷移する。
export function BottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const month = searchParams.get("month");
  const query = month ? `?month=${month}` : "";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--color-line)] bg-[var(--color-surface)] pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex h-[64px] max-w-[480px] items-stretch">
        {ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={`${item.href}${query}`}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-xs ${
                active
                  ? "font-semibold text-[var(--color-brand)]"
                  : "text-[var(--color-muted)]"
              }`}
            >
              <span className="text-xl leading-none">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
