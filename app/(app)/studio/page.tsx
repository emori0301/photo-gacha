import type { Metadata } from "next";
import { Suspense } from "react";
import { StudioView } from "@/components/studio/studio-view";

export const metadata: Metadata = { title: "工房" };

export default function StudioPage() {
  return (
    <Suspense>
      <StudioView />
    </Suspense>
  );
}
