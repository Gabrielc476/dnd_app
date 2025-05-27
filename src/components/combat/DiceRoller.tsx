// src/components/combat/DiceRoller.tsx

"use client";

import React, { useState } from "react";
import {
  Dice6,
  Plus,
  Minus,
  RotateCcw,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DiceResult {
  formula: string;
  rolls: number[];
  modifier: number;
  total: number;
  advantage: boolean;
  disadvantage: boolean;
  timestamp: Date;
}

interface DiceRollerProps {
  onRoll?: (result: DiceResult) => void;
  className?: string;
  compact?: boolean;
}

const COMMON_DICE = [
  { sides: 4, label: "d4" },
  { sides: 6, label: "d6" },
  { sides: 8, label: "d8" },
  { sides: 10, label: "d10" },
  { sides: 12, label: "d12" },
  { sides: 20, label: "d20" },
  { sides: 100, label: "d100" },
];

const COMMON_ROLLS = [
  { formula: "1d20", label: "d20", description: "Ability check" },
  { formula: "1d20+3", label: "d20+3", description: "Attack roll" },
  { formula: "1d8+2", label: "d8+2", description: "Weapon damage" },
  { formula: "2d6", label: "2d6", description: "Greatsword damage" },
  { formula: "1d6+1", label: "d6+1", description: "Healing potion" },
  { formula: "4d6", label: "4d6", description: "Fireball damage" },
];

export function DiceRoller({
  onRoll,
  className,
  compact = false,
}: DiceRollerProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [currentRoll, setCurrentRoll] = useState({
    diceCount: 1,
    diceSides: 20,
    modifier: 0,
    advantage: false,
    disadvantage: false,
  });
  const [customFormula, setCustomFormula] = useState("");
  const [recentRolls, setRecentRolls] = useState<DiceResult[]>([]);

  // Roll dice function
  const rollDice = (
    count: number,
    sides: number,
    modifier: number = 0,
    advantage: boolean = false,
    disadvantage: boolean = false
  ): DiceResult => {
    const rolls: number[] = [];

    // Roll the dice
    for (let i = 0; i < count; i++) {
      rolls.push(Math.floor(Math.random() * sides) + 1);
    }

    // Handle advantage/disadvantage for d20 rolls
    if ((advantage || disadvantage) && sides === 20 && count === 1) {
      const secondRoll = Math.floor(Math.random() * 20) + 1;
      rolls.push(secondRoll);
    }

    // Calculate total
    let total = 0;
    if (advantage && sides === 20 && rolls.length >= 2) {
      total = Math.max(...rolls) + modifier;
    } else if (disadvantage && sides === 20 && rolls.length >= 2) {
      total = Math.min(...rolls) + modifier;
    } else {
      total = rolls.reduce((sum, roll) => sum + roll, 0) + modifier;
    }

    const formula = `${count}d${sides}${
      modifier !== 0 ? (modifier > 0 ? `+${modifier}` : modifier) : ""
    }`;

    return {
      formula,
      rolls,
      modifier,
      total,
      advantage,
      disadvantage,
      timestamp: new Date(),
    };
  };

  // Parse formula string (e.g., "2d6+3")
  const parseFormula = (
    formula: string
  ): { count: number; sides: number; modifier: number } | null => {
    const match = formula.match(/^(\d+)d(\d+)([+-]\d+)?$/);
    if (!match) return null;

    return {
      count: parseInt(match[1]),
      sides: parseInt(match[2]),
      modifier: match[3] ? parseInt(match[3]) : 0,
    };
  };

  // Handle dice roll
  const handleRoll = (
    count?: number,
    sides?: number,
    modifier?: number,
    advantage?: boolean,
    disadvantage?: boolean
  ) => {
    const result = rollDice(
      count ?? currentRoll.diceCount,
      sides ?? currentRoll.diceSides,
      modifier ?? currentRoll.modifier,
      advantage ?? currentRoll.advantage,
      disadvantage ?? currentRoll.disadvantage
    );

    // Add to recent rolls
    setRecentRolls((prev) => [result, ...prev.slice(0, 4)]);

    // Call callback if provided
    if (onRoll) {
      onRoll(result);
    }

    return result;
  };

  // Handle formula roll
  const handleFormulaRoll = () => {
    const parsed = parseFormula(customFormula);
    if (!parsed) return;

    handleRoll(parsed.count, parsed.sides, parsed.modifier);
    setCustomFormula("");
    setShowDialog(false);
  };

  // Handle quick roll
  const handleQuickRoll = (formula: string) => {
    const parsed = parseFormula(formula);
    if (!parsed) return;

    handleRoll(parsed.count, parsed.sides, parsed.modifier);
  };

  if (compact) {
    return (
      <TooltipProvider>
        <div className={`flex items-center gap-1 ${className}`}>
          {COMMON_DICE.slice(0, 3).map((dice) => (
            <Tooltip key={dice.sides}>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRoll(1, dice.sides)}
                  className="h-8 w-8 p-0"
                >
                  {dice.label}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Roll {dice.label}</TooltipContent>
            </Tooltip>
          ))}

          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                <Dice6 className="h-3 w-3" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Roll Dice</DialogTitle>
                <DialogDescription>
                  Configure and roll custom dice combinations.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Quick Formula Input */}
                <div className="space-y-2">
                  <Label>Quick Formula</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g., 2d6+3"
                      value={customFormula}
                      onChange={(e) => setCustomFormula(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleFormulaRoll();
                        }
                      }}
                    />
                    <Button
                      onClick={handleFormulaRoll}
                      disabled={!customFormula}
                    >
                      Roll
                    </Button>
                  </div>
                </div>

                {/* Common Rolls */}
                <div className="space-y-2">
                  <Label>Common Rolls</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {COMMON_ROLLS.map((roll) => (
                      <Button
                        key={roll.formula}
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickRoll(roll.formula)}
                        className="justify-start"
                      >
                        {roll.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Dice6 className="h-4 w-4" />
            Dice Roller
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Dice Configuration */}
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Count</Label>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentRoll((prev) => ({
                        ...prev,
                        diceCount: Math.max(1, prev.diceCount - 1),
                      }))
                    }
                    className="h-8 w-8 p-0"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="text-center font-medium w-8">
                    {currentRoll.diceCount}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentRoll((prev) => ({
                        ...prev,
                        diceCount: Math.min(10, prev.diceCount + 1),
                      }))
                    }
                    className="h-8 w-8 p-0"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Die</Label>
                <Select
                  value={currentRoll.diceSides.toString()}
                  onValueChange={(value) =>
                    setCurrentRoll((prev) => ({
                      ...prev,
                      diceSides: parseInt(value),
                    }))
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_DICE.map((dice) => (
                      <SelectItem
                        key={dice.sides}
                        value={dice.sides.toString()}
                      >
                        {dice.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Modifier</Label>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentRoll((prev) => ({
                        ...prev,
                        modifier: prev.modifier - 1,
                      }))
                    }
                    className="h-8 w-8 p-0"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="text-center font-medium w-8">
                    {currentRoll.modifier >= 0
                      ? `+${currentRoll.modifier}`
                      : currentRoll.modifier}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentRoll((prev) => ({
                        ...prev,
                        modifier: prev.modifier + 1,
                      }))
                    }
                    className="h-8 w-8 p-0"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Advantage/Disadvantage (for d20) */}
            {currentRoll.diceSides === 20 && currentRoll.diceCount === 1 && (
              <div className="flex gap-2">
                <Button
                  variant={currentRoll.advantage ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    setCurrentRoll((prev) => ({
                      ...prev,
                      advantage: !prev.advantage,
                      disadvantage: false,
                    }))
                  }
                  className="flex items-center gap-1 flex-1"
                >
                  <TrendingUp className="h-3 w-3" />
                  Advantage
                </Button>
                <Button
                  variant={currentRoll.disadvantage ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    setCurrentRoll((prev) => ({
                      ...prev,
                      disadvantage: !prev.disadvantage,
                      advantage: false,
                    }))
                  }
                  className="flex items-center gap-1 flex-1"
                >
                  <TrendingDown className="h-3 w-3" />
                  Disadvantage
                </Button>
              </div>
            )}

            {/* Roll Button */}
            <Button
              onClick={() => handleRoll()}
              className="w-full flex items-center gap-2"
            >
              <Dice6 className="h-4 w-4" />
              Roll {currentRoll.diceCount}d{currentRoll.diceSides}
              {currentRoll.modifier !== 0 &&
                (currentRoll.modifier > 0
                  ? `+${currentRoll.modifier}`
                  : currentRoll.modifier)}
            </Button>
          </div>

          {/* Quick Rolls */}
          <div className="space-y-2">
            <Label className="text-xs">Quick Rolls</Label>
            <div className="grid grid-cols-2 gap-1">
              {COMMON_ROLLS.slice(0, 4).map((roll) => (
                <Button
                  key={roll.formula}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickRoll(roll.formula)}
                  className="text-xs"
                >
                  {roll.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Recent Rolls */}
          {recentRolls.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Recent Rolls</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRecentRolls([])}
                  className="h-6 w-6 p-0"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </div>
              <div className="space-y-1">
                {recentRolls.slice(0, 3).map((result, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-muted rounded text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{result.formula}</span>
                      {result.advantage && (
                        <Badge variant="outline" className="text-xs">
                          ADV
                        </Badge>
                      )}
                      {result.disadvantage && (
                        <Badge variant="outline" className="text-xs">
                          DIS
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        [{result.rolls.join(", ")}]
                      </span>
                      <span className="font-bold">= {result.total}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
