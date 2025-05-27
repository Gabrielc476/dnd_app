// src/components/npc/combat/NPCHealthTracker.tsx

"use client";

import React, { useState, useEffect } from "react";
import {
  Heart,
  Shield,
  Minus,
  Plus,
  RotateCcw,
  Activity,
  AlertTriangle,
  Skull,
} from "lucide-react";
import { NPC } from "@/lib/types";
import { useNPC } from "@/hooks/useNPC";
import { useToast } from "@/hooks/use-toast";
import { getHPColorClass } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface HealthEvent {
  id: string;
  type: "damage" | "heal" | "temp_hp" | "condition" | "death" | "revival";
  amount: number;
  source: string;
  description: string;
  timestamp: string;
  round?: number;
  turn?: number;
}

interface NPCHealthTrackerProps {
  npc: NPC;
  campaignId: string;
  userId: string;
  combatRound?: number;
  combatTurn?: number;
  onHealthChange?: (npcId: string, newHP: number) => void;
  onDeath?: (npcId: string) => void;
  onRevival?: (npcId: string) => void;
  isReadOnly?: boolean;
  showDetailedLog?: boolean;
}

export function NPCHealthTracker({
  npc,
  campaignId,
  userId,
  combatRound,
  combatTurn,
  onHealthChange,
  onDeath,
  onRevival,
  isReadOnly = false,
  showDetailedLog = true,
}: NPCHealthTrackerProps) {
  const { toast } = useToast();
  const { updateHP } = useNPC({
    campaignId,
    userId,
    npcId: npc._id,
  });

  const [currentHP, setCurrentHP] = useState(npc.stats.hp.current);
  const [tempHP, setTempHP] = useState(0);
  const [damageInput, setDamageInput] = useState("");
  const [healInput, setHealInput] = useState("");
  const [tempHPInput, setTempHPInput] = useState("");
  const [healthLog, setHealthLog] = useState<HealthEvent[]>([]);
  const [showDeathDialog, setShowDeathDialog] = useState(false);
  const [deathSaves, setDeathSaves] = useState({ successes: 0, failures: 0 });

  const maxHP = npc.stats.hp.max;
  const totalHP = currentHP + tempHP;
  const hpPercentage = Math.max(0, Math.min(100, (currentHP / maxHP) * 100));
  const isDead = currentHP <= 0;
  const isBloodied = currentHP <= maxHP / 2 && currentHP > 0;
  const isNearDeath = currentHP <= maxHP * 0.25 && currentHP > 0;

  // Load health log from localStorage
  useEffect(() => {
    const savedLog = localStorage.getItem(`npc-health-log-${npc._id}`);
    if (savedLog) {
      try {
        setHealthLog(JSON.parse(savedLog));
      } catch (error) {
        console.error("Failed to load health log:", error);
      }
    }
  }, [npc._id]);

  // Save health log to localStorage
  const saveHealthLog = (log: HealthEvent[]) => {
    setHealthLog(log);
    localStorage.setItem(`npc-health-log-${npc._id}`, JSON.stringify(log));
  };

  // Add health event to log
  const addHealthEvent = (
    type: HealthEvent["type"],
    amount: number,
    source: string,
    description: string
  ) => {
    const event: HealthEvent = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      type,
      amount,
      source,
      description,
      timestamp: new Date().toISOString(),
      round: combatRound,
      turn: combatTurn,
    };

    const updatedLog = [event, ...healthLog].slice(0, 50); // Keep last 50 events
    saveHealthLog(updatedLog);
  };

  // Handle damage
  const handleDamage = async (amount: number, source: string = "Unknown") => {
    if (isReadOnly || amount <= 0) return;

    let damage = amount;
    let newTempHP = tempHP;
    let newCurrentHP = currentHP;

    // Apply damage to temp HP first
    if (tempHP > 0) {
      if (damage <= tempHP) {
        newTempHP = tempHP - damage;
        damage = 0;
      } else {
        damage -= tempHP;
        newTempHP = 0;
      }
    }

    // Apply remaining damage to current HP
    if (damage > 0) {
      newCurrentHP = Math.max(0, currentHP - damage);
    }

    try {
      // Update via API
      await updateHP(npc._id, -(currentHP - newCurrentHP));

      setCurrentHP(newCurrentHP);
      setTempHP(newTempHP);

      // Add to log
      addHealthEvent(
        "damage",
        amount,
        source,
        `Took ${amount} damage from ${source}`
      );

      // Check for death
      if (newCurrentHP <= 0 && currentHP > 0) {
        setShowDeathDialog(true);
        addHealthEvent("death", 0, source, `Dropped to 0 HP from ${source}`);
        onDeath?.(npc._id);
      }

      onHealthChange?.(npc._id, newCurrentHP);

      toast({
        title: "Damage Applied",
        description: `${npc.name} took ${amount} damage`,
        variant: newCurrentHP <= 0 ? "destructive" : "default",
      });
    } catch (error) {
      toast({
        title: "Failed to Apply Damage",
        description: "Could not update NPC health",
        variant: "destructive",
      });
    }
  };

  // Handle healing
  const handleHeal = async (amount: number, source: string = "Healing") => {
    if (isReadOnly || amount <= 0 || currentHP >= maxHP) return;

    const newCurrentHP = Math.min(maxHP, currentHP + amount);
    const actualHealing = newCurrentHP - currentHP;

    try {
      await updateHP(npc._id, actualHealing);

      setCurrentHP(newCurrentHP);

      // Add to log
      addHealthEvent(
        "heal",
        actualHealing,
        source,
        `Healed ${actualHealing} HP from ${source}`
      );

      // Check for revival
      if (currentHP <= 0 && newCurrentHP > 0) {
        addHealthEvent("revival", 0, source, `Revived from 0 HP`);
        onRevival?.(npc._id);
        setDeathSaves({ successes: 0, failures: 0 });
      }

      onHealthChange?.(npc._id, newCurrentHP);

      toast({
        title: "Healing Applied",
        description: `${npc.name} recovered ${actualHealing} HP`,
      });
    } catch (error) {
      toast({
        title: "Failed to Apply Healing",
        description: "Could not update NPC health",
        variant: "destructive",
      });
    }
  };

  // Handle temporary HP
  const handleTempHP = (amount: number, source: string = "Temporary HP") => {
    if (isReadOnly || amount <= 0) return;

    // Temp HP doesn't stack, take the higher value
    const newTempHP = Math.max(tempHP, amount);
    const actualGain = newTempHP - tempHP;

    if (actualGain > 0) {
      setTempHP(newTempHP);

      addHealthEvent(
        "temp_hp",
        actualGain,
        source,
        `Gained ${actualGain} temporary HP from ${source}`
      );

      toast({
        title: "Temporary HP Gained",
        description: `${npc.name} gained ${actualGain} temporary HP`,
      });
    }
  };

  // Reset HP to max
  const handleFullHeal = async () => {
    if (isReadOnly) return;

    try {
      const healingAmount = maxHP - currentHP;
      await updateHP(npc._id, healingAmount);

      setCurrentHP(maxHP);
      setTempHP(0);
      setDeathSaves({ successes: 0, failures: 0 });

      addHealthEvent(
        "heal",
        healingAmount,
        "Full Heal",
        "Fully healed to maximum HP"
      );

      if (isDead) {
        addHealthEvent("revival", 0, "Full Heal", "Revived to full health");
        onRevival?.(npc._id);
      }

      onHealthChange?.(npc._id, maxHP);

      toast({
        title: "Fully Healed",
        description: `${npc.name} restored to full health`,
      });
    } catch (error) {
      toast({
        title: "Failed to Heal",
        description: "Could not restore NPC to full health",
        variant: "destructive",
      });
    }
  };

  // Quick damage/heal buttons
  const QuickActions = () => (
    <div className="grid grid-cols-2 gap-2">
      <div className="space-y-2">
        <Label className="text-xs font-medium">Quick Damage</Label>
        <div className="grid grid-cols-3 gap-1">
          {[5, 10, 20].map((amount) => (
            <Button
              key={amount}
              size="sm"
              variant="outline"
              onClick={() => handleDamage(amount, "Quick")}
              disabled={isReadOnly}
              className="h-8 text-xs"
            >
              -{amount}
            </Button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-medium">Quick Heal</Label>
        <div className="grid grid-cols-3 gap-1">
          {[5, 10, 20].map((amount) => (
            <Button
              key={amount}
              size="sm"
              variant="outline"
              onClick={() => handleHeal(amount, "Quick")}
              disabled={isReadOnly || currentHP >= maxHP}
              className="h-8 text-xs"
            >
              +{amount}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart
                className={`h-5 w-5 ${
                  isDead ? "text-red-500" : "text-green-500"
                }`}
              />
              {npc.name} Health
              {isDead && <Badge variant="destructive">Dead</Badge>}
              {isBloodied && !isDead && (
                <Badge variant="outline">Bloodied</Badge>
              )}
              {isNearDeath && !isDead && (
                <Badge variant="destructive">Critical</Badge>
              )}
            </div>
            {!isReadOnly && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleFullHeal}
                className="flex items-center gap-1"
              >
                <RotateCcw className="h-4 w-4" />
                Full Heal
              </Button>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* HP Display */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                HP: {currentHP} / {maxHP}
                {tempHP > 0 && (
                  <span className="text-blue-600 ml-2">(+{tempHP} temp)</span>
                )}
              </span>
              <span
                className={`text-sm font-bold ${getHPColorClass(
                  currentHP,
                  maxHP
                )}`}
              >
                {Math.round(hpPercentage)}%
              </span>
            </div>
            <Progress
              value={hpPercentage}
              className="h-3"
              // @ts-ignore - Progress component styling
              style={{
                "--progress-foreground": isDead
                  ? "rgb(239 68 68)"
                  : isNearDeath
                  ? "rgb(245 158 11)"
                  : isBloodied
                  ? "rgb(249 115 22)"
                  : "rgb(34 197 94)",
              }}
            />
            {tempHP > 0 && (
              <div className="text-xs text-blue-600">
                +{tempHP} temporary hit points
              </div>
            )}
          </div>

          {isDead && (
            <Alert variant="destructive">
              <Skull className="h-4 w-4" />
              <AlertDescription>
                This NPC has been reduced to 0 hit points.
              </AlertDescription>
            </Alert>
          )}

          {!isReadOnly && (
            <Tabs defaultValue="manual" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manual">Manual</TabsTrigger>
                <TabsTrigger value="quick">Quick</TabsTrigger>
              </TabsList>

              <TabsContent value="manual" className="space-y-4">
                {/* Damage Input */}
                <div className="space-y-2">
                  <Label htmlFor="damage-input">Apply Damage</Label>
                  <div className="flex gap-2">
                    <Input
                      id="damage-input"
                      type="number"
                      min="0"
                      placeholder="Damage amount"
                      value={damageInput}
                      onChange={(e) => setDamageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const amount = parseInt(damageInput);
                          if (amount > 0) {
                            handleDamage(amount);
                            setDamageInput("");
                          }
                        }
                      }}
                    />
                    <Button
                      onClick={() => {
                        const amount = parseInt(damageInput);
                        if (amount > 0) {
                          handleDamage(amount);
                          setDamageInput("");
                        }
                      }}
                      disabled={!damageInput || parseInt(damageInput) <= 0}
                      variant="destructive"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Healing Input */}
                <div className="space-y-2">
                  <Label htmlFor="heal-input">Apply Healing</Label>
                  <div className="flex gap-2">
                    <Input
                      id="heal-input"
                      type="number"
                      min="0"
                      placeholder="Healing amount"
                      value={healInput}
                      onChange={(e) => setHealInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const amount = parseInt(healInput);
                          if (amount > 0) {
                            handleHeal(amount);
                            setHealInput("");
                          }
                        }
                      }}
                    />
                    <Button
                      onClick={() => {
                        const amount = parseInt(healInput);
                        if (amount > 0) {
                          handleHeal(amount);
                          setHealInput("");
                        }
                      }}
                      disabled={
                        !healInput ||
                        parseInt(healInput) <= 0 ||
                        currentHP >= maxHP
                      }
                      variant="default"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Temporary HP Input */}
                <div className="space-y-2">
                  <Label htmlFor="temp-hp-input">Temporary HP</Label>
                  <div className="flex gap-2">
                    <Input
                      id="temp-hp-input"
                      type="number"
                      min="0"
                      placeholder="Temp HP amount"
                      value={tempHPInput}
                      onChange={(e) => setTempHPInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const amount = parseInt(tempHPInput);
                          if (amount > 0) {
                            handleTempHP(amount);
                            setTempHPInput("");
                          }
                        }
                      }}
                    />
                    <Button
                      onClick={() => {
                        const amount = parseInt(tempHPInput);
                        if (amount > 0) {
                          handleTempHP(amount);
                          setTempHPInput("");
                        }
                      }}
                      disabled={!tempHPInput || parseInt(tempHPInput) <= 0}
                      variant="outline"
                    >
                      <Shield className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="quick" className="space-y-4">
                <QuickActions />
              </TabsContent>
            </Tabs>
          )}

          {/* Health Log */}
          {showDetailedLog && healthLog.length > 0 && (
            <div className="space-y-2">
              <Separator />
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <Label className="text-sm font-medium">Health Log</Label>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {healthLog.slice(0, 10).map((event) => {
                  const icon = {
                    damage: <Minus className="h-3 w-3 text-red-500" />,
                    heal: <Plus className="h-3 w-3 text-green-500" />,
                    temp_hp: <Shield className="h-3 w-3 text-blue-500" />,
                    death: <Skull className="h-3 w-3 text-red-600" />,
                    revival: <Heart className="h-3 w-3 text-green-600" />,
                    condition: (
                      <AlertTriangle className="h-3 w-3 text-yellow-500" />
                    ),
                  };

                  return (
                    <div
                      key={event.id}
                      className="flex items-center gap-2 text-xs p-2 rounded bg-muted/50"
                    >
                      {icon[event.type]}
                      <span className="flex-1">{event.description}</span>
                      {event.round && (
                        <span className="text-muted-foreground">
                          R{event.round}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              {healthLog.length > 10 && (
                <p className="text-xs text-muted-foreground text-center">
                  ...and {healthLog.length - 10} more events
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Death Dialog */}
      <Dialog open={showDeathDialog} onOpenChange={setShowDeathDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Skull className="h-5 w-5 text-red-500" />
              {npc.name} Defeated
            </DialogTitle>
            <DialogDescription>
              This NPC has been reduced to 0 hit points. What would you like to
              do?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeathDialog(false)}>
              Keep at 0 HP
            </Button>
            <Button
              onClick={() => {
                handleHeal(1, "Stabilized");
                setShowDeathDialog(false);
              }}
            >
              Stabilize (1 HP)
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                // Mark as permanently dead
                addHealthEvent("death", 0, "Final", "Confirmed death");
                setShowDeathDialog(false);
              }}
            >
              Confirm Death
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
