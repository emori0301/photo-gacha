import type { Metadata } from "next";
import { CollectionView } from "@/components/collection/collection-view";

export const metadata: Metadata = { title: "図鑑" };

export default function CollectionPage() {
  return <CollectionView />;
}
