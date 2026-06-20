'use server';

// レシート画像を Claude（Sonnet 4.6）で読み取り、取引フォームのプリフィルを返す Server Action。
// 画像は保存せず、読み取りに使ったら破棄する。
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { getCategories } from '@/lib/queries';
import { normalizeReceipt, type ReceiptPrefill } from '@/lib/receipt-input';
import { todayDate } from '@/lib/format';

export type ScanResult =
  | { ok: true; prefill: ReceiptPrefill }
  | { ok: false; error: string };

const MODEL = 'claude-sonnet-4-6';

// レシート画像（base64）を読み取り、フォーム用プリフィルへ正規化して返す。
// クライアントのイベントハンドラから直接呼ぶ（FormData 不要）。
export async function scanReceipt(
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png'
): Promise<ScanResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'ログインが必要です。' };

  if (!imageBase64) return { ok: false, error: '画像がありません。' };
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: '読み取り設定が未構成です。手入力してください。' };
  }

  // 支出カテゴリのみを候補にする（クライアントは信用せずサーバーで取得）。
  const categories = await getCategories();
  const expenseCats = categories.filter((c) => c.type === 'expense');
  const categoryIds = expenseCats.map((c) => c.id);

  // category_id は既存IDの enum + "unmatched" に制約し、架空カテゴリを返させない。
  const schema = {
    type: 'object',
    properties: {
      amount: { type: 'integer', description: 'レシートの合計金額（円・整数）。読めなければ 0。' },
      date: { type: 'string', description: '利用日 YYYY-MM-DD。読めなければ空文字。' },
      category_id: {
        type: 'string',
        enum: [...categoryIds, 'unmatched'],
        description: '最も適切な支出カテゴリのID。該当が無ければ "unmatched"。',
      },
      store: { type: 'string', description: '店名。読めなければ空文字。' },
    },
    required: ['amount', 'date', 'category_id', 'store'],
    additionalProperties: false,
  } as const;

  const categoryList = expenseCats
    .map((c) => `- ${c.id}: ${c.name}`)
    .join('\n');

  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      output_config: { format: { type: 'json_schema', schema } },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: imageBase64 },
            },
            {
              type: 'text',
              text:
                'このレシート画像から、合計金額・利用日・店名を読み取ってください。\n' +
                '個々の商品名は読み取る必要はありません。\n' +
                '合計金額は税込の支払総額（整数の円）。利用日は YYYY-MM-DD。\n' +
                '次の支出カテゴリ一覧から最も近いものを1つ選び、その ID を category_id に入れてください。' +
                '当てはまるものが無ければ "unmatched" を返してください。\n' +
                `カテゴリ一覧:\n${categoryList}`,
            },
          ],
        },
      ],
    });

    // 安全要因で拒否された場合は content を読まずにフォールバック。
    if (response.stop_reason === 'refusal') {
      return { ok: false, error: '画像を読み取れませんでした。手入力してください。' };
    }

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return { ok: false, error: '読み取り結果を取得できませんでした。手入力してください。' };
    }

    const raw = JSON.parse(textBlock.text);
    const prefill = normalizeReceipt(raw, categories, todayDate());
    return { ok: true, prefill };
  } catch {
    // API エラー・JSON 破損など。画像内容はログに残さない。
    return { ok: false, error: '読み取りに失敗しました。手入力してください。' };
  }
}
