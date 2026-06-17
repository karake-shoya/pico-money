"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowRightLeft, House, PieChart, type LucideIcon } from "lucide-react";

const ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "ホーム", icon: House },
  { href: "/transactions", label: "入出金", icon: ArrowRightLeft },
  { href: "/charts", label: "家計簿", icon: PieChart },
];

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
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={`${item.href}${query}`}
              className={`flex flex-1 flex-col items-center justify-center gap-1 text-[11px] ${
                active
                  ? "font-semibold text-[var(--color-brand)]"
                  : "text-[var(--color-muted)]"
              }`}
            >
              <Icon
                className="h-[22px] w-[22px]"
                strokeWidth={active ? 2.4 : 1.8}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
