// src/components/combat/InitiativeList.tsx

"use client";

import React, { useState } from "react";
import {
  ChevronRight,
  Dice6,
  Users,
  Crown,
  Heart,
  Shield,
  Zap,
} from "lucide-react";
import { Combat, InitiativeEntry } from "@/lib/types";
import { useCharacterStore } from "@/stores/characterStore";
import { useNPCStore } from "@/stores/npcStore";
import { formatModifier, getHPColorClass } from "@/lib/utils";

import { CombatantCard } from "./CombatantCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface InitiativeListProps {
  combat: Combat;
  currentCombatant: InitiativeEntry | null;
  selectedCombatant: string | null;
  onSelectCombatant: (id: string | null) => void;
  onInitiativeRoll: (
    entityId: string,
    entityType: "character" | "npc",
    advantage?: boolean,
    disadvantage?: boolean
  ) => void;
  onNextTurn: () => void;
  isUserDM: boolean;
  userId: string;
}

export function InitiativeList({
  combat,
  currentCombatant,
  selectedCombatant,
  onSelectCombatant,
  onInitiativeRoll,
  onNextTurn,
  isUserDM,
  userId,
}: InitiativeListProps) {
  const { getCharacterById } = useCharacterStore();
  const { getNPCById } = useNPCStore();

  const [rollMode, setRollMode] = useState<
    "normal" | "advantage" | "disadvantage"
  >("normal");

  // Get entity data (character or NPC)
  const getEntityData = (entry: InitiativeEntry) => {
    if (entry.type === "character") {
      const character = getCharacterById(entry.id);
      return {
        name: character?.name || entry.name || "Unknown Character",
        hp: character && "hp" in character ? character.hp : null,
        ac:
          character && "armor_class" in character
            ? character.armor_class
            : null,
        conditions:
          character && "conditions" in character ? character.conditions : [],
        isPlayer: true,
      };
    } else {
      const npc = getNPCById(entry.id);
      return {
        name: npc?.name || entry.name || "Unknown NPC",
        hp: npc && "stats" in npc ? npc.stats.hp : null,
        ac: npc && "stats" in npc ? npc.stats.ac : null,
        conditions: [],
        isPlayer: false,
      };
    }
  };

  // Check if user can control this entity
  const canControl = (entry: InitiativeEntry) => {
    if (isUserDM) return true;

    if (entry.type === "character") {
      const character = getCharacterById(entry.id);
      return (
        character && "owner_id" in character && character.owner_id === userId
      );
    }

    return false;
  };

  // Get initiative modifier for rolling
  const getInitiativeModifier = (entry: InitiativeEntry): string => {
    if (entry.type === "character") {
      const character = getCharacterById(entry.id);
      if (character && "attributes" in character && character.attributes) {
        const dexMod = Math.floor((character.attributes.dexterity - 10) / 2);
        const initBonus = character.initiative_bonus || 0;
        const total = dexMod + initBonus;
        return formatModifier(total);
      }
    } else {
      const npc = getNPCById(entry.id);
      if (npc && "stats" in npc && npc.stats.attributes) {
        const dexMod = Math.floor((npc.stats.attributes.dexterity - 10) / 2);
        return formatModifier(dexMod);
      }
    }
    return "+0";
  };

  // Handle initiative roll
  const handleInitiativeRoll = (entry: InitiativeEntry) => {
    const advantage = rollMode === "advantage";
    const disadvantage = rollMode === "disadvantage";

    onInitiativeRoll(entry.id, entry.type, advantage, disadvantage);
  };

  // Sort initiative order
  const sortedInitiative = [...combat.initiative_order].sort((a, b) => {
    // Sort by initiative (highest first), then by dexterity modifier as tiebreaker
    if (b.initiative !== a.initiative) {
      return b.initiative - a.initiative;
    }

    // Tiebreaker logic could be added here
    return 0;
  });

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Initiative Order
              <Badge variant="outline">Round {combat.round}</Badge>
            </div>

            {isUserDM && (
              <div className="flex items-center gap-2">
                <select
                  value={rollMode}
                  onChange={(e) =>
                    setRollMode(e.target.value as typeof rollMode)
                  }
                  className="text-sm border rounded px-2 py-1"
                >
                  <option value="normal">Normal</option>
                  <option value="advantage">Advantage</option>
                  <option value="disadvantage">Disadvantage</option>
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onNextTurn}
                  className="flex items-center gap-1"
                >
                  <ChevronRight className="h-4 w-4" />
                  Next Turn
                </Button>
              </div>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {sortedInitiative.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No combatants in initiative order</p>
              <p className="text-sm">Add characters and NPCs to begin combat</p>
            </div>
          ) : (
            sortedInitiative.map((entry, index) => {
              const entityData = getEntityData(entry);
              const isCurrentTurn = currentCombatant?.id === entry.id;
              const isSelected = selectedCombatant === entry.id;
              const canControlEntity = canControl(entry);
              const needsInitiative = entry.initiative === 0;

              return (
                <div
                  key={`${entry.type}-${entry.id}`}
                  className={`relative rounded-lg border transition-all ${
                    isCurrentTurn
                      ? "border-primary bg-primary/5 shadow-md"
                      : isSelected
                      ? "border-primary/50 bg-primary/2"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  {/* Current Turn Indicator */}
                  {isCurrentTurn && (
                    <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                      <ChevronRight className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}

                  <div
                    className="p-4 cursor-pointer"
                    onClick={() =>
                      onSelectCombatant(isSelected ? null : entry.id)
                    }
                  >
                    <div className="flex items-center justify-between">
                      {/* Left side - Avatar and Info */}
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback
                              className={
                                entityData.isPlayer
                                  ? "bg-blue-100 text-blue-600"
                                  : "bg-red-100 text-red-600"
                              }
                            >
                              {entityData.isPlayer ? (
                                <Users className="h-5 w-5" />
                              ) : (
                                <Crown className="h-5 w-5" />
                              )}
                            </AvatarFallback>
                          </Avatar>

                          {entry.has_acted && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium truncate">
                              {entityData.name}
                            </h4>
                            <Badge variant="outline" className="text-xs">
                              {entry.type === "character" ? "PC" : "NPC"}
                            </Badge>
                            {entityData.conditions.length > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {entityData.conditions.length} condition
                                {entityData.conditions.length > 1 ? "s" : ""}
                              </Badge>
                            )}
                          </div>

                          {/* HP and AC */}
                          {entityData.hp && (
                            <div className="flex items-center gap-4 mt-1">
                              <div className="flex items-center gap-1 text-sm">
                                <Heart className="h-3 w-3" />
                                <span
                                  className={getHPColorClass(
                                    entityData.hp.current,
                                    entityData.hp.max
                                  )}
                                >
                                  {entityData.hp.current}/{entityData.hp.max}
                                </span>
                              </div>

                              {entityData.ac && (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Shield className="h-3 w-3" />
                                  <span>{entityData.ac}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* HP Progress Bar */}
                          {entityData.hp && (
                            <Progress
                              value={
                                (entityData.hp.current / entityData.hp.max) *
                                100
                              }
                              className="h-1 mt-1"
                            />
                          )}
                        </div>
                      </div>

                      {/* Right side - Initiative and Actions */}
                      <div className="flex items-center gap-3">
                        {/* Initiative Score */}
                        <div className="text-center">
                          <div className="text-2xl font-bold">
                            {needsInitiative ? "?" : entry.initiative}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Initiative
                          </div>
                        </div>

                        {/* Initiative Roll Button */}
                        {needsInitiative && canControlEntity && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleInitiativeRoll(entry);
                                }}
                                className="flex items-center gap-1"
                              >
                                <Dice6 className="h-4 w-4" />
                                <span className="hidden sm:inline">
                                  Roll {getInitiativeModifier(entry)}
                                </span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              Roll initiative with {rollMode}
                            </TooltipContent>
                          </Tooltip>
                        )}

                        {/* Re-roll Initiative Button (DM only) */}
                        {!needsInitiative && isUserDM && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleInitiativeRoll(entry);
                                }}
                                className="flex items-center gap-1"
                              >
                                <Dice6 className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Re-roll initiative</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>

                    {/* Conditions List */}
                    {entityData.conditions.length > 0 && (
                      <div className="mt-2 pt-2 border-t">
                        <div className="flex flex-wrap gap-1">
                          {entityData.conditions.map((condition, idx) => (
                            <Badge
                              key={idx}
                              variant="destructive"
                              className="text-xs"
                            >
                              {condition}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Expanded Combatant Details */}
                  {isSelected && (
                    <div className="border-t bg-muted/30">
                      <CombatantCard
                        combatant={entry}
                        entityData={entityData}
                        canControl={canControlEntity}
                        isCurrentTurn={isCurrentTurn}
                        onAction={(action) => {
                          // Handle combatant actions
                          console.log("Combatant action:", action);
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Initiative Summary */}
          {sortedInitiative.length > 0 && (
            <>
              <Separator />
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>
                  {sortedInitiative.filter((e) => e.has_acted).length} /{" "}
                  {sortedInitiative.length} acted this round
                </span>
                <span>
                  Turn {combat.current_turn + 1} of {sortedInitiative.length}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
