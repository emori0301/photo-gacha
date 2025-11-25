"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import {
  type Rarity,
  RARITY_LIST,
  RARITY_COLORS,
  RARITY_LABELS,
} from "@/lib/constants/rarity";
import { IMAGE_UPLOAD_REWARD } from "@/lib/constants/points";
import { uploadImage } from "@/lib/utils/image-upload";

export function ImageUpload({ userId }: { userId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rarity, setRarity] = useState<Rarity>("N");
  const [uploading, setUploading] = useState(false);
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: userImages, refetch: refetchUserImages } =
    trpc.image.getByUserId.useQuery({ userId }, { enabled: !!userId });

  const createImage = trpc.image.create.useMutation({
    onSuccess: () => {
      toast.success(
        `画像の登録に成功しました！${IMAGE_UPLOAD_REWARD}ポイント獲得しました！`,
      );
      utils.user.getPoints.invalidate({ userId });
      refetchUserImages();
      router.refresh();
      setFile(null);
      setName("");
      setDescription("");
      setRarity("N");
    },
    onError: (error) => {
      toast.error("画像の登録に失敗しました", {
        description: error.message || "エラーが発生しました",
      });
    },
  });

  const deleteImage = trpc.image.delete.useMutation({
    onSuccess: () => {
      toast.success("画像を削除しました");
      refetchUserImages();
    },
    onError: (error) => {
      toast.error("画像の削除に失敗しました", {
        description: error.message || "エラーが発生しました",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    try {
      const imageUrl = await uploadImage(file);

      await createImage.mutateAsync({
        name,
        description: description || undefined,
        imageUrl,
        rarity,
        userId,
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("アップロードに失敗しました", {
        description:
          error instanceof Error ? error.message : "不明なエラーが発生しました",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
        <div>
          <Label
            htmlFor="file"
            className="text-zinc-200 mb-3 block text-base font-semibold"
          >
            画像ファイル
          </Label>
          <Input
            id="file"
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            required
            className="bg-zinc-800/50 border-zinc-700 text-zinc-100 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-r file:from-zinc-700 file:to-zinc-600 file:text-white hover:file:from-zinc-600 hover:file:to-zinc-500 transition-all"
          />
        </div>
        <div>
          <Label
            htmlFor="name"
            className="text-zinc-200 mb-3 block text-base font-semibold"
          >
            名前
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
          />
        </div>
        <div>
          <Label
            htmlFor="description"
            className="text-zinc-200 mb-3 block text-base font-semibold"
          >
            説明（オプション）
          </Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
          />
        </div>
        <div>
          <Label
            htmlFor="rarity"
            className="text-zinc-200 mb-3 block text-base font-semibold"
          >
            レア度
          </Label>
          <select
            id="rarity"
            value={rarity}
            onChange={(e) => setRarity(e.target.value as typeof rarity)}
            className="w-full p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
          >
            {RARITY_LIST.map((r) => (
              <option key={r} value={r}>
                {RARITY_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        <Button
          type="submit"
          disabled={uploading || !file}
          className="w-full bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-600 hover:via-yellow-600 hover:to-amber-600 text-white shadow-xl shadow-amber-500/50 disabled:opacity-50 transition-all duration-300 py-6 text-lg font-semibold"
        >
          {uploading ? "アップロード中..." : "画像を登録"}
        </Button>
      </form>
      {userImages && userImages.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-bold text-white mb-4">
            登録済み画像 ({userImages.length}枚)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {userImages.map((image) => (
              <Card
                key={image.id}
                className="p-3 bg-gradient-to-br from-white to-gray-50 border-2 border-gray-300 shadow-lg hover:shadow-2xl transition-all hover:border-amber-400"
              >
                <div className="relative">
                  <Image
                    src={image.imageUrl}
                    alt={image.name}
                    width={200}
                    height={200}
                    className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                    unoptimized
                  />
                  <Badge
                    className={`absolute top-2 right-2 ${RARITY_COLORS[image.rarity]} text-white text-xs shadow-md`}
                  >
                    {RARITY_LABELS[image.rarity]}
                  </Badge>
                </div>
                <h4 className="font-semibold mt-2 text-sm text-gray-900 line-clamp-1">
                  {image.name}
                </h4>
                {image.description && (
                  <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                    {image.description}
                  </p>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm("この画像を削除しますか？")) {
                      deleteImage.mutate({ id: image.id });
                    }
                  }}
                  className="w-full mt-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
