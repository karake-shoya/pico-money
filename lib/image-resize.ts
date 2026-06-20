// 撮影画像をクライアント側で縮小して base64 化する（ブラウザ専用）。
// 目的: (1) Sonnet の画像トークン削減（長辺1568pxで十分）、
//       (2) Server Action の本文上限(1MB)対策。

const MAX_EDGE = 1568; // 長辺の上限px。これ以上は Claude 側でも縮小される。
const QUALITY = 0.75; // JPEG 品質。レシートの文字が読めれば十分。

export type ResizedImage = {
  base64: string; // data: プレフィックス無しの純base64
  mediaType: "image/jpeg";
};

// 描画ソース（画像 / 映像）を長辺 MAX_EDGE・JPEG へ縮小し、base64 を返す共通処理。
function drawToBase64(
  source: CanvasImageSource,
  srcWidth: number,
  srcHeight: number
): ResizedImage {
  const { width, height } = fitWithin(srcWidth, srcHeight, MAX_EDGE);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas コンテキストを取得できませんでした。");
  ctx.drawImage(source, 0, 0, width, height);

  const dataUrl = canvas.toDataURL("image/jpeg", QUALITY);
  const base64 = dataUrl.split(",")[1] ?? "";
  if (!base64) throw new Error("画像の変換に失敗しました。");
  return { base64, mediaType: "image/jpeg" };
}

// File（カメラ/アルバム画像）を長辺 MAX_EDGE・JPEG へ縮小し、base64 を返す。
export async function resizeImageToBase64(file: File): Promise<ResizedImage> {
  const bitmap = await loadBitmap(file);
  return drawToBase64(bitmap, bitmap.width, bitmap.height);
}

// 再生中の <video> の現在フレームを長辺 MAX_EDGE・JPEG へ縮小し、base64 を返す。
// アプリ内カメラ（getUserMedia のプレビュー）からの取り込み用。File 版と縮小条件を揃える。
export function captureVideoFrameToBase64(video: HTMLVideoElement): ResizedImage {
  const sw = video.videoWidth;
  const sh = video.videoHeight;
  if (!sw || !sh) throw new Error("カメラ映像をまだ取得できていません。");
  return drawToBase64(video, sw, sh);
}

// createImageBitmap が使えればそれを、無ければ <img> 経由で読み込む。
async function loadBitmap(
  file: File
): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file);
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("画像の読み込みに失敗しました。"));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// 長辺が max を超えないようアスペクト比を保って縮小する（拡大はしない）。
function fitWithin(
  w: number,
  h: number,
  max: number
): { width: number; height: number } {
  const longest = Math.max(w, h);
  if (longest <= max) return { width: w, height: h };
  const scale = max / longest;
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
}
