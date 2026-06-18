import { RecurringList } from "@/components/recurring/RecurringList";
import { getCategories, getRecurringTransactions } from "@/lib/queries";

export default async function RecurringPage() {
  const [items, categories] = await Promise.all([
    getRecurringTransactions(),
    getCategories(),
  ]);

  return <RecurringList items={items} categories={categories} />;
}
