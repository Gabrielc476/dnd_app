// src/app/characters/[id]/edit/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Save,
  X,
  Lock,
  AlertTriangle,
  User,
  Crown,
  Shield,
} from "lucide-react";

import { Character } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";
import { useCharacter } from "@/hooks/useCharacter";
import { useGameStore } from "@/stores/gameStore";
import { useToast } from "@/hooks/use-toast";
import { CharacterSheet } from "@/components/character/charactersheet";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function EditCharacterPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const { currentCampaign, isUserDM } = useGameStore();
  const { toast } = useToast();

  const characterId = params?.id as string;
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);

  const {
    character,
    isLoading,
    error,
    fetchCharacter,
    isLocked,
    acquireLock,
    releaseLock,
    whoLocked,
  } = useCharacter({
    campaignId: currentCampaign?._id || "",
    userId: user?.id || "",
    characterId,
  });

  useEffect(() => {
    if (characterId && user) {
      fetchCharacter(characterId);
    }
  }, [characterId, user, fetchCharacter]);

  // Check permissions
  useEffect(() => {
    if (character && user) {
      const canEdit = character.owner_id === user.id || isUserDM;

      if (!canEdit) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to edit this character",
          variant: "destructive",
        });
        router.push(`/characters/${characterId}`);
      }
    }
  }, [character, user, isUserDM, characterId, router, toast]);

  // Handle browser navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleBack = () => {
    if (hasUnsavedChanges) {
      setShowExitDialog(true);
    } else {
      router.push(`/characters/${characterId}`);
    }
  };

  const handleSave = () => {
    // The CharacterSheet component handles saving
    // This is just for UI feedback
    setHasUnsavedChanges(false);
    toast({
      title: "Changes Saved",
      description: "Character has been updated successfully",
    });
  };

  const confirmExit = () => {
    // Release any locks
    if (character && isLocked(characterId)) {
      releaseLock(characterId);
    }
    router.push(`/characters/${characterId}`);
  };

  const cancelExit = () => {
    setShowExitDialog(false);
  };

  // Check if user can edit this character
  const canEdit = character && (character.owner_id === user?.id || isUserDM);

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <Alert variant="destructive">
          <AlertDescription>Error loading character: {error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading || !character) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to edit this character.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const characterLocked = isLocked(characterId);
  const lockedBy = whoLocked(characterId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback>
                {character.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Edit {character.name}
              </h1>
              <p className="text-muted-foreground">
                Level {character.level} {character.race} {character.class}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Badges */}
          <Badge variant="outline">
            {character.owner_id === user?.id ? (
              <>
                <User className="h-3 w-3 mr-1" />
                Your Character
              </>
            ) : (
              <>
                <Shield className="h-3 w-3 mr-1" />
                DM Editing
              </>
            )}
          </Badge>

          {hasUnsavedChanges && (
            <Badge variant="destructive">Unsaved Changes</Badge>
          )}

          {characterLocked && lockedBy !== user?.id && (
            <Badge variant="secondary">
              <Lock className="h-3 w-3 mr-1" />
              Locked by {lockedBy}
            </Badge>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleBack}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={characterLocked}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>

      {/* Lock Warning */}
      {characterLocked && lockedBy !== user?.id && (
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertDescription>
            This character is currently being edited by {lockedBy}. You cannot
            make changes at this time.
          </AlertDescription>
        </Alert>
      )}

      {/* Editing Instructions */}
      {!characterLocked && (
        <Alert>
          <AlertDescription>
            You are now editing this character. Changes will be saved
            automatically as you make them. Click "Save Changes" or navigate
            away when you're done.
          </AlertDescription>
        </Alert>
      )}

      {/* Character Editor */}
      <CharacterSheet
        characterId={characterId}
        campaignId={currentCampaign?._id || ""}
        userId={user?.id || ""}
        isReadOnly={characterLocked && lockedBy !== user?.id}
      />

      {/* Exit Confirmation Dialog */}
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogDescription>
              You have unsaved changes to this character. Are you sure you want
              to leave? Your changes will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={cancelExit}>
              Continue Editing
            </Button>
            <Button variant="destructive" onClick={confirmExit}>
              Discard Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
