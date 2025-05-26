// ========================================
// components/spells/CastSpellDialog.tsx
// ========================================

import React from "react";
import { Zap } from "lucide-react";
import { Spell } from "@/lib/types";
import { SpellSlot } from "./types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface CastSpellDialogProps {
  spell: Spell;
  availableSpellSlots: SpellSlot[];
  onCastSpell: (spell: Spell, level: number) => void;
  disabled?: boolean;
}

export function CastSpellDialog({
  spell,
  availableSpellSlots,
  onCastSpell,
  disabled = false,
}: CastSpellDialogProps) {
  const canCast =
    spell.level === 0 ||
    availableSpellSlots.some(
      (slot) => slot.level >= spell.level && slot.available > 0
    );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="flex items-center gap-1"
          disabled={disabled || !canCast}
        >
          <Zap className="h-4 w-4" />
          Cast
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cast {spell.name}</DialogTitle>
          <DialogDescription>
            Choose the spell slot level to use
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {spell.level === 0 ? (
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Cantrips don't require spell slots
              </p>
              <Button onClick={() => onCastSpell(spell, 0)} className="w-full">
                Cast Cantrip
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {availableSpellSlots
                .filter(
                  (slot) => slot.level >= spell.level && slot.available > 0
                )
                .map((slot) => (
                  <Button
                    key={slot.level}
                    variant="outline"
                    onClick={() => onCastSpell(spell, slot.level)}
                    className="w-full justify-between"
                  >
                    <span>Level {slot.level} Slot</span>
                    <span className="text-sm text-muted-foreground">
                      {slot.available} available
                    </span>
                  </Button>
                ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
