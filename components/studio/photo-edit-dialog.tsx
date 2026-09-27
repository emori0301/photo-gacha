"use client";

import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/field";
import type { Rarity } from "@/lib/constants/rarity";
import { errorMessage, trpc } from "@/lib/trpc/client";
import { RarityPicker } from "./rarity-picker";

export type EditablePhoto = {
  id: string;
  name: string;
  description: string | null;
  rarity: Rarity;
};

export function PhotoEditDialog({
  photo,
  onOpenChange,
}: {
  photo: EditablePhoto | null;
  onOpenChange: (open: boolean) => void;
}) {
  const id = useId();
  const utils = trpc.useUtils();
  const update = trpc.image.update.useMutation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rarity, setRarity] = useState<Rarity>("N");

  useEffect(() => {
    if (photo) {
      setName(photo.name);
      setDescription(photo.description ?? "");
      setRarity(photo.rarity);
    }
  }, [photo]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photo) return;
    try {
      await update.mutateAsync({ id: photo.id, name, description, rarity });
      toast.success("カードを更新しました");
      void utils.image.mine.invalidate();
      void utils.pack.invalidate();
      void utils.collection.invalidate();
      onOpenChange(false);
    } catch (error) {
      toast.error(errorMessage(error, "更新に失敗しました"));
    }
  };

  return (
    <Dialog open={!!photo} onOpenChange={onOpenChange}>
      {photo && (
        <DialogContent title="カードを編集">
          <form onSubmit={save} className="flex min-h-0 flex-1 flex-col">
            <DialogBody className="space-y-4">
              <Field
                label="タイトル"
                htmlFor={`${id}-name`}
                counter={{ value: name.length, max: 40 }}
              >
                <Input
                  id={`${id}-name`}
                  value={name}
                  maxLength={40}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </Field>
              <Field
                label="ひとこと（任意）"
                htmlFor={`${id}-desc`}
                counter={{ value: description.length, max: 200 }}
              >
                <Textarea
                  id={`${id}-desc`}
                  value={description}
                  maxLength={200}
                  rows={3}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </Field>
              <Field label="レア度">
                <RarityPicker value={rarity} onChange={setRarity} />
              </Field>
            </DialogBody>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost">やめる</Button>
              </DialogClose>
              <Button type="submit" disabled={!name.trim() || update.isPending}>
                {update.isPending ? "保存中…" : "保存"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      )}
    </Dialog>
  );
}
