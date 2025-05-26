// src/components/character/CharacterActions.tsx
"use client";

import React, { useState } from "react";
import { Character } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Swords,
  Dice1,
  Dice2,
  Dice3,
  Dice4,
  Dice5,
  Dice6,
  Heart,
  Shield,
  Zap,
  Target,
  Plus,
  Minus,
} from "lucide-react";
import { formatModifier } from "@/lib/utils";

interface CharacterActionsProps {
  character: Character;
  campaignId: string;
  userId: string;
  isReadOnly?: boolean;
  onRollDice?: (type: string, formula: string) => void;
  onUpdateHP?: (change: number, isTemp?: boolean) => Promise<boolean>;
  onAddCondition?: (condition: string) => Promise<boolean>;
  onRemoveCondition?: (condition: string) => Promise<boolean>;
  onUpdate?: (updates: Partial<Character>) => Promise<boolean>;
}

interface DiceRollDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRoll: (formula: string, type: string) => void;
  title: string;
}

function DiceRollDialog({
  isOpen,
  onClose,
  onRoll,
  title,
}: DiceRollDialogProps) {
  const [diceType, setDiceType] = useState("d20");
  const [diceCount, setDiceCount] = useState(1);
  const [modifier, setModifier] = useState(0);
  const [customFormula, setCustomFormula] = useState("");
  const [useCustom, setUseCustom] = useState(false);

  const handleRoll = () => {
    const formula = useCustom
      ? customFormula
      : `${diceCount}${diceType}${
          modifier !== 0 ? (modifier > 0 ? `+${modifier}` : `${modifier}`) : ""
        }`;

    onRoll(formula, title);
    onClose();

    // Reset form
    setDiceType("d20");
    setDiceCount(1);
    setModifier(0);
    setCustomFormula("");
    setUseCustom(false);
  };

  const diceIcons = {
    d4: Dice1,
    d6: Dice2,
    d8: Dice3,
    d10: Dice4,
    d12: Dice5,
    d20: Dice6,
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Configure your dice roll</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button
              variant={!useCustom ? "default" : "outline"}
              size="sm"
              onClick={() => setUseCustom(false)}
            >
              Standard
            </Button>
            <Button
              variant={useCustom ? "default" : "outline"}
              size="sm"
              onClick={() => setUseCustom(true)}
            >
              Custom
            </Button>
          </div>

          {useCustom ? (
            <div>
              <label className="text-sm font-medium">Formula</label>
              <Input
                placeholder="e.g., 2d6+3, 1d20+5"
                value={customFormula}
                onChange={(e) => setCustomFormula(e.target.value)}
              />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Count</label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={diceCount}
                  onChange={(e) => setDiceCount(parseInt(e.target.value) || 1)}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Die Type</label>
                <Select value={diceType} onValueChange={setDiceType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="d4">d4</SelectItem>
                    <SelectItem value="d6">d6</SelectItem>
                    <SelectItem value="d8">d8</SelectItem>
                    <SelectItem value="d10">d10</SelectItem>
                    <SelectItem value="d12">d12</SelectItem>
                    <SelectItem value="d20">d20</SelectItem>
                    <SelectItem value="d100">d100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Modifier</label>
                <Input
                  type="number"
                  value={modifier}
                  onChange={(e) => setModifier(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          )}

          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground">Preview:</div>
            <div className="text-lg font-mono">
              {useCustom
                ? customFormula || "Enter formula"
                : `${diceCount}${diceType}${
                    modifier !== 0
                      ? modifier > 0
                        ? `+${modifier}`
                        : `${modifier}`
                      : ""
                  }`}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleRoll}
            disabled={useCustom ? !customFormula : false}
          >
            Roll Dice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CharacterActions({
  character,
  campaignId,
  userId,
  isReadOnly = false,
  onRollDice,
  onUpdateHP,
  onAddCondition,
  onRemoveCondition,
  onUpdate,
}: CharacterActionsProps) {
  const [diceDialog, setDiceDialog] = useState(false);
  const [diceDialogTitle, setDiceDialogTitle] = useState("");

  const openDiceDialog = (title: string) => {
    setDiceDialogTitle(title);
    setDiceDialog(true);
  };

  const handleDiceRoll = (formula: string, type: string) => {
    if (onRollDice) {
      onRollDice(type, formula);
    }
  };

  // Quick actions for common rolls
  const quickRolls = [
    {
      name: "Initiative",
      icon: Zap,
      modifier:
        Math.floor((character.attributes.dexterity - 10) / 2) +
        (character.initiative_bonus || 0),
      formula: "1d20",
    },
    {
      name: "Death Save",
      icon: Heart,
      modifier: 0,
      formula: "1d20",
    },
  ];

  // Attribute checks
  const attributeChecks = [
    { name: "STR", attribute: "strength", icon: Swords },
    { name: "DEX", attribute: "dexterity", icon: Target },
    { name: "CON", attribute: "constitution", icon: Shield },
    { name: "INT", attribute: "intelligence", icon: Dice6 },
    { name: "WIS", attribute: "wisdom", icon: Dice5 },
    { name: "CHA", attribute: "charisma", icon: Dice4 },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Swords className="h-5 w-5" />
          Quick Actions
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* HP Quick Actions */}
        {!isReadOnly && (
          <div>
            <h4 className="text-sm font-medium mb-2">Hit Points</h4>
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onUpdateHP?.(-1)}
                className="flex items-center gap-1"
              >
                <Minus className="h-3 w-3" />
                -1 HP
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onUpdateHP?.(-5)}
                className="flex items-center gap-1"
              >
                <Minus className="h-3 w-3" />
                -5 HP
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onUpdateHP?.(1)}
                className="flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                +1 HP
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onUpdateHP?.(5)}
                className="flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                +5 HP
              </Button>
            </div>
          </div>
        )}

        <Separator />

        {/* Quick Rolls */}
        <div>
          <h4 className="text-sm font-medium mb-2">Quick Rolls</h4>
          <div className="grid grid-cols-2 gap-2">
            {quickRolls.map((roll) => {
              const IconComponent = roll.icon;
              return (
                <Tooltip key={roll.name}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onRollDice?.(roll.name, roll.formula)}
                      disabled={isReadOnly}
                      className="flex items-center gap-1"
                    >
                      <IconComponent className="h-3 w-3" />
                      {roll.name}
                      {roll.modifier !== 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {formatModifier(roll.modifier)}
                        </Badge>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {roll.name} ({roll.formula}
                      {roll.modifier !== 0 ? formatModifier(roll.modifier) : ""}
                      )
                    </p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Attribute Checks */}
        <div>
          <h4 className="text-sm font-medium mb-2">Ability Checks</h4>
          <div className="grid grid-cols-3 gap-2">
            {attributeChecks.map((attr) => {
              const IconComponent = attr.icon;
              const modifier = Math.floor(
                (character.attributes[
                  attr.attribute as keyof typeof character.attributes
                ] -
                  10) /
                  2
              );

              return (
                <Tooltip key={attr.name}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onRollDice?.(`${attr.name} Check`, "1d20")}
                      disabled={isReadOnly}
                      className="flex flex-col items-center gap-1 h-auto py-2"
                    >
                      <IconComponent className="h-3 w-3" />
                      <span className="text-xs">{attr.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {formatModifier(modifier)}
                      </Badge>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {attr.name} Check (1d20{formatModifier(modifier)})
                    </p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Custom Roll */}
        <div>
          <h4 className="text-sm font-medium mb-2">Custom Roll</h4>
          <Button
            variant="outline"
            size="sm"
            onClick={() => openDiceDialog("Custom Roll")}
            disabled={isReadOnly}
            className="w-full flex items-center gap-2"
          >
            <Dice6 className="h-4 w-4" />
            Roll Custom Dice
          </Button>
        </div>

        {/* Active Conditions Quick View */}
        {character.conditions.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-2">Active Conditions</h4>
              <div className="flex flex-wrap gap-1">
                {character.conditions.slice(0, 3).map((condition, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {condition}
                  </Badge>
                ))}
                {character.conditions.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{character.conditions.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          </>
        )}

        {/* Rest Actions */}
        {!isReadOnly && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-2">Rest</h4>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Short rest logic - recover some HP and abilities
                    const shortRestHP = Math.max(
                      1,
                      Math.floor(character.level / 2)
                    );
                    onUpdateHP?.(shortRestHP);
                  }}
                  className="text-xs"
                >
                  Short Rest
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    // Long rest logic - full HP, reset spell slots, etc.
                    const hpToRecover = character.hp.max - character.hp.current;
                    if (hpToRecover > 0) {
                      await onUpdateHP?.(hpToRecover);
                    }

                    // Reset spell slots if character has spellcasting
                    if (character.spellcasting) {
                      const resetSpellSlots = { ...character.spellcasting };
                      Object.keys(resetSpellSlots.spell_slots).forEach(
                        (level) => {
                          resetSpellSlots.spell_slots[level].used = 0;
                        }
                      );
                      await onUpdate?.({ spellcasting: resetSpellSlots });
                    }
                  }}
                  className="text-xs"
                >
                  Long Rest
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>

      {/* Custom Dice Roll Dialog */}
      <DiceRollDialog
        isOpen={diceDialog}
        onClose={() => setDiceDialog(false)}
        onRoll={handleDiceRoll}
        title={diceDialogTitle}
      />
    </Card>
  );
}
