import { CategoryManager } from "@/components/settings/CategoryManager";
import { ReminderSettings } from "@/components/settings/ReminderSettings";
import { getCategories, getMyPushSubscription } from "@/lib/queries";

export default async function SettingsPage() {
  const [categories, pushSubscription] = await Promise.all([
    getCategories(),
    getMyPushSubscription(),
  ]);
  return (
    <div className="space-y-6">
      <ReminderSettings initial={pushSubscription} />
      <CategoryManager categories={categories} />
    </div>
  );
}
