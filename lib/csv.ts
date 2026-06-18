import type { Category, TransactionWithCategory, TxType } from '@/lib/types';

// ── エクスポート ──────────────────────────────────

const MF_HEADER =
  '計算対象,日付,内容,金額（円）,保有金融機関,大項目,中項目,メモ,振替,ID';

export function escapeCsvField(field: string): string {
  if (/[",\r\n]/.test(field)) {
    return '"' + field.replace(/"/g, '""') + '"';
  }
  return field;
}

function toMfDate(isoDate: string): string {
  return isoDate.replace(/-/g, '/');
}

function toMfRow(tx: TransactionWithCategory): string {
  const catName = tx.category?.name ?? '';
  const memo = tx.memo ?? '';
  const fields = [
    '1',
    toMfDate(tx.date),
    catName,
    String(tx.amount),
    '',
    catName,
    '',
    memo,
    '0',
    tx.id,
  ];
  return fields.map(escapeCsvField).join(',');
}

export function generateMfCsv(transactions: TransactionWithCategory[]): string {
  const rows = [MF_HEADER, ...transactions.map(toMfRow)];
  return rows.join('\r\n') + '\r\n';
}

// ── CSVパース（RFC 4180 最小実装）──────────────────

export function parseCsvRows(csv: string): string[][] {
  const text = csv.startsWith('﻿') ? csv.slice(1) : csv;
  const result: string[][] = [];
  let i = 0;
  const len = text.length;

  while (i < len) {
    const row: string[] = [];
    while (i < len) {
      if (text[i] === '"') {
        i++;
        let field = '';
        while (i < len) {
          if (text[i] === '"') {
            if (i + 1 < len && text[i + 1] === '"') {
              field += '"';
              i += 2;
            } else {
              i++;
              break;
            }
          } else {
            field += text[i];
            i++;
          }
        }
        row.push(field);
      } else {
        let field = '';
        while (i < len && text[i] !== ',' && text[i] !== '\r' && text[i] !== '\n') {
          field += text[i];
          i++;
        }
        row.push(field);
      }
      if (i < len && text[i] === ',') {
        i++;
      } else {
        break;
      }
    }
    if (i < len && text[i] === '\r') i++;
    if (i < len && text[i] === '\n') i++;
    if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
      result.push(row);
    }
  }
  return result;
}

// ── Money Forward CSV行のパース ────────────────────

export type MfCsvRow = {
  includeInCalc: string;
  date: string;
  content: string;
  amount: string;
  institution: string;
  majorCategory: string;
  minorCategory: string;
  memo: string;
  transfer: string;
  id: string;
};

export type ParseMfResult =
  | { ok: true; rows: MfCsvRow[] }
  | { ok: false; error: string };

export function parseMfCsvRows(rows: string[][]): ParseMfResult {
  if (rows.length === 0) {
    return { ok: false, error: 'CSVファイルが空です。' };
  }
  const dataRows = rows.slice(1);
  if (dataRows.length === 0) {
    return { ok: false, error: 'データ行がありません。' };
  }
  const parsed: MfCsvRow[] = [];
  for (let i = 0; i < dataRows.length; i++) {
    const r = dataRows[i];
    if (r.length < 10) {
      return { ok: false, error: `${i + 2}行目: 列数が不足しています（${r.length}/10）。` };
    }
    parsed.push({
      includeInCalc: r[0],
      date: r[1],
      content: r[2],
      amount: r[3],
      institution: r[4],
      majorCategory: r[5],
      minorCategory: r[6],
      memo: r[7],
      transfer: r[8],
      id: r[9],
    });
  }
  return { ok: true, rows: parsed };
}

// ── インポートマッピング ────────────────────────────

const MF_INCOME_MAJOR = new Set([
  '給与', '賞与', '一時所得', '事業・副業', '副業',
  '投資', '年金', '配当所得', '不動産所得',
  '臨時収入', 'ポイント・マイル', '不明な入金', 'その他入金',
]);

export function inferTxType(majorCategory: string): TxType {
  return MF_INCOME_MAJOR.has(majorCategory) ? 'income' : 'expense';
}

export type ImportPreviewRow = {
  rowIndex: number;
  date: string;
  type: TxType;
  amount: number;
  memo: string | null;
  categoryName: string;
  categoryId: string | null;
};

export type MapResult =
  | { ok: true; rows: ImportPreviewRow[] }
  | { ok: false; error: string };

function fromMfDate(mfDate: string): string | null {
  const m = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(mfDate);
  if (!m) return null;
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
}

function matchCategory(
  name: string,
  type: TxType,
  categories: Category[],
): string | null {
  const found = categories.find((c) => c.name === name && c.type === type);
  return found?.id ?? null;
}

export function mapMfRowsToPreview(
  mfRows: MfCsvRow[],
  categories: Category[],
): MapResult {
  const result: ImportPreviewRow[] = [];
  for (let i = 0; i < mfRows.length; i++) {
    const row = mfRows[i];
    if (row.transfer === '1') continue;

    const date = fromMfDate(row.date);
    if (!date) {
      return { ok: false, error: `${i + 2}行目: 日付の形式が不正です（${row.date}）。` };
    }
    const amountNum = Number(row.amount.replace(/,/g, ''));
    if (!Number.isFinite(amountNum) || amountNum <= 0 || !Number.isInteger(amountNum)) {
      return { ok: false, error: `${i + 2}行目: 金額が不正です（${row.amount}）。` };
    }

    const type = inferTxType(row.majorCategory);
    const catName = row.minorCategory || row.majorCategory;
    const categoryId =
      (row.minorCategory ? matchCategory(row.minorCategory, type, categories) : null) ??
      matchCategory(row.majorCategory, type, categories);

    const memo = (row.memo || '').trim() || null;

    result.push({
      rowIndex: i + 2,
      date,
      type,
      amount: amountNum,
      memo,
      categoryName: catName,
      categoryId,
    });
  }
  return { ok: true, rows: result };
}

// ── Server Action 用の入力型 ────────────────────────

export type ImportTxInput = {
  date: string;
  type: TxType;
  category_id: string;
  amount: number;
  memo: string | null;
};
