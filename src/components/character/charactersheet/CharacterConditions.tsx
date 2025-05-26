// src/components/character/CharacterConditions.tsx
"use client";

import React, { useState } from "react";
import { Character } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AlertTriangle, Plus, X } from "lucide-react";

interface CharacterConditionsProps {
  character: Character;
  campaignId: string;
  userId: string;
  isReadOnly?: boolean;
  onAddCondition?: (condition: string) => Promise<boolean>;
  onRemoveCondition?: (condition: string) => Promise<boolean>;
}

const COMMON_CONDITIONS = [
  "Blinded",
  "Charmed",
  "Deafened",
  "Exhausted",
  "Frightened",
  "Grappled",
  "Incapacitated",
  "Invisible",
  "Paralyzed",
  "Petrified",
  "Poisoned",
  "Prone",
  "Restrained",
  "Stunned",
  "Unconscious",
];

export function CharacterConditions({
  character,
  campaignId,
  userId,
  isReadOnly = false,
  onAddCondition,
  onRemoveCondition,
}: CharacterConditionsProps) {
  const [addConditionDialog, setAddConditionDialog] = useState(false);
  const [selectedCondition, setSelectedCondition] = useState("");
  const [customCondition, setCustomCondition] = useState("");

  const handleAddCondition = async () => {
    const condition =
      selectedCondition === "custom" ? customCondition : selectedCondition;

    if (condition && onAddCondition) {
      const success = await onAddCondition(condition);
      if (success) {
        setAddConditionDialog(false);
        setSelectedCondition("");
        setCustomCondition("");
      }
    }
  };

  const handleRemoveCondition = async (condition: string) => {
    if (onRemoveCondition) {
      await onRemoveCondition(condition);
    }
  };

  const getConditionColor = (condition: string): string => {
    const lowerCondition = condition.toLowerCase();

    // Severe conditions (red)
    if (
      ["unconscious", "paralyzed", "petrified", "stunned"].includes(
        lowerCondition
      )
    ) {
      return "destructive";
    }

    // Moderate conditions (yellow/warning)
    if (
      [
        "frightened",
        "charmed",
        "incapacitated",
        "restrained",
        "grappled",
      ].includes(lowerCondition)
    ) {
      return "secondary";
    }

    // Minor conditions (default)
    return "outline";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Conditions
          </CardTitle>
          {!isReadOnly && (
            <Dialog
              open={addConditionDialog}
              onOpenChange={setAddConditionDialog}
            >
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Condition</DialogTitle>
                  <DialogDescription>
                    Select a condition to apply to {character.name}.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <Select
                      value={selectedCondition}
                      onValueChange={setSelectedCondition}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a condition" />
                      </SelectTrigger>
                      <SelectContent>
                        {COMMON_CONDITIONS.map((condition) => (
                          <SelectItem key={condition} value={condition}>
                            {condition}
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">Custom Condition</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedCondition === "custom" && (
                    <div>
                      <Input
                        placeholder="Enter custom condition"
                        value={customCondition}
                        onChange={(e) => setCustomCondition(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setAddConditionDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddCondition}
                    disabled={
                      !selectedCondition ||
                      (selectedCondition === "custom" && !customCondition)
                    }
                  >
                    Add Condition
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {character.conditions.length === 0 ? (
          <div className="text-center text-muted-foreground py-4">
            No active conditions
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {character.conditions.map((condition, index) => (
              <Badge
                key={index}
                variant={getConditionColor(condition) as any}
                className="flex items-center gap-1 px-2 py-1"
              >
                {condition}
                {!isReadOnly && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveCondition(condition)}
                    className="h-4 w-4 p-0 hover:bg-transparent"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
