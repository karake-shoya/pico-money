import { describe, expect, it } from 'vitest';
import {
  escapeCsvField,
  generateMfCsv,
  parseCsvRows,
  parseMfCsvRows,
  inferTxType,
  mapMfRowsToPreview,
  type MfCsvRow,
} from '@/lib/csv';
import type { Category, TransactionWithCategory } from '@/lib/types';

// ── テストヘルパー ─────────────────────────────────

function makeTx(
  overrides: Partial<TransactionWithCategory> & { categoryName?: string },
): TransactionWithCategory {
  const { categoryName, ...rest } = overrides;
  return {
    id: 'tx-1',
    user_id: 'u1',
    date: '2026-06-15',
    type: 'expense',
    category_id: 'cat-1',
    amount: 850,
    memo: null,
    recurring_id: null,
    created_at: '2026-06-15T00:00:00Z',
    category: {
      id: 'cat-1',
      name: categoryName ?? '食費',
      icon: null,
      type: 'expense',
      sort_order: 1,
    },
    ...rest,
  };
}

function makeCategory(name: string, type: 'income' | 'expense', id?: string): Category {
  return {
    id: id ?? `cat-${name}`,
    user_id: null,
    name,
    type,
    icon: null,
    sort_order: 0,
    is_default: true,
    created_at: '',
  };
}

function makeMfRow(overrides: Partial<MfCsvRow> = {}): MfCsvRow {
  return {
    includeInCalc: '1',
    date: '2026/06/15',
    content: '食費',
    amount: '850',
    institution: '',
    majorCategory: '食費',
    minorCategory: '',
    memo: '',
    transfer: '0',
    id: 'mf-1',
    ...overrides,
  };
}

// ── escapeCsvField ─────────────────────────────────

describe('escapeCsvField', () => {
  it('エスケープ不要なフィールドはそのまま返す', () => {
    expect(escapeCsvField('hello')).toBe('hello');
    expect(escapeCsvField('')).toBe('');
  });

  it('カンマを含むフィールドをダブルクォートで囲む', () => {
    expect(escapeCsvField('a,b')).toBe('"a,b"');
  });

  it('ダブルクォートを含むフィールドをエスケープする', () => {
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
  });

  it('改行を含むフィールドをエスケープする', () => {
    expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"');
  });
});

// ── generateMfCsv ──────────────────────────────────

describe('generateMfCsv', () => {
  it('空配列ならヘッダーのみ出力する', () => {
    const csv = generateMfCsv([]);
    const lines = csv.trimEnd().split('\r\n');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('計算対象');
  });

  it('取引をMFフォーマットに変換する', () => {
    const csv = generateMfCsv([makeTx({})]);
    const lines = csv.trimEnd().split('\r\n');
    expect(lines).toHaveLength(2);
    const fields = lines[1].split(',');
    expect(fields[0]).toBe('1');
    expect(fields[1]).toBe('2026/06/15');
    expect(fields[2]).toBe('食費');
    expect(fields[3]).toBe('850');
    expect(fields[5]).toBe('食費');
    expect(fields[8]).toBe('0');
  });

  it('メモを含むフィールドにカンマがあればエスケープする', () => {
    const csv = generateMfCsv([makeTx({ memo: 'ランチ,ディナー' })]);
    expect(csv).toContain('"ランチ,ディナー"');
  });

  it('日付をYYYY/MM/DDに変換する', () => {
    const csv = generateMfCsv([makeTx({ date: '2026-01-05' })]);
    expect(csv).toContain('2026/01/05');
  });
});

// ── parseCsvRows ───────────────────────────────────

describe('parseCsvRows', () => {
  it('基本的なCSVをパースする', () => {
    const rows = parseCsvRows('a,b,c\r\n1,2,3\r\n');
    expect(rows).toEqual([['a', 'b', 'c'], ['1', '2', '3']]);
  });

  it('ダブルクォートで囲まれたフィールドをパースする', () => {
    const rows = parseCsvRows('"hello","world"\r\n');
    expect(rows).toEqual([['hello', 'world']]);
  });

  it('フィールド内のカンマを扱う', () => {
    const rows = parseCsvRows('"a,b",c\r\n');
    expect(rows).toEqual([['a,b', 'c']]);
  });

  it('フィールド内のダブルクォートエスケープを扱う', () => {
    const rows = parseCsvRows('"say ""hi""",ok\r\n');
    expect(rows).toEqual([['say "hi"', 'ok']]);
  });

  it('空行をスキップする', () => {
    const rows = parseCsvRows('a,b\r\n\r\nc,d\r\n');
    expect(rows).toEqual([['a', 'b'], ['c', 'd']]);
  });

  it('BOM付きUTF-8を処理する', () => {
    const rows = parseCsvRows('﻿a,b\r\n');
    expect(rows).toEqual([['a', 'b']]);
  });

  it('LFのみの改行も扱う', () => {
    const rows = parseCsvRows('a,b\n1,2\n');
    expect(rows).toEqual([['a', 'b'], ['1', '2']]);
  });
});

// ── parseMfCsvRows ─────────────────────────────────

describe('parseMfCsvRows', () => {
  it('空のCSVでエラーを返す', () => {
    const result = parseMfCsvRows([]);
    expect(result.ok).toBe(false);
  });

  it('ヘッダーのみでエラーを返す', () => {
    const result = parseMfCsvRows([['計算対象', '日付', '内容', '金額（円）', '', '', '', '', '', '']]);
    expect(result.ok).toBe(false);
  });

  it('列数不足でエラーを返す', () => {
    const result = parseMfCsvRows([
      ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7', 'h8', 'h9', 'h10'],
      ['1', '2026/06/15', '食費'],
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('列数');
  });

  it('正常なデータをパースする', () => {
    const result = parseMfCsvRows([
      ['計算対象', '日付', '内容', '金額（円）', '保有金融機関', '大項目', '中項目', 'メモ', '振替', 'ID'],
      ['1', '2026/06/15', '食費', '850', '', '食費', '', '', '0', 'mf-1'],
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].date).toBe('2026/06/15');
      expect(result.rows[0].amount).toBe('850');
      expect(result.rows[0].majorCategory).toBe('食費');
    }
  });
});

// ── inferTxType ────────────────────────────────────

describe('inferTxType', () => {
  it('給与 → income', () => {
    expect(inferTxType('給与')).toBe('income');
  });

  it('賞与 → income', () => {
    expect(inferTxType('賞与')).toBe('income');
  });

  it('投資 → income', () => {
    expect(inferTxType('投資')).toBe('income');
  });

  it('食費 → expense', () => {
    expect(inferTxType('食費')).toBe('expense');
  });

  it('未知のカテゴリ → expense', () => {
    expect(inferTxType('趣味')).toBe('expense');
  });
});

// ── mapMfRowsToPreview ─────────────────────────────

describe('mapMfRowsToPreview', () => {
  const categories: Category[] = [
    makeCategory('食費', 'expense', 'cat-food'),
    makeCategory('交通費', 'expense', 'cat-transport'),
    makeCategory('給与', 'income', 'cat-salary'),
    makeCategory('外食', 'expense', 'cat-eating-out'),
  ];

  it('大項目でカテゴリをマッチする', () => {
    const result = mapMfRowsToPreview([makeMfRow()], categories);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows[0].categoryId).toBe('cat-food');
      expect(result.rows[0].categoryName).toBe('食費');
    }
  });

  it('中項目が先にマッチする', () => {
    const result = mapMfRowsToPreview(
      [makeMfRow({ majorCategory: '食費', minorCategory: '外食' })],
      categories,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows[0].categoryId).toBe('cat-eating-out');
      expect(result.rows[0].categoryName).toBe('外食');
    }
  });

  it('マッチしない場合 categoryId = null', () => {
    const result = mapMfRowsToPreview(
      [makeMfRow({ majorCategory: '美容', minorCategory: '' })],
      categories,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows[0].categoryId).toBeNull();
      expect(result.rows[0].categoryName).toBe('美容');
    }
  });

  it('日付をYYYY-MM-DD形式に変換する', () => {
    const result = mapMfRowsToPreview(
      [makeMfRow({ date: '2026/1/5' })],
      categories,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows[0].date).toBe('2026-01-05');
    }
  });

  it('振替行をスキップする', () => {
    const result = mapMfRowsToPreview(
      [makeMfRow({ transfer: '1' }), makeMfRow({ transfer: '0' })],
      categories,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows).toHaveLength(1);
    }
  });

  it('不正な日付でエラーを返す', () => {
    const result = mapMfRowsToPreview(
      [makeMfRow({ date: '2026-06-15' })],
      categories,
    );
    expect(result.ok).toBe(false);
  });

  it('カンマ付き金額をパースできる', () => {
    const result = mapMfRowsToPreview(
      [makeMfRow({ amount: '1,500' })],
      categories,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows[0].amount).toBe(1500);
    }
  });

  it('不正な金額でエラーを返す', () => {
    const result = mapMfRowsToPreview(
      [makeMfRow({ amount: '-100' })],
      categories,
    );
    expect(result.ok).toBe(false);
  });

  it('メモの空文字をnullに変換する', () => {
    const result = mapMfRowsToPreview(
      [makeMfRow({ memo: '' })],
      categories,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows[0].memo).toBeNull();
    }
  });

  it('メモの値を保持する', () => {
    const result = mapMfRowsToPreview(
      [makeMfRow({ memo: 'ランチ代' })],
      categories,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows[0].memo).toBe('ランチ代');
    }
  });

  it('収入カテゴリを正しく判定する', () => {
    const result = mapMfRowsToPreview(
      [makeMfRow({ majorCategory: '給与', amount: '300000' })],
      categories,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows[0].type).toBe('income');
      expect(result.rows[0].categoryId).toBe('cat-salary');
    }
  });
});

// ── ラウンドトリップ ───────────────────────────────

describe('ラウンドトリップ（エクスポート→インポート）', () => {
  it('エクスポートしたCSVを再インポートできる', () => {
    const txs = [
      makeTx({ id: 'tx-1', date: '2026-06-15', amount: 850, memo: 'ランチ', categoryName: '食費' }),
      makeTx({ id: 'tx-2', date: '2026-06-10', amount: 300000, type: 'income', categoryName: '給与', category: { id: 'cat-salary', name: '給与', icon: null, type: 'income', sort_order: 1 } }),
    ];
    const categories: Category[] = [
      makeCategory('食費', 'expense', 'cat-food'),
      makeCategory('給与', 'income', 'cat-salary'),
    ];

    const csv = generateMfCsv(txs);
    const rows = parseCsvRows(csv);
    const parsed = parseMfCsvRows(rows);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const mapped = mapMfRowsToPreview(parsed.rows, categories);
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;

    expect(mapped.rows).toHaveLength(2);
    expect(mapped.rows[0].date).toBe('2026-06-15');
    expect(mapped.rows[0].amount).toBe(850);
    expect(mapped.rows[0].categoryId).toBe('cat-food');
    expect(mapped.rows[0].memo).toBe('ランチ');

    expect(mapped.rows[1].date).toBe('2026-06-10');
    expect(mapped.rows[1].amount).toBe(300000);
    expect(mapped.rows[1].type).toBe('income');
    expect(mapped.rows[1].categoryId).toBe('cat-salary');
  });
});
