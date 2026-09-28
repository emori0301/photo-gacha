import type { Metadata, Viewport } from "next";
import {
  Dela_Gothic_One,
  DM_Mono,
  Zen_Kaku_Gothic_New,
} from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const display = Dela_Gothic_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-dela",
  display: "swap",
  preload: false,
});

const body = Zen_Kaku_Gothic_New({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-zen",
  display: "swap",
  preload: false,
});

const mono = DM_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-dmmono",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "PhotoGacha", template: "%s | PhotoGacha" },
  description:
    "撮った写真が、ガチャになる。写真をカードにして、パックを作って、みんなで引き合おう。",
  applicationName: "PhotoGacha",
  // iPhone でホーム画面に追加したときの名前と、上のステータスバーの見た目（明るい地に黒い文字）
  appleWebApp: {
    capable: true,
    title: "PhotoGacha",
    statusBarStyle: "default",
  },
  // ポイントなどの数字が電話番号のリンクにならないように
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#f4efe6",
  // ホーム画面から開いたとき、画面の端（ホームバーの裏）まで使う。重ならない余白は env(safe-area-inset-*) で取る
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ja"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
    >
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
