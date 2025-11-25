"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc/client";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Pencil } from "lucide-react";
import { RARITY_COLORS, RARITY_LABELS } from "@/lib/constants/rarity";
import { uploadImage } from "@/lib/utils/image-upload";
import Image from "next/image";

type SelectedImage = {
  imageId: string;
  weight: number;
};

export function PackEditor({ packId }: { packId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState<string>("");
  const [selectedImages, setSelectedImages] = useState<
    Map<string, SelectedImage>
  >(new Map());
  const router = useRouter();

  const { data: pack } = trpc.pack.getById.useQuery({ id: packId });
  const { data: images } = trpc.image.getAll.useQuery();
  const updatePack = trpc.pack.update.useMutation({
    onSuccess: () => {
      toast.success("パックの更新に成功しました！");
      router.refresh();
      setIsOpen(false);
    },
    onError: (error) => {
      toast.error("パックの更新に失敗しました", {
        description: error.message || "エラーが発生しました",
      });
    },
  });

  useEffect(() => {
    if (pack && isOpen) {
      setName(pack.name);
      setDescription(pack.description || "");
      setThumbnailUrl(pack.thumbnailUrl || "");
      const imageMap = new Map<string, SelectedImage>();
      pack.packImages.forEach((pi) => {
        imageMap.set(pi.imageId, { imageId: pi.imageId, weight: pi.weight });
      });
      setSelectedImages(imageMap);
    }
  }, [pack, isOpen]);

  const toggleImage = (imageId: string) => {
    const newSelected = new Map(selectedImages);
    if (newSelected.has(imageId)) {
      newSelected.delete(imageId);
    } else {
      newSelected.set(imageId, { imageId, weight: 1 });
    }
    setSelectedImages(newSelected);
  };

  const updateWeight = (imageId: string, weight: number) => {
    const newSelected = new Map(selectedImages);
    const current = newSelected.get(imageId);
    if (current) {
      newSelected.set(imageId, { ...current, weight: Math.max(1, weight) });
      setSelectedImages(newSelected);
    }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedImages.size === 0) {
      toast.error("最低1枚の画像を選択してください");
      return;
    }

    try {
      await updatePack.mutateAsync({
        id: packId,
        name,
        description: description || undefined,
        thumbnailUrl: thumbnailUrl || undefined,
        packImages: Array.from(selectedImages.values()),
      });
    } catch {
      // エラーはonErrorで処理される
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-slate-300 hover:text-white cursor-pointer"
        >
          <Pencil className="w-4 h-4 mr-2" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white">
            Edit Pack
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="edit-pack-name" className="text-slate-200">
              パック名
            </Label>
            <Input
              id="edit-pack-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="bg-slate-700/50 border-slate-600 text-slate-100 placeholder:text-slate-400"
            />
          </div>
          <div>
            <Label htmlFor="edit-pack-description" className="text-slate-200">
              説明（オプション）
            </Label>
            <Input
              id="edit-pack-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-slate-700/50 border-slate-600 text-slate-100 placeholder:text-slate-400"
            />
          </div>
          <div>
            <Label htmlFor="edit-thumbnail" className="text-slate-200">
              サムネイル画像（オプション）
            </Label>
            <Input
              id="edit-thumbnail"
              type="file"
              accept="image/*"
              onChange={handleThumbnailChange}
              className="bg-slate-700/50 border-slate-600 text-slate-100 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-600 file:text-white hover:file:bg-slate-500"
            />
            {thumbnailUrl && (
              <Image
                src={thumbnailUrl}
                alt="サムネイル"
                width={128}
                height={128}
                className="mt-2 w-32 h-32 object-cover rounded-lg border border-slate-600"
                unoptimized
              />
            )}
          </div>
          <div>
            <Label className="text-slate-200">
              画像を選択:{" "}
              <span className="text-amber-400 font-bold">
                {selectedImages.size}枚
              </span>
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 max-h-96 overflow-y-auto">
              {images?.map((image) => {
                const isSelected = selectedImages.has(image.id);
                const selectedData = selectedImages.get(image.id);
                return (
                  <Card
                    key={image.id}
                    className={`cursor-pointer p-2 transition-all ${
                      isSelected
                        ? "ring-4 ring-amber-400 shadow-lg shadow-amber-400/50 scale-105 bg-slate-700/70"
                        : "bg-slate-700/30 hover:bg-slate-700/50 border-slate-600"
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
                    {isSelected && (
                      <div className="mt-2">
                        <Label className="text-xs text-slate-300">
                          排出率（重み）
                        </Label>
                        <Input
                          type="number"
                          min="1"
                          value={selectedData?.weight || 1}
                          onChange={(e) =>
                            updateWeight(
                              image.id,
                              parseInt(e.target.value) || 1,
                            )
                          }
                          className="bg-slate-600 border-slate-500 text-white text-xs h-8"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        />
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={selectedImages.size === 0}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white shadow-lg disabled:opacity-50"
            >
              更新
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsOpen(false)}
              className="text-slate-300 hover:text-white"
            >
              キャンセル
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
