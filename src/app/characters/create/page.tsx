// src/app/characters/create/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, UserPlus } from "lucide-react";

import { Character } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";
import { useGameStore } from "@/stores/gameStore";
import { useToast } from "@/hooks/use-toast";
import { CharacterCreator } from "@/components/character/creator";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function CreateCharacterPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentCampaign } = useGameStore();
  const { toast } = useToast();

  useEffect(() => {
    // Redirect if not authenticated
    if (!user) {
      router.push("/auth");
      return;
    }
  }, [user, router]);

  const handleCharacterCreated = (character: Character) => {
    toast({
      title: "Character Created!",
      description: `${character.name} has been created successfully`,
    });

    // Redirect to the character page
    router.push(`/characters/${character._id}`);
  };

  const handleCancel = () => {
    router.back();
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  // If no campaign is selected, show selection prompt
  if (!currentCampaign) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Create Character
            </h1>
            <p className="text-muted-foreground">
              Create a new character for your D&D campaign
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Campaign Required
            </CardTitle>
            <CardDescription>
              You need to select a campaign before creating a character
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                Characters must be associated with a campaign. Please select an
                active campaign from the dashboard before creating a character.
              </AlertDescription>
            </Alert>
            <div className="flex gap-2">
              <Button onClick={() => router.push("/campaign")}>
                Browse Campaigns
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard")}
              >
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Create Character
          </h1>
          <p className="text-muted-foreground">
            Create a new character for {currentCampaign.name}
          </p>
        </div>
      </div>

      {/* Character Creator */}
      <CharacterCreator
        campaignId={currentCampaign._id}
        userId={user.id}
        onCharacterCreated={handleCharacterCreated}
        onCancel={handleCancel}
      />
    </div>
  );
}
