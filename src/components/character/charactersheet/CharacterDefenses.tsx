// src/components/character/CharacterDefenses.tsx
"use client";

import React, { useState } from "react";
import { Character } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Shield, Heart, Zap, Plus, Minus, Edit3, Save, X } from "lucide-react";
import { getHPColorClass } from "@/lib/utils";

interface CharacterDefensesProps {
  character: Character;
  campaignId: string;
  userId: string;
  isReadOnly?: boolean;
  onUpdate?: (updates: Partial<Character>) => Promise<boolean>;
  onUpdateHP?: (change: number, isTemp?: boolean) => Promise<boolean>;
  isEditing?: boolean;
  onStartEditing?: () => void;
}

export function CharacterDefenses({
  character,
  campaignId,
  userId,
  isReadOnly = false,
  onUpdate,
  onUpdateHP,
  isEditing = false,
  onStartEditing,
}: CharacterDefensesProps) {
  const [editValues, setEditValues] = useState({
    armor_class: character.armor_class,
    hp: character.hp,
    speed: character.speed,
    initiative_bonus: character.initiative_bonus,
  });

  const [hpChangeDialog, setHpChangeDialog] = useState(false);
  const [hpChangeValue, setHpChangeValue] = useState(0);
  const [isHeal, setIsHeal] = useState(true);
  const [isTemporary, setIsTemporary] = useState(false);

  const handleSave = async () => {
    if (onUpdate) {
      await onUpdate({
        armor_class: editValues.armor_class,
        hp: editValues.hp,
        speed: editValues.speed,
        initiative_bonus: editValues.initiative_bonus,
      });
    }
  };

  const handleCancel = () => {
    setEditValues({
      armor_class: character.armor_class,
      hp: character.hp,
      speed: character.speed,
      initiative_bonus: character.initiative_bonus,
    });
  };

  const handleHPChange = async () => {
    if (onUpdateHP) {
      const change = isHeal ? hpChangeValue : -hpChangeValue;
      await onUpdateHP(change, isTemporary);
      setHpChangeDialog(false);
      setHpChangeValue(0);
    }
  };

  const openHPDialog = (heal: boolean, temp: boolean = false) => {
    setIsHeal(heal);
    setIsTemporary(temp);
    setHpChangeDialog(true);
  };

  const hpPercentage = (character.hp.current / character.hp.max) * 100;
  const hpColorClass = getHPColorClass(character.hp.current, character.hp.max);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Defenses
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

      <CardContent className="space-y-6">
        {/* Armor Class */}
        <div className="text-center">
          <div className="text-sm font-medium text-muted-foreground mb-1">
            Armor Class
          </div>
          {isEditing ? (
            <Input
              type="number"
              min="1"
              max="30"
              value={editValues.armor_class}
              onChange={(e) =>
                setEditValues({
                  ...editValues,
                  armor_class: parseInt(e.target.value) || 1,
                })
              }
              className="text-center text-2xl font-bold w-20 mx-auto"
            />
          ) : (
            <div className="text-3xl font-bold">{character.armor_class}</div>
          )}
        </div>

        {/* Hit Points */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Hit Points
            </span>
            {!isReadOnly && !isEditing && (
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openHPDialog(false)}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openHPDialog(true)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          <div className="text-center">
            {isEditing ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <span>Current:</span>
                  <Input
                    type="number"
                    min="0"
                    value={editValues.hp.current}
                    onChange={(e) =>
                      setEditValues({
                        ...editValues,
                        hp: {
                          ...editValues.hp,
                          current: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    className="text-center w-20"
                  />
                </div>
                <div className="flex items-center justify-center gap-2">
                  <span>Max:</span>
                  <Input
                    type="number"
                    min="1"
                    value={editValues.hp.max}
                    onChange={(e) =>
                      setEditValues({
                        ...editValues,
                        hp: {
                          ...editValues.hp,
                          max: parseInt(e.target.value) || 1,
                        },
                      })
                    }
                    className="text-center w-20"
                  />
                </div>
              </div>
            ) : (
              <>
                <div className={`text-2xl font-bold ${hpColorClass}`}>
                  {character.hp.current}
                  <span className="text-lg text-muted-foreground">
                    /{character.hp.max}
                  </span>
                </div>
                <Progress value={hpPercentage} className="w-full mt-2" />
              </>
            )}
          </div>

          {/* Temporary HP */}
          {character.temporary_hp > 0 && (
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Temporary HP</div>
              <div className="text-lg font-semibold text-blue-600">
                +{character.temporary_hp}
              </div>
            </div>
          )}
        </div>

        {/* Speed */}
        <div className="text-center">
          <div className="text-sm font-medium text-muted-foreground mb-1">
            Speed
          </div>
          {isEditing ? (
            <div className="flex items-center justify-center gap-2">
              <Input
                type="number"
                min="0"
                value={editValues.speed}
                onChange={(e) =>
                  setEditValues({
                    ...editValues,
                    speed: parseInt(e.target.value) || 0,
                  })
                }
                className="text-center w-20"
              />
              <span className="text-sm">ft</span>
            </div>
          ) : (
            <div className="text-xl font-bold">{character.speed} ft</div>
          )}
        </div>

        {/* Initiative */}
        <div className="text-center">
          <div className="text-sm font-medium text-muted-foreground mb-1">
            Initiative
          </div>
          {isEditing ? (
            <Input
              type="number"
              value={editValues.initiative_bonus}
              onChange={(e) =>
                setEditValues({
                  ...editValues,
                  initiative_bonus: parseInt(e.target.value) || 0,
                })
              }
              className="text-center w-20 mx-auto"
            />
          ) : (
            <div className="text-xl font-bold">
              {character.initiative_bonus >= 0 ? "+" : ""}
              {character.initiative_bonus}
            </div>
          )}
        </div>
      </CardContent>

      {/* HP Change Dialog */}
      <Dialog open={hpChangeDialog} onOpenChange={setHpChangeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isHeal ? "Heal" : "Damage"} {character.name}
              {isTemporary && " (Temporary)"}
            </DialogTitle>
            <DialogDescription>
              Enter the amount of {isHeal ? "healing" : "damage"} to apply.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Input
                type="number"
                min="0"
                value={hpChangeValue}
                onChange={(e) =>
                  setHpChangeValue(parseInt(e.target.value) || 0)
                }
                className="text-center w-24"
                placeholder="0"
              />
              <span>HP</span>
            </div>

            <div className="flex items-center justify-center gap-4">
              <Button
                variant={isHeal ? "default" : "outline"}
                onClick={() => setIsHeal(true)}
              >
                <Heart className="h-4 w-4 mr-1" />
                Heal
              </Button>
              <Button
                variant={!isHeal ? "default" : "outline"}
                onClick={() => setIsHeal(false)}
              >
                <Minus className="h-4 w-4 mr-1" />
                Damage
              </Button>
            </div>

            {isHeal && (
              <div className="flex items-center justify-center">
                <Button
                  variant={isTemporary ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setIsTemporary(!isTemporary)}
                >
                  Temporary HP
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setHpChangeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleHPChange} disabled={hpChangeValue <= 0}>
              Apply {isHeal ? "Healing" : "Damage"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
