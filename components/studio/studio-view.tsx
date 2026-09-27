"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PageTitle } from "@/components/common/empty-state";
import { Segmented } from "@/components/ui/segmented";
import { PackManager } from "./pack-manager";
import { PhotoList } from "./photo-list";
import { PhotoUploader } from "./photo-uploader";

type Tab = "photos" | "packs";

export function StudioView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tab: Tab = params.get("tab") === "packs" ? "packs" : "photos";

  const setTab = (next: Tab) => {
    router.replace(next === "photos" ? pathname : `${pathname}?tab=${next}`, {
      scroll: false,
    });
  };

  return (
    <>
      <PageTitle
        title="工房"
        lead="写真をカードにして、パックに詰めよう。"
        action={
          <Segmented
            label="工房のメニュー"
            value={tab}
            onChange={setTab}
            options={[
              { value: "photos", label: "カード" },
              { value: "packs", label: "パック" },
            ]}
          />
        }
      />
      {tab === "photos" ? (
        <>
          <PhotoUploader />
          <PhotoList />
        </>
      ) : (
        <PackManager onGoToPhotos={() => setTab("photos")} />
      )}
    </>
  );
}
