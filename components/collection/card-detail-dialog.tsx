"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PhotoCard } from "@/components/cards/photo-card";
import { RARITY_TEXT } from "@/components/cards/rarity";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent } from "@/components/ui/dialog";
import { RARITY_META, type Rarity } from "@/lib/constants/rarity";
import { cn, formatDate } from "@/lib/utils";

export type CollectedCard = {
  id: string;
  count: number;
  obtainedAt: Date;
  image: {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string;
    rarity: Rarity;
    creatorName: string | null;
  };
};

async function download(url: string, name: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("download failed");
  const blob = await res.blob();
  const ext = blob.type.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = `${name.replace(/[\\/:*?"<>|]/g, "_")}.${ext}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // クリック直後に解放すると一部ブラウザで失敗するので少し待つ
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

export function CardDetailDialog({
  item,
  onOpenChange,
}: {
  item: CollectedCard | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [downloading, setDownloading] = useState(false);
  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      {item && (
        <DialogContent title={item.image.name} className="max-w-3xl">
          <DialogBody className="grid gap-6 pt-3 sm:grid-cols-[minmax(0,300px)_1fr]">
            <div className="mx-auto w-full max-w-[300px]">
              <PhotoCard card={item.image} size="lg" sizes="300px" priority />
            </div>
            <div className="space-y-5">
              <p
                className={cn(
                  "font-display text-2xl",
                  RARITY_TEXT[item.image.rarity],
                )}
              >
                {RARITY_META[item.image.rarity].name}
              </p>
              {item.image.description && (
                <p className="whitespace-pre-wrap break-words leading-relaxed">
                  {item.image.description}
                </p>
              )}
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                <dt className="text-ink-2">作者</dt>
                <dd className="font-bold">
                  {item.image.creatorName ?? "不明"}
                </dd>
                <dt className="text-ink-2">持っている枚数</dt>
                <dd className="font-mono font-bold">{item.count} 枚</dd>
                <dt className="text-ink-2">はじめて入手</dt>
                <dd className="font-bold">{formatDate(item.obtainedAt)}</dd>
              </dl>
              <Button
                variant="secondary"
                disabled={downloading}
                onClick={async () => {
                  setDownloading(true);
                  try {
                    await download(item.image.imageUrl, item.image.name);
                  } catch {
                    toast.error("ダウンロードに失敗しました");
                  } finally {
                    setDownloading(false);
                  }
                }}
              >
                <Download />
                {downloading ? "準備中…" : "画像を保存"}
              </Button>
            </div>
          </DialogBody>
        </DialogContent>
      )}
    </Dialog>
  );
}
