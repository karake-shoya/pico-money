'use server';

// 取引の登録 / 編集 / 削除 Server Actions
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { parseTransactionInput } from '@/lib/transaction-input';
import type { ActionState } from '@/lib/types';

export type TxFormState = ActionState;

// FormData から生の文字列を取り出し、純粋関数で検証する。
function parse(formData: FormData) {
  return parseTransactionInput({
    type: String(formData.get('type') ?? ''),
    date: String(formData.get('date') ?? ''),
    category_id: String(formData.get('category_id') ?? ''),
    amount: String(formData.get('amount') ?? ''),
    memo: String(formData.get('memo') ?? ''),
  });
}

export async function createTransaction(
  _prev: TxFormState,
  formData: FormData
): Promise<TxFormState> {
  const parsed = parse(formData);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'ログインが必要です。' };

  const { error } = await supabase
    .from('transactions')
    .insert({ ...parsed.value, user_id: user.id });
  if (error) return { error: '登録に失敗しました。' };

  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function updateTransaction(
  id: string,
  _prev: TxFormState,
  formData: FormData
): Promise<TxFormState> {
  const parsed = parse(formData);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  // RLS により他人の取引は更新できない。
  const { error } = await supabase
    .from('transactions')
    .update(parsed.value)
    .eq('id', id);
  if (error) return { error: '更新に失敗しました。' };

  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function deleteTransaction(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw error;
  revalidatePath('/', 'layout');
}
