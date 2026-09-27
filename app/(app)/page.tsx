import type { Metadata } from "next";
import { GachaView } from "@/components/gacha/gacha-view";

export const metadata: Metadata = { title: "ガチャ" };

export default function GachaPage() {
  return <GachaView />;
}
