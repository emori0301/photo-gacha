import type { Metadata } from "next";
import { EarnView } from "@/components/earn/earn-view";

export const metadata: Metadata = { title: "ポイント" };

export default function EarnPage() {
  return <EarnView />;
}
