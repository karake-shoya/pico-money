import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pico Money",
  description: "自分の収支だけをシンプルに把握する、ミニマルな家計簿。",
  applicationName: "Pico Money",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Pico Money",
  },
};

export const viewport: Viewport = {
  themeColor: "#2f6df6",
  width: "device-width",
  initialScale: 1,
  // 拡大を妨げない（アクセシビリティ: WCAG 1.4.4）
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
