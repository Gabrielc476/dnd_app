// src/components/combat/CombatStats.tsx

"use client";

import React from "react";
import {
  BarChart3,
  Clock,
  Users,
  Zap,
  Heart,
  Shield,
  Target,
  TrendingUp,
  Activity,
  Award,
} from "lucide-react";
import { Combat, InitiativeEntry } from "@/lib/types";
import { useCharacterStore } from "@/stores/characterStore";
import { useNPCStore } from "@/stores/npcStore";
import { formatModifier, getHPColorClass } from "@/lib/utils";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CombatStatsProps {
  combat: Combat;
  currentCombatant: InitiativeEntry | null;
  selectedCombatant: string | null;
}

export function CombatStats({
  combat,
  currentCombatant,
  selectedCombatant,
}: CombatStatsProps) {
  const { getCharacterById } = useCharacterStore();
  const { getNPCById } = useNPCStore();

  // Get entity data helper
  const getEntityData = (entityId: string, entityType: "character" | "npc") => {
    if (entityType === "character") {
      const character = getCharacterById(entityId);
      return {
        name: character?.name || "Unknown Character",
        hp: character && "hp" in character ? character.hp : null,
        ac:
          character && "armor_class" in character
            ? character.armor_class
            : null,
        attributes:
          character && "attributes" in character ? character.attributes : null,
        level: character && "level" in character ? character.level : null,
        isPlayer: true,
      };
    } else {
      const npc = getNPCById(entityId);
      return {
        name: npc?.name || "Unknown NPC",
        hp: npc && "stats" in npc ? npc.stats.hp : null,
        ac: npc && "stats" in npc ? npc.stats.ac : null,
        attributes: npc && "stats" in npc ? npc.stats.attributes : null,
        cr: npc && "stats" in npc ? npc.stats.challenge_rating : null,
        isPlayer: false,
      };
    }
  };

  // Calculate combat statistics
  const getCombatStats = () => {
    const totalCombatants = combat.initiative_order.length;
    const charactersCount = combat.initiative_order.filter(
      (c) => c.type === "character"
    ).length;
    const npcsCount = combat.initiative_order.filter(
      (c) => c.type === "npc"
    ).length;
    const actedThisRound = combat.initiative_order.filter(
      (c) => c.has_acted
    ).length;
    const totalActions = combat.events?.length || 0;
    const totalConditions = combat.conditions?.length || 0;

    // Calculate average initiative
    const totalInitiative = combat.initiative_order.reduce(
      (sum, c) => sum + c.initiative,
      0
    );
    const averageInitiative =
      totalCombatants > 0 ? Math.round(totalInitiative / totalCombatants) : 0;

    // Calculate HP statistics for characters
    let totalCharacterHP = 0;
    let currentCharacterHP = 0;
    let aliveCharacters = 0;

    combat.initiative_order
      .filter((c) => c.type === "character")
      .forEach((c) => {
        const data = getEntityData(c.id, c.type);
        if (data.hp) {
          totalCharacterHP += data.hp.max;
          currentCharacterHP += data.hp.current;
          if (data.hp.current > 0) aliveCharacters++;
        }
      });

    // Calculate turn duration estimate
    const turnsCompleted =
      (combat.round - 1) * totalCombatants + actedThisRound;
    const estimatedTimePerTurn = turnsCompleted > 0 ? 6 : 6; // 6 seconds per turn in D&D
    const combatDuration = turnsCompleted * estimatedTimePerTurn;

    return {
      totalCombatants,
      charactersCount,
      npcsCount,
      actedThisRound,
      totalActions,
      totalConditions,
      averageInitiative,
      totalCharacterHP,
      currentCharacterHP,
      aliveCharacters,
      combatDuration,
      turnsCompleted,
    };
  };

  // Get selected combatant details
  const getSelectedCombatantDetails = () => {
    if (!selectedCombatant) return null;

    const combatant = combat.initiative_order.find(
      (c) => c.id === selectedCombatant
    );
    if (!combatant) return null;

    const entityData = getEntityData(combatant.id, combatant.type);

    return {
      combatant,
      entityData,
    };
  };

  const stats = getCombatStats();
  const selectedDetails = getSelectedCombatantDetails();

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Current Turn Info */}
        {currentCombatant && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4" />
                Current Turn
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback
                      className={
                        currentCombatant.type === "character"
                          ? "bg-blue-100 text-blue-600"
                          : "bg-red-100 text-red-600"
                      }
                    >
                      {currentCombatant.type === "character" ? "PC" : "NPC"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {
                        getEntityData(
                          currentCombatant.id,
                          currentCombatant.type
                        ).name
                      }
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Initiative {currentCombatant.initiative}
                    </p>
                  </div>
                  <Badge
                    variant={currentCombatant.has_acted ? "default" : "outline"}
                    className="text-xs"
                  >
                    {currentCombatant.has_acted ? "Acted" : "Ready"}
                  </Badge>
                </div>

                {(() => {
                  const entityData = getEntityData(
                    currentCombatant.id,
                    currentCombatant.type
                  );
                  return (
                    entityData.hp && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>HP</span>
                          <span
                            className={getHPColorClass(
                              entityData.hp.current,
                              entityData.hp.max
                            )}
                          >
                            {entityData.hp.current}/{entityData.hp.max}
                          </span>
                        </div>
                        <Progress
                          value={
                            (entityData.hp.current / entityData.hp.max) * 100
                          }
                          className="h-1"
                        />
                      </div>
                    )
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Combat Overview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <BarChart3 className="h-4 w-4" />
              Combat Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {combat.round}
                </div>
                <div className="text-xs text-muted-foreground">Round</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.totalCombatants}
                </div>
                <div className="text-xs text-muted-foreground">Combatants</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {stats.actedThisRound}
                </div>
                <div className="text-xs text-muted-foreground">Acted</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {stats.totalActions}
                </div>
                <div className="text-xs text-muted-foreground">Actions</div>
              </div>
            </div>

            <Separator className="my-4" />

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Round Progress</span>
                <span>
                  {stats.actedThisRound}/{stats.totalCombatants}
                </span>
              </div>
              <Progress
                value={(stats.actedThisRound / stats.totalCombatants) * 100}
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Party Health (Characters only) */}
        {stats.charactersCount > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Heart className="h-4 w-4" />
                Party Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Total HP
                  </span>
                  <span
                    className={`font-medium ${getHPColorClass(
                      stats.currentCharacterHP,
                      stats.totalCharacterHP
                    )}`}
                  >
                    {stats.currentCharacterHP}/{stats.totalCharacterHP}
                  </span>
                </div>

                <Progress
                  value={
                    (stats.currentCharacterHP / stats.totalCharacterHP) * 100
                  }
                  className="h-2"
                />

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">
                      {stats.aliveCharacters}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Conscious
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-lg font-bold text-red-600">
                      {stats.charactersCount - stats.aliveCharacters}
                    </div>
                    <div className="text-xs text-muted-foreground">Down</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Initiative Rankings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4" />
              Initiative Order
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {combat.initiative_order
                .sort((a, b) => b.initiative - a.initiative)
                .slice(0, 5)
                .map((combatant, index) => {
                  const entityData = getEntityData(
                    combatant.id,
                    combatant.type
                  );
                  const isSelected = selectedCombatant === combatant.id;
                  const isCurrent = currentCombatant?.id === combatant.id;

                  return (
                    <div
                      key={combatant.id}
                      className={`flex items-center gap-2 p-2 rounded text-sm ${
                        isCurrent
                          ? "bg-primary/10 border border-primary/20"
                          : isSelected
                          ? "bg-muted"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="w-6 text-center">
                        <Badge
                          variant="outline"
                          className="text-xs w-6 h-6 p-0 flex items-center justify-center"
                        >
                          {index + 1}
                        </Badge>
                      </div>

                      <Avatar className="h-6 w-6">
                        <AvatarFallback
                          className={
                            entityData.isPlayer
                              ? "bg-blue-100 text-blue-600"
                              : "bg-red-100 text-red-600"
                          }
                        >
                          {entityData.isPlayer ? "PC" : "NPC"}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium">
                          {entityData.name}
                        </p>
                      </div>

                      <div className="text-right">
                        <div className="font-bold">{combatant.initiative}</div>
                      </div>

                      {combatant.has_acted && (
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                      )}
                    </div>
                  );
                })}

              {combat.initiative_order.length > 5 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  +{combat.initiative_order.length - 5} more combatants
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Selected Combatant Details */}
        {selectedDetails && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Target className="h-4 w-4" />
                Selected Combatant
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback
                      className={
                        selectedDetails.entityData.isPlayer
                          ? "bg-blue-100 text-blue-600"
                          : "bg-red-100 text-red-600"
                      }
                    >
                      {selectedDetails.entityData.isPlayer ? "PC" : "NPC"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">
                      {selectedDetails.entityData.name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs">
                        {selectedDetails.combatant.type}
                      </Badge>
                      {selectedDetails.entityData.level && (
                        <span>Level {selectedDetails.entityData.level}</span>
                      )}
                      {selectedDetails.entityData.cr && (
                        <span>CR {selectedDetails.entityData.cr}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* HP and AC */}
                {selectedDetails.entityData.hp && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <Heart className="h-3 w-3" />
                        Hit Points
                      </div>
                      <div className="space-y-1">
                        <div
                          className={`font-bold ${getHPColorClass(
                            selectedDetails.entityData.hp.current,
                            selectedDetails.entityData.hp.max
                          )}`}
                        >
                          {selectedDetails.entityData.hp.current}/
                          {selectedDetails.entityData.hp.max}
                        </div>
                        <Progress
                          value={
                            (selectedDetails.entityData.hp.current /
                              selectedDetails.entityData.hp.max) *
                            100
                          }
                          className="h-1"
                        />
                      </div>
                    </div>

                    {selectedDetails.entityData.ac && (
                      <div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <Shield className="h-3 w-3" />
                          Armor Class
                        </div>
                        <div className="font-bold">
                          {selectedDetails.entityData.ac}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Initiative */}
                <div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    <Zap className="h-3 w-3" />
                    Initiative
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">
                      {selectedDetails.combatant.initiative}
                    </span>
                    <Badge
                      variant={
                        selectedDetails.combatant.has_acted
                          ? "default"
                          : "outline"
                      }
                      className="text-xs"
                    >
                      {selectedDetails.combatant.has_acted ? "Acted" : "Ready"}
                    </Badge>
                  </div>
                </div>

                {/* Ability Scores (if available) */}
                {selectedDetails.entityData.attributes && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-2">
                      Ability Scores
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {Object.entries(
                        selectedDetails.entityData.attributes
                      ).map(([ability, score]) => (
                        <Tooltip key={ability}>
                          <TooltipTrigger asChild>
                            <div className="text-center p-1 bg-muted rounded">
                              <div className="font-medium">
                                {ability.slice(0, 3).toUpperCase()}
                              </div>
                              <div className="text-xs">
                                {score} ({formatModifier(score)})
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {ability.charAt(0).toUpperCase() + ability.slice(1)}
                            : {score}
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Combat Statistics */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4" />
              Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  Average Initiative
                </span>
                <Badge variant="outline" className="text-xs">
                  {stats.averageInitiative}
                </Badge>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  Active Conditions
                </span>
                <Badge variant="outline" className="text-xs">
                  {stats.totalConditions}
                </Badge>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  Combat Duration
                </span>
                <Badge variant="outline" className="text-xs">
                  {Math.floor(stats.combatDuration / 60)}m{" "}
                  {stats.combatDuration % 60}s
                </Badge>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  Turns Completed
                </span>
                <Badge variant="outline" className="text-xs">
                  {stats.turnsCompleted}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
