"use client";

import { RARITY_BG } from "@/components/cards/rarity";
import { Segmented } from "@/components/ui/segmented";
import { RARITY_LIST, RARITY_META, type Rarity } from "@/lib/constants/rarity";

export function RarityPicker({
  value,
  onChange,
}: {
  value: Rarity;
  onChange: (r: Rarity) => void;
}) {
  return (
    <div>
      <Segmented
        label="レア度"
        value={value}
        onChange={onChange}
        options={RARITY_LIST.map((r) => ({
          value: r,
          label: r,
          className: `${RARITY_BG[r]} text-white`,
        }))}
      />
      <p className="mt-1.5 text-xs text-ink-2">
        {RARITY_META[value].name}
        。パックの排出率に従って、このレア度の枠から出ます。
      </p>
    </div>
  );
}
