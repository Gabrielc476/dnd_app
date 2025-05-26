// src/components/character/CharacterAttributes.tsx
"use client";

import React, { useState } from "react";
import { Character, Attributes } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Dice6, Edit3, Save, X, Zap } from "lucide-react";
import { formatModifier, getProficiencyBonus } from "@/lib/utils";

interface CharacterAttributesProps {
  character: Character;
  campaignId: string;
  userId: string;
  isReadOnly?: boolean;
  onUpdate?: (updates: Partial<Character>) => Promise<boolean>;
  onRollDice?: (type: string, formula: string) => void;
  isEditing?: boolean;
  onStartEditing?: () => void;
}

interface AttributeCardProps {
  name: string;
  attributeKey: keyof Attributes;
  value: number;
  modifier: number;
  savingThrowBonus: number;
  isProficientSavingThrow: boolean;
  isEditing: boolean;
  onValueChange: (key: keyof Attributes, value: number) => void;
  onRollAbility: () => void;
  onRollSavingThrow: () => void;
  isReadOnly: boolean;
}

function AttributeCard({
  name,
  attributeKey,
  value,
  modifier,
  savingThrowBonus,
  isProficientSavingThrow,
  isEditing,
  onValueChange,
  onRollAbility,
  onRollSavingThrow,
  isReadOnly,
}: AttributeCardProps) {
  return (
    <Card className="text-center">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Attribute Score */}
        <div>
          {isEditing ? (
            <Input
              type="number"
              min="1"
              max="30"
              value={value}
              onChange={(e) =>
                onValueChange(attributeKey, parseInt(e.target.value) || 1)
              }
              className="text-center text-lg font-bold w-16 mx-auto"
            />
          ) : (
            <div className="text-2xl font-bold">{value}</div>
          )}
        </div>

        {/* Modifier */}
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRollAbility}
            disabled={isReadOnly}
            className="w-12 h-12 rounded-full p-0"
          >
            <span className="text-lg font-bold">
              {formatModifier(modifier)}
            </span>
          </Button>
        </div>

        {/* Saving Throw */}
        <div className="flex items-center justify-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isProficientSavingThrow ? "secondary" : "ghost"}
                size="sm"
                onClick={onRollSavingThrow}
                disabled={isReadOnly}
                className="text-xs px-2 py-1 h-auto"
              >
                {formatModifier(savingThrowBonus)}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {name} Saving Throw {isProficientSavingThrow && "(Proficient)"}
              </p>
            </TooltipContent>
          </Tooltip>
          {isProficientSavingThrow && (
            <Badge variant="secondary" className="w-2 h-2 rounded-full p-0" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function CharacterAttributes({
  character,
  campaignId,
  userId,
  isReadOnly = false,
  onUpdate,
  onRollDice,
  isEditing = false,
  onStartEditing,
}: CharacterAttributesProps) {
  const [editValues, setEditValues] = useState(character.attributes);
  const [editingSavingThrows, setEditingSavingThrows] = useState(false);

  const proficiencyBonus = getProficiencyBonus(character.level);

  // Get saving throw proficiencies
  const savingThrowProficiencies = character.proficiencies
    .filter((prof) => prof.type === "saving_throw")
    .map((prof) => prof.name.toLowerCase());

  const handleSave = async () => {
    if (onUpdate) {
      await onUpdate({ attributes: editValues });
    }
  };

  const handleCancel = () => {
    setEditValues(character.attributes);
  };

  const handleAttributeChange = (key: keyof Attributes, value: number) => {
    setEditValues((prev) => ({ ...prev, [key]: value }));
  };

  const rollAttribute = (attributeName: string) => {
    if (onRollDice) {
      onRollDice(`${attributeName} Check`, "1d20");
    }
  };

  const rollSavingThrow = (attributeName: string) => {
    if (onRollDice) {
      onRollDice(`${attributeName} Save`, "1d20");
    }
  };

  const attributes = [
    { name: "Strength", key: "strength" as keyof Attributes, short: "STR" },
    { name: "Dexterity", key: "dexterity" as keyof Attributes, short: "DEX" },
    {
      name: "Constitution",
      key: "constitution" as keyof Attributes,
      short: "CON",
    },
    {
      name: "Intelligence",
      key: "intelligence" as keyof Attributes,
      short: "INT",
    },
    { name: "Wisdom", key: "wisdom" as keyof Attributes, short: "WIS" },
    { name: "Charisma", key: "charisma" as keyof Attributes, short: "CHA" },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Ability Scores
          </CardTitle>
          {!isReadOnly && !isEditing && (
            <Button variant="outline" size="sm" onClick={onStartEditing}>
              <Edit3 className="h-4 w-4" />
            </Button>
          )}
          {isEditing && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSave}>
                <Save className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleCancel}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {attributes.map((attr) => {
            const currentValue = isEditing
              ? editValues[attr.key]
              : character.attributes[attr.key];
            const modifier = Math.floor((currentValue - 10) / 2);
            const isProficientSavingThrow = savingThrowProficiencies.includes(
              attr.name.toLowerCase()
            );
            const savingThrowBonus =
              modifier + (isProficientSavingThrow ? proficiencyBonus : 0);

            return (
              <AttributeCard
                key={attr.key}
                name={attr.short}
                attributeKey={attr.key}
                value={currentValue}
                modifier={modifier}
                savingThrowBonus={savingThrowBonus}
                isProficientSavingThrow={isProficientSavingThrow}
                isEditing={isEditing}
                onValueChange={handleAttributeChange}
                onRollAbility={() => rollAttribute(attr.name)}
                onRollSavingThrow={() => rollSavingThrow(attr.name)}
                isReadOnly={isReadOnly}
              />
            );
          })}
        </div>

        {/* Quick Actions */}
        {!isReadOnly && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRollDice?.("Initiative", "1d20")}
                    className="flex items-center gap-1"
                  >
                    <Dice6 className="h-4 w-4" />
                    Initiative
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    Roll Initiative (
                    {formatModifier(
                      Math.floor((character.attributes.dexterity - 10) / 2) +
                        (character.initiative_bonus || 0)
                    )}
                    )
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
