"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PhotoCard } from "@/components/cards/photo-card";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState, Skeleton } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { errorMessage, trpc } from "@/lib/trpc/client";
import { type EditablePhoto, PhotoEditDialog } from "./photo-edit-dialog";

export function PhotoList() {
  const utils = trpc.useUtils();
  const photos = trpc.image.mine.useQuery();
  const remove = trpc.image.delete.useMutation();
  const [editing, setEditing] = useState<EditablePhoto | null>(null);
  const [deleting, setDeleting] = useState<{
    id: string;
    name: string;
    bonus: number;
  } | null>(null);

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await remove.mutateAsync({ id: deleting.id });
      toast.success("カードを削除しました");
      void utils.image.mine.invalidate();
      void utils.user.me.invalidate();
    } catch (error) {
      toast.error(errorMessage(error, "削除に失敗しました"));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <section aria-labelledby="my-photos" className="mt-10">
      <h2 id="my-photos" className="mb-4 font-display text-xl">
        あなたのカード
        <span className="ml-2 font-sans text-sm font-bold text-ink-3">
          {photos.data?.length ?? ""}
        </span>
      </h2>
      {photos.isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <Skeleton className="aspect-[4/6]" />
          <Skeleton className="aspect-[4/6]" />
        </div>
      ) : !photos.data?.length ? (
        <EmptyState title="まだカードがありません">
          上のフォームから最初の 1 枚を登録しよう。
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {photos.data.map((photo) => {
            const inPack = photo._count.packImages;
            const pulled = photo._count.collections;
            const locked = inPack > 0 || pulled > 0;
            return (
              <li key={photo.id}>
                <PhotoCard
                  card={photo}
                  sizes="(min-width: 1024px) 210px, (min-width: 640px) 30vw, 45vw"
                  footer={
                    <div className="mt-1.5 space-y-2 px-0.5">
                      <p className="text-[11px] text-ink-2">
                        パック {inPack} ・ 引かれた {pulled}
                      </p>
                      <div className="flex gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="flex-1 shadow-none"
                          onClick={() => setEditing(photo)}
                        >
                          <Pencil />
                          編集
                        </Button>
                        <Button
                          variant="danger"
                          size="icon-sm"
                          aria-label={`${photo.name} を削除`}
                          title={
                            inPack > 0
                              ? "パックに入っているため削除できません"
                              : pulled > 0
                                ? "引かれたカードは削除できません"
                                : "削除"
                          }
                          disabled={locked}
                          onClick={() =>
                            setDeleting({
                              id: photo.id,
                              name: photo.name,
                              bonus: photo.bonusGranted,
                            })
                          }
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                  }
                />
              </li>
            );
          })}
        </ul>
      )}

      <PhotoEditDialog
        photo={editing}
        onOpenChange={(o) => !o && setEditing(null)}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`「${deleting?.name ?? ""}」を削除しますか？`}
        confirmLabel="削除する"
        pending={remove.isPending}
        onConfirm={confirmDelete}
      >
        {deleting?.bonus
          ? `登録ボーナスの ${deleting.bonus}pt を返却します。`
          : ""}
        この操作は取り消せません。
      </ConfirmDialog>
    </section>
  );
}
