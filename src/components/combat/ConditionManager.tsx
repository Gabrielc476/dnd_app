// src/components/combat/ConditionManager.tsx

"use client";

import React, { useState } from "react";
import {
  Timer,
  X,
  Plus,
  Clock,
  Target,
  AlertCircle,
  Filter,
  Trash2,
} from "lucide-react";
import { Combat, ConditionEffect } from "@/lib/types";
import { useCharacterStore } from "@/stores/characterStore";
import { useNPCStore } from "@/stores/npcStore";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";

interface ConditionManagerProps {
  combat: Combat;
  onAddCondition: (
    targetId: string,
    targetType: "character" | "npc",
    condition: string,
    duration: { type: "rounds" | "minutes" | "hours"; value: number },
    notes?: string
  ) => void;
  onRemoveCondition: (conditionId: string) => void;
  isUserDM: boolean;
}

interface NewCondition {
  targetId: string;
  targetType: "character" | "npc";
  condition: string;
  durationType: "rounds" | "minutes" | "hours";
  durationValue: number;
  notes: string;
}

const COMMON_CONDITIONS = [
  "Blinded",
  "Charmed",
  "Deafened",
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

export function ConditionManager({
  combat,
  onAddCondition,
  onRemoveCondition,
  isUserDM,
}: ConditionManagerProps) {
  const { getCharacterById } = useCharacterStore();
  const { getNPCById } = useNPCStore();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "character" | "npc">(
    "all"
  );
  const [newCondition, setNewCondition] = useState<NewCondition>({
    targetId: "",
    targetType: "character",
    condition: "",
    durationType: "rounds",
    durationValue: 1,
    notes: "",
  });

  // Get entity name by ID and type
  const getEntityName = (
    entityId: string,
    entityType: "character" | "npc"
  ): string => {
    if (entityType === "character") {
      const character = getCharacterById(entityId);
      return character?.name || "Unknown Character";
    } else {
      const npc = getNPCById(entityId);
      return npc?.name || "Unknown NPC";
    }
  };

  // Get combatants for target selection
  const getCombatants = () => {
    return combat.initiative_order.map((entry) => ({
      id: entry.id,
      type: entry.type,
      name: getEntityName(entry.id, entry.type),
    }));
  };

  // Filter conditions based on type
  const getFilteredConditions = () => {
    let filtered = combat.conditions || [];

    if (filterType !== "all") {
      filtered = filtered.filter(
        (condition) => condition.target_type === filterType
      );
    }

    return filtered;
  };

  // Calculate remaining duration
  const getRemainingDuration = (condition: ConditionEffect): string => {
    const currentRound = combat.round;
    const currentTurn = combat.current_turn;
    const appliedRound = condition.applied_at.round;
    const appliedTurn = condition.applied_at.turn;

    if (condition.duration.type === "rounds") {
      const roundsPassed = currentRound - appliedRound;
      const remaining = condition.duration.value - roundsPassed;

      if (remaining <= 0) {
        return "Expired";
      } else if (remaining === 1) {
        return "1 round";
      } else {
        return `${remaining} rounds`;
      }
    } else {
      // For minutes/hours, just show the duration
      return `${condition.duration.value} ${condition.duration.type}`;
    }
  };

  // Check if condition is expired
  const isConditionExpired = (condition: ConditionEffect): boolean => {
    if (condition.duration.type !== "rounds") return false;

    const currentRound = combat.round;
    const appliedRound = condition.applied_at.round;
    const roundsPassed = currentRound - appliedRound;

    return roundsPassed >= condition.duration.value;
  };

  // Handle add condition
  const handleAddCondition = () => {
    if (
      !newCondition.targetId ||
      !newCondition.condition ||
      newCondition.durationValue <= 0
    ) {
      return;
    }

    onAddCondition(
      newCondition.targetId,
      newCondition.targetType,
      newCondition.condition,
      {
        type: newCondition.durationType,
        value: newCondition.durationValue,
      },
      newCondition.notes || undefined
    );

    // Reset form
    setNewCondition({
      targetId: "",
      targetType: "character",
      condition: "",
      durationType: "rounds",
      durationValue: 1,
      notes: "",
    });
    setShowAddDialog(false);
  };

  // Handle remove condition
  const handleRemoveCondition = (conditionId: string) => {
    onRemoveCondition(conditionId);
  };

  const filteredConditions = getFilteredConditions();
  const combatants = getCombatants();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Condition Manager
            <Badge variant="outline">
              {filteredConditions.length} conditions
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter */}
            <Select
              value={filterType}
              onValueChange={(value: any) => setFilterType(value)}
            >
              <SelectTrigger className="w-32">
                <Filter className="h-4 w-4 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="character">Characters</SelectItem>
                <SelectItem value="npc">NPCs</SelectItem>
              </SelectContent>
            </Select>

            {/* Add Condition Button */}
            {isUserDM && (
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Condition
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Condition</DialogTitle>
                    <DialogDescription>
                      Apply a condition effect to a combatant.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    {/* Target Selection */}
                    <div className="space-y-2">
                      <Label>Target</Label>
                      <Select
                        value={newCondition.targetId}
                        onValueChange={(value) => {
                          const combatant = combatants.find(
                            (c) => c.id === value
                          );
                          setNewCondition((prev) => ({
                            ...prev,
                            targetId: value,
                            targetType: combatant?.type || "character",
                          }));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select target..." />
                        </SelectTrigger>
                        <SelectContent>
                          {combatants.map((combatant) => (
                            <SelectItem key={combatant.id} value={combatant.id}>
                              {combatant.name} ({combatant.type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Condition */}
                    <div className="space-y-2">
                      <Label>Condition</Label>
                      <Input
                        placeholder="Enter condition name..."
                        value={newCondition.condition}
                        onChange={(e) =>
                          setNewCondition((prev) => ({
                            ...prev,
                            condition: e.target.value,
                          }))
                        }
                      />
                      <div className="flex flex-wrap gap-1 mt-2">
                        {COMMON_CONDITIONS.map((condition) => (
                          <Button
                            key={condition}
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() =>
                              setNewCondition((prev) => ({
                                ...prev,
                                condition,
                              }))
                            }
                          >
                            {condition}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Duration */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label>Duration</Label>
                        <Input
                          type="number"
                          min="1"
                          value={newCondition.durationValue}
                          onChange={(e) =>
                            setNewCondition((prev) => ({
                              ...prev,
                              durationValue: parseInt(e.target.value) || 1,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select
                          value={newCondition.durationType}
                          onValueChange={(value: any) =>
                            setNewCondition((prev) => ({
                              ...prev,
                              durationType: value,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="rounds">Rounds</SelectItem>
                            <SelectItem value="minutes">Minutes</SelectItem>
                            <SelectItem value="hours">Hours</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                      <Label>Notes (Optional)</Label>
                      <Textarea
                        placeholder="Additional notes about this condition..."
                        value={newCondition.notes}
                        onChange={(e) =>
                          setNewCondition((prev) => ({
                            ...prev,
                            notes: e.target.value,
                          }))
                        }
                        rows={2}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      onClick={handleAddCondition}
                      disabled={
                        !newCondition.targetId ||
                        !newCondition.condition ||
                        newCondition.durationValue <= 0
                      }
                    >
                      Add Condition
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {filteredConditions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Timer className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No active conditions</p>
            <p className="text-sm">
              Conditions will appear here when applied to combatants
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredConditions.map((condition, index) => {
              const isExpired = isConditionExpired(condition);
              const remainingDuration = getRemainingDuration(condition);
              const targetName = getEntityName(
                condition.target_id,
                condition.target_type
              );

              return (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    isExpired
                      ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"
                      : "border-border bg-background"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{targetName}</span>
                        <Badge variant="outline" className="text-xs">
                          {condition.target_type}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge
                          variant={isExpired ? "destructive" : "default"}
                          className="text-sm"
                        >
                          {condition.condition}
                        </Badge>

                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{remainingDuration}</span>
                        </div>

                        {isExpired && (
                          <div className="flex items-center gap-1 text-sm text-red-600">
                            <AlertCircle className="h-3 w-3" />
                            <span>Expired</span>
                          </div>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground">
                        Applied in Round {condition.applied_at.round}, Turn{" "}
                        {condition.applied_at.turn + 1}
                      </div>

                      {condition.notes && (
                        <div className="text-sm text-muted-foreground border-l-2 border-muted pl-2">
                          {condition.notes}
                        </div>
                      )}
                    </div>

                    {isUserDM && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Remove Condition?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove the "
                              {condition.condition}" condition from {targetName}
                              ? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                handleRemoveCondition(
                                  `${condition.target_id}-${condition.condition}-${index}`
                                )
                              }
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Expired Conditions Warning */}
        {filteredConditions.some(isConditionExpired) && (
          <>
            <Separator />
            <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-800 dark:text-yellow-200">
                Some conditions have expired and should be removed.
              </span>
              {isUserDM && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    filteredConditions.forEach((condition, index) => {
                      if (isConditionExpired(condition)) {
                        handleRemoveCondition(
                          `${condition.target_id}-${condition.condition}-${index}`
                        );
                      }
                    });
                  }}
                  className="ml-auto"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Remove Expired
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
