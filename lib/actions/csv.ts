'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { ImportTxInput } from '@/lib/csv';

export type ImportFormState = { error: string } | { ok: true; count: number } | null;

function validateRow(r: unknown): r is ImportTxInput {
  if (typeof r !== 'object' || r === null) return false;
  const row = r as Record<string, unknown>;
  if (row.type !== 'income' && row.type !== 'expense') return false;
  if (typeof row.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) return false;
  if (typeof row.category_id !== 'string' || row.category_id === '') return false;
  if (typeof row.amount !== 'number' || !Number.isInteger(row.amount) || row.amount <= 0) return false;
  if (row.memo !== null && typeof row.memo !== 'string') return false;
  return true;
}

export async function importTransactions(
  _prev: ImportFormState,
  formData: FormData,
): Promise<ImportFormState> {
  const json = formData.get('csv_data');
  if (typeof json !== 'string') {
    return { error: 'データが不正です。' };
  }

  let raw: unknown[];
  try {
    raw = JSON.parse(json) as unknown[];
  } catch {
    return { error: 'データの解析に失敗しました。' };
  }

  if (!Array.isArray(raw) || raw.length === 0) {
    return { error: 'インポートするデータがありません。' };
  }

  const rows: ImportTxInput[] = [];
  for (const r of raw) {
    if (!validateRow(r)) {
      return { error: '不正なデータが含まれています。' };
    }
    rows.push(r);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'ログインが必要です。' };

  const insertRows = rows.map((r) => ({
    user_id: user.id,
    date: r.date,
    type: r.type,
    category_id: r.category_id,
    amount: r.amount,
    memo: r.memo,
  }));

  const { error } = await supabase.from('transactions').insert(insertRows);
  if (error) return { error: 'インポートに失敗しました。' };

  revalidatePath('/', 'layout');
  return { ok: true, count: rows.length };
}
