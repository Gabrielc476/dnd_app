/**
 * NPC Combat Controls Component - COMPLETAMENTE REFATORADO
 * Problemas resolvidos:
 * 1. ✅ handleExecuteAction function completada (estava cortada)
 * 2. ✅ Proper state management
 * 3. ✅ HP tracking
 * 4. ✅ Action execution
 * 5. ✅ Condition management
 */

"use client";

import React, { useState, useCallback } from "react";
import {
  Sword,
  Shield,
  Heart,
  Zap,
  AlertTriangle,
  Dice6,
  Target,
  Eye,
  EyeOff,
  Plus,
  Minus,
  RotateCcw,
} from "lucide-react";

import {
  NPC,
  NPCAction,
  CombatParticipant,
  ConditionEffect,
} from "@/lib/types";
import { useCombat } from "@/hooks/useCombat";
import { useGameStore } from "@/stores/gameStore";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

// ===== INTERFACES =====
interface NPCCombatControlsProps {
  npc: NPC;
  participant?: CombatParticipant;
  isCurrentTurn?: boolean;
  canEdit?: boolean;
}

interface ActionDialogState {
  open: boolean;
  action: NPCAction | null;
  target: string;
  rollAdvantage: boolean;
  rollDisadvantage: boolean;
}

interface ConditionDialogState {
  open: boolean;
  condition: string;
  duration: number;
  description: string;
}

// ===== UTILITY FUNCTIONS =====
const rollDie = (sides: number): number =>
  Math.floor(Math.random() * sides) + 1;

const rollDice = (formula: string): { total: number; breakdown: string } => {
  // Parse dice formula like "2d6+3" or "1d8+2"
  const match = formula.match(/(\d+)d(\d+)([+-]\d+)?/);
  if (!match) {
    throw new Error(`Invalid dice formula: ${formula}`);
  }

  const numDice = parseInt(match[1]);
  const sides = parseInt(match[2]);
  const modifier = match[3] ? parseInt(match[3]) : 0;

  const rolls: number[] = [];
  for (let i = 0; i < numDice; i++) {
    rolls.push(rollDie(sides));
  }

  const rollTotal = rolls.reduce((sum, roll) => sum + roll, 0);
  const total = rollTotal + modifier;

  const breakdown = `${rolls.join(" + ")}${
    modifier !== 0 ? ` ${modifier >= 0 ? "+" : ""}${modifier}` : ""
  } = ${total}`;

  return { total, breakdown };
};

const rollAttack = (
  attackBonus: number,
  advantage?: boolean,
  disadvantage?: boolean
): { total: number; rolls: number[]; critical: boolean } => {
  let rolls: number[];
  let result: number;

  if (advantage && disadvantage) {
    // Cancel out
    const roll = rollDie(20);
    rolls = [roll];
    result = roll;
  } else if (advantage) {
    const roll1 = rollDie(20);
    const roll2 = rollDie(20);
    rolls = [roll1, roll2];
    result = Math.max(roll1, roll2);
  } else if (disadvantage) {
    const roll1 = rollDie(20);
    const roll2 = rollDie(20);
    rolls = [roll1, roll2];
    result = Math.min(roll1, roll2);
  } else {
    const roll = rollDie(20);
    rolls = [roll];
    result = roll;
  }

  const total = result + attackBonus;
  const critical = result === 20;

  return { total, rolls, critical };
};

// ===== MAIN COMPONENT =====
export default function NPCCombatControls({
  npc,
  participant,
  isCurrentTurn = false,
  canEdit = true,
}: NPCCombatControlsProps) {
  const { currentCampaign } = useGameStore();
  const {
    updateParticipantHP,
    setParticipantHP,
    addCondition,
    removeCondition,
    addAction,
    isCurrentTurn: checkCurrentTurn,
  } = useCombat({
    campaignId: currentCampaign?._id || "",
    userId: "", // This should come from auth context
  });

  // State
  const [hpAdjustment, setHpAdjustment] = useState<number>(0);
  const [tempHP, setTempHP] = useState<number>(0);
  const [actionDialog, setActionDialog] = useState<ActionDialogState>({
    open: false,
    action: null,
    target: "",
    rollAdvantage: false,
    rollDisadvantage: false,
  });
  const [conditionDialog, setConditionDialog] = useState<ConditionDialogState>({
    open: false,
    condition: "",
    duration: 1,
    description: "",
  });

  // ===== HP MANAGEMENT =====
  const handleHPAdjustment = async (change: number) => {
    if (!participant) {
      toast.error("NPC is not in combat");
      return;
    }

    try {
      await updateParticipantHP(participant._id, change);
      setHpAdjustment(0);

      const action = change > 0 ? "healed" : "damaged";
      toast.success(`${npc.name} ${action} for ${Math.abs(change)} HP`);
    } catch (error) {
      console.error("Error updating HP:", error);
      toast.error(`Failed to update HP: ${error.message}`);
    }
  };

  const handleSetHP = async (currentHP: number, maxHP?: number) => {
    if (!participant) {
      toast.error("NPC is not in combat");
      return;
    }

    try {
      await setParticipantHP(participant._id, currentHP, maxHP);
      toast.success(`${npc.name}'s HP set to ${currentHP}`);
    } catch (error) {
      console.error("Error setting HP:", error);
      toast.error(`Failed to set HP: ${error.message}`);
    }
  };

  const handleTempHP = async () => {
    if (!participant || tempHP <= 0) return;

    try {
      await updateParticipantHP(participant._id, tempHP, true);
      setTempHP(0);
      toast.success(`${npc.name} gained ${tempHP} temporary HP`);
    } catch (error) {
      console.error("Error adding temp HP:", error);
      toast.error(`Failed to add temporary HP: ${error.message}`);
    }
  };

  // ===== ACTION EXECUTION =====
  const handleExecuteAction = useCallback(
    async (action: NPCAction) => {
      if (!participant) {
        toast.error("NPC is not in combat");
        return;
      }

      try {
        let result = "";

        // Handle attack actions
        if (action.attack_bonus !== undefined) {
          const attackRoll = rollAttack(
            action.attack_bonus,
            actionDialog.rollAdvantage,
            actionDialog.rollDisadvantage
          );

          result = `Attack: ${attackRoll.total} (${attackRoll.rolls.join(
            ", "
          )})`;

          if (attackRoll.critical) {
            result += " 🎯 CRITICAL!";
          }

          // Roll damage if hit
          if (action.damage) {
            try {
              const damageRoll = rollDice(action.damage);
              result += ` | Damage: ${damageRoll.breakdown}`;

              if (attackRoll.critical) {
                // Double dice for critical
                const critDamage = rollDice(action.damage);
                result += ` + ${critDamage.breakdown} (critical)`;
              }
            } catch (error) {
              console.warn("Invalid damage formula:", action.damage);
            }
          }
        }
        // Handle save actions
        else if (action.save_dc !== undefined) {
          result = `DC ${action.save_dc} ${
            action.save_ability || "Constitution"
          } save`;

          if (action.damage) {
            try {
              const damageRoll = rollDice(action.damage);
              result += ` | Damage: ${damageRoll.breakdown}`;
            } catch (error) {
              console.warn("Invalid damage formula:", action.damage);
            }
          }
        }
        // Handle other actions
        else {
          result = `${action.name} executed`;

          if (action.damage) {
            try {
              const damageRoll = rollDice(action.damage);
              result += ` | Effect: ${damageRoll.breakdown}`;
            } catch (error) {
              result += ` | Effect applied`;
            }
          }
        }

        // Add action to combat log
        await addAction(participant._id, action.name, result);

        // Close dialog
        setActionDialog({
          open: false,
          action: null,
          target: "",
          rollAdvantage: false,
          rollDisadvantage: false,
        });

        toast.success(`${npc.name} used ${action.name}`);
      } catch (error) {
        console.error("Error executing action:", error);
        toast.error(`Failed to execute action: ${error.message}`);
      }
    },
    [participant, actionDialog, addAction, npc.name]
  );

  // ===== CONDITION MANAGEMENT =====
  const handleAddCondition = async () => {
    if (!participant || !conditionDialog.condition) return;

    try {
      const condition: ConditionEffect = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: conditionDialog.condition,
        description: conditionDialog.description || undefined,
        duration: conditionDialog.duration,
        source: npc.name,
        effects: {},
        created_at: new Date().toISOString(),
      };

      await addCondition(participant._id, condition);

      setConditionDialog({
        open: false,
        condition: "",
        duration: 1,
        description: "",
      });

      toast.success(`Added ${conditionDialog.condition} to ${npc.name}`);
    } catch (error) {
      console.error("Error adding condition:", error);
      toast.error(`Failed to add condition: ${error.message}`);
    }
  };

  const handleRemoveCondition = async (conditionId: string) => {
    if (!participant) return;

    try {
      await removeCondition(participant._id, conditionId);
      toast.success("Condition removed");
    } catch (error) {
      console.error("Error removing condition:", error);
      toast.error(`Failed to remove condition: ${error.message}`);
    }
  };

  // ===== RENDER HELPERS =====
  const renderHPBar = () => {
    if (!participant) return null;

    const { hit_points_current, hit_points_max, hit_points_temp } = participant;
    const hpPercentage = (hit_points_current / hit_points_max) * 100;
    const totalHP = hit_points_current + hit_points_temp;

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Hit Points</Label>
          <div className="text-sm">
            {totalHP} / {hit_points_max}
            {hit_points_temp > 0 && (
              <span className="text-blue-500 ml-1">(+{hit_points_temp})</span>
            )}
          </div>
        </div>
        <Progress
          value={hpPercentage}
          className="h-2"
          indicatorClassName={
            hpPercentage <= 25
              ? "bg-red-500"
              : hpPercentage <= 50
              ? "bg-yellow-500"
              : "bg-green-500"
          }
        />
      </div>
    );
  };

  const renderActions = () => {
    const allActions = [
      ...npc.actions.map((a) => ({ ...a, category: "Actions" })),
      ...(npc.legendary_actions || []).map((a) => ({
        ...a,
        category: "Legendary",
      })),
      ...(npc.reactions || []).map((a) => ({ ...a, category: "Reactions" })),
    ];

    if (allActions.length === 0) {
      return (
        <div className="text-center py-4 text-muted-foreground">
          No actions available
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-2">
        {allActions.map((action, index) => (
          <TooltipProvider key={index}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start text-left h-auto p-3"
                  onClick={() =>
                    setActionDialog({
                      open: true,
                      action,
                      target: "",
                      rollAdvantage: false,
                      rollDisadvantage: false,
                    })
                  }
                  disabled={!canEdit || !participant}
                >
                  <div className="flex items-start space-x-2 w-full">
                    <div className="flex-shrink-0 mt-0.5">
                      {action.attack_bonus !== undefined ? (
                        <Sword className="h-4 w-4" />
                      ) : action.save_dc !== undefined ? (
                        <Shield className="h-4 w-4" />
                      ) : (
                        <Zap className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate">
                          {action.name}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {action.category}
                        </Badge>
                      </div>
                      {action.attack_bonus !== undefined && (
                        <div className="text-xs text-muted-foreground">
                          +{action.attack_bonus} to hit
                        </div>
                      )}
                      {action.save_dc !== undefined && (
                        <div className="text-xs text-muted-foreground">
                          DC {action.save_dc} {action.save_ability} save
                        </div>
                      )}
                      {action.damage && (
                        <div className="text-xs text-muted-foreground">
                          {action.damage} damage
                        </div>
                      )}
                    </div>
                  </div>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-sm">
                <div className="space-y-2">
                  <div className="font-medium">{action.name}</div>
                  <div className="text-sm">{action.description}</div>
                  {action.recharge && (
                    <div className="text-xs text-muted-foreground">
                      Recharge: {action.recharge}
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    );
  };

  const renderConditions = () => {
    if (!participant || !participant.conditions.length) {
      return (
        <div className="text-center py-2 text-muted-foreground text-sm">
          No conditions
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {participant.conditions.map((condition) => (
          <div
            key={condition.id}
            className="flex items-center justify-between p-2 bg-muted rounded"
          >
            <div className="flex-1">
              <div className="font-medium text-sm">{condition.name}</div>
              {condition.description && (
                <div className="text-xs text-muted-foreground">
                  {condition.description}
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                Duration: {condition.duration} rounds
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRemoveCondition(condition.id)}
              disabled={!canEdit}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    );
  };

  // ===== MAIN RENDER =====
  return (
    <Card className={`${isCurrentTurn ? "ring-2 ring-primary" : ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{npc.name}</CardTitle>
          <div className="flex items-center space-x-2">
            {isCurrentTurn && (
              <Badge variant="default" className="gap-1">
                <Target className="h-3 w-3" />
                Current Turn
              </Badge>
            )}
            <Badge variant="outline">CR {npc.challenge_rating}</Badge>
          </div>
        </div>
        <CardDescription>
          {npc.type} • AC {npc.armor_class}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* HP Management */}
        {participant && (
          <div className="space-y-3">
            {renderHPBar()}

            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleHPAdjustment(-1)}
                  disabled={!canEdit}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Input
                  type="number"
                  value={hpAdjustment}
                  onChange={(e) =>
                    setHpAdjustment(parseInt(e.target.value) || 0)
                  }
                  className="w-16 text-center text-sm"
                  placeholder="0"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleHPAdjustment(1)}
                  disabled={!canEdit}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleHPAdjustment(hpAdjustment)}
                disabled={!canEdit || hpAdjustment === 0}
              >
                Apply
              </Button>

              <div className="flex items-center space-x-1">
                <Input
                  type="number"
                  value={tempHP}
                  onChange={(e) => setTempHP(parseInt(e.target.value) || 0)}
                  className="w-16 text-center text-sm"
                  placeholder="Temp"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleTempHP}
                  disabled={!canEdit || tempHP <= 0}
                >
                  <Heart className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* Actions */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="font-medium">Actions</Label>
            <Badge variant="secondary">{npc.actions.length}</Badge>
          </div>
          {renderActions()}
        </div>

        <Separator />

        {/* Conditions */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="font-medium">Conditions</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setConditionDialog({ ...conditionDialog, open: true })
              }
              disabled={!canEdit || !participant}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          </div>
          {renderConditions()}
        </div>
      </CardContent>

      {/* Action Execution Dialog */}
      <Dialog
        open={actionDialog.open}
        onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Execute Action: {actionDialog.action?.name}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.action?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {actionDialog.action?.attack_bonus !== undefined && (
              <div className="space-y-2">
                <Label>Roll Modifier</Label>
                <div className="flex space-x-2">
                  <Button
                    variant={actionDialog.rollAdvantage ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setActionDialog({
                        ...actionDialog,
                        rollAdvantage: !actionDialog.rollAdvantage,
                        rollDisadvantage: false,
                      })
                    }
                  >
                    Advantage
                  </Button>
                  <Button
                    variant={
                      actionDialog.rollDisadvantage ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      setActionDialog({
                        ...actionDialog,
                        rollDisadvantage: !actionDialog.rollDisadvantage,
                        rollAdvantage: false,
                      })
                    }
                  >
                    Disadvantage
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() =>
                  setActionDialog({ ...actionDialog, open: false })
                }
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleExecuteAction(actionDialog.action!)}
                disabled={!actionDialog.action}
              >
                <Dice6 className="h-4 w-4 mr-2" />
                Execute
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Condition Dialog */}
      <Dialog
        open={conditionDialog.open}
        onOpenChange={(open) =>
          setConditionDialog({ ...conditionDialog, open })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Condition</DialogTitle>
            <DialogDescription>Add a condition to {npc.name}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Condition</Label>
              <Select
                value={conditionDialog.condition}
                onValueChange={(value) =>
                  setConditionDialog({ ...conditionDialog, condition: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blinded">Blinded</SelectItem>
                  <SelectItem value="charmed">Charmed</SelectItem>
                  <SelectItem value="deafened">Deafened</SelectItem>
                  <SelectItem value="frightened">Frightened</SelectItem>
                  <SelectItem value="grappled">Grappled</SelectItem>
                  <SelectItem value="incapacitated">Incapacitated</SelectItem>
                  <SelectItem value="invisible">Invisible</SelectItem>
                  <SelectItem value="paralyzed">Paralyzed</SelectItem>
                  <SelectItem value="petrified">Petrified</SelectItem>
                  <SelectItem value="poisoned">Poisoned</SelectItem>
                  <SelectItem value="prone">Prone</SelectItem>
                  <SelectItem value="restrained">Restrained</SelectItem>
                  <SelectItem value="stunned">Stunned</SelectItem>
                  <SelectItem value="unconscious">Unconscious</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Duration (rounds)</Label>
              <Input
                type="number"
                value={conditionDialog.duration}
                onChange={(e) =>
                  setConditionDialog({
                    ...conditionDialog,
                    duration: parseInt(e.target.value) || 1,
                  })
                }
                min={1}
              />
            </div>

            <div>
              <Label>Description (optional)</Label>
              <Textarea
                value={conditionDialog.description}
                onChange={(e) =>
                  setConditionDialog({
                    ...conditionDialog,
                    description: e.target.value,
                  })
                }
                placeholder="Additional details about the condition..."
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() =>
                  setConditionDialog({ ...conditionDialog, open: false })
                }
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddCondition}
                disabled={!conditionDialog.condition}
              >
                Add Condition
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
