"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { normalizeMonth } from "@/lib/format";

// 月（YYYY-MM）をクライアント全体で共有する単一の状態。
// URL ?month は同期されたミラーとして扱い、真実源はこの Context。
// - navigate=false（既定）: state 更新 ＋ history.replaceState（サーバー再取得なし）。
//   ホームのカルーセルが先読みデータで即描画するための軽量同期。
// - navigate=true: router.replace（Server Component ページのデータ再取得が必要なとき）。
type SetMonthOptions = { navigate?: boolean };
type MonthContextValue = {
  month: string;
  setMonth: (month: string, options?: SetMonthOptions) => void;
};

const MonthContext = createContext<MonthContextValue | null>(null);

export function MonthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [month, setMonthState] = useState(() =>
    normalizeMonth(searchParams.get("month"))
  );

  const setMonth = useCallback(
    (next: string, options?: SetMonthOptions) => {
      setMonthState(next);
      const params = new URLSearchParams(searchParams);
      params.set("month", next);
      const url = `${pathname}?${params.toString()}`;
      if (options?.navigate) {
        router.replace(url, { scroll: false });
      } else {
        window.history.replaceState(null, "", url);
      }
    },
    [router, pathname, searchParams]
  );

  const value = useMemo(() => ({ month, setMonth }), [month, setMonth]);

  return (
    <MonthContext.Provider value={value}>{children}</MonthContext.Provider>
  );
}

export function useMonth() {
  const ctx = useContext(MonthContext);
  if (!ctx) throw new Error("useMonth は MonthProvider の内側で使ってください");
  return ctx;
}
