"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { CountBadge, PhotoCard } from "@/components/cards/photo-card";
import { RarityTag } from "@/components/cards/rarity";
import {
  EmptyState,
  PageTitle,
  Skeleton,
} from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { RARITY_LIST, RARITY_META, type Rarity } from "@/lib/constants/rarity";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { CardDetailDialog, type CollectedCard } from "./card-detail-dialog";

type SortKey = "new" | "rarity" | "count" | "name";

const SORTERS: Record<SortKey, (a: CollectedCard, b: CollectedCard) => number> =
  {
    new: (a, b) => +new Date(b.obtainedAt) - +new Date(a.obtainedAt),
    rarity: (a, b) =>
      RARITY_META[b.image.rarity].order - RARITY_META[a.image.rarity].order ||
      a.image.name.localeCompare(b.image.name, "ja"),
    count: (a, b) => b.count - a.count,
    name: (a, b) => a.image.name.localeCompare(b.image.name, "ja"),
  };

export function CollectionView() {
  const collection = trpc.collection.mine.useQuery();
  const stats = trpc.collection.stats.useQuery();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [rarity, setRarity] = useState<Rarity | "ALL">("ALL");
  const [sort, setSort] = useState<SortKey>("new");
  const [openId, setOpenId] = useState<string | null>(null);

  const items = collection.data ?? [];
  const visible = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return items
      .filter((item) => rarity === "ALL" || item.image.rarity === rarity)
      .filter(
        (item) =>
          !q ||
          item.image.name.toLowerCase().includes(q) ||
          item.image.description?.toLowerCase().includes(q) ||
          item.image.creatorName?.toLowerCase().includes(q),
      )
      .sort(SORTERS[sort]);
  }, [items, deferredQuery, rarity, sort]);

  const opened = items.find((i) => i.id === openId) ?? null;
  const s = stats.data;
  const completion =
    s && s.catalog > 0 ? Math.round((s.ownedInCatalog / s.catalog) * 100) : 0;

  return (
    <>
      <PageTitle title="図鑑" lead="引き当てたカードがここに集まります。" />

      <section className="mb-6 grid gap-4 rounded-3xl border-2 border-ink bg-card p-5 shadow-hard md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <div className="flex items-baseline gap-3">
            <span className="font-display text-4xl tabular-nums">
              {s ? `${completion}%` : "—"}
            </span>
            <span className="text-sm text-ink-2">
              コンプリート率（{s?.ownedInCatalog ?? 0} / {s?.catalog ?? 0} 種）
            </span>
          </div>
          <div
            className="mt-3 h-3 overflow-hidden rounded-full border-2 border-ink bg-paper-2"
            role="progressbar"
            aria-valuenow={completion}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="コンプリート率"
          >
            <div
              className="h-full bg-[repeating-linear-gradient(-45deg,var(--color-red)_0_8px,var(--color-red-deep)_8px_16px)] transition-[width] duration-700"
              style={{ width: `${completion}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-ink-2">
            これまでに <b className="font-mono text-ink">{s?.total ?? 0}</b>{" "}
            枚を入手
          </p>
        </div>
        <ul
          className="flex flex-wrap gap-2 md:justify-end"
          aria-label="レア度ごとの入手枚数"
        >
          {RARITY_LIST.map((r) => (
            <li
              key={r}
              className="flex min-w-14 flex-col items-center gap-1 rounded-xl border-2 border-ink/15 bg-paper px-2 py-1.5"
            >
              <RarityTag rarity={r} size="sm" />
              <span className="font-mono text-sm tabular-nums">
                {s?.byRarity[r] ?? 0}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-3"
            aria-hidden
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="カード名・ひとこと・作者で探す"
            aria-label="カードを検索"
            className="pl-10"
          />
        </div>
        <div className="flex min-w-0 gap-3">
          <fieldset className="no-scrollbar flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
            <legend className="sr-only">レア度で絞り込む</legend>
            {(["ALL", ...RARITY_LIST] as const).map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={rarity === r}
                onClick={() => setRarity(r)}
                className={cn(
                  "h-11 shrink-0 rounded-full border-2 border-ink px-3.5 text-sm font-bold transition-colors",
                  rarity === r
                    ? "bg-ink text-paper"
                    : "bg-card hover:bg-paper-2",
                )}
              >
                {r === "ALL" ? "すべて" : r}
              </button>
            ))}
          </fieldset>
          <Select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="並び替え"
            className="w-36 shrink-0"
          >
            <option value="new">新しい順</option>
            <option value="rarity">レア度順</option>
            <option value="count">枚数順</option>
            <option value="name">名前順</option>
          </Select>
        </div>
      </div>

      {collection.isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: プレースホルダー
            <Skeleton key={i} className="aspect-[4/5.6]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="まだカードがありません"
          action={
            <Button asChild>
              <Link href="/">ガチャを回しに行く</Link>
            </Button>
          }
        >
          ガチャを回すと、引いたカードがここに並びます。
        </EmptyState>
      ) : visible.length === 0 ? (
        <EmptyState
          title="条件に合うカードがありません"
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setQuery("");
                setRarity("ALL");
              }}
            >
              条件をリセット
            </Button>
          }
        />
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {visible.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setOpenId(item.id)}
                className="block w-full rounded-2xl text-left"
                aria-label={`${item.image.name}（${RARITY_META[item.image.rarity].name}）の詳細`}
              >
                <PhotoCard
                  card={item.image}
                  sizes="(min-width: 1024px) 210px, (min-width: 640px) 30vw, 45vw"
                  badge={<CountBadge count={item.count} />}
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      <CardDetailDialog
        item={opened}
        onOpenChange={(o) => !o && setOpenId(null)}
      />
    </>
  );
}
