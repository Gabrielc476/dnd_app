// ========================================
// components/spells/PreparedSpellsList.tsx
// ========================================

import React from "react";
import { Sparkles } from "lucide-react";
import { Spell } from "@/lib/types";

interface PreparedSpellsListProps {
  spells: Spell[];
  availableSpellSlots: SpellSlot[];
  isReadOnly?: boolean;
  onCastSpell: (spell: Spell, level: number) => void;
  onUnprepareSpell: (spell: Spell) => void;
}

export function PreparedSpellsList({
  spells,
  availableSpellSlots,
  isReadOnly = false,
  onCastSpell,
  onUnprepareSpell,
}: PreparedSpellsListProps) {
  if (spells.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No spells prepared</p>
        <p className="text-sm">Use the "Find Spells" tab to prepare spells</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Prepared Spells ({spells.length})
        </h3>
      </div>

      <div className="grid gap-3">
        {spells.map((spell) => (
          <PreparedSpellCard
            key={spell._id}
            spell={spell}
            availableSpellSlots={availableSpellSlots}
            isReadOnly={isReadOnly}
            onCastSpell={onCastSpell}
            onUnprepareSpell={onUnprepareSpell}
          />
        ))}
      </div>
    </div>
  );
}
