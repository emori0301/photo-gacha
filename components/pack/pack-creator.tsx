"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  RARITY_COLORS,
  RARITY_LABELS,
  RARITY_LIST,
  type RarityRates,
  DEFAULT_RARITY_RATES,
  TOTAL_RARITY_RATE,
  RARITY_RATE_TOLERANCE,
} from "@/lib/constants/rarity";
import { PACK_CREATE_REWARD } from "@/lib/constants/points";
import { uploadImage } from "@/lib/utils/image-upload";

type SelectedImage = {
  imageId: string;
  weight: number;
};

export function PackCreator({ userId }: { userId: string }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState<string>("");
  const [selectedImages, setSelectedImages] = useState<
    Map<string, SelectedImage>
  >(new Map());
  const [rarityRates, setRarityRates] =
    useState<RarityRates>(DEFAULT_RARITY_RATES);
  const router = useRouter();

  const { data: images } = trpc.image.getByUserId.useQuery(
    { userId },
    { enabled: !!userId },
  );
  const utils = trpc.useUtils();
  const createPack = trpc.pack.create.useMutation({
    onSuccess: () => {
      toast.success(
        `パックの作成に成功しました！${PACK_CREATE_REWARD}ポイント獲得しました！`,
      );
      utils.user.getPoints.invalidate({ userId });
      router.refresh();
      setName("");
      setDescription("");
      setSelectedImages(new Map());
      setThumbnailUrl("");
    },
    onError: (error) => {
      toast.error("パックの作成に失敗しました", {
        description: error.message || "エラーが発生しました",
      });
    },
  });

  const toggleImage = (imageId: string) => {
    const newSelected = new Map(selectedImages);
    if (newSelected.has(imageId)) {
      newSelected.delete(imageId);
    } else {
      newSelected.set(imageId, { imageId, weight: 1 });
    }
    setSelectedImages(newSelected);
  };

  const handleThumbnailChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const imageUrl = await uploadImage(file);
      setThumbnailUrl(imageUrl);
    } catch {
      toast.error("サムネイルのアップロードに失敗しました");
    }
  };

  const handleRarityRateChange = (rarity: keyof RarityRates, value: number) => {
    const newRates = { ...rarityRates };
    newRates[rarity] = Math.max(0, Math.min(100, value));
    setRarityRates(newRates);
  };

  const totalRate = Object.values(rarityRates).reduce(
    (sum, rate) => sum + rate,
    0,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedImages.size === 0) {
      toast.error("最低1枚の画像を選択してください");
      return;
    }

    if (Math.abs(totalRate - TOTAL_RARITY_RATE) > RARITY_RATE_TOLERANCE) {
      toast.error("レア度の排出率の合計が100%になるように設定してください");
      return;
    }

    try {
      await createPack.mutateAsync({
        name,
        description: description || undefined,
        thumbnailUrl: thumbnailUrl || undefined,
        packImages: Array.from(selectedImages.keys()).map((imageId) => ({
          imageId,
          weight: 1,
        })),
        rarityRates: JSON.stringify(rarityRates),
        userId,
      });
      setThumbnailUrl("");
      setRarityRates(DEFAULT_RARITY_RATES);
    } catch {
      // エラーはonErrorで処理される
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
      <div>
        <Label
          htmlFor="pack-name"
          className="text-zinc-200 mb-3 block text-base font-semibold"
        >
          パック名
        </Label>
        <Input
          id="pack-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
        />
      </div>
      <div>
        <Label
          htmlFor="pack-description"
          className="text-zinc-200 mb-3 block text-base font-semibold"
        >
          説明（オプション）
        </Label>
        <Input
          id="pack-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
        />
      </div>
      <div>
        <Label
          htmlFor="thumbnail"
          className="text-zinc-200 mb-3 block text-base font-semibold"
        >
          サムネイル画像（オプション）
        </Label>
        <Input
          id="thumbnail"
          type="file"
          accept="image/*"
          onChange={handleThumbnailChange}
          className="bg-zinc-800/50 border-zinc-700 text-zinc-100 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-r file:from-zinc-700 file:to-zinc-600 file:text-white hover:file:from-zinc-600 hover:file:to-zinc-500 transition-all"
        />
        {thumbnailUrl && (
          <Image
            src={thumbnailUrl}
            alt="サムネイル"
            width={128}
            height={128}
            className="mt-3 w-32 h-32 object-cover rounded-lg border-2 border-zinc-700 shadow-lg"
            unoptimized
          />
        )}
      </div>
      <div>
        <Label className="text-zinc-200 mb-3 block text-base font-semibold">
          Rarity Rates (Total: {totalRate}%)
        </Label>
        <div className="grid grid-cols-5 gap-4 mb-6 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
          {RARITY_LIST.map((rarity) => (
            <div key={rarity} className="space-y-2">
              <Label className="text-xs text-zinc-300 block text-center">
                {RARITY_LABELS[rarity]}
              </Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={rarityRates[rarity]}
                onChange={(e) =>
                  handleRarityRateChange(
                    rarity,
                    parseFloat(e.target.value) || 0,
                  )
                }
                className="bg-zinc-700 border-zinc-600 text-white text-sm h-10 text-center focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20"
              />
              <div className="text-xs text-zinc-400 text-center">
                {rarityRates[rarity]}%
              </div>
            </div>
          ))}
        </div>
        {Math.abs(totalRate - 100) > 0.01 && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
            <p className="text-sm text-red-400 text-center">
              Total must be 100% (Current: {totalRate.toFixed(1)}%)
            </p>
          </div>
        )}
      </div>
      <div>
        <Label className="text-zinc-200 mb-3 block text-base font-semibold">
          Select Images:{" "}
          <span className="text-amber-400 font-bold">
            {selectedImages.size} selected
          </span>
        </Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
          {images?.map((image) => {
            const isSelected = selectedImages.has(image.id);
            const selectedData = selectedImages.get(image.id);
            return (
              <button
                key={image.id}
                type="button"
                className={`w-full text-left p-2 transition-all rounded-lg border ${
                  isSelected
                    ? "ring-4 ring-amber-400 shadow-lg shadow-amber-400/50 scale-105 bg-gradient-to-br from-zinc-800/80 to-zinc-700/80 border-amber-400"
                    : "bg-gradient-to-br from-zinc-900/50 to-zinc-800/50 hover:from-zinc-800/70 hover:to-zinc-700/70 border-zinc-700"
                }`}
                onClick={() => toggleImage(image.id)}
              >
                <div className="relative">
                  <Image
                    src={image.imageUrl}
                    alt={image.name}
                    width={200}
                    height={128}
                    className="w-full h-32 object-cover rounded"
                    unoptimized
                  />
                  <Badge
                    className={`absolute top-2 right-2 ${RARITY_COLORS[image.rarity]} text-white text-xs`}
                  >
                    {RARITY_LABELS[image.rarity]}
                  </Badge>
                </div>
                <p className="text-sm mt-1 text-white">{image.name}</p>
              </button>
            );
          })}
        </div>
      </div>
      <Button
        type="submit"
        disabled={selectedImages.size === 0}
        className="w-full bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-600 hover:via-yellow-600 hover:to-amber-600 text-white shadow-xl shadow-amber-500/50 disabled:opacity-50 transition-all duration-300 py-6 text-lg font-semibold"
      >
        パックを作成
      </Button>
    </form>
  );
}
