"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { RotateCcw, X } from "lucide-react";
import {
  RARITY_COLORS,
  RARITY_LABELS,
  RARITY_EFFECTS,
  type Rarity,
} from "@/lib/constants/rarity";
import { PACK_OPEN_COST } from "@/lib/constants/points";

type CardImage = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string;
  rarity: Rarity;
  creatorName?: string;
};

export function PackOpener({
  packId,
  userId,
  cardCount = 5,
  packThumbnailUrl,
}: {
  packId: string;
  userId: string;
  cardCount?: number;
  packThumbnailUrl?: string;
}) {
  const [isOpening, setIsOpening] = useState(false);
  const [openedImages, setOpenedImages] = useState<CardImage[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showPackOpening, setShowPackOpening] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedImage, setSelectedImage] = useState<CardImage | null>(null);
  const [packThumbnail, setPackThumbnail] = useState<string>("");

  const utils = trpc.useUtils();
  const { data: points } = trpc.user.getPoints.useQuery({ userId });
  const openPack = trpc.pack.openPack.useMutation({
    onSuccess: () => {
      utils.user.getPoints.invalidate({ userId });
    },
  });

  const handleOpenPack = async () => {
    setIsOpening(true);
    setIsAnimating(true);
    setCurrentCardIndex(0);
    setShowResults(false);
    setShowPackOpening(true);
    setShowCard(false);
    setShowDialog(true);
    setPackThumbnail(packThumbnailUrl || "");

    try {
      const result = await openPack.mutateAsync({
        packId,
        userId,
        cardCount,
        cost: PACK_OPEN_COST,
      });
      setOpenedImages(
        result.images.map((img) => ({
          ...img,
          rarity: img.rarity as Rarity,
        })),
      );

      // パック開封演出
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setShowPackOpening(false);
      setShowCard(true);
      setIsAnimating(false);
    } catch (error) {
      console.error("Error opening pack:", error);
      setIsAnimating(false);
      setShowDialog(false);
      toast.error("Failed to open pack", {
        description:
          error instanceof Error ? error.message : "An error occurred",
      });
      setIsOpening(false);
    }
  };

  const handleFlipCard = () => {
    if (currentCardIndex < openedImages.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    } else {
      // 最後のカードをめくったら結果を表示
      setShowResults(true);
      toast.success("Pack opened!", {
        description: `Obtained ${openedImages.length} cards`,
      });
    }
  };

  const handleCloseDialog = () => {
    // すべての状態をリセット
    setIsOpening(false);
    setIsAnimating(false);
    setShowPackOpening(false);
    setShowCard(false);
    setShowResults(false);
    setCurrentCardIndex(0);
    setOpenedImages([]);
    setShowDialog(false);
  };

  return (
    <>
      <Button
        onClick={handleOpenPack}
        disabled={isOpening || (points ?? 0) < PACK_OPEN_COST}
        className="w-full bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-600 hover:via-yellow-600 hover:to-amber-600 text-white shadow-xl shadow-amber-500/50 disabled:opacity-50 text-lg py-6 transition-all duration-300 cursor-pointer"
      >
        {isOpening ? (
          <span className="flex items-center gap-2">
            <span className="animate-spin">✨</span>
            Opening...
          </span>
        ) : (points ?? 0) < PACK_OPEN_COST ? (
          `Insufficient points (${PACK_OPEN_COST}pt required)`
        ) : (
          `✨ Open Pack (${PACK_OPEN_COST}pt) ✨`
        )}
      </Button>

      <Dialog
        open={showDialog}
        onOpenChange={(open) => {
          if (!open) {
            // モーダルが閉じられた時にすべての状態をリセット
            handleCloseDialog();
          } else {
            setShowDialog(open);
          }
        }}
      >
        <DialogContent
          className={`max-w-[95vw] sm:max-w-4xl lg:max-w-5xl w-full max-h-[95vh] bg-gradient-to-br from-zinc-950 via-zinc-900 to-slate-950 border-zinc-800/50 p-4 sm:p-6 flex flex-col ${
            showResults ? "overflow-y-auto" : "overflow-hidden"
          } ${showCard ? "h-[90vh] sm:h-[85vh]" : ""}`}
        >
          <DialogHeader>
            <DialogTitle className="sr-only">
              {isAnimating
                ? "Opening cards"
                : showResults
                  ? "Results"
                  : "Flip card"}
            </DialogTitle>
          </DialogHeader>
          {isAnimating && showPackOpening ? (
            <div className="flex flex-col items-center justify-center h-[85vh]">
              <div className="relative w-64 h-80 sm:w-80 sm:h-96 mx-auto">
                {/* パックの画像 */}
                {packThumbnail ? (
                  <div className="absolute inset-0 animate-[pack-open_1.5s_ease-in-out]">
                    <Image
                      src={packThumbnail}
                      alt="Pack"
                      width={400}
                      height={500}
                      className="w-full h-full object-cover rounded-xl border-4 border-amber-400 shadow-2xl shadow-amber-400/50"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-600 via-yellow-600 to-amber-500 rounded-xl border-4 border-amber-400 shadow-2xl shadow-amber-400/50 flex items-center justify-center animate-[pack-open_1.5s_ease-in-out]">
                    <div className="text-6xl animate-bounce">🎁</div>
                  </div>
                )}
                {/* 光るエフェクト */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_1.5s_infinite] rounded-xl pointer-events-none" />
                {/* パーティクルエフェクト */}
                <div className="absolute inset-0 pointer-events-none">
                  {Array.from({ length: 20 }, (_, i) => (
                    <div
                      key={`particle-${packId}-${Date.now()}-${i}`}
                      className="absolute w-2 h-2 bg-amber-400 rounded-full animate-ping"
                      style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 1.5}s`,
                        animationDuration: `${1 + Math.random()}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
              <p className="text-zinc-300 text-xl mt-8 animate-pulse font-semibold">
                Opening pack...
              </p>
            </div>
          ) : showResults ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 bg-clip-text text-transparent">
                  🎉 Results 🎉
                </h2>
                <Button
                  onClick={handleCloseDialog}
                  variant="ghost"
                  size="icon"
                  className="text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 mb-4">
                {openedImages.map((image) => {
                  const isUR = image.rarity === "UR";
                  return (
                    <button
                      key={image.id}
                      type="button"
                      className="relative group cursor-pointer transition-all duration-300 w-full hover:scale-105"
                      onClick={() => setSelectedImage(image)}
                    >
                      <Card className="p-2 bg-gradient-to-br from-white to-gray-50 border-2 border-gray-300 shadow-lg hover:shadow-2xl transition-all h-full hover:border-amber-400">
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
                            className={`absolute top-1 right-1 ${RARITY_COLORS[image.rarity]} text-white text-xs px-2 py-0.5 shadow-md ${
                              isUR ? "animate-pulse" : ""
                            }`}
                          >
                            {RARITY_LABELS[image.rarity]}
                          </Badge>
                        </div>
                        <h4 className="font-semibold mt-2 text-xs text-gray-900 line-clamp-1">
                          {image.name}
                        </h4>
                      </Card>
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-center mt-4">
                <Button
                  onClick={handleCloseDialog}
                  className="bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-600 hover:via-yellow-600 hover:to-amber-600 text-white shadow-xl shadow-amber-500/50 px-8 py-6 text-lg font-semibold transition-all duration-300 cursor-pointer"
                >
                  Close
                </Button>
              </div>
            </>
          ) : showCard && openedImages.length > 0 ? (
            <div className="flex flex-col items-center justify-start flex-1 min-h-0 py-2 sm:py-3 gap-2 sm:gap-3 overflow-hidden">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white text-center shrink-0 px-2">
                Card {currentCardIndex + 1}
              </h2>
              <div
                className="relative w-full max-w-[280px] sm:max-w-sm md:max-w-md lg:max-w-lg mx-auto flex items-center justify-center shrink-0"
                style={{ maxHeight: "calc(85vh - 240px)" }}
              >
                <div
                  className="relative w-full"
                  style={{ aspectRatio: "2 / 3", maxHeight: "100%" }}
                >
                  {openedImages.slice(0, currentCardIndex + 1).map((image) => {
                    const isCurrent =
                      openedImages.indexOf(image) === currentCardIndex;
                    const isUR = image.rarity === "UR";
                    return (
                      <Card
                        key={image.id}
                        className={`absolute inset-0 w-full h-full bg-gradient-to-br from-white via-gray-50 to-gray-100 border-4 shadow-2xl transition-all duration-700 ${
                          isCurrent
                            ? "opacity-100 scale-100 rotate-0 z-10 animate-card-reveal"
                            : "opacity-0 scale-95 rotate-y-90 pointer-events-none z-0"
                        } ${
                          image.rarity === "UR"
                            ? "border-amber-400 shadow-amber-400/50 ring-4 ring-amber-300"
                            : image.rarity === "SSR"
                              ? "border-violet-500 shadow-violet-500/50 ring-2 ring-violet-300"
                              : image.rarity === "SR"
                                ? "border-cyan-400 shadow-cyan-400/50 ring-2 ring-cyan-300"
                                : image.rarity === "R"
                                  ? "border-emerald-400 shadow-emerald-400/30 ring-1 ring-emerald-300"
                                  : "border-gray-400 shadow-gray-400/30"
                        } ${RARITY_EFFECTS[image.rarity]}`}
                      >
                        {isUR && isCurrent && (
                          <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-amber-400/20 via-yellow-400/30 to-amber-400/20 animate-pulse pointer-events-none z-0" />
                        )}
                        <div className="relative h-full flex flex-col p-3 sm:p-4 bg-white/95">
                          {/* タイトル（一番上） */}
                          <div className="mb-2 flex-shrink-0">
                            <h3 className="text-lg sm:text-xl font-bold text-gray-900 text-center mb-1.5 line-clamp-2 leading-tight drop-shadow-sm">
                              {image.name}
                            </h3>
                            <Badge
                              className={`w-full justify-center ${RARITY_COLORS[image.rarity]} text-white font-bold text-xs sm:text-sm py-1 shadow-md ${
                                isUR ? "animate-pulse" : ""
                              }`}
                            >
                              {RARITY_LABELS[image.rarity]}
                            </Badge>
                          </div>

                          {/* 画像（中央） */}
                          <div className="flex-1 relative mb-2 rounded-md overflow-hidden border-2 border-gray-300 shadow-inner min-h-0 bg-gray-50">
                            <Image
                              src={image.imageUrl}
                              alt={image.name}
                              width={400}
                              height={400}
                              className="w-full h-full object-cover"
                              unoptimized
                            />
                          </div>

                          {/* 説明（画像の下） */}
                          {image.description && (
                            <div className="mb-2 flex-shrink-0 bg-gray-50 rounded p-2 border border-gray-200">
                              <p className="text-xs text-gray-700 text-center line-clamp-2 leading-relaxed">
                                {image.description}
                              </p>
                            </div>
                          )}

                          {/* 作成者（一番下） */}
                          <div className="mt-auto pt-1.5 border-t border-gray-300 flex-shrink-0">
                            <p className="text-[10px] sm:text-xs text-gray-600 text-center font-medium">
                              Creator: {image.creatorName || "Unknown"}
                            </p>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* めくるボタン */}
              <div className="w-full max-w-md shrink-0 px-2 pb-2">
                <Button
                  onClick={handleFlipCard}
                  className="w-full bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-600 hover:via-yellow-600 hover:to-amber-600 text-white shadow-xl shadow-amber-500/50 py-3 sm:py-4 text-sm sm:text-base font-semibold transition-all duration-300 cursor-pointer"
                >
                  {currentCardIndex < openedImages.length - 1 ? (
                    <>
                      <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      Flip Card {currentCardIndex + 1}
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      Flip Last Card
                    </>
                  )}
                </Button>
                <p className="text-center text-zinc-400 text-xs sm:text-sm mt-1.5">
                  {currentCardIndex + 1} / {openedImages.length}
                </p>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* 画像詳細モーダル */}
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
                    <p className="text-base sm:text-lg text-zinc-200 leading-relaxed whitespace-pre-wrap">
                      {selectedImage.description}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
