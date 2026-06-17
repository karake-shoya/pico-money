import type { MetadataRoute } from "next";

// PWA マニフェスト（軽量）。ホーム画面追加に対応。
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pico Money",
    short_name: "Pico Money",
    description: "自分の収支だけをシンプルに把握する、ミニマルな家計簿。",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f7f9",
    theme_color: "#4f46e5",
    lang: "ja",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
