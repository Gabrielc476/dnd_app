// src/components/combat/CombatantCard.tsx

"use client";

import React, { useState } from "react";
import {
  Heart,
  Shield,
  Zap,
  Sword,
  Target,
  Plus,
  Minus,
  Dice6,
  Eye,
  EyeOff,
  MoreHorizontal,
} from "lucide-react";
import { InitiativeEntry } from "@/lib/types";
import { formatModifier, getHPColorClass } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface EntityData {
  name: string;
  hp: { current: number; max: number } | null;
  ac: number | null;
  conditions: string[];
  isPlayer: boolean;
}

interface CombatantCardProps {
  combatant: InitiativeEntry;
  entityData: EntityData;
  canControl: boolean;
  isCurrentTurn: boolean;
  onAction: (action: CombatantAction) => void;
}

interface CombatantAction {
  type: "damage" | "heal" | "condition" | "initiative" | "hide" | "remove";
  value?: number;
  condition?: string;
  target?: string;
}

export function CombatantCard({
  combatant,
  entityData,
  canControl,
  isCurrentTurn,
  onAction,
}: CombatantCardProps) {
  const [hpChange, setHpChange] = useState("");
  const [newCondition, setNewCondition] = useState("");
  const [showHPDialog, setShowHPDialog] = useState(false);
  const [showConditionDialog, setShowConditionDialog] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  // Handle HP change
  const handleHPChange = (change: number) => {
    if (!entityData.hp) return;

    onAction({
      type: change > 0 ? "heal" : "damage",
      value: Math.abs(change),
    });

    setHpChange("");
    setShowHPDialog(false);
  };

  // Handle condition add
  const handleAddCondition = () => {
    if (!newCondition.trim()) return;

    onAction({
      type: "condition",
      condition: newCondition.trim(),
    });

    setNewCondition("");
    setShowConditionDialog(false);
  };

  // Handle quick actions
  const handleQuickAction = (actionType: string) => {
    switch (actionType) {
      case "hide":
        setIsHidden(!isHidden);
        onAction({ type: "hide" });
        break;
      case "remove":
        onAction({ type: "remove" });
        break;
      default:
        break;
    }
  };

  // Calculate HP percentage
  const hpPercentage = entityData.hp
    ? (entityData.hp.current / entityData.hp.max) * 100
    : 0;

  return (
    <TooltipProvider>
      <div className="p-4 space-y-4">
        {/* Header with Name and Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{entityData.name}</h4>
            {isCurrentTurn && (
              <Badge variant="default" className="text-xs">
                Current Turn
              </Badge>
            )}
            {isHidden && (
              <Badge variant="secondary" className="text-xs">
                <EyeOff className="h-3 w-3 mr-1" />
                Hidden
              </Badge>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleQuickAction("hide")}>
                {isHidden ? (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Show to Players
                  </>
                ) : (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Hide from Players
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleQuickAction("remove")}
                className="text-destructive"
              >
                Remove from Combat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* HP Section */}
          {entityData.hp && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  Hit Points
                </Label>
                {canControl && (
                  <Dialog open={showHPDialog} onOpenChange={setShowHPDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Plus className="h-3 w-3" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Modify Hit Points</DialogTitle>
                        <DialogDescription>
                          Enter a positive number to heal or negative to damage.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="hp-change">HP Change</Label>
                          <Input
                            id="hp-change"
                            type="number"
                            placeholder="e.g., -5 or +10"
                            value={hpChange}
                            onChange={(e) => setHpChange(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                const change = parseInt(hpChange);
                                if (!isNaN(change)) handleHPChange(change);
                              }
                            }}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleHPChange(-5)}
                            className="flex-1"
                          >
                            -5 HP
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleHPChange(-1)}
                            className="flex-1"
                          >
                            -1 HP
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleHPChange(1)}
                            className="flex-1"
                          >
                            +1 HP
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleHPChange(5)}
                            className="flex-1"
                          >
                            +5 HP
                          </Button>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          onClick={() => {
                            const change = parseInt(hpChange);
                            if (!isNaN(change)) handleHPChange(change);
                          }}
                          disabled={!hpChange || isNaN(parseInt(hpChange))}
                        >
                          Apply
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>

              <div className="text-center">
                <div
                  className={`text-lg font-bold ${getHPColorClass(
                    entityData.hp.current,
                    entityData.hp.max
                  )}`}
                >
                  {entityData.hp.current} / {entityData.hp.max}
                </div>
                <Progress value={hpPercentage} className="h-2 mt-1" />
              </div>
            </div>
          )}

          {/* AC Section */}
          {entityData.ac && (
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Armor Class
              </Label>
              <div className="text-center">
                <div className="text-lg font-bold">{entityData.ac}</div>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Initiative and Actions */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1">
              <Zap className="h-3 w-3" />
              Initiative
            </Label>
            <div className="text-center">
              <div className="text-lg font-bold">{combatant.initiative}</div>
              {canControl && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onAction({ type: "initiative" })}
                      className="mt-1"
                    >
                      <Dice6 className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Re-roll Initiative</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Status</Label>
            <div className="text-center">
              <Badge
                variant={combatant.has_acted ? "default" : "outline"}
                className="text-xs"
              >
                {combatant.has_acted ? "Acted" : "Ready"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Conditions */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Conditions</Label>
            {canControl && (
              <Dialog
                open={showConditionDialog}
                onOpenChange={setShowConditionDialog}
              >
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-3 w-3" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Condition</DialogTitle>
                    <DialogDescription>
                      Add a condition effect to this combatant.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="condition">Condition</Label>
                      <Input
                        id="condition"
                        placeholder="e.g., Stunned, Prone, Poisoned"
                        value={newCondition}
                        onChange={(e) => setNewCondition(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleAddCondition();
                          }
                        }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {[
                        "Stunned",
                        "Prone",
                        "Poisoned",
                        "Charmed",
                        "Frightened",
                        "Restrained",
                      ].map((condition) => (
                        <Button
                          key={condition}
                          variant="outline"
                          size="sm"
                          onClick={() => setNewCondition(condition)}
                          className="text-xs"
                        >
                          {condition}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleAddCondition}
                      disabled={!newCondition.trim()}
                    >
                      Add Condition
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {entityData.conditions.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {entityData.conditions.map((condition, index) => (
                <Badge
                  key={index}
                  variant="destructive"
                  className="text-xs cursor-pointer"
                  onClick={() => {
                    if (canControl) {
                      // Handle condition removal
                      onAction({
                        type: "condition",
                        condition: condition,
                      });
                    }
                  }}
                >
                  {condition}
                  {canControl && <span className="ml-1">×</span>}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No active conditions
            </p>
          )}
        </div>

        {/* Quick Actions */}
        {canControl && isCurrentTurn && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label className="text-sm font-medium">Quick Actions</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                  onClick={() => onAction({ type: "damage", value: 0 })}
                >
                  <Sword className="h-3 w-3" />
                  Attack
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                  onClick={() => onAction({ type: "heal", value: 0 })}
                >
                  <Heart className="h-3 w-3" />
                  Heal
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                  onClick={() => onAction({ type: "condition" })}
                >
                  <Target className="h-3 w-3" />
                  Cast Spell
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                  onClick={() => onAction({ type: "condition" })}
                >
                  <Zap className="h-3 w-3" />
                  Other
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}
