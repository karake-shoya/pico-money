'use server';

// カテゴリ別月予算の保存 Server Action
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { parseBudgetAmount } from '@/lib/budget-input';

export type BudgetFormState = { error: string } | { ok: true } | null;

// FormData の budget_<categoryId> 各値を検証し、正の値は upsert、0/空は delete する。
// 予算編集シートから全カテゴリ分をまとめて保存する。
export async function saveBudgets(
  _prev: BudgetFormState,
  formData: FormData
): Promise<BudgetFormState> {
  // budget_<categoryId> を収集して検証
  const toUpsert: { category_id: string; amount: number }[] = [];
  const toDelete: string[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith('budget_')) continue;
    const categoryId = key.slice('budget_'.length);
    if (!categoryId) continue;
    const parsed = parseBudgetAmount(String(value));
    if (!parsed.ok) return { error: parsed.error };
    if (parsed.amount > 0) toUpsert.push({ category_id: categoryId, amount: parsed.amount });
    else toDelete.push(categoryId);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'ログインが必要です。' };

  if (toUpsert.length > 0) {
    const { error } = await supabase
      .from('budgets')
      .upsert(
        toUpsert.map((b) => ({ ...b, user_id: user.id })),
        { onConflict: 'user_id,category_id' }
      );
    if (error) return { error: '予算の保存に失敗しました。' };
  }

  if (toDelete.length > 0) {
    // RLS により本人の行のみ削除される
    const { error } = await supabase
      .from('budgets')
      .delete()
      .in('category_id', toDelete);
    if (error) return { error: '予算の保存に失敗しました。' };
  }

  revalidatePath('/', 'layout');
  return { ok: true };
}
