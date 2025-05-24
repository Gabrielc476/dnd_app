// ========================================
// components/spells/PreparedSpellCard.tsx
// ========================================

import React from "react";
import { X } from "lucide-react";
import { Spell } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface PreparedSpellCardProps {
  spell: Spell;
  availableSpellSlots: SpellSlot[];
  isReadOnly?: boolean;
  onCastSpell: (spell: Spell, level: number) => void;
  onUnprepareSpell: (spell: Spell) => void;
}

export function PreparedSpellCard({
  spell,
  availableSpellSlots,
  isReadOnly = false,
  onCastSpell,
  onUnprepareSpell,
}: PreparedSpellCardProps) {
  return (
    <Card className="transition-colors hover:bg-muted/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-medium">{spell.name}</h4>
              <Badge
                variant="secondary"
                className={cn(
                  "text-white text-xs",
                  getSpellLevelColor(spell.level)
                )}
              >
                {getSpellLevelLabel(spell.level)}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {getSchoolAbbreviation(spell.school)}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground mb-3">
              <div>
                <span className="font-medium">Cast Time:</span>
                <br />
                {spell.casting_time}
              </div>
              <div>
                <span className="font-medium">Range:</span>
                <br />
                {spell.range}
              </div>
              <div>
                <span className="font-medium">Duration:</span>
                <br />
                {spell.duration}
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-3">
              <span className="font-medium">Components:</span>{" "}
              {spell.components}
            </p>

            <ScrollArea className="max-h-20">
              <p className="text-sm">{spell.description}</p>
            </ScrollArea>
          </div>

          {!isReadOnly && (
            <div className="flex flex-col gap-2 ml-4">
              <CastSpellDialog
                spell={spell}
                availableSpellSlots={availableSpellSlots}
                onCastSpell={onCastSpell}
                disabled={
                  spell.level > 0 &&
                  availableSpellSlots.every((slot) => slot.available === 0)
                }
              />

              <Button
                variant="outline"
                size="sm"
                onClick={() => onUnprepareSpell(spell)}
                className="flex items-center gap-1"
              >
                <X className="h-4 w-4" />
                Remove
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
