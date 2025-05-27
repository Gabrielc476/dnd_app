// src/components/combat/CombatTracker.tsx

"use client";

import React, { useState, useEffect } from "react";
import { Swords, Play, Square, Users, Timer, Shield } from "lucide-react";
import { Combat, Character, NPC } from "@/lib/types";
import { useCombat } from "@/hooks/useCombat";
import { useGameStore } from "@/stores/gameStore";
import { useToast } from "@/hooks/use-toast";

import { InitiativeList } from "./InitiativeList";
import { CombatControls } from "./CombatControls";
import { CombatActions } from "./CombatActions";
import { ConditionManager } from "./ConditionManager";
import { CombatStats } from "./CombatStats";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface CombatTrackerProps {
  campaignId: string;
  userId: string;
}

export function CombatTracker({ campaignId, userId }: CombatTrackerProps) {
  const { toast } = useToast();
  const { currentCampaign, isUserDM } = useGameStore();

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
    registerAction,
  } = useCombat({
    campaignId,
    userId,
    combatId: undefined,
  });

  const [activeTab, setActiveTab] = useState("initiative");
  const [selectedCombatant, setSelectedCombatant] = useState<string | null>(
    null
  );

  // Load active combat on mount
  useEffect(() => {
    fetchActiveCombat();
  }, [fetchActiveCombat]);

  // Handle combat start
  const handleStartCombat = async (encounterId?: string) => {
    if (!isUserDM) {
      toast({
        title: "Permission Denied",
        description: "Only the DM can start combat",
        variant: "destructive",
      });
      return;
    }

    try {
      const newCombat = await createCombat(encounterId);
      if (newCombat) {
        toast({
          title: "Combat Started",
          description: "Initiative phase has begun",
        });
      }
    } catch (error) {
      toast({
        title: "Failed to Start Combat",
        description: "Could not initiate combat encounter",
        variant: "destructive",
      });
    }
  };

  // Handle combat end
  const handleEndCombat = async () => {
    if (!combat || !isUserDM) return;

    try {
      const success = await endCombat(combat._id);
      if (success) {
        toast({
          title: "Combat Ended",
          description: "Combat encounter has been concluded",
        });
        setSelectedCombatant(null);
      }
    } catch (error) {
      toast({
        title: "Failed to End Combat",
        description: "Could not end combat encounter",
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
    if (!combat) return;

    try {
      const success = await rollInitiative(
        entityId,
        entityType,
        advantage,
        disadvantage
      );

      if (success) {
        toast({
          title: "Initiative Rolled",
          description: `${entityType} initiative has been set`,
        });
      }
    } catch (error) {
      toast({
        title: "Initiative Roll Failed",
        description: "Could not roll initiative",
        variant: "destructive",
      });
    }
  };

  // Handle next turn
  const handleNextTurn = async () => {
    if (!combat || !isUserDM) return;

    try {
      const success = await nextTurn();
      if (success) {
        toast({
          title: "Turn Advanced",
          description: "Moving to the next combatant",
        });
      }
    } catch (error) {
      toast({
        title: "Failed to Advance Turn",
        description: "Could not proceed to next turn",
        variant: "destructive",
      });
    }
  };

  // Handle condition management
  const handleAddCondition = async (
    targetId: string,
    targetType: "character" | "npc",
    condition: string,
    duration: { type: "rounds" | "minutes" | "hours"; value: number }
  ) => {
    if (!combat) return;

    try {
      const success = await addCondition(
        targetId,
        targetType,
        condition,
        duration
      );
      if (success) {
        toast({
          title: "Condition Applied",
          description: `${condition} applied to target`,
        });
      }
    } catch (error) {
      toast({
        title: "Failed to Apply Condition",
        description: "Could not apply condition",
        variant: "destructive",
      });
    }
  };

  const handleRemoveCondition = async (conditionId: string) => {
    if (!combat) return;

    try {
      const success = await removeCondition(conditionId);
      if (success) {
        toast({
          title: "Condition Removed",
          description: "Condition has been cleared",
        });
      }
    } catch (error) {
      toast({
        title: "Failed to Remove Condition",
        description: "Could not remove condition",
        variant: "destructive",
      });
    }
  };

  // Handle action registration
  const handleRegisterAction = async (
    actorId: string,
    actionType: string,
    description: string,
    targetId?: string,
    targetType?: "character" | "npc"
  ) => {
    if (!combat) return;

    try {
      const success = await registerAction({
        actor_id: actorId,
        action_type: actionType,
        description,
        target_id: targetId,
        target_type: targetType,
      });

      if (success) {
        toast({
          title: "Action Registered",
          description: `${actionType} action recorded`,
        });
      }
    } catch (error) {
      toast({
        title: "Failed to Register Action",
        description: "Could not record action",
        variant: "destructive",
      });
    }
  };

  // Get current combatant
  const getCurrentCombatant = () => {
    if (!combat || combat.initiative_order.length === 0) return null;

    const currentTurn = combat.current_turn;
    if (currentTurn >= combat.initiative_order.length) return null;

    return combat.initiative_order[currentTurn];
  };

  const currentCombatant = getCurrentCombatant();

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Combat Tracker Error: {error}</AlertDescription>
      </Alert>
    );
  }

  // No combat state
  if (!combat) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Swords className="h-5 w-5" />
            Combat Tracker
          </CardTitle>
          <CardDescription>No active combat encounter</CardDescription>
        </CardHeader>
        <CardContent>
          {isUserDM && (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Start a new combat encounter to begin tracking initiative and
                actions.
              </p>
              <Button
                onClick={() => handleStartCombat()}
                className="flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                Start Combat
              </Button>
              {currentCampaign?.active_encounter && (
                <Button
                  variant="outline"
                  onClick={() =>
                    handleStartCombat(currentCampaign.active_encounter)
                  }
                  className="flex items-center gap-2"
                >
                  <Shield className="h-4 w-4" />
                  Start Active Encounter
                </Button>
              )}
            </div>
          )}
          {!isUserDM && (
            <p className="text-muted-foreground">
              Waiting for the DM to start combat...
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Combat Status Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Swords className="h-5 w-5" />
              Combat Tracker
              <Badge
                variant={combat.status === "active" ? "default" : "secondary"}
              >
                {combat.status}
              </Badge>
              {!connected && <Badge variant="destructive">Disconnected</Badge>}
            </div>
            {isUserDM && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEndCombat}
                className="flex items-center gap-1"
              >
                <Square className="h-4 w-4" />
                End Combat
              </Button>
            )}
          </CardTitle>
          <CardDescription>
            Round {combat.round} • {combat.initiative_order.length} combatants
            {currentCombatant && (
              <span className="ml-2">
                • Current: {currentCombatant.name || currentCombatant.id}
              </span>
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Combat Controls */}
      {isUserDM && (
        <CombatControls
          combat={combat}
          onNextTurn={handleNextTurn}
          onEndCombat={handleEndCombat}
          isLoading={isLoading}
        />
      )}

      {/* Main Combat Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Initiative & Controls */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="initiative">
                <Users className="h-4 w-4 mr-1" />
                Initiative
              </TabsTrigger>
              <TabsTrigger value="actions">
                <Swords className="h-4 w-4 mr-1" />
                Actions
              </TabsTrigger>
              <TabsTrigger value="conditions">
                <Timer className="h-4 w-4 mr-1" />
                Conditions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="initiative" className="space-y-4">
              <InitiativeList
                combat={combat}
                currentCombatant={currentCombatant}
                selectedCombatant={selectedCombatant}
                onSelectCombatant={setSelectedCombatant}
                onInitiativeRoll={handleInitiativeRoll}
                onNextTurn={handleNextTurn}
                isUserDM={isUserDM}
                userId={userId}
              />
            </TabsContent>

            <TabsContent value="actions" className="space-y-4">
              <CombatActions
                combat={combat}
                selectedCombatant={selectedCombatant}
                onRegisterAction={handleRegisterAction}
                onAddCondition={handleAddCondition}
                isUserDM={isUserDM}
                userId={userId}
              />
            </TabsContent>

            <TabsContent value="conditions" className="space-y-4">
              <ConditionManager
                combat={combat}
                onAddCondition={handleAddCondition}
                onRemoveCondition={handleRemoveCondition}
                isUserDM={isUserDM}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Combat Stats & Details */}
        <div className="space-y-6">
          <CombatStats
            combat={combat}
            currentCombatant={currentCombatant}
            selectedCombatant={selectedCombatant}
          />
        </div>
      </div>
    </div>
  );
}
