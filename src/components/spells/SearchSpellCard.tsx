// ========================================
// components/spells/SearchSpellCard.tsx
// ========================================

import React from "react";
import { Plus, X } from "lucide-react";
import { Spell } from "@/lib/types";
import {
  getSpellLevelColor,
  getSpellLevelLabel,
  getSchoolAbbreviation,
} from "./types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface SearchSpellCardProps {
  spell: Spell;
  isPrepared: boolean;
  isReadOnly?: boolean;
  onPrepareSpell: (spell: Spell) => void;
  onUnprepareSpell: (spell: Spell) => void;
}

export function SearchSpellCard({
  spell,
  isPrepared,
  isReadOnly = false,
  onPrepareSpell,
  onUnprepareSpell,
}: SearchSpellCardProps) {
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
              {isPrepared && (
                <Badge variant="default" className="text-xs">
                  Prepared
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground mb-2">
              <div>
                <span className="font-medium">Cast Time:</span>{" "}
                {spell.casting_time}
              </div>
              <div>
                <span className="font-medium">Range:</span> {spell.range}
              </div>
              <div>
                <span className="font-medium">Duration:</span> {spell.duration}
              </div>
            </div>

            <ScrollArea className="max-h-16">
              <p className="text-sm">{spell.description}</p>
            </ScrollArea>
          </div>

          {!isReadOnly && (
            <div className="ml-4">
              {isPrepared ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onUnprepareSpell(spell)}
                  className="flex items-center gap-1"
                >
                  <X className="h-4 w-4" />
                  Remove
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => onPrepareSpell(spell)}
                  className="flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" />
                  Prepare
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
