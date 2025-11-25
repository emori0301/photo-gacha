"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";
import { Package, Trash2 } from "lucide-react";
import { PackEditor } from "./pack-editor";
import { Button } from "./ui/button";

import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function PackList() {
  const router = useRouter();
  const { data: packs } = trpc.pack.getAll.useQuery();
  const deletePack = trpc.pack.delete.useMutation({
    onSuccess: () => {
      toast.success("Pack deleted");
      router.refresh();
    },
    onError: (error) => {
      toast.error("Failed to delete pack", {
        description: error.message || "An error occurred",
      });
    },
  });

  const handleDelete = async (packId: string) => {
    if (confirm("Are you sure you want to delete this pack?")) {
      await deletePack.mutateAsync({ id: packId });
    }
  };

  if (!packs || packs.length === 0) {
    return null;
  }

  return (
    <section className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/80 backdrop-blur-sm rounded-xl p-6 border border-zinc-800/50 shadow-2xl">
      <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
        <Package className="w-6 h-6 text-amber-400" />
        Pack List
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {packs.map((pack) => (
          <Card
            key={pack.id}
            className="relative overflow-hidden bg-gradient-to-br from-white to-gray-100 border-2 border-gray-300 hover:border-amber-400 transition-all shadow-lg hover:shadow-2xl aspect-[2/3] max-w-[200px] mx-auto cursor-pointer"
          >
            <div className="relative h-full overflow-hidden flex flex-col">
              {pack.thumbnailUrl ? (
                <div className="flex-1 relative">
                  <img
                    src={pack.thumbnailUrl}
                    alt={pack.name}
                    className="w-full h-full object-cover"
                  />
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
                <div className="flex items-center justify-between text-xs text-gray-600 font-medium mb-3">
                  <span>{pack.packImages.length} cards</span>
                </div>
                <div className="flex gap-2">
                  <PackEditor packId={pack.id} />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(pack.id);
                    }}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-all cursor-pointer flex-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
