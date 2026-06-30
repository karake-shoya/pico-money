'use server';

// 貯金目標の登録 / 編集 / 削除 Server Actions
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { parseGoalInput } from '@/lib/goal-input';
import type { ActionState } from '@/lib/types';

export type GoalFormState = ActionState;

// FormData から生の文字列を取り出し、純粋関数で検証する。
function parse(formData: FormData) {
  return parseGoalInput({
    name: String(formData.get('name') ?? ''),
    target_amount: String(formData.get('target_amount') ?? ''),
    deadline: String(formData.get('deadline') ?? ''),
  });
}

export async function createGoal(
  _prev: GoalFormState,
  formData: FormData
): Promise<GoalFormState> {
  const parsed = parse(formData);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'ログインが必要です。' };

  // 末尾に並ぶよう、既存の最大 sort_order + 1 を割り当てる。
  const { data: maxRow, error: maxErr } = await supabase
    .from('savings_goals')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1);
  if (maxErr) return { error: '目標の登録に失敗しました。' };
  const nextOrder = maxRow && maxRow.length > 0 ? maxRow[0].sort_order + 1 : 1;

  const { error } = await supabase.from('savings_goals').insert({
    ...parsed.value,
    user_id: user.id,
    sort_order: nextOrder,
  });
  if (error) return { error: '目標の登録に失敗しました。' };

  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function updateGoal(
  id: string,
  _prev: GoalFormState,
  formData: FormData
): Promise<GoalFormState> {
  const parsed = parse(formData);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  // RLS により他人の目標は更新できない。
  const { error } = await supabase
    .from('savings_goals')
    .update({ ...parsed.value, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { error: '目標の更新に失敗しました。' };

  revalidatePath('/', 'layout');
  return { ok: true };
}

// 目標を削除する。紐づく貯金取引（goal_id 付き）も併せて削除し、
// 過去の貯金が消費支出へ再分類されるのを防ぐ（残高はその分だけ戻る）。
// RLS により本人の行のみが対象。
export async function deleteGoal(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  // 先に紐づく貯金取引を削除する（goal の削除で goal_id が NULL 化される前に）。
  const { error: txError } = await supabase
    .from('transactions')
    .delete()
    .eq('goal_id', id);
  if (txError) return { error: '目標の削除に失敗しました。' };

  const { error } = await supabase.from('savings_goals').delete().eq('id', id);
  if (error) return { error: '目標の削除に失敗しました。' };

  revalidatePath('/', 'layout');
  return {};
}
