"use client";

import { useEffect, useRef, useState } from "react";
import { Images, X } from "lucide-react";
import { captureVideoFrameToBase64 } from "@/lib/image-resize";

type Props = {
  // シャッター押下でフレームを取り込んだとき。
  onCapture: (base64: string, mediaType: "image/jpeg") => void;
  // 「アルバム」選択時（親が隠し input を開く）。
  onPickAlbum: () => void;
  // ×（閉じる）。
  onClose: () => void;
  // カメラ未対応・権限拒否など、起動できなかったとき（親がフォールバックする）。
  onUnsupported: () => void;
};

// アプリ内カメラ。getUserMedia の映像を <video> に流し、シャッターで現在フレームを
// canvas へ転写する。OS のカメラアプリを使わないためシャッター音は鳴らない。
export function ReceiptCamera({
  onCapture,
  onPickAlbum,
  onClose,
  onUnsupported,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);

  // コールバックは最新値を ref 経由で参照する（親の再レンダリングで起動 effect が
  // 再実行され、カメラのストリームが停止→再取得されるのを防ぐ）。
  const onUnsupportedRef = useRef(onUnsupported);
  useEffect(() => {
    onUnsupportedRef.current = onUnsupported;
  });

  useEffect(() => {
    let cancelled = false; // Strict Mode の二重マウント・即アンマウント対策

    const stop = () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };

    (async () => {
      try {
        if (typeof navigator.mediaDevices?.getUserMedia !== "function") {
          onUnsupportedRef.current();
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          // 取得完了前にアンマウントされていたら即解放する。
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => {});
        }
        setReady(true);
      } catch {
        if (!cancelled) onUnsupportedRef.current();
      }
    })();

    return () => {
      cancelled = true;
      stop();
    };
    // マウント時に一度だけカメラを起動する（コールバックは ref 経由で最新を参照）。
  }, []);

  function shoot() {
    const video = videoRef.current;
    if (!video) return;
    try {
      const { base64, mediaType } = captureVideoFrameToBase64(video);
      // 取り込んだら即カメラを解放する。
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      onCapture(base64, mediaType);
    } catch {
      onUnsupported();
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black">
      {/* 映像プレビュー */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* 閉じる（左上） */}
      <button
        type="button"
        onClick={onClose}
        aria-label="カメラを閉じる"
        className="absolute left-4 top-[calc(12px+env(safe-area-inset-top))] z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur active:scale-95"
      >
        <X className="h-6 w-6" />
      </button>

      {/* ガイド文言 */}
      <p className="absolute inset-x-0 top-[calc(20px+env(safe-area-inset-top))] z-0 text-center text-sm text-white/90 drop-shadow">
        レシート全体が入るように撮影
      </p>

      {/* 下部の操作バー */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between px-8 pb-[calc(28px+env(safe-area-inset-bottom))] pt-6">
        {/* アルバム */}
        <button
          type="button"
          onClick={onPickAlbum}
          aria-label="アルバムから選ぶ"
          className="flex h-12 w-12 flex-col items-center justify-center rounded-xl text-white active:scale-95"
        >
          <Images className="h-6 w-6" />
          <span className="mt-0.5 text-[10px]">アルバム</span>
        </button>

        {/* シャッター */}
        <button
          type="button"
          onClick={shoot}
          disabled={!ready}
          aria-label="撮影"
          className="flex h-[72px] w-[72px] items-center justify-center rounded-full ring-4 ring-white/80 transition active:scale-95 disabled:opacity-50"
        >
          <span className="h-[58px] w-[58px] rounded-full bg-white" />
        </button>

        {/* 左右対称のためのスペーサー */}
        <span className="h-12 w-12" />
      </div>
    </div>
  );
}
