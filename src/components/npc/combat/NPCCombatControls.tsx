// src/components/npc/combat/NPCCombatControls.tsx

"use client";

import React, { useState, useEffect } from "react";
import {
  Swords,
  Shield,
  Heart,
  Zap,
  Clock,
  Target,
  Play,
  Pause,
  SkipForward,
  AlertCircle,
  Dice6,
} from "lucide-react";
import { NPC, Combat, InitiativeEntry } from "@/lib/types";
import { useCombat } from "@/hooks/useCombat";
import { useNPC } from "@/hooks/useNPC";
import { useToast } from "@/hooks/use-toast";
import { formatModifier } from "@/lib/utils";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface NPCCombatControlsProps {
  npc: NPC;
  combat?: Combat;
  campaignId: string;
  userId: string;
  isUserDM: boolean;
  onActionPerformed?: () => void;
}

interface NPCAction {
  name: string;
  description: string;
  attack_bonus?: number;
  damage?: string;
  damage_type?: string;
  recharge?: string;
  uses?: number;
  usesRemaining?: number;
}

interface CombatAction {
  type:
    | "attack"
    | "spell"
    | "dash"
    | "dodge"
    | "disengage"
    | "help"
    | "hide"
    | "ready"
    | "other";
  name: string;
  description: string;
  target?: string;
  damage?: number;
  healing?: number;
}

const ACTION_TYPES = [
  { value: "attack", label: "Attack", icon: Swords },
  { value: "spell", label: "Spell", icon: Zap },
  { value: "dash", label: "Dash", icon: SkipForward },
  { value: "dodge", label: "Dodge", icon: Shield },
  { value: "disengage", label: "Disengage", icon: SkipForward },
  { value: "help", label: "Help", icon: Heart },
  { value: "hide", label: "Hide", icon: AlertCircle },
  { value: "ready", label: "Ready Action", icon: Clock },
  { value: "other", label: "Other", icon: Target },
];

const CONDITIONS = [
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

export function NPCCombatControls({
  npc,
  combat,
  campaignId,
  userId,
  isUserDM,
  onActionPerformed,
}: NPCCombatControlsProps) {
  const { toast } = useToast();
  const { updateHP } = useNPC({ campaignId, userId });
  const { rollInitiative, addCondition, removeCondition, registerAction } =
    useCombat({ campaignId, userId, combatId: combat?._id });

  const [selectedAction, setSelectedAction] = useState<NPCAction | null>(null);
  const [newAction, setNewAction] = useState<CombatAction>({
    type: "attack",
    name: "",
    description: "",
  });
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [initiativeValue, setInitiativeValue] = useState<number | null>(null);
  const [hpChange, setHpChange] = useState<number>(0);
  const [selectedCondition, setSelectedCondition] = useState<string>("");
  const [conditionDuration, setConditionDuration] = useState<{
    type: "rounds" | "minutes" | "hours";
    value: number;
  }>({ type: "rounds", value: 1 });

  // Calculate initiative modifier
  const initiativeModifier = npc.stats.attributes
    ? formatModifier(npc.stats.attributes.dexterity)
    : "+0";

  // Check if NPC is in combat
  const npcInCombat = combat?.initiative_order.some(
    (entry) => entry.id === npc._id && entry.type === "npc"
  );

  // Get NPC's initiative entry
  const npcInitiativeEntry = combat?.initiative_order.find(
    (entry) => entry.id === npc._id && entry.type === "npc"
  );

  // Check if it's NPC's turn
  const isNPCTurn =
    combat &&
    npcInitiativeEntry &&
    combat.initiative_order[combat.current_turn]?.id === npc._id;

  // Handle initiative roll
  const handleRollInitiative = async (
    advantage?: boolean,
    disadvantage?: boolean
  ) => {
    if (!combat) return;

    try {
      let roll = initiativeValue;

      if (roll === null) {
        // Auto-roll initiative
        const d20Roll = Math.floor(Math.random() * 20) + 1;
        const modifier = npc.stats.attributes
          ? Math.floor((npc.stats.attributes.dexterity - 10) / 2)
          : 0;

        if (advantage) {
          const d20Roll2 = Math.floor(Math.random() * 20) + 1;
          roll = Math.max(d20Roll, d20Roll2) + modifier;
        } else if (disadvantage) {
          const d20Roll2 = Math.floor(Math.random() * 20) + 1;
          roll = Math.min(d20Roll, d20Roll2) + modifier;
        } else {
          roll = d20Roll + modifier;
        }
      }

      const success = await rollInitiative(
        npc._id,
        "npc",
        advantage,
        disadvantage
      );

      if (success) {
        toast({
          title: "Initiative Rolled",
          description: `${npc.name} rolled ${roll} for initiative`,
        });
        setInitiativeValue(null);
      }
    } catch (error) {
      toast({
        title: "Initiative Failed",
        description: "Failed to roll initiative",
        variant: "destructive",
      });
    }
  };

  // Handle HP change
  const handleHPChange = async () => {
    if (hpChange === 0) return;

    try {
      await updateHP(npc._id, hpChange);

      const changeText = hpChange > 0 ? "healed" : "damaged";
      toast({
        title: "HP Updated",
        description: `${npc.name} ${changeText} for ${Math.abs(hpChange)} HP`,
      });

      setHpChange(0);
      onActionPerformed?.();
    } catch (error) {
      toast({
        title: "HP Update Failed",
        description: "Failed to update HP",
        variant: "destructive",
      });
    }
  };

  // Handle condition management
  const handleAddCondition = async () => {
    if (!selectedCondition || !combat) return;

    try {
      const success = await addCondition(
        npc._id,
        "npc",
        selectedCondition,
        conditionDuration
      );

      if (success) {
        toast({
          title: "Condition Applied",
          description: `${selectedCondition} applied to ${npc.name}`,
        });
        setSelectedCondition("");
      }
    } catch (error) {
      toast({
        title: "Failed to Add Condition",
        description: "Could not apply condition",
        variant: "destructive",
      });
    }
  };

  // Handle action execution
  const handleExecuteAction = (action: NPCAction) => {
    setSelectedAction(action);
    setNewAction({
      type: "attack",
      name: action.name,
      description: action.description,
    });
    setIsActionDialogOpen(true);
  };

  const handleRegisterAction = async () => {
    if (!combat || !newAction.name.trim()) return;

    try {
      const success = await registerAction({
        actor_id: npc._id,
        action_type: newAction.type,
        description: newAction.description || newAction.name,
        target_id: newAction.target,
      });

      if (success) {
        toast({
          title: "Action Registered",
          description: `${npc.name} used ${newAction.name}`,
        });
        setIsActionDialogOpen(false);
        setNewAction({
          type: "attack",
          name: "",
          description: "",
        });
        onActionPerformed?.();
      }
    } catch (error) {
      toast({
        title: "Action Failed",
        description: "Failed to register action",
        variant: "destructive",
      });
    }
  };

  // Auto-calculate initiative if not set
  const autoInitiative = () => {
    const d20Roll = Math.floor(Math.random() * 20) + 1;
    const modifier = npc.stats.attributes
      ? Math.floor((npc.stats.attributes.dexterity - 10) / 2)
      : 0;
    return d20Roll + modifier;
  };

  const currentHP = npc.stats.hp.current;
  const maxHP = npc.stats.hp.max;
  const hpPercentage = (currentHP / maxHP) * 100;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Swords className="h-5 w-5" />
              Combat Controls: {npc.name}
              {isNPCTurn && (
                <Badge variant="default" className="animate-pulse">
                  Current Turn
                </Badge>
              )}
            </div>

            {npcInCombat && (
              <Badge variant="outline">
                Initiative: {npcInitiativeEntry?.initiative}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Manage {npc.name} during combat encounters
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {!isUserDM && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Most combat controls are restricted to the DM
              </AlertDescription>
            </Alert>
          )}

          {/* HP Tracking */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Hit Points</Label>
              <span className="text-sm text-muted-foreground">
                {currentHP} / {maxHP}
              </span>
            </div>

            <Progress
              value={hpPercentage}
              className="h-2"
              // Red when low, yellow when medium, green when high
              // Note: This would need custom CSS classes
            />

            {isUserDM && (
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="HP change"
                  value={hpChange || ""}
                  onChange={(e) => setHpChange(parseInt(e.target.value) || 0)}
                  className="w-24"
                />
                <Button
                  size="sm"
                  onClick={handleHPChange}
                  disabled={hpChange === 0}
                  variant={hpChange > 0 ? "default" : "destructive"}
                >
                  <Heart className="h-4 w-4 mr-1" />
                  {hpChange > 0 ? "Heal" : "Damage"}
                </Button>
              </div>
            )}
          </div>

          <Separator />

          {/* Initiative */}
          {combat && isUserDM && (
            <div className="space-y-2">
              <Label>Initiative</Label>

              {!npcInCombat ? (
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder={`Roll + ${initiativeModifier}`}
                    value={initiativeValue || ""}
                    onChange={(e) =>
                      setInitiativeValue(parseInt(e.target.value) || null)
                    }
                    className="w-24"
                  />
                  <Button size="sm" onClick={() => handleRollInitiative()}>
                    <Dice6 className="h-4 w-4 mr-1" />
                    Roll
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRollInitiative(true)}
                  >
                    Advantage
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRollInitiative(false, true)}
                  >
                    Disadvantage
                  </Button>
                </div>
              ) : (
                <div className="text-sm">
                  Already in initiative order (Initiative:{" "}
                  {npcInitiativeEntry?.initiative})
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Actions */}
          <div className="space-y-3">
            <Label>Actions</Label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {npc.actions.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleExecuteAction(action)}
                  disabled={!isUserDM || !combat}
                  className="justify-start text-left h-auto p-3"
                >
                  <div className="space-y-1">
                    <div className="font-medium">{action.name}</div>
                    {action.attack_bonus && (
                      <div className="text-xs text-muted-foreground">
                        Attack: +{action.attack_bonus}
                        {action.damage && ` | Damage: ${action.damage}`}
                      </div>
                    )}
                  </div>
                </Button>
              ))}

              {npc.legendary_actions.length > 0 && (
                <>
                  <div className="col-span-full">
                    <Label className="text-sm font-medium">
                      Legendary Actions
                    </Label>
                  </div>
                  {npc.legendary_actions.map((action, index) => (
                    <Button
                      key={`legendary-${index}`}
                      variant="outline"
                      size="sm"
                      onClick={() => handleExecuteAction(action)}
                      disabled={!isUserDM || !combat}
                      className="justify-start text-left h-auto p-3 border-amber-200"
                    >
                      <div className="space-y-1">
                        <div className="font-medium text-amber-700">
                          {action.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Legendary Action
                        </div>
                      </div>
                    </Button>
                  ))}
                </>
              )}

              {isUserDM && (
                <Button
                  variant="dashed"
                  size="sm"
                  onClick={() => setIsActionDialogOpen(true)}
                  className="justify-start"
                >
                  <Target className="h-4 w-4 mr-2" />
                  Custom Action
                </Button>
              )}
            </div>
          </div>

          {/* Conditions */}
          {isUserDM && combat && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label>Conditions</Label>

                <div className="flex gap-2">
                  <Select
                    value={selectedCondition}
                    onValueChange={setSelectedCondition}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Condition" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONDITIONS.map((condition) => (
                        <SelectItem key={condition} value={condition}>
                          {condition}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    type="number"
                    placeholder="Duration"
                    value={conditionDuration.value}
                    onChange={(e) =>
                      setConditionDuration({
                        ...conditionDuration,
                        value: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-20"
                  />

                  <Select
                    value={conditionDuration.type}
                    onValueChange={(value: "rounds" | "minutes" | "hours") =>
                      setConditionDuration({
                        ...conditionDuration,
                        type: value,
                      })
                    }
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rounds">Rounds</SelectItem>
                      <SelectItem value="minutes">Minutes</SelectItem>
                      <SelectItem value="hours">Hours</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    size="sm"
                    onClick={handleAddCondition}
                    disabled={!selectedCondition}
                  >
                    Apply
                  </Button>
                </div>

                {/* Current Conditions */}
                {combat.conditions
                  .filter((condition) => condition.target_id === npc._id)
                  .map((condition, index) => (
                    <Badge
                      key={index}
                      variant="destructive"
                      className="cursor-pointer"
                      onClick={() => removeCondition(condition.target_id)} // Simplified
                    >
                      {condition.condition} ({condition.duration.value}{" "}
                      {condition.duration.type})
                    </Badge>
                  ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Execute Action</DialogTitle>
            <DialogDescription>
              Register an action for {npc.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Action Type</Label>
              <Select
                value={newAction.type}
                onValueChange={(value) =>
                  setNewAction({ ...newAction, type: value as any })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Action Name</Label>
              <Input
                value={newAction.name}
                onChange={(e) =>
                  setNewAction({ ...newAction, name: e.target.value })
                }
                placeholder="Action name"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newAction.description}
                onChange={(e) =>
                  setNewAction({ ...newAction, description: e.target.value })
                }
                placeholder="Describe what the NPC does..."
                rows={3}
              />
            </div>

            {(newAction.type === "attack" || newAction.type === "spell") && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Damage</Label>
                  <Input
                    type="number"
                    value={newAction.damage || ""}
                    onChange={(e) =>
                      setNewAction({
                        ...newAction,
                        damage: parseInt(e.target.value) || undefined,
                      })
                    }
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Healing</Label>
                  <Input
                    type="number"
                    value={newAction.healing || ""}
                    onChange={(e) =>
                      setNewAction({
                        ...newAction,
                        healing: parseInt(e.target.value) || undefined,
                      })
                    }
                    placeholder="0"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsActionDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleRegisterAction}>Execute Action</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
