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
};

export const viewport: Viewport = {
  themeColor: "#f4efe6",
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
