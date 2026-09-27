"use client";

import { ImagePlus, Upload } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { PhotoCard } from "@/components/cards/photo-card";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import {
  ACCEPT_IMAGES,
  checkImageFile,
  uploadImage,
} from "@/lib/client/upload";
import {
  IMAGE_REWARD_DAILY_LIMIT,
  IMAGE_UPLOAD_REWARD,
} from "@/lib/constants/points";
import type { Rarity } from "@/lib/constants/rarity";
import { errorMessage, trpc } from "@/lib/trpc/client";
import { cn, titleFromFilename } from "@/lib/utils";
import { RarityPicker } from "./rarity-picker";

export function PhotoUploader() {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();
  const create = trpc.image.create.useMutation();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rarity, setRarity] = useState<Rarity>("N");
  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState(false);

  // プレビュー用 URL の後始末
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const choose = (f: File | undefined | null) => {
    if (!f) return;
    const problem = checkImageFile(f);
    if (problem) {
      toast.error(problem);
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setName((prev) => prev || titleFromFilename(f.name));
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setName("");
    setDescription("");
    setRarity("N");
    if (inputRef.current) inputRef.current.value = "";
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !name.trim()) return;
    setPending(true);
    try {
      const imageUrl = await uploadImage(file);
      const created = await create.mutateAsync({
        name,
        description,
        imageUrl,
        rarity,
      });
      toast.success(
        created.bonusGranted > 0
          ? `カードにしました（+${created.bonusGranted}pt）`
          : "カードにしました（今日の登録ボーナスは上限に達しています）",
      );
      reset();
      void utils.image.mine.invalidate();
      void utils.user.me.invalidate();
    } catch (error) {
      toast.error(errorMessage(error, "登録に失敗しました"));
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="grid gap-6 rounded-3xl border-2 border-ink bg-card p-5 shadow-hard md:grid-cols-[240px_1fr] md:p-6"
    >
      <div className="group mx-auto w-full max-w-[240px]">
        {preview ? (
          <div className="space-y-2">
            <PhotoCard
              card={{
                name: name || "タイトル未設定",
                imageUrl: preview,
                rarity,
              }}
              unoptimized
              sizes="240px"
            />
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => inputRef.current?.click()}
            >
              別の写真にする
            </Button>
          </div>
        ) : (
          <label
            htmlFor={`${id}-file`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              choose(e.dataTransfer.files[0]);
            }}
            className={cn(
              "flex aspect-[4/5.4] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink/50 bg-paper p-4 text-center transition-colors",
              dragging ? "border-red bg-[#fff1ee]" : "hover:bg-paper-2",
              // 実体の input は視覚的に隠しているので、フォーカスはラベル側に表示する
              "group-has-[input:focus-visible]:outline-3 group-has-[input:focus-visible]:outline-offset-2 group-has-[input:focus-visible]:outline-rarity-sr",
            )}
          >
            <span className="grid size-12 place-items-center rounded-full border-2 border-ink bg-card">
              <ImagePlus className="size-5" />
            </span>
            <span className="font-bold">写真を選ぶ</span>
            <span className="text-xs text-ink-2">
              ドラッグ&ドロップでも OK
              <br />
              最大 8MB
            </span>
          </label>
        )}
        <input
          ref={inputRef}
          id={`${id}-file`}
          type="file"
          accept={ACCEPT_IMAGES}
          className="sr-only"
          onChange={(e) => choose(e.target.files?.[0])}
        />
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="font-display text-xl">写真をカードにする</h2>
          <p className="text-sm text-ink-2">
            登録するたびに +{IMAGE_UPLOAD_REWARD}pt（1 日{" "}
            {IMAGE_REWARD_DAILY_LIMIT}{" "}
            回まで）。作ったカードはパックに入れて、みんなに引いてもらえます。
          </p>
        </div>
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
            placeholder="例: 雨上がりの交差点"
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
            rows={2}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="撮ったときのこと、カードの裏話など"
          />
        </Field>
        <Field label="レア度">
          <RarityPicker value={rarity} onChange={setRarity} />
        </Field>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button type="submit" disabled={!file || !name.trim() || pending}>
            <Upload />
            {pending ? "登録中…" : "カードにする"}
          </Button>
          {file && (
            <Button variant="ghost" onClick={reset} disabled={pending}>
              クリア
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
