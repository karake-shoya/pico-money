'use server';

// Web Push 購読の保存・更新・削除 Server Action（記録忘れリマインダー）
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { ActionState } from '@/lib/types';

// クライアントの PushSubscription から必要な値だけ受け取る最小形
export type PushSubscriptionInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

// 'HH:MM' 形式の時刻を検証して 'HH:MM' に正規化する。不正なら null。
function normalizeReminderTime(time: string): string | null {
  const m = /^(\d{2}):(\d{2})$/.exec(time.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return `${m[1]}:${m[2]}`;
}

// 購読を保存（同一 endpoint は upsert で更新）。リマインダーを有効化する。
export async function savePushSubscription(
  sub: PushSubscriptionInput,
  reminderTime: string
): Promise<ActionState> {
  const time = normalizeReminderTime(reminderTime);
  if (!time) return { error: '通知時刻の形式が正しくありません。' };
  if (!sub.endpoint || !sub.p256dh || !sub.auth) {
    return { error: '購読情報が不完全です。' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'ログインが必要です。' };

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint: sub.endpoint,
      p256dh: sub.p256dh,
      auth: sub.auth,
      reminder_time: time,
      enabled: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' }
  );
  if (error) return { error: '通知設定の保存に失敗しました。' };

  revalidatePath('/settings');
  return { ok: true };
}

// 通知時刻を更新（本人の全購読に適用）。
export async function updateReminderTime(
  reminderTime: string
): Promise<ActionState> {
  const time = normalizeReminderTime(reminderTime);
  if (!time) return { error: '通知時刻の形式が正しくありません。' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'ログインが必要です。' };

  // RLS により本人の行のみ更新される
  const { error } = await supabase
    .from('push_subscriptions')
    .update({ reminder_time: time, updated_at: new Date().toISOString() })
    .eq('user_id', user.id);
  if (error) return { error: '通知時刻の更新に失敗しました。' };

  revalidatePath('/settings');
  return { ok: true };
}

// 指定 endpoint の購読を削除（リマインダー無効化）。
export async function deletePushSubscription(
  endpoint: string
): Promise<ActionState> {
  if (!endpoint) return { error: '購読情報が不完全です。' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'ログインが必要です。' };

  // RLS により本人の行のみ削除される
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint);
  if (error) return { error: '通知設定の解除に失敗しました。' };

  revalidatePath('/settings');
  return { ok: true };
}
