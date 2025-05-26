// ========================================
// components/spells/SpellSlotsList.tsx
// ========================================

import React from "react";
import { SpellSlot } from "./types";
import { SpellSlotCard } from "./SpellSlotCard";

interface SpellSlotsListProps {
  spellSlots: SpellSlot[];
}

export function SpellSlotsList({ spellSlots }: SpellSlotsListProps) {
  if (spellSlots.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No spell slots available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Spell Slots</h3>
      <div className="grid gap-4">
        {spellSlots.map((slot) => (
          <SpellSlotCard
            key={slot.level}
            level={slot.level}
            used={slot.used}
            total={slot.total}
            available={slot.available}
          />
        ))}
      </div>
    </div>
  );
}
