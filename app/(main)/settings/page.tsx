import { CategoryManager } from "@/components/settings/CategoryManager";
import { getCategories } from "@/lib/queries";

export default async function SettingsPage() {
  const categories = await getCategories();
  return <CategoryManager categories={categories} />;
}
