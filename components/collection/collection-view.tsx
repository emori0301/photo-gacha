"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc/client";
import { FolderKanban, Search, ArrowUpDown, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

import {
  RARITY_COLORS,
  RARITY_LABELS,
  RARITY_ORDER,
  RARITY_EFFECTS,
  type Rarity,
} from "@/lib/constants/rarity";

type SortOption = "name" | "rarity" | "date";

export function CollectionView({ userId }: { userId: string }) {
  const { data: collections } = trpc.collection.getByUserId.useQuery({
    userId,
  });
  const { data: stats } = trpc.collection.getStats.useQuery({ userId });
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [selectedImage, setSelectedImage] = useState<{
    imageUrl: string;
    name: string;
    description: string | null;
    rarity: Rarity;
  } | null>(null);

  const filteredAndSortedCollections = useMemo(() => {
    if (!collections) return [];

    let filtered = collections.filter((collection) => {
      const query = searchQuery.toLowerCase();
      return (
        collection.image.name.toLowerCase().includes(query) ||
        collection.image.description?.toLowerCase().includes(query) ||
        RARITY_LABELS[collection.image.rarity as Rarity]
          .toLowerCase()
          .includes(query)
      );
    });

    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.image.name.localeCompare(b.image.name, "ja");
        case "rarity":
          return (
            RARITY_ORDER[b.image.rarity as Rarity] -
            RARITY_ORDER[a.image.rarity as Rarity]
          );
        case "date":
        default:
          return (
            new Date(b.obtainedAt).getTime() - new Date(a.obtainedAt).getTime()
          );
      }
    });

    return filtered;
  }, [collections, searchQuery, sortBy]);

  if (!collections) {
    return (
      <div className="text-center py-12 text-zinc-300">
        <div className="animate-spin text-4xl mb-4">🎁</div>
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {stats && (
        <Card className="p-6 bg-gradient-to-br from-zinc-900/80 to-zinc-800/80 border-zinc-800/50 shadow-2xl">
          <h2 className="text-2xl font-bold mb-4 text-white">
            コレクション統計
          </h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
              <p className="text-sm text-zinc-400 mb-1">種類数</p>
              <p className="text-2xl font-bold text-emerald-400">
                {stats.unique || 0}
              </p>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
              <p className="text-sm text-zinc-400 mb-1">総枚数</p>
              <p className="text-2xl font-bold text-amber-400">
                {stats.total || 0}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-3 mt-4">
            {Object.entries(stats.byRarity).map(([rarity, count]) => (
              <div key={rarity} className="text-center">
                <Badge
                  className={`${RARITY_COLORS[rarity as Rarity]} text-white font-bold shadow-lg`}
                >
                  {RARITY_LABELS[rarity as Rarity]}
                </Badge>
                <p className="text-sm mt-2 text-zinc-300 font-semibold">
                  {count}枚
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-4 bg-gradient-to-br from-zinc-900/80 to-zinc-800/80 border-zinc-800/50 shadow-xl">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Label htmlFor="search" className="text-zinc-200 mb-2 block">
              検索
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <Input
                id="search"
                type="text"
                placeholder="名前、説明、レア度で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <Label htmlFor="sort" className="text-zinc-200 mb-2 block">
              並び替え
            </Label>
            <div className="relative">
              <ArrowUpDown className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <select
                id="sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="w-full pl-10 pr-4 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="date">獲得日時</option>
                <option value="name">名前順</option>
                <option value="rarity">レア度順</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {filteredAndSortedCollections.map((collection) => {
          const rarity = collection.image.rarity as Rarity;
          const isHighRarity = rarity === "SSR" || rarity === "UR";
          const count = (collection as any).count || 1;
          return (
            <Card
              key={collection.id}
              className={`p-3 bg-gradient-to-br from-white to-gray-50 border-2 border-gray-300 shadow-lg hover:shadow-2xl hover:scale-105 transition-all cursor-pointer relative overflow-hidden hover:border-amber-400 ${
                isHighRarity ? RARITY_EFFECTS[rarity] : ""
              }`}
              onClick={() =>
                setSelectedImage({
                  imageUrl: collection.image.imageUrl,
                  name: collection.image.name,
                  description: collection.image.description,
                  rarity: rarity,
                })
              }
            >
              {isHighRarity && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_3s_infinite] pointer-events-none" />
              )}
              <div className="relative">
                <div
                  className={`relative overflow-hidden rounded-lg ${
                    rarity === "UR"
                      ? "border-2 border-amber-400 shadow-lg shadow-amber-400/50"
                      : rarity === "SSR"
                        ? "border-2 border-violet-500 shadow-lg shadow-violet-500/50"
                        : rarity === "SR"
                          ? "border-2 border-cyan-400 shadow-md shadow-cyan-400/30"
                          : rarity === "R"
                            ? "border-2 border-emerald-400 shadow-sm"
                            : "border-2 border-gray-300"
                  }`}
                >
                  <Image
                    src={collection.image.imageUrl}
                    alt={collection.image.name}
                    width={200}
                    height={200}
                    className="w-full h-32 object-cover"
                    unoptimized
                  />
                  {rarity === "UR" && (
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-400/10 via-yellow-400/15 to-amber-400/10 animate-pulse pointer-events-none" />
                  )}
                </div>
                <Badge
                  className={`absolute top-2 right-2 ${
                    RARITY_COLORS[rarity]
                  } text-white font-bold shadow-lg text-xs ${
                    rarity === "UR" ? "animate-pulse" : ""
                  }`}
                >
                  {RARITY_LABELS[rarity]}
                </Badge>
                {count > 1 && (
                  <div className="absolute top-2 left-2 bg-black/80 text-white text-xs font-bold px-2 py-1 rounded shadow-lg">
                    ×{count}
                  </div>
                )}
              </div>
              <h3 className="font-semibold mt-2 text-sm text-gray-900 line-clamp-1">
                {collection.image.name}
              </h3>
              {collection.image.description && (
                <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                  {collection.image.description}
                </p>
              )}
            </Card>
          );
        })}
        {filteredAndSortedCollections.length === 0 && (
          <div className="col-span-full text-center py-12 text-zinc-400">
            <FolderKanban className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">
              {searchQuery
                ? "検索結果が見つかりませんでした"
                : "コレクションがまだありません"}
            </p>
            <p className="text-sm mt-2">
              {searchQuery
                ? "別のキーワードで検索してみてください"
                : "パックを開封してカードを集めましょう！"}
            </p>
          </div>
        )}
      </div>

      {/* 画像拡大表示モーダル */}
      <Dialog
        open={!!selectedImage}
        onOpenChange={() => setSelectedImage(null)}
      >
        <DialogContent className="max-w-[90vw] sm:max-w-2xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-slate-950 border-zinc-800/50 p-6 sm:p-8">
          {selectedImage && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 bg-clip-text text-transparent mb-4">
                  {selectedImage.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="relative group">
                  {selectedImage.rarity === "UR" && (
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-400/20 via-yellow-400/30 to-amber-400/20 animate-pulse pointer-events-none z-10" />
                  )}
                  <div
                    className={`relative overflow-hidden rounded-xl border-4 transition-all ${
                      selectedImage.rarity === "UR"
                        ? "border-amber-400 shadow-2xl shadow-amber-400/50"
                        : selectedImage.rarity === "SSR"
                          ? "border-violet-500 shadow-xl shadow-violet-500/50"
                          : selectedImage.rarity === "SR"
                            ? "border-cyan-400 shadow-xl shadow-cyan-400/50"
                            : selectedImage.rarity === "R"
                              ? "border-emerald-400 shadow-lg shadow-emerald-400/30"
                              : "border-zinc-600"
                    } ${RARITY_EFFECTS[selectedImage.rarity]}`}
                    style={{ aspectRatio: "1 / 1" }}
                  >
                    <Image
                      src={selectedImage.imageUrl}
                      alt={selectedImage.name}
                      width={800}
                      height={800}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  </div>
                  <Badge
                    className={`absolute top-4 right-4 ${RARITY_COLORS[selectedImage.rarity]} text-white font-bold shadow-xl text-lg px-5 py-2.5 z-20 ${
                      selectedImage.rarity === "UR" ? "animate-pulse" : ""
                    }`}
                  >
                    {RARITY_LABELS[selectedImage.rarity]}
                  </Badge>
                </div>
                {selectedImage.description && (
                  <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800/50">
                    <p className="text-base sm:text-lg text-zinc-200 leading-relaxed whitespace-pre-wrap break-words">
                      {selectedImage.description}
                    </p>
                  </div>
                )}
                <div className="flex justify-center pt-4">
                  <Button
                    onClick={async () => {
                      try {
                        const response = await fetch(selectedImage.imageUrl);
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `${selectedImage.name}.${blob.type.split("/")[1] || "jpg"}`;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                      } catch (error) {
                        console.error("ダウンロードエラー:", error);
                      }
                    }}
                    className="bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-600 hover:via-yellow-600 hover:to-amber-600 text-white shadow-xl shadow-amber-500/50 transition-all duration-300"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    画像をダウンロード
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
