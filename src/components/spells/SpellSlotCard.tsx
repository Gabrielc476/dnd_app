// ========================================
// components/spells/SpellSlotCard.tsx
// ========================================

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface SpellSlotCardProps {
  level: number;
  used: number;
  total: number;
  available: number;
}

export function SpellSlotCard({
  level,
  used,
  total,
  available,
}: SpellSlotCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium">Level {level} Slots</h4>
          <span className="text-sm text-muted-foreground">
            {available} / {total}
          </span>
        </div>
        <Progress value={(available / total) * 100} className="h-2" />
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>{used} used</span>
          <span>{available} available</span>
        </div>
      </CardContent>
    </Card>
  );
}
