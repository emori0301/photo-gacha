"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { RarityTag } from "@/components/cards/rarity";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState, Skeleton } from "@/components/common/empty-state";
import { CapsuleMark } from "@/components/shell/logo";
import { Button } from "@/components/ui/button";
import { PACK_CREATE_REWARD } from "@/lib/constants/points";
import { RARITY_LIST } from "@/lib/constants/rarity";
import { errorMessage, trpc } from "@/lib/trpc/client";
import { formatPercent } from "@/lib/utils";
import { type EditablePack, PackEditorDialog } from "./pack-editor-dialog";

export function PackManager({ onGoToPhotos }: { onGoToPhotos: () => void }) {
  const utils = trpc.useUtils();
  const packs = trpc.pack.mine.useQuery();
  const photos = trpc.image.mine.useQuery();
  const remove = trpc.pack.delete.useMutation();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<EditablePack | null>(null);
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(
    null,
  );

  const photoList = photos.data ?? [];

  const openEditor = (pack: EditablePack | null) => {
    setEditing(pack);
    setEditorOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await remove.mutateAsync({ id: deleting.id });
      toast.success("パックを削除しました");
      void utils.pack.invalidate();
      void utils.image.mine.invalidate();
      void utils.user.me.invalidate();
      void utils.collection.stats.invalidate();
    } catch (error) {
      toast.error(errorMessage(error, "削除に失敗しました"));
    } finally {
      setDeleting(null);
    }
  };

  if (packs.isLoading || photos.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  if (photoList.length === 0) {
    return (
      <EmptyState
        title="まずは写真をカードにしよう"
        action={<Button onClick={onGoToPhotos}>写真を登録する</Button>}
      >
        パックには自分のカードを入れられます。1 枚からでも作れます。
      </EmptyState>
    );
  }

  const photoById = new Map(photoList.map((p) => [p.id, p]));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-2">
          パックを作ると +{PACK_CREATE_REWARD}
          pt。ガチャ画面にみんなのパックとして並びます。
        </p>
        <Button onClick={() => openEditor(null)}>
          <Plus />
          新しいパック
        </Button>
      </div>

      {!packs.data?.length ? (
        <EmptyState
          title="まだパックがありません"
          action={
            <Button onClick={() => openEditor(null)}>
              <Plus />
              最初のパックを作る
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {packs.data.map((pack) => {
            const cards = pack.imageIds
              .map((id) => photoById.get(id))
              .filter((p) => p !== undefined);
            return (
              <li
                key={pack.id}
                className="flex flex-col gap-4 rounded-2xl border-2 border-ink bg-card p-4 shadow-hard-sm sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border-2 border-ink bg-paper-2">
                    {pack.thumbnailUrl ? (
                      <Image
                        src={pack.thumbnailUrl}
                        alt=""
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    ) : (
                      <CapsuleMark className="absolute inset-0 m-auto size-9" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-bold">{pack.name}</p>
                    <p className="text-xs text-ink-2">
                      全 {pack.imageIds.length} 種
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-x-2.5 gap-y-1">
                      {RARITY_LIST.map((r) => (
                        <span
                          key={r}
                          className="inline-flex items-center gap-1 font-mono text-[11px] text-ink-2"
                        >
                          <RarityTag rarity={r} size="sm" />
                          {formatPercent(pack.rarityRates[r])}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex -space-x-5 pl-1">
                  {cards.slice(0, 5).map((c, i) => (
                    <div
                      key={c.id}
                      className="relative size-11 overflow-hidden rounded-lg border-2 border-ink bg-paper-2"
                      style={{ transform: `rotate(${(i - 2) * 5}deg)` }}
                    >
                      <Image
                        src={c.imageUrl}
                        alt=""
                        fill
                        sizes="44px"
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 sm:ml-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openEditor(pack)}
                  >
                    <Pencil />
                    編集
                  </Button>
                  <Button
                    variant="danger"
                    size="icon-sm"
                    aria-label={`${pack.name} を削除`}
                    onClick={() =>
                      setDeleting({ id: pack.id, name: pack.name })
                    }
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <PackEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        pack={editing}
        photos={photoList}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`「${deleting?.name ?? ""}」を削除しますか？`}
        confirmLabel="削除する"
        pending={remove.isPending}
        onConfirm={confirmDelete}
      >
        作成ボーナスの {PACK_CREATE_REWARD}pt
        は返却されます。すでに引かれたカードは、引いた人の図鑑に残ります。
      </ConfirmDialog>
    </div>
  );
}
