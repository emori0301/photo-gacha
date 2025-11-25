"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PackOpener } from "@/components/pack/pack-opener";
import { trpc } from "@/lib/trpc/client";
import { Package } from "lucide-react";

export function PackSelector({ userId }: { userId: string }) {
  const { data: packs } = trpc.pack.getAll.useQuery();
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);

  if (!packs || packs.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p className="text-lg">No packs yet</p>
        <p className="text-sm mt-2">Create a pack from the Images tab</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Select Pack</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packs.map((pack) => (
            <Card
              key={pack.id}
              className={`relative overflow-hidden cursor-pointer transition-all group aspect-[2/3] max-w-[200px] mx-auto ${
                selectedPackId === pack.id
                  ? "ring-4 ring-amber-400 bg-gradient-to-br from-amber-50 to-yellow-50 scale-105 shadow-2xl"
                  : "bg-gradient-to-br from-white to-gray-100 border-2 border-gray-300 hover:border-amber-400 hover:scale-105 shadow-lg"
              }`}
              onClick={() => setSelectedPackId(pack.id)}
            >
              {/* サムネイル画像 */}
              <div className="relative h-full overflow-hidden flex flex-col">
                {pack.thumbnailUrl ? (
                  <div className="flex-1 relative">
                    <img
                      src={pack.thumbnailUrl}
                      alt={pack.name}
                      className="w-full h-full object-cover"
                    />
                    {/* パック名を画像の上にオーバーレイ */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-end">
                      <h4 className="text-xl font-bold text-white p-3 w-full text-center font-serif tracking-wide drop-shadow-2xl">
                        {pack.name}
                      </h4>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 w-full bg-gradient-to-br from-amber-200 via-yellow-200 to-orange-200 flex flex-col items-center justify-center p-4">
                    <Package className="w-16 h-16 text-amber-600 mb-2" />
                    <h4 className="text-lg font-bold text-gray-800 text-center font-serif tracking-wide">
                      {pack.name}
                    </h4>
                  </div>
                )}
                <div className="p-3 bg-white/95 border-t border-gray-300">
                  {pack.description && (
                    <p className="text-xs text-gray-700 mb-2 line-clamp-2">
                      {pack.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-gray-600 font-medium">
                    <span>{pack.packImages.length} cards</span>
                    {pack.packImages.length > 5 && (
                      <span>+{pack.packImages.length - 5} more</span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {selectedPackId && (
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <h3 className="text-xl font-bold text-white mb-4">Open Pack</h3>
          <PackOpener
            packId={selectedPackId}
            userId={userId}
            packThumbnailUrl={
              packs.find((p) => p.id === selectedPackId)?.thumbnailUrl || ""
            }
          />
        </div>
      )}
    </div>
  );
}
