'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { parseCategoryInput } from '@/lib/category-input';
import type { ActionState } from '@/lib/types';

export type CategoryFormState = ActionState;

function parse(formData: FormData) {
  return parseCategoryInput({
    name: String(formData.get('name') ?? ''),
    type: String(formData.get('type') ?? ''),
  });
}

function invalidateAll() {
  revalidateTag('categories', 'max');
  revalidatePath('/', 'layout');
}

export async function createCategory(
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const parsed = parse(formData);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'ログインが必要です。' };

  const { data: maxRow } = await supabase
    .from('categories')
    .select('sort_order')
    .eq('type', parsed.value.type)
    .not('user_id', 'is', null)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextOrder = maxRow && maxRow.length > 0 ? maxRow[0].sort_order + 1 : 100;

  const { error } = await supabase.from('categories').insert({
    name: parsed.value.name,
    type: parsed.value.type,
    user_id: user.id,
    sort_order: nextOrder,
    is_default: false,
  });
  if (error) return { error: '登録に失敗しました。' };

  invalidateAll();
  return { ok: true };
}

export async function updateCategory(
  id: string,
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const parsed = parse(formData);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from('categories')
    .update({ name: parsed.value.name })
    .eq('id', id);
  if (error) return { error: '更新に失敗しました。' };

  invalidateAll();
  return { ok: true };
}

export async function deleteCategory(
  id: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const [txCheck, recurCheck] = await Promise.all([
    supabase.from('transactions').select('id').eq('category_id', id).limit(1),
    supabase.from('recurring_transactions').select('id').eq('category_id', id).limit(1),
  ]);

  if ((txCheck.data?.length ?? 0) > 0 || (recurCheck.data?.length ?? 0) > 0) {
    return { error: 'このカテゴリは取引または固定費で使用中のため削除できません。' };
  }

  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) return { error: '削除に失敗しました。' };

  invalidateAll();
  return {};
}
