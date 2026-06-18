import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { MonthProvider } from "@/components/MonthProvider";
import { TransactionModalProvider } from "@/components/transaction/TransactionModal";
import { getCategories } from "@/lib/queries";
import { generateRecurringForCurrentMonth } from "@/lib/actions/recurring";

// 認証済みアプリの共有レイアウト。ヘッダー（月セレクタ）・FAB・下部ナビを提供。
// 未ログインのアクセスは proxy.ts が /login へリダイレクトする。
export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [categories] = await Promise.all([
    getCategories(),
    generateRecurringForCurrentMonth(),
  ]);

  return (
    <MonthProvider>
      <TransactionModalProvider categories={categories}>
        <AppHeader />
        <main className="mx-auto w-full max-w-[480px] px-4 pb-[calc(150px+env(safe-area-inset-bottom))] pt-4">
          {children}
        </main>
        <BottomNav />
      </TransactionModalProvider>
    </MonthProvider>
  );
}
