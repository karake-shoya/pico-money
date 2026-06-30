"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Plus, Trash2 } from "lucide-react";
import { BottomSheet } from "@/components/BottomSheet";
import { TransactionForm, type GoalContext } from "./TransactionForm";
import { ReceiptCamera } from "./ReceiptCamera";
import { deleteTransaction } from "@/lib/actions/transactions";
import { scanReceipt } from "@/lib/actions/receipt";
import { resizeImageToBase64 } from "@/lib/image-resize";
import type { ReceiptPrefill } from "@/lib/receipt-input";
import type {
  Category,
  SavingsGoalWithProgress,
  TransactionWithCategory,
} from "@/lib/types";

type ModalContextValue = {
  // 新規登録モーダルを開く
  openNew: () => void;
  // 編集モーダルを開く
  openEdit: (tx: TransactionWithCategory) => void;
  // 目標への貯金（支出）モーダルを開く
  openContribute: (goal: { id: string; name: string }) => void;
};

const ModalContext = createContext<ModalContextValue | null>(null);

export function useTransactionModal() {
  const ctx = useContext(ModalContext);
  if (!ctx)
    throw new Error("useTransactionModal は Provider 内で使用してください");
  return ctx;
}

// アプリ全体に取引モーダルと FAB を提供する。
export function TransactionModalProvider({
  categories,
  goals = [],
  children,
}: {
  categories: Category[];
  goals?: SavingsGoalWithProgress[];
  children: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TransactionWithCategory | null>(null);
  // レシート読み取りによる新規入力の初期値。
  const [prefill, setPrefill] = useState<ReceiptPrefill | null>(null);
  // 目標への貯金モード（指定時は支出=貯金 固定で goal_id を紐付ける）。
  const [goalContext, setGoalContext] = useState<GoalContext | null>(null);
  // フォームを再マウントして初期 state を seed し直すためのキー。
  const [formKey, setFormKey] = useState(0);
  // 読み取り中のオーバーレイ表示。
  const [scanning, setScanning] = useState(false);
  // 読み取り失敗の注意書き（空フォームの先頭に出す）。
  const [scanNote, setScanNote] = useState<string | null>(null);
  // アプリ内カメラ（getUserMedia）の表示。
  const [cameraOpen, setCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openNew = useCallback(() => {
    setEditing(null);
    setPrefill(null);
    setGoalContext(null);
    setScanNote(null);
    setFormKey((k) => k + 1);
    setOpen(true);
  }, []);
  const openEdit = useCallback(
    (tx: TransactionWithCategory) => {
      setEditing(tx);
      setPrefill(null);
      // 貯金取引（goal_id 付き）の編集も貯金モードで開き、goal_id を保持する。
      const goal = tx.goal_id ? goals.find((g) => g.id === tx.goal_id) : null;
      setGoalContext(
        tx.goal_id ? { goalId: tx.goal_id, goalName: goal?.name ?? "貯金" } : null
      );
      setScanNote(null);
      setFormKey((k) => k + 1);
      setOpen(true);
    },
    [goals]
  );
  // 目標への貯金（支出）モーダルを開く。
  const openContribute = useCallback(
    (goal: { id: string; name: string }) => {
      setEditing(null);
      setPrefill(null);
      setGoalContext({ goalId: goal.id, goalName: goal.name });
      setScanNote(null);
      setFormKey((k) => k + 1);
      setOpen(true);
    },
    []
  );
  const close = useCallback(() => setOpen(false), []);

  // レシート読み取りを開始する。アプリ内カメラ（無音）が使えればそれを開き、
  // 使えない端末では従来の OS 選択ダイアログ（撮影/アルバム）にフォールバックする。
  function pickReceipt() {
    if (typeof navigator.mediaDevices?.getUserMedia === "function") {
      setCameraOpen(true);
    } else {
      fileInputRef.current?.click();
    }
  }

  // 読み取り失敗時は空フォームへフォールバックし、注意書きを添えて手入力を促す。
  function openEmptyFormWithNote(note: string) {
    setEditing(null);
    setPrefill(null);
    setGoalContext(null);
    setFormKey((k) => k + 1);
    setScanNote(note);
    setOpen(true);
  }

  // 縮小済み base64 を Claude へ渡して読み取り → フォームをプリフィル表示する共通処理。
  // ファイル選択経路・アプリ内カメラ経路の双方から呼ぶ。
  async function runScan(base64: string, mediaType: "image/jpeg" | "image/png") {
    setScanning(true);
    try {
      const result = await scanReceipt(base64, mediaType);
      if (result.ok) {
        setEditing(null);
        setGoalContext(null);
        setFormKey((k) => k + 1);
        setPrefill(result.prefill);
        setScanNote(null);
        setOpen(true);
      } else {
        openEmptyFormWithNote(result.error);
      }
    } catch {
      openEmptyFormWithNote("画像を処理できませんでした。手入力してください。");
    } finally {
      setScanning(false);
    }
  }

  // 画像選択 → 縮小 → 読み取り。
  async function handleReceiptFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // 同じファイルを再選択しても onChange が発火するようリセット。
    e.target.value = "";
    if (!file) return;
    try {
      const { base64, mediaType } = await resizeImageToBase64(file);
      await runScan(base64, mediaType);
    } catch {
      openEmptyFormWithNote("画像を処理できませんでした。手入力してください。");
    }
  }

  // 削除（編集時のみ）。ヘッダー左上のゴミ箱から実行する。
  const [isDeleting, startDelete] = useTransition();
  function handleDelete() {
    if (!editing) return;
    if (!confirm("この取引を削除しますか？")) return;
    startDelete(async () => {
      await deleteTransaction(editing.id);
      handleDone();
    });
  }

  function handleDone() {
    setOpen(false);
    router.refresh(); // サーバーデータを再取得
  }

  return (
    <ModalContext.Provider value={{ openNew, openEdit, openContribute }}>
      {children}

      {/* アルバム選択・カメラ非対応時のフォールバック用の隠し input。
          capture を付けないことで OS 側で「撮影/アルバム」を選べる。 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleReceiptFile}
        className="hidden"
      />

      {/* アプリ内カメラ（無音）。シャッターで現在フレームを取り込み読み取りへ。 */}
      {cameraOpen && (
        <ReceiptCamera
          onCapture={(base64, mediaType) => {
            setCameraOpen(false);
            void runScan(base64, mediaType);
          }}
          onPickAlbum={() => {
            setCameraOpen(false);
            fileInputRef.current?.click();
          }}
          onClose={() => setCameraOpen(false)}
          onUnsupported={() => {
            // カメラを使えない端末は従来の選択ダイアログへフォールバック。
            setCameraOpen(false);
            fileInputRef.current?.click();
          }}
        />
      )}

      {/* FAB（下部固定）。取引登録（＋）。レシート読み取りは入力画面の左上カメラから。 */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-[480px] flex-col items-end gap-3 px-4">
        <button
          type="button"
          onClick={openNew}
          aria-label="取引を登録"
          className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-brand)] text-white shadow-lg shadow-[var(--color-brand)]/30 transition active:scale-95"
        >
          <Plus className="h-7 w-7" strokeWidth={2.4} />
        </button>
      </div>

      {/* 読み取り中のオーバーレイ */}
      {scanning && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-3 bg-black/40 backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
          <p className="text-sm font-medium text-white">レシートを読み取り中…</p>
        </div>
      )}

      {/* ボトムシート モーダル */}
      {open && (
        <BottomSheet
          onClose={close}
          height="94dvh"
          fixedHeight
          title={editing ? "編集" : goalContext ? "貯金する" : "入力"}
          headerLeft={
            editing ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                aria-label="この取引を削除"
                className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-expense)] transition active:bg-[var(--color-bg)] disabled:opacity-60"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            ) : goalContext ? undefined : (
              // 新規入力時はレシート読み取りの導線（左上カメラ）。
              <button
                type="button"
                onClick={pickReceipt}
                aria-label="レシートを読み取る"
                className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-ink)] transition active:bg-[var(--color-bg)]"
              >
                <Camera className="h-5 w-5" />
              </button>
            )
          }
        >
          {scanNote && (
            <p className="mx-5 mb-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
              {scanNote}
            </p>
          )}
          <TransactionForm
            key={editing?.id ?? `new-${formKey}`}
            categories={categories}
            initial={editing}
            prefill={prefill}
            goalContext={goalContext}
            onDone={handleDone}
          />
        </BottomSheet>
      )}
    </ModalContext.Provider>
  );
}
