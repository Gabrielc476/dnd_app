// src/app/combat/page.tsx
"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Swords, AlertTriangle, Users, Shield } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useGameStore } from "@/stores/gameStore";
import { CombatTracker } from "@/components/combat";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export default function CombatPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentCampaign, isUserDM } = useGameStore();

  useEffect(() => {
    // If no campaign is selected, redirect to dashboard
    if (!currentCampaign) {
      router.push("/dashboard");
    }
  }, [currentCampaign, router]);

  if (!user) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          You must be logged in to access the combat tracker.
        </AlertDescription>
      </Alert>
    );
  }

  if (!currentCampaign) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Combat Tracker
            </h1>
            <p className="text-muted-foreground">
              Manage initiative, combat rounds, and battle actions
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Campaign Selected</h3>
            <p className="text-muted-foreground text-center mb-4">
              You need to select an active campaign before you can use the
              combat tracker.
            </p>
            <Button onClick={() => router.push("/dashboard")}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Swords className="h-8 w-8" />
            Combat Tracker
          </h1>
          <p className="text-muted-foreground">
            Manage initiative, combat rounds, and battle actions for{" "}
            {currentCampaign.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {currentCampaign.players.length} Players
          </Badge>
          {isUserDM ? (
            <Badge variant="default" className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Dungeon Master
            </Badge>
          ) : (
            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              Player
            </Badge>
          )}
        </div>
      </div>

      {/* Permission Warning for Non-DMs */}
      {!isUserDM && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You are viewing the combat tracker as a player. Some features may be
            limited or read-only. Only the Dungeon Master can control combat
            flow and manage encounters.
          </AlertDescription>
        </Alert>
      )}

      {/* Combat Tracker Component */}
      <CombatTracker campaignId={currentCampaign._id} userId={user.id} />

      {/* Quick Help */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Combat Quick Guide</CardTitle>
          <CardDescription>
            Essential rules and shortcuts for running D&D 5e combat
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <h4 className="font-medium">Initiative Order</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Roll 1d20 + Dex modifier</li>
                <li>• Higher rolls go first</li>
                <li>• Ties: Dex score breaks ties</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Actions in Combat</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Action (attack, cast spell, etc.)</li>
                <li>• Move (up to speed)</li>
                <li>• Bonus Action (if available)</li>
                <li>• Reaction (triggers vary)</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Common Conditions</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Prone: Disadvantage on attacks</li>
                <li>• Stunned: Can't act</li>
                <li>• Poisoned: Disadvantage on attacks/checks</li>
                <li>• Grappled: Speed becomes 0</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Attack Rolls</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 1d20 + ability modifier + proficiency</li>
                <li>• Natural 20 = Critical Hit</li>
                <li>• Must meet or exceed AC</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Saving Throws</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 1d20 + ability modifier</li>
                <li>• Add proficiency if proficient</li>
                <li>• Meet or exceed DC to succeed</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Death Saves</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Roll 1d20 when at 0 HP</li>
                <li>• 10+: Success, 9-: Failure</li>
                <li>• 3 successes = stabilized</li>
                <li>• 3 failures = death</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
