"use client";

import { Check, ImagePlus } from "lucide-react";
import Image from "next/image";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { RarityTag } from "@/components/cards/rarity";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/field";
import {
  ACCEPT_IMAGES,
  checkImageFile,
  uploadImage,
} from "@/lib/client/upload";
import {
  PACK_CREATE_REWARD,
  PACK_REWARD_DAILY_LIMIT,
} from "@/lib/constants/points";
import {
  DEFAULT_RARITY_RATES,
  RARITY_LIST,
  type Rarity,
  type RarityRates,
} from "@/lib/constants/rarity";
import { isValidRarityRates } from "@/lib/gacha";
import { errorMessage, trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { RateEditor } from "./rate-editor";

export type EditablePack = {
  id: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  imageIds: string[];
  rarityRates: RarityRates;
};

type Photo = { id: string; name: string; imageUrl: string; rarity: Rarity };

export function PackEditorDialog({
  open,
  onOpenChange,
  pack,
  photos,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null なら新規作成 */
  pack: EditablePack | null;
  photos: Photo[];
}) {
  const id = useId();
  const utils = trpc.useUtils();
  const create = trpc.pack.create.useMutation();
  const update = trpc.pack.update.useMutation();
  const coverInput = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cover, setCover] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rates, setRates] = useState<RarityRates>(DEFAULT_RARITY_RATES);
  const [autoBalance, setAutoBalance] = useState(true);
  const [filter, setFilter] = useState<Rarity | "ALL">("ALL");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [triedSubmit, setTriedSubmit] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(pack?.name ?? "");
    setDescription(pack?.description ?? "");
    setCover(pack?.thumbnailUrl ?? null);
    setSelected(new Set(pack?.imageIds ?? []));
    setRates(pack?.rarityRates ?? { ...DEFAULT_RARITY_RATES });
    setFilter("ALL");
    setTriedSubmit(false);
  }, [open, pack]);

  const countByRarity = useMemo(() => {
    const counts: Partial<Record<Rarity, number>> = {};
    for (const p of photos) {
      if (selected.has(p.id)) counts[p.rarity] = (counts[p.rarity] ?? 0) + 1;
    }
    return counts;
  }, [photos, selected]);

  const visiblePhotos =
    filter === "ALL" ? photos : photos.filter((p) => p.rarity === filter);
  const allVisibleSelected =
    visiblePhotos.length > 0 && visiblePhotos.every((p) => selected.has(p.id));
  // 選べる写真の中にカバーが無い（アップロードした画像など）場合も表示する
  const coverIsPhoto =
    cover !== null && photos.some((p) => p.imageUrl === cover);

  const toggle = (photoId: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });

  const toggleVisible = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const p of visiblePhotos) {
        if (allVisibleSelected) next.delete(p.id);
        else next.add(p.id);
      }
      return next;
    });

  const onCoverFile = async (file: File | undefined) => {
    if (!file) return;
    const problem = checkImageFile(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    setUploadingCover(true);
    try {
      setCover(await uploadImage(file));
    } catch (error) {
      toast.error(errorMessage(error, "アップロードに失敗しました"));
    } finally {
      setUploadingCover(false);
      if (coverInput.current) coverInput.current.value = "";
    }
  };

  const problems = [
    !name.trim() && "パック名を入力してください",
    selected.size === 0 && "カードを 1 枚以上選んでください",
    !isValidRarityRates(rates) && "排出率の合計を 100% にしてください",
  ].filter(Boolean) as string[];

  const pending = create.isPending || update.isPending;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setTriedSubmit(true);
    if (problems.length) return;
    const input = {
      name,
      description,
      thumbnailUrl: cover,
      // 選択の順番ではなく一覧の並び順で保存する
      imageIds: photos.filter((p) => selected.has(p.id)).map((p) => p.id),
      rarityRates: rates,
    };
    try {
      if (pack) {
        await update.mutateAsync({ id: pack.id, ...input });
        toast.success("パックを保存しました");
      } else {
        const created = await create.mutateAsync(input);
        toast.success(
          created.bonusGranted > 0
            ? `パックを作りました（+${created.bonusGranted}pt）`
            : "パックを作りました（今日の作成ボーナスは上限に達しています）",
        );
        void utils.user.me.invalidate();
      }
      void utils.pack.invalidate();
      void utils.image.mine.invalidate();
      void utils.collection.stats.invalidate();
      onOpenChange(false);
    } catch (error) {
      toast.error(errorMessage(error, "保存に失敗しました"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={pack ? "パックを編集" : "新しいパック"}
        description={
          pack
            ? undefined
            : `作ると +${PACK_CREATE_REWARD}pt（1 日 ${PACK_REWARD_DAILY_LIMIT} 回まで）。削除すると返却します。`
        }
        className="max-w-4xl"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <form
          onSubmit={save}
          className="flex min-h-0 flex-1 flex-col"
          noValidate
        >
          <DialogBody className="space-y-8">
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="パック名"
                htmlFor={`${id}-name`}
                counter={{ value: name.length, max: 30 }}
              >
                <Input
                  id={`${id}-name`}
                  value={name}
                  maxLength={30}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例: 夏休みの記録"
                  aria-invalid={triedSubmit && !name.trim()}
                />
              </Field>
              <Field
                label="説明（任意）"
                htmlFor={`${id}-desc`}
                counter={{ value: description.length, max: 120 }}
              >
                <Textarea
                  id={`${id}-desc`}
                  value={description}
                  maxLength={120}
                  rows={1}
                  className="min-h-11"
                  onChange={(e) => setDescription(e.target.value)}
                />
              </Field>
            </div>

            <fieldset>
              <legend className="mb-2 text-sm font-bold">
                カバー画像（任意）
              </legend>
              <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
                <button
                  type="button"
                  onClick={() => coverInput.current?.click()}
                  disabled={uploadingCover}
                  className="grid size-16 shrink-0 place-items-center rounded-xl border-2 border-dashed border-ink/50 bg-paper text-ink-2 hover:bg-paper-2"
                  aria-label="カバー画像をアップロード"
                >
                  <ImagePlus
                    className={cn("size-5", uploadingCover && "animate-pulse")}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => setCover(null)}
                  aria-pressed={cover === null}
                  className={cn(
                    "size-16 shrink-0 rounded-xl border-2 border-ink bg-paper text-xs font-bold",
                    cover === null && "ring-4 ring-mustard",
                  )}
                >
                  なし
                </button>
                {cover && !coverIsPhoto && (
                  <button
                    type="button"
                    aria-pressed
                    className="relative size-16 shrink-0 overflow-hidden rounded-xl border-2 border-ink ring-4 ring-mustard"
                  >
                    <Image
                      src={cover}
                      alt="アップロードしたカバー"
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </button>
                )}
                {photos.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setCover(p.imageUrl)}
                    aria-pressed={cover === p.imageUrl}
                    aria-label={`${p.name} をカバーにする`}
                    className={cn(
                      "relative size-16 shrink-0 overflow-hidden rounded-xl border-2 border-ink",
                      cover === p.imageUrl && "ring-4 ring-mustard",
                    )}
                  >
                    <Image
                      src={p.imageUrl}
                      alt=""
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
              <input
                ref={coverInput}
                type="file"
                accept={ACCEPT_IMAGES}
                className="sr-only"
                tabIndex={-1}
                onChange={(e) => onCoverFile(e.target.files?.[0])}
              />
            </fieldset>

            <fieldset>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <legend className="text-sm font-bold">
                  入れるカード
                  <span className="ml-2 font-mono text-ink-2">
                    {selected.size} 枚
                  </span>
                </legend>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(["ALL", ...RARITY_LIST] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      aria-pressed={filter === r}
                      onClick={() => setFilter(r)}
                      className={cn(
                        "h-7 rounded-full border-2 border-ink px-2.5 text-xs font-bold",
                        filter === r ? "bg-ink text-paper" : "bg-card",
                      )}
                    >
                      {r === "ALL" ? "すべて" : r}
                    </button>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleVisible}
                    disabled={visiblePhotos.length === 0}
                  >
                    {allVisibleSelected ? "表示中を外す" : "表示中を全部入れる"}
                  </Button>
                </div>
              </div>
              {triedSubmit && selected.size === 0 && (
                <p
                  role="alert"
                  className="mb-2 text-sm font-medium text-red-deep"
                >
                  カードを 1 枚以上選んでください
                </p>
              )}
              <ul className="grid max-h-[340px] grid-cols-3 gap-2 overflow-y-auto rounded-2xl border-2 border-ink/15 bg-paper p-2 sm:grid-cols-5 md:grid-cols-6">
                {visiblePhotos.map((p) => {
                  const on = selected.has(p.id);
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => toggle(p.id)}
                        aria-pressed={on}
                        aria-label={`${p.name}（${p.rarity}）`}
                        className={cn(
                          "relative block aspect-4/5 w-full overflow-hidden rounded-xl border-2 border-ink transition-transform",
                          on
                            ? "ring-4 ring-red"
                            : "opacity-75 hover:opacity-100",
                        )}
                      >
                        <Image
                          src={p.imageUrl}
                          alt=""
                          fill
                          sizes="120px"
                          className="object-cover"
                        />
                        <RarityTag
                          rarity={p.rarity}
                          size="sm"
                          className="absolute top-1 left-1"
                        />
                        <span
                          className={cn(
                            "absolute right-1 bottom-1 z-10 grid size-6 place-items-center rounded-full border-2 border-ink",
                            on ? "bg-red text-white" : "bg-card/90",
                          )}
                        >
                          {on && <Check className="size-3.5" strokeWidth={3} />}
                        </span>
                        <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-ink/70 px-1.5 pt-4 pb-1 pr-8 text-left text-[11px] font-bold text-white">
                          {p.name}
                        </span>
                      </button>
                    </li>
                  );
                })}
                {visiblePhotos.length === 0 && (
                  <li className="col-span-full py-6 text-center text-sm text-ink-2">
                    このレア度のカードはありません
                  </li>
                )}
              </ul>
            </fieldset>

            <fieldset>
              <legend className="mb-3 text-sm font-bold">排出率</legend>
              <RateEditor
                rates={rates}
                onChange={setRates}
                autoBalance={autoBalance}
                onAutoBalanceChange={setAutoBalance}
                countByRarity={countByRarity}
              />
            </fieldset>
          </DialogBody>
          <DialogFooter>
            {triedSubmit && problems.length > 0 && (
              <p className="mr-auto text-sm font-medium text-red-deep">
                {problems[0]}
              </p>
            )}
            <DialogClose asChild>
              <Button variant="ghost">やめる</Button>
            </DialogClose>
            <Button type="submit" disabled={pending || uploadingCover}>
              {pending ? "保存中…" : pack ? "保存" : "パックを作る"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
