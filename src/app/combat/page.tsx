// ===== src/app/combat/page.tsx - PÁGINA COMBAT COMPLETA =====

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Swords,
  Users,
  Shield,
  Crown,
  AlertTriangle,
  Play,
  Square,
  Settings,
  Timer,
  Zap,
  Target,
  Plus,
  Wifi,
  WifiOff,
  BarChart3,
  Eye,
  EyeOff,
} from "lucide-react";

// Hooks and stores
import { useAuth } from "@/hooks/useAuth";
import { useGameStore } from "@/stores/gameStore";
import { useCombat } from "@/hooks/useCombat";
import { useCharacter } from "@/hooks/useCharacter";
import { useNPC } from "@/hooks/useNPC";
import { useToast } from "@/hooks/use-toast";

// Combat components
import {
  CombatTracker,
  InitiativeList,
  CombatActions,
  CombatStats,
  ConditionManager,
  DiceRoller,
} from "@/components/combat";

// UI components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CombatPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentCampaign, isUserDM } = useGameStore();
  const { toast } = useToast();

  // State
  const [activeView, setActiveView] = useState<"tracker" | "simple">("tracker");
  const [showSettings, setShowSettings] = useState(false);
  const [showAddCombatant, setShowAddCombatant] = useState(false);
  const [combatSettings, setCombatSettings] = useState({
    autoSort: true,
    showHP: true,
    showConditions: true,
    enableTimer: false,
    turnTimerSeconds: 60,
  });

  // Combat hook
  const {
    combat,
    isLoading,
    error,
    connected,
    fetchActiveCombat,
    createCombat,
    endCombat,
    rollInitiative,
    nextTurn,
    addCondition,
    removeCondition,
    addParticipant,
    removeParticipant,
  } = useCombat({
    campaignId: currentCampaign?._id || "",
    userId: user?.id || "",
  });

  // Character and NPC hooks for adding participants
  const { characters } = useCharacter({
    campaignId: currentCampaign?._id || "",
    userId: user?.id || "",
  });

  const { npcs } = useNPC({
    campaignId: currentCampaign?._id || "",
    userId: user?.id || "",
  });

  // Check if user has access
  useEffect(() => {
    if (!currentCampaign) {
      toast({
        title: "No Campaign Selected",
        description: "Please select a campaign to access combat.",
        variant: "destructive",
      });
      router.push("/dashboard");
      return;
    }

    // Load active combat
    fetchActiveCombat();
  }, [currentCampaign, fetchActiveCombat, router, toast]);

  // Handle combat start
  const handleStartCombat = async (encounterId?: string) => {
    if (!isUserDM) {
      toast({
        title: "Access Denied",
        description: "Only the DM can start combat.",
        variant: "destructive",
      });
      return;
    }

    try {
      const newCombat = await createCombat(encounterId);
      if (newCombat) {
        toast({
          title: "Combat Started!",
          description: "Initiative order has been established.",
        });
      }
    } catch (error) {
      toast({
        title: "Failed to Start Combat",
        description: "Could not initialize combat. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle combat end
  const handleEndCombat = async () => {
    if (!isUserDM || !combat) return;

    try {
      const success = await endCombat(combat._id);
      if (success) {
        toast({
          title: "Combat Ended",
          description: "Combat has been concluded.",
        });
      }
    } catch (error) {
      toast({
        title: "Failed to End Combat",
        description: "Could not end combat. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle initiative roll
  const handleInitiativeRoll = async (
    entityId: string,
    entityType: "character" | "npc",
    advantage?: boolean,
    disadvantage?: boolean
  ) => {
    try {
      const success = await rollInitiative(entityId, entityType);
      if (success) {
        toast({
          title: "Initiative Rolled",
          description: `Initiative updated for ${entityType}.`,
        });
      }
    } catch (error) {
      toast({
        title: "Initiative Roll Failed",
        description: "Could not roll initiative. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle next turn
  const handleNextTurn = async () => {
    if (!isUserDM) return;

    try {
      const success = await nextTurn();
      if (success) {
        toast({
          title: "Turn Advanced",
          description: "Next combatant's turn.",
        });
      }
    } catch (error) {
      toast({
        title: "Failed to Advance Turn",
        description: "Could not advance to next turn.",
        variant: "destructive",
      });
    }
  };

  // Handle add condition
  const handleAddCondition = async (
    targetId: string,
    targetType: "character" | "npc",
    condition: string,
    duration: { type: "rounds" | "minutes" | "hours"; value: number }
  ) => {
    if (!combat) return;

    try {
      const conditionEffect = {
        id: `${Date.now()}`,
        name: condition,
        description: "",
        duration,
        target_id: targetId,
        target_type: targetType,
      };

      const success = await addCondition(targetId, conditionEffect);
      if (success) {
        toast({
          title: "Condition Added",
          description: `${condition} applied to ${targetType}.`,
        });
      }
    } catch (error) {
      toast({
        title: "Failed to Add Condition",
        description: "Could not apply condition.",
        variant: "destructive",
      });
    }
  };

  // Handle remove condition
  const handleRemoveCondition = async (conditionId: string) => {
    if (!combat) return;

    try {
      const success = await removeCondition("", conditionId);
      if (success) {
        toast({
          title: "Condition Removed",
          description: "Condition has been removed.",
        });
      }
    } catch (error) {
      toast({
        title: "Failed to Remove Condition",
        description: "Could not remove condition.",
        variant: "destructive",
      });
    }
  };

  // Handle add participant
  const handleAddParticipant = async (
    entityId: string,
    entityType: "character" | "npc"
  ) => {
    if (!isUserDM || !combat) return;

    try {
      const success = await addParticipant(entityId, entityType);
      if (success) {
        toast({
          title: "Participant Added",
          description: `${entityType} added to combat.`,
        });
        setShowAddCombatant(false);
      }
    } catch (error) {
      toast({
        title: "Failed to Add Participant",
        description: "Could not add participant to combat.",
        variant: "destructive",
      });
    }
  };

  // Get current combatant
  const currentCombatant = combat?.initiative_order[combat?.current_turn || 0];

  // Show loading state
  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-muted-foreground">Loading combat...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Show no campaign state
  if (!currentCampaign) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Swords className="h-5 w-5" />
              Combat Tracker
            </CardTitle>
            <CardDescription>
              Manage initiative, actions, and conditions during combat
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No campaign selected. Please{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto"
                  onClick={() => router.push("/campaign")}
                >
                  select a campaign
                </Button>{" "}
                to access combat features.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Swords className="h-8 w-8" />
              Combat Tracker
            </h1>
            <p className="text-muted-foreground">
              Manage initiative, actions, and conditions for{" "}
              {currentCampaign.name}
            </p>
          </div>

          {/* Connection Status */}
          <div className="flex items-center gap-2">
            {connected ? (
              <Badge variant="outline" className="flex items-center gap-1">
                <Wifi className="h-3 w-3" />
                Connected
              </Badge>
            ) : (
              <Badge variant="destructive" className="flex items-center gap-1">
                <WifiOff className="h-3 w-3" />
                Disconnected
              </Badge>
            )}

            {combat && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Timer className="h-3 w-3" />
                Round {combat.round}
              </Badge>
            )}
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="hidden md:flex border rounded-md">
            <Button
              variant={activeView === "tracker" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveView("tracker")}
              className="rounded-r-none"
            >
              <BarChart3 className="h-4 w-4 mr-1" />
              Full Tracker
            </Button>
            <Button
              variant={activeView === "simple" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveView("simple")}
              className="rounded-l-none"
            >
              <Users className="h-4 w-4 mr-1" />
              Simple View
            </Button>
          </div>

          {/* DM Actions */}
          {isUserDM && (
            <>
              {!combat ? (
                <Button onClick={() => handleStartCombat()}>
                  <Play className="h-4 w-4 mr-2" />
                  Start Combat
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddCombatant(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Combatant
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEndCombat()}
                  >
                    <Square className="h-4 w-4 mr-1" />
                    End Combat
                  </Button>
                </>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(true)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      {!combat ? (
        /* No Active Combat */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              No Active Combat
            </CardTitle>
            <CardDescription>
              Start a new combat encounter to track initiative and actions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Target className="h-4 w-4" />
              <AlertDescription>
                {isUserDM
                  ? "Click 'Start Combat' to begin a new encounter. You can add characters and NPCs to the initiative order once combat begins."
                  : "Waiting for the DM to start combat..."}
              </AlertDescription>
            </Alert>

            {isUserDM && (
              <div className="flex gap-2">
                <Button onClick={() => handleStartCombat()}>
                  <Play className="h-4 w-4 mr-2" />
                  Start New Combat
                </Button>
                {currentCampaign.active_encounter && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      handleStartCombat(currentCampaign.active_encounter)
                    }
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Start Active Encounter
                  </Button>
                )}
              </div>
            )}

            {/* Combat Tips */}
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Crown className="h-4 w-4" />
                    For Dungeon Masters
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>• Start combat to establish initiative order</p>
                  <p>• Add characters and NPCs to the encounter</p>
                  <p>• Track HP, conditions, and actions</p>
                  <p>• Use dice roller for quick rolls</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    For Players
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>• View initiative order and current turn</p>
                  <p>• Track your character's status</p>
                  <p>• Roll dice for attacks and saves</p>
                  <p>• Monitor conditions and effects</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      ) : activeView === "tracker" ? (
        /* Full Combat Tracker */
        <CombatTracker
          campaignId={currentCampaign._id}
          userId={user?.id || ""}
        />
      ) : (
        /* Simple Combat View */
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Initiative List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Initiative Order</span>
                  {isUserDM && (
                    <Button size="sm" onClick={handleNextTurn}>
                      <Target className="h-4 w-4 mr-1" />
                      Next Turn
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <InitiativeList
                  combat={combat}
                  currentCombatant={currentCombatant}
                  selectedCombatant={null}
                  onSelectCombatant={() => {}}
                  onInitiativeRoll={handleInitiativeRoll}
                  onNextTurn={handleNextTurn}
                  isUserDM={isUserDM}
                  userId={user?.id || ""}
                />
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions & Dice */}
          <div className="space-y-4">
            {/* Dice Roller */}
            <DiceRoller compact />

            {/* Combat Stats */}
            <CombatStats
              combat={combat}
              currentCombatant={currentCombatant}
              selectedCombatant={null}
            />
          </div>
        </div>
      )}

      {/* Add Combatant Dialog */}
      <Dialog open={showAddCombatant} onOpenChange={setShowAddCombatant}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Combatant</DialogTitle>
            <DialogDescription>
              Add a character or NPC to the current combat
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="characters" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="characters">Characters</TabsTrigger>
              <TabsTrigger value="npcs">NPCs</TabsTrigger>
            </TabsList>

            <TabsContent value="characters" className="space-y-4">
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {characters.map((character) => (
                    <div
                      key={character._id}
                      className="flex items-center justify-between p-3 border rounded"
                    >
                      <div>
                        <p className="font-medium">{character.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Level {character.level} {character.race}{" "}
                          {character.class}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() =>
                          handleAddParticipant(character._id, "character")
                        }
                      >
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="npcs" className="space-y-4">
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {npcs.map((npc) => (
                    <div
                      key={npc._id}
                      className="flex items-center justify-between p-3 border rounded"
                    >
                      <div>
                        <p className="font-medium">{npc.name}</p>
                        <p className="text-sm text-muted-foreground">
                          CR {npc.challenge_rating} • {npc.type}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAddParticipant(npc._id, "npc")}
                      >
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Combat Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Combat Settings</DialogTitle>
            <DialogDescription>
              Configure combat tracker preferences
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-sort">Auto-sort initiative</Label>
              <Button
                variant={combatSettings.autoSort ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  setCombatSettings((prev) => ({
                    ...prev,
                    autoSort: !prev.autoSort,
                  }))
                }
              >
                {combatSettings.autoSort ? "On" : "Off"}
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="show-hp">Show HP values</Label>
              <Button
                variant={combatSettings.showHP ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  setCombatSettings((prev) => ({
                    ...prev,
                    showHP: !prev.showHP,
                  }))
                }
              >
                {combatSettings.showHP ? "On" : "Off"}
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="show-conditions">Show conditions</Label>
              <Button
                variant={combatSettings.showConditions ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  setCombatSettings((prev) => ({
                    ...prev,
                    showConditions: !prev.showConditions,
                  }))
                }
              >
                {combatSettings.showConditions ? "On" : "Off"}
              </Button>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="enable-timer">Turn timer</Label>
                <Button
                  variant={combatSettings.enableTimer ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    setCombatSettings((prev) => ({
                      ...prev,
                      enableTimer: !prev.enableTimer,
                    }))
                  }
                >
                  {combatSettings.enableTimer ? "On" : "Off"}
                </Button>
              </div>

              {combatSettings.enableTimer && (
                <div className="space-y-2">
                  <Label htmlFor="timer-seconds">
                    Timer duration (seconds)
                  </Label>
                  <Input
                    id="timer-seconds"
                    type="number"
                    min="10"
                    max="300"
                    value={combatSettings.turnTimerSeconds}
                    onChange={(e) =>
                      setCombatSettings((prev) => ({
                        ...prev,
                        turnTimerSeconds: parseInt(e.target.value) || 60,
                      }))
                    }
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowSettings(false)}>
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
