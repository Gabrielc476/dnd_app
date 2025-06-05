// src/app/npcs/page.tsx
"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users, AlertTriangle, Shield, Crown } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useGameStore } from "@/stores/gameStore";
import { NPCManager } from "@/components/npc";

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

export default function NPCsPage() {
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
          You must be logged in to access the NPC manager.
        </AlertDescription>
      </Alert>
    );
  }

  if (!currentCampaign) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">NPC Manager</h1>
            <p className="text-muted-foreground">
              Create and manage non-player characters for your campaigns
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Campaign Selected</h3>
            <p className="text-muted-foreground text-center mb-4">
              You need to select an active campaign before you can manage NPCs.
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
            <Users className="h-8 w-8" />
            NPC Manager
          </h1>
          <p className="text-muted-foreground">
            Create, manage, and organize non-player characters for{" "}
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
              <Crown className="h-3 w-3" />
              Dungeon Master
            </Badge>
          ) : (
            <Badge variant="outline" className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
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
            You are viewing the NPC manager as a player. You can view NPCs but
            cannot create, edit, or delete them. Only the Dungeon Master has
            full access to NPC management features.
          </AlertDescription>
        </Alert>
      )}

      {/* NPC Manager Component */}
      <NPCManager
        campaignId={currentCampaign._id}
        userId={user.id}
        isReadOnly={!isUserDM}
      />

      {/* Quick Tips for DMs */}
      {isUserDM && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">NPC Management Tips</CardTitle>
            <CardDescription>
              Best practices for creating and managing NPCs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <h4 className="font-medium">Quick Creation</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Use templates for common NPC types</li>
                  <li>• Import from compendium for official monsters</li>
                  <li>• Duplicate existing NPCs to save time</li>
                  <li>• Adjust CR based on party level</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Organization</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Tag NPCs by location or encounter</li>
                  <li>• Use descriptive names for duplicates</li>
                  <li>• Group similar creatures together</li>
                  <li>• Add notes for roleplay details</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Combat Ready</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Pre-roll initiative for encounters</li>
                  <li>• Prepare stat blocks in advance</li>
                  <li>• Note special abilities and tactics</li>
                  <li>• Consider environmental factors</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Challenge Rating</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• CR 1/4 - 1/2: Weak enemies, minions</li>
                  <li>• CR 1-4: Standard encounters</li>
                  <li>• CR 5-10: Challenging foes</li>
                  <li>• CR 11+: Boss fights, legendary creatures</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Roleplay NPCs</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Give each NPC a distinct voice</li>
                  <li>• Define motivations and goals</li>
                  <li>• Consider their relationship to PCs</li>
                  <li>• Prepare key dialogue or reactions</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Encounter Balance</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Easy: 1/4 party's daily XP budget</li>
                  <li>• Medium: 1/2 party's daily XP budget</li>
                  <li>• Hard: 3/4 party's daily XP budget</li>
                  <li>• Deadly: Full daily XP budget</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
