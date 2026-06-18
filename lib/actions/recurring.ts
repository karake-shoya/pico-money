'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { parseRecurringInput } from '@/lib/recurring-input';
import { buildTransactions, type RecurringTemplate } from '@/lib/recurring-generate';
import { currentMonth, monthRange } from '@/lib/format';

export type RecurringFormState = { error: string } | { ok: true } | null;

function parse(formData: FormData) {
  return parseRecurringInput({
    type: String(formData.get('type') ?? ''),
    category_id: String(formData.get('category_id') ?? ''),
    amount: String(formData.get('amount') ?? ''),
    memo: String(formData.get('memo') ?? ''),
    day: String(formData.get('day') ?? ''),
  });
}

export async function createRecurring(
  _prev: RecurringFormState,
  formData: FormData,
): Promise<RecurringFormState> {
  const parsed = parse(formData);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'ログインが必要です。' };

  const { error } = await supabase
    .from('recurring_transactions')
    .insert({ ...parsed.value, user_id: user.id });
  if (error) return { error: '登録に失敗しました。' };

  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function updateRecurring(
  id: string,
  _prev: RecurringFormState,
  formData: FormData,
): Promise<RecurringFormState> {
  const parsed = parse(formData);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from('recurring_transactions')
    .update({ ...parsed.value, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { error: '更新に失敗しました。' };

  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function deleteRecurring(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('recurring_transactions').delete().eq('id', id);
  if (error) throw error;
  revalidatePath('/', 'layout');
}

export async function toggleRecurring(id: string, enabled: boolean): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('recurring_transactions')
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
  revalidatePath('/', 'layout');
}

// アプリ起動時に呼び出す。当月分の未生成テンプレートから取引を自動生成する。
// last_generated_month で追跡するため、ユーザーが生成済み取引を削除しても再生成しない。
export async function generateRecurringForCurrentMonth(): Promise<void> {
  const month = currentMonth();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // last_generated_month が当月未満（または null）のテンプレートだけ取得
  const { data: templates, error } = await supabase
    .from('recurring_transactions')
    .select('id, type, category_id, amount, memo, day')
    .eq('enabled', true)
    .or(`last_generated_month.is.null,last_generated_month.lt.${month}`);

  if (error || !templates || templates.length === 0) return;

  const toInsert = buildTransactions(
    templates as RecurringTemplate[],
    new Set(),
    month,
  );
  if (toInsert.length === 0) return;

  const { error: insertError } = await supabase
    .from('transactions')
    .insert(toInsert.map((t) => ({ ...t, user_id: user.id })));
  if (insertError) return;

  // 生成済みテンプレートの last_generated_month を更新
  const generatedIds = toInsert.map((t) => t.recurring_id);
  await supabase
    .from('recurring_transactions')
    .update({ last_generated_month: month })
    .in('id', generatedIds);

  revalidatePath('/', 'layout');
}
