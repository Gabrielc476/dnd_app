// src/components/npc/utils/NPCDiceRoller.tsx

"use client";

import React, { useState, useEffect } from "react";
import {
  Dices,
  Sword,
  Shield,
  Eye,
  Zap,
  Target,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { NPC, NPCAction } from "@/lib/types";
import { useWebSocket } from "@/lib/socket";
import { formatModifier } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DiceRoll {
  formula: string;
  result: number;
  individual: number[];
  modifier: number;
  type: string;
  timestamp: string;
  advantage?: boolean;
  disadvantage?: boolean;
}

interface NPCDiceRollerProps {
  npc: NPC;
  campaignId: string;
  userId: string;
  onRollResult?: (roll: DiceRoll) => void;
  showHistory?: boolean;
  isReadOnly?: boolean;
}

export function NPCDiceRoller({
  npc,
  campaignId,
  userId,
  onRollResult,
  showHistory = true,
  isReadOnly = false,
}: NPCDiceRollerProps) {
  const { toast } = useToast();
  const { socket, connected, sendMessage } = useWebSocket(campaignId, userId);

  const [rollHistory, setRollHistory] = useState<DiceRoll[]>([]);
  const [customFormula, setCustomFormula] = useState("");
  const [customModifier, setCustomModifier] = useState(0);
  const [rollType, setRollType] = useState<
    "normal" | "advantage" | "disadvantage"
  >("normal");

  // Load roll history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem(`npc-roll-history-${npc._id}`);
    if (savedHistory) {
      try {
        setRollHistory(JSON.parse(savedHistory));
      } catch (error) {
        console.error("Failed to load roll history:", error);
      }
    }
  }, [npc._id]);

  // Save roll history to localStorage
  const saveRollHistory = (history: DiceRoll[]) => {
    setRollHistory(history);
    localStorage.setItem(
      `npc-roll-history-${npc._id}`,
      JSON.stringify(history.slice(0, 50))
    );
  };

  // Calculate ability modifiers
  const getModifier = (ability: keyof typeof npc.stats.attributes) => {
    return Math.floor((npc.stats.attributes[ability] - 10) / 2);
  };

  // Calculate proficiency bonus
  const getProficiencyBonus = () => {
    const cr = parseFloat(npc.stats.challenge_rating);
    if (cr <= 4) return 2;
    if (cr <= 8) return 3;
    if (cr <= 12) return 4;
    if (cr <= 16) return 5;
    if (cr <= 20) return 6;
    if (cr <= 24) return 7;
    if (cr <= 28) return 8;
    return 9;
  };

  // Dice rolling function
  const rollDice = (sides: number, count: number = 1): number[] => {
    return Array.from(
      { length: count },
      () => Math.floor(Math.random() * sides) + 1
    );
  };

  // Parse dice formula (e.g., "2d6+3")
  const parseDiceFormula = (
    formula: string
  ): { count: number; sides: number; modifier: number } => {
    const match = formula.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
    if (!match) return { count: 1, sides: 20, modifier: 0 };

    return {
      count: parseInt(match[1]),
      sides: parseInt(match[2]),
      modifier: match[3] ? parseInt(match[3]) : 0,
    };
  };

  // Execute roll
  const executeRoll = (
    formula: string,
    modifier: number = 0,
    type: string = "Custom",
    advantage: boolean = false,
    disadvantage: boolean = false
  ) => {
    if (isReadOnly) return;

    const {
      count,
      sides,
      modifier: formulaModifier,
    } = parseDiceFormula(formula);
    const totalModifier = modifier + formulaModifier;

    let rolls: number[];
    let result: number;

    if (advantage || disadvantage) {
      // Roll twice for advantage/disadvantage
      const roll1 = rollDice(sides, count);
      const roll2 = rollDice(sides, count);
      const sum1 = roll1.reduce((a, b) => a + b, 0);
      const sum2 = roll2.reduce((a, b) => a + b, 0);

      if (advantage) {
        result = Math.max(sum1, sum2) + totalModifier;
        rolls = sum1 >= sum2 ? roll1 : roll2;
      } else {
        result = Math.min(sum1, sum2) + totalModifier;
        rolls = sum1 <= sum2 ? roll1 : roll2;
      }
    } else {
      // Normal roll
      rolls = rollDice(sides, count);
      result = rolls.reduce((a, b) => a + b, 0) + totalModifier;
    }

    const rollData: DiceRoll = {
      formula,
      result,
      individual: rolls,
      modifier: totalModifier,
      type,
      timestamp: new Date().toISOString(),
      advantage,
      disadvantage,
    };

    // Add to history
    const updatedHistory = [rollData, ...rollHistory].slice(0, 50);
    saveRollHistory(updatedHistory);

    // Send via WebSocket if connected
    if (connected && socket) {
      sendMessage("roll", {
        type: "roll",
        npc_id: npc._id,
        npc_name: npc.name,
        formula,
        result,
        modifier: totalModifier,
        roll_type: type,
        advantage,
        disadvantage,
      });
    }

    // Call callback
    onRollResult?.(rollData);

    // Show toast
    const advantageText = advantage
      ? " (Advantage)"
      : disadvantage
      ? " (Disadvantage)"
      : "";
    const rollText =
      rolls.length > 1 ? `[${rolls.join(", ")}]` : rolls[0].toString();
    const modifierText =
      totalModifier !== 0
        ? ` ${totalModifier >= 0 ? "+" : ""}${totalModifier}`
        : "";

    toast({
      title: `${npc.name} - ${type}`,
      description: `Rolled ${result} (${rollText}${modifierText})${advantageText}`,
    });
  };

  // Quick roll buttons
  const quickRolls = [
    { name: "d20", formula: "1d20", icon: <Dices className="h-4 w-4" /> },
    { name: "d12", formula: "1d12", icon: <Dices className="h-4 w-4" /> },
    { name: "d10", formula: "1d10", icon: <Dices className="h-4 w-4" /> },
    { name: "d8", formula: "1d8", icon: <Dices className="h-4 w-4" /> },
    { name: "d6", formula: "1d6", icon: <Dices className="h-4 w-4" /> },
    { name: "d4", formula: "1d4", icon: <Dices className="h-4 w-4" /> },
  ];

  // Ability check rolls
  const abilityChecks = Object.entries(npc.stats.attributes).map(
    ([ability, score]) => ({
      name: ability.charAt(0).toUpperCase() + ability.slice(1),
      formula: "1d20",
      modifier: getModifier(ability as keyof typeof npc.stats.attributes),
      icon: <Eye className="h-4 w-4" />,
    })
  );

  // Saving throw rolls
  const savingThrows = Object.entries(npc.stats.attributes).map(
    ([ability, score]) => {
      const baseModifier = getModifier(
        ability as keyof typeof npc.stats.attributes
      );
      const saveBonus = npc.stats.saving_throws?.[ability] || baseModifier;

      return {
        name: `${ability.charAt(0).toUpperCase() + ability.slice(1)} Save`,
        formula: "1d20",
        modifier: saveBonus,
        icon: <Shield className="h-4 w-4" />,
      };
    }
  );

  // Attack rolls from actions
  const attackRolls = npc.actions
    .filter((action) => action.attack_bonus !== undefined)
    .map((action) => ({
      name: `${action.name} (Attack)`,
      formula: "1d20",
      modifier: action.attack_bonus!,
      icon: <Target className="h-4 w-4" />,
      action,
    }));

  // Damage rolls from actions
  const damageRolls = npc.actions
    .filter((action) => action.damage)
    .map((action) => ({
      name: `${action.name} (Damage)`,
      formula: action.damage!,
      modifier: 0,
      icon: <Sword className="h-4 w-4" />,
      action,
    }));

  const clearHistory = () => {
    setRollHistory([]);
    localStorage.removeItem(`npc-roll-history-${npc._id}`);
    toast({
      title: "History Cleared",
      description: "Roll history has been cleared",
    });
  };

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dices className="h-5 w-5" />
              {npc.name} - Dice Roller
              {!connected && <Badge variant="outline">Offline</Badge>}
            </div>
            {showHistory && rollHistory.length > 0 && (
              <Button size="sm" variant="outline" onClick={clearHistory}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Roll Type Selection */}
          {!isReadOnly && (
            <div className="flex items-center gap-2">
              <Label className="text-sm">Roll Type:</Label>
              <Select
                value={rollType}
                onValueChange={(
                  value: "normal" | "advantage" | "disadvantage"
                ) => setRollType(value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="advantage">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Advantage
                    </div>
                  </SelectItem>
                  <SelectItem value="disadvantage">
                    <div className="flex items-center gap-1">
                      <TrendingDown className="h-3 w-3" />
                      Disadvantage
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <Tabs defaultValue="quick" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="quick">Quick</TabsTrigger>
              <TabsTrigger value="abilities">Abilities</TabsTrigger>
              <TabsTrigger value="combat">Combat</TabsTrigger>
              <TabsTrigger value="custom">Custom</TabsTrigger>
            </TabsList>

            {/* Quick Rolls */}
            <TabsContent value="quick" className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {quickRolls.map((roll) => (
                  <Tooltip key={roll.name}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        onClick={() =>
                          executeRoll(
                            roll.formula,
                            0,
                            roll.name,
                            rollType === "advantage",
                            rollType === "disadvantage"
                          )
                        }
                        disabled={isReadOnly}
                        className="flex items-center gap-1"
                      >
                        {roll.icon}
                        {roll.name}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Roll {roll.formula}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </TabsContent>

            {/* Ability Checks and Saves */}
            <TabsContent value="abilities" className="space-y-4">
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Ability Checks</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {abilityChecks.map((check) => (
                      <Button
                        key={check.name}
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          executeRoll(
                            check.formula,
                            check.modifier,
                            `${check.name} Check`,
                            rollType === "advantage",
                            rollType === "disadvantage"
                          )
                        }
                        disabled={isReadOnly}
                        className="flex items-center justify-between gap-1 text-xs"
                      >
                        <span>{check.name}</span>
                        <span>{formatModifier(check.modifier)}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-sm font-medium">Saving Throws</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {savingThrows.map((save) => (
                      <Button
                        key={save.name}
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          executeRoll(
                            save.formula,
                            save.modifier,
                            save.name,
                            rollType === "advantage",
                            rollType === "disadvantage"
                          )
                        }
                        disabled={isReadOnly}
                        className="flex items-center justify-between gap-1 text-xs"
                      >
                        <span>{save.name.replace(" Save", "")}</span>
                        <span>{formatModifier(save.modifier)}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Combat Rolls */}
            <TabsContent value="combat" className="space-y-4">
              <div className="space-y-3">
                {attackRolls.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Attack Rolls</Label>
                    <div className="grid grid-cols-1 gap-2 mt-2">
                      {attackRolls.map((attack, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            executeRoll(
                              attack.formula,
                              attack.modifier,
                              attack.name,
                              rollType === "advantage",
                              rollType === "disadvantage"
                            )
                          }
                          disabled={isReadOnly}
                          className="flex items-center justify-between gap-1 text-xs"
                        >
                          <span className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            {attack.action.name}
                          </span>
                          <span>{formatModifier(attack.modifier)}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {damageRolls.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Damage Rolls</Label>
                    <div className="grid grid-cols-1 gap-2 mt-2">
                      {damageRolls.map((damage, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            executeRoll(
                              damage.formula,
                              damage.modifier,
                              damage.name
                            )
                          }
                          disabled={isReadOnly}
                          className="flex items-center justify-between gap-1 text-xs"
                        >
                          <span className="flex items-center gap-1">
                            <Sword className="h-3 w-3" />
                            {damage.action.name}
                          </span>
                          <span className="text-xs">{damage.formula}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {attackRolls.length === 0 && damageRolls.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    This NPC has no combat actions defined.
                  </p>
                )}
              </div>
            </TabsContent>

            {/* Custom Roll */}
            <TabsContent value="custom" className="space-y-4">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="custom-formula">Dice Formula</Label>
                    <Input
                      id="custom-formula"
                      placeholder="e.g., 2d6+3"
                      value={customFormula}
                      onChange={(e) => setCustomFormula(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && customFormula) {
                          executeRoll(
                            customFormula,
                            customModifier,
                            "Custom Roll",
                            rollType === "advantage",
                            rollType === "disadvantage"
                          );
                        }
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="custom-modifier">Extra Modifier</Label>
                    <Input
                      id="custom-modifier"
                      type="number"
                      placeholder="0"
                      value={customModifier || ""}
                      onChange={(e) =>
                        setCustomModifier(parseInt(e.target.value) || 0)
                      }
                    />
                  </div>
                </div>
                <Button
                  onClick={() =>
                    executeRoll(
                      customFormula,
                      customModifier,
                      "Custom Roll",
                      rollType === "advantage",
                      rollType === "disadvantage"
                    )
                  }
                  disabled={!customFormula || isReadOnly}
                  className="w-full"
                >
                  <Dices className="h-4 w-4 mr-2" />
                  Roll Custom Dice
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {/* Roll History */}
          {showHistory && rollHistory.length > 0 && (
            <div className="space-y-2">
              <Separator />
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Recent Rolls</Label>
                <span className="text-xs text-muted-foreground">
                  {rollHistory.length} roll{rollHistory.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {rollHistory.slice(0, 10).map((roll, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-xs p-2 rounded bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {roll.type}
                      </Badge>
                      {roll.advantage && (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      )}
                      {roll.disadvantage && (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">
                        {roll.individual.length > 1
                          ? `[${roll.individual.join(", ")}]`
                          : roll.individual[0]}
                        {roll.modifier !== 0 && (
                          <span className="text-muted-foreground">
                            {roll.modifier >= 0 ? "+" : ""}
                            {roll.modifier}
                          </span>
                        )}
                      </span>
                      <span className="font-bold">{roll.result}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
