"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRightLeft, House, PieChart, Repeat, type LucideIcon } from "lucide-react";
import { useMonth } from "@/components/MonthProvider";

const ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "ホーム", icon: House },
  { href: "/transactions", label: "入出金", icon: ArrowRightLeft },
  { href: "/charts", label: "家計簿", icon: PieChart },
  { href: "/recurring", label: "固定費", icon: Repeat },
];

// 片手操作しやすい下部固定ナビ。選択中の月(?month)を保持して遷移する。
export function BottomNav() {
  const pathname = usePathname();
  const { month } = useMonth();
  const query = `?month=${month}`;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--color-line)] bg-[var(--color-surface)] pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex h-[52px] max-w-[480px] items-stretch">
        {ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={`${item.href}${query}`}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] ${
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
