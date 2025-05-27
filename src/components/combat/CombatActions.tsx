// src/components/combat/CombatActions.tsx

"use client";

import React, { useState } from "react";
import {
  Sword,
  Shield,
  Zap,
  Heart,
  Target,
  ArrowRight,
  Dice6,
  MessageSquare,
  History,
  Eye,
  Plus,
} from "lucide-react";
import { Combat, CombatEvent } from "@/lib/types";
import { useCharacterStore } from "@/stores/characterStore";
import { useNPCStore } from "@/stores/npcStore";
import { formatDate } from "@/lib/utils";

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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface CombatActionsProps {
  combat: Combat;
  selectedCombatant: string | null;
  onRegisterAction: (
    actorId: string,
    actionType: string,
    description: string,
    targetId?: string,
    targetType?: "character" | "npc"
  ) => void;
  onAddCondition: (
    targetId: string,
    targetType: "character" | "npc",
    condition: string,
    duration: { type: "rounds" | "minutes" | "hours"; value: number }
  ) => void;
  isUserDM: boolean;
  userId: string;
}

interface NewAction {
  actorId: string;
  actionType: string;
  description: string;
  targetId: string;
  targetType: "character" | "npc";
  damage: string;
  healing: string;
  condition: string;
  customAction: string;
}

const ACTION_TYPES = [
  {
    id: "attack",
    name: "Attack",
    icon: Sword,
    description: "Make an attack roll",
  },
  { id: "cast", name: "Cast Spell", icon: Zap, description: "Cast a spell" },
  { id: "heal", name: "Heal", icon: Heart, description: "Restore hit points" },
  {
    id: "dash",
    name: "Dash",
    icon: ArrowRight,
    description: "Move additional distance",
  },
  {
    id: "dodge",
    name: "Dodge",
    icon: Shield,
    description: "Focus on avoiding attacks",
  },
  {
    id: "help",
    name: "Help",
    icon: Target,
    description: "Aid another creature",
  },
  { id: "hide", name: "Hide", icon: Eye, description: "Attempt to hide" },
  {
    id: "ready",
    name: "Ready",
    icon: Target,
    description: "Prepare an action",
  },
  {
    id: "other",
    name: "Other",
    icon: MessageSquare,
    description: "Custom action",
  },
];

export function CombatActions({
  combat,
  selectedCombatant,
  onRegisterAction,
  onAddCondition,
  isUserDM,
  userId,
}: CombatActionsProps) {
  const { getCharacterById } = useCharacterStore();
  const { getNPCById } = useNPCStore();

  const [showActionDialog, setShowActionDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("actions");
  const [newAction, setNewAction] = useState<NewAction>({
    actorId: "",
    actionType: "",
    description: "",
    targetId: "",
    targetType: "character",
    damage: "",
    healing: "",
    condition: "",
    customAction: "",
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

  // Get combatants for selection
  const getCombatants = () => {
    return combat.initiative_order.map((entry) => ({
      id: entry.id,
      type: entry.type,
      name: getEntityName(entry.id, entry.type),
    }));
  };

  // Check if user can control an entity
  const canControlEntity = (
    entityId: string,
    entityType: "character" | "npc"
  ): boolean => {
    if (isUserDM) return true;

    if (entityType === "character") {
      const character = getCharacterById(entityId);
      return (
        character && "owner_id" in character && character.owner_id === userId
      );
    }

    return false;
  };

  // Get current combatant
  const getCurrentCombatant = () => {
    if (combat.initiative_order.length === 0) return null;
    const currentIndex = combat.current_turn;
    if (currentIndex >= combat.initiative_order.length) return null;
    return combat.initiative_order[currentIndex];
  };

  // Handle action registration
  const handleRegisterAction = () => {
    if (!newAction.actorId || !newAction.actionType) return;

    let description = newAction.description;

    // Build description based on action type
    if (!description) {
      const actionType = ACTION_TYPES.find(
        (a) => a.id === newAction.actionType
      );
      description = actionType?.description || "Performed an action";

      if (newAction.damage) {
        description += ` (${newAction.damage} damage)`;
      }
      if (newAction.healing) {
        description += ` (${newAction.healing} healing)`;
      }
      if (newAction.condition) {
        description += ` (${newAction.condition} condition)`;
      }
      if (newAction.customAction) {
        description = newAction.customAction;
      }
    }

    onRegisterAction(
      newAction.actorId,
      newAction.actionType,
      description,
      newAction.targetId || undefined,
      newAction.targetType
    );

    // Reset form
    setNewAction({
      actorId: "",
      actionType: "",
      description: "",
      targetId: "",
      targetType: "character",
      damage: "",
      healing: "",
      condition: "",
      customAction: "",
    });
    setShowActionDialog(false);
  };

  // Handle quick action
  const handleQuickAction = (actionType: string) => {
    const currentCombatant = getCurrentCombatant();
    if (!currentCombatant) return;

    const canControl = canControlEntity(
      currentCombatant.id,
      currentCombatant.type
    );
    if (!canControl && !isUserDM) return;

    const actionData = ACTION_TYPES.find((a) => a.id === actionType);
    const description = actionData?.description || "Performed an action";

    onRegisterAction(currentCombatant.id, actionType, description);
  };

  const combatants = getCombatants();
  const currentCombatant = getCurrentCombatant();
  const canControlCurrent = currentCombatant
    ? canControlEntity(currentCombatant.id, currentCombatant.type)
    : false;

  // Sort events by timestamp (most recent first)
  const sortedEvents = [...(combat.events || [])].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="space-y-6">
      {/* Quick Actions for Current Turn */}
      {currentCombatant && (canControlCurrent || isUserDM) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Quick Actions
              <Badge variant="outline">
                {getEntityName(currentCombatant.id, currentCombatant.type)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {ACTION_TYPES.slice(0, 6).map((action) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.id}
                    variant="outline"
                    className="flex items-center gap-2 h-auto p-3"
                    onClick={() => handleQuickAction(action.id)}
                  >
                    <Icon className="h-4 w-4" />
                    <div className="text-left">
                      <div className="font-medium text-sm">{action.name}</div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Actions Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Combat Actions
            </div>

            {isUserDM && (
              <Dialog
                open={showActionDialog}
                onOpenChange={setShowActionDialog}
              >
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Action
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Register Combat Action</DialogTitle>
                    <DialogDescription>
                      Record an action performed during combat.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    {/* Actor Selection */}
                    <div className="space-y-2">
                      <Label>Actor</Label>
                      <Select
                        value={newAction.actorId}
                        onValueChange={(value) =>
                          setNewAction((prev) => ({ ...prev, actorId: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select actor..." />
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

                    {/* Action Type */}
                    <div className="space-y-2">
                      <Label>Action Type</Label>
                      <Select
                        value={newAction.actionType}
                        onValueChange={(value) =>
                          setNewAction((prev) => ({
                            ...prev,
                            actionType: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select action type..." />
                        </SelectTrigger>
                        <SelectContent>
                          {ACTION_TYPES.map((action) => (
                            <SelectItem key={action.id} value={action.id}>
                              {action.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Target (optional) */}
                    {(newAction.actionType === "attack" ||
                      newAction.actionType === "cast" ||
                      newAction.actionType === "help") && (
                      <div className="space-y-2">
                        <Label>Target (Optional)</Label>
                        <Select
                          value={newAction.targetId}
                          onValueChange={(value) => {
                            const target = combatants.find(
                              (c) => c.id === value
                            );
                            setNewAction((prev) => ({
                              ...prev,
                              targetId: value,
                              targetType: target?.type || "character",
                            }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select target..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">No target</SelectItem>
                            {combatants.map((combatant) => (
                              <SelectItem
                                key={combatant.id}
                                value={combatant.id}
                              >
                                {combatant.name} ({combatant.type})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Action Details */}
                    {newAction.actionType === "attack" && (
                      <div className="space-y-2">
                        <Label>Damage</Label>
                        <Input
                          placeholder="e.g., 1d8+3 slashing"
                          value={newAction.damage}
                          onChange={(e) =>
                            setNewAction((prev) => ({
                              ...prev,
                              damage: e.target.value,
                            }))
                          }
                        />
                      </div>
                    )}

                    {newAction.actionType === "heal" && (
                      <div className="space-y-2">
                        <Label>Healing</Label>
                        <Input
                          placeholder="e.g., 2d4+2 hit points"
                          value={newAction.healing}
                          onChange={(e) =>
                            setNewAction((prev) => ({
                              ...prev,
                              healing: e.target.value,
                            }))
                          }
                        />
                      </div>
                    )}

                    {newAction.actionType === "cast" && (
                      <div className="space-y-2">
                        <Label>Condition/Effect</Label>
                        <Input
                          placeholder="e.g., Stunned, Charmed"
                          value={newAction.condition}
                          onChange={(e) =>
                            setNewAction((prev) => ({
                              ...prev,
                              condition: e.target.value,
                            }))
                          }
                        />
                      </div>
                    )}

                    {newAction.actionType === "other" && (
                      <div className="space-y-2">
                        <Label>Custom Action</Label>
                        <Input
                          placeholder="Describe the action..."
                          value={newAction.customAction}
                          onChange={(e) =>
                            setNewAction((prev) => ({
                              ...prev,
                              customAction: e.target.value,
                            }))
                          }
                        />
                      </div>
                    )}

                    {/* Description */}
                    <div className="space-y-2">
                      <Label>Description (Optional)</Label>
                      <Textarea
                        placeholder="Additional details about the action..."
                        value={newAction.description}
                        onChange={(e) =>
                          setNewAction((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        rows={2}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      onClick={handleRegisterAction}
                      disabled={!newAction.actorId || !newAction.actionType}
                    >
                      Register Action
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="actions">Recent Actions</TabsTrigger>
              <TabsTrigger value="log">Combat Log</TabsTrigger>
            </TabsList>

            <TabsContent value="actions" className="space-y-4">
              {/* Recent Actions from Current Round */}
              {sortedEvents.filter((event) => event.round === combat.round)
                .length > 0 ? (
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {sortedEvents
                      .filter((event) => event.round === combat.round)
                      .map((event, index) => (
                        <div
                          key={index}
                          className="p-3 rounded-lg border bg-muted/30"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">
                                  {getEntityName(
                                    event.actor_id,
                                    event.actor_type
                                  )}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {event.event_type}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  Round {event.round}, Turn {event.turn + 1}
                                </span>
                              </div>

                              <p className="text-sm text-muted-foreground">
                                {event.description}
                              </p>

                              {event.target_id && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Target:{" "}
                                  {getEntityName(
                                    event.target_id,
                                    event.target_type!
                                  )}
                                </p>
                              )}

                              {event.rolls && event.rolls.length > 0 && (
                                <div className="flex items-center gap-2 mt-2">
                                  <Dice6 className="h-3 w-3" />
                                  <div className="flex gap-2">
                                    {event.rolls.map((roll, rollIndex) => (
                                      <Badge
                                        key={rollIndex}
                                        variant="secondary"
                                        className="text-xs"
                                      >
                                        {roll.roll}: {roll.result}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No actions this round</p>
                  <p className="text-sm">
                    Actions will appear here as they are performed
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="log" className="space-y-4">
              {/* Full Combat Log */}
              {sortedEvents.length > 0 ? (
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {sortedEvents.map((event, index) => (
                      <div key={index} className="p-3 rounded-lg border">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <History className="h-3 w-3" />
                              <span className="font-medium">
                                {getEntityName(
                                  event.actor_id,
                                  event.actor_type
                                )}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {event.event_type}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                Round {event.round}, Turn {event.turn + 1}
                              </span>
                            </div>

                            <p className="text-sm text-muted-foreground">
                              {event.description}
                            </p>

                            {event.target_id && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Target:{" "}
                                {getEntityName(
                                  event.target_id,
                                  event.target_type!
                                )}
                              </p>
                            )}

                            <div className="text-xs text-muted-foreground mt-1">
                              {formatDate(event.timestamp)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No combat actions recorded</p>
                  <p className="text-sm">
                    The combat log will show all actions taken during this
                    encounter
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
