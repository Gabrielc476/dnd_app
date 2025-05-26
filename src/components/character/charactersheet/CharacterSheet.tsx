// src/components/character/CharacterSheet.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Character } from "@/lib/types";
import { useCharacter } from "@/hooks/useCharacter";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Lock } from "lucide-react";
import { CharacterHeader } from "./CharacterHeader";
import { CharacterAttributes } from "./CharacterAttributes";
import { CharacterDefenses } from "./CharacterDefenses";
import { CharacterSkills } from "./CharacterSkills";
import { CharacterFeatures } from "./CharacterFeatures";
import { CharacterInventory } from "./CharacterInventory";
import { CharacterConditions } from "./CharacterConditions";
import { CharacterActions } from "./CharacterActions";

interface CharacterSheetProps {
  characterId: string;
  campaignId: string;
  userId: string;
  isReadOnly?: boolean;
}

export function CharacterSheet({
  characterId,
  campaignId,
  userId,
  isReadOnly = false,
}: CharacterSheetProps) {
  const { toast } = useToast();

  // Usando o hook useCharacter existente - não precisa do useCharacterSheet!
  const {
    character,
    isLoading,
    error,
    updateCharacter,
    updateHP,
    addCondition,
    removeCondition,
    rollAbilityCheck,
    isLocked,
    acquireLock,
    releaseLock,
    whoLocked,
  } = useCharacter({
    campaignId,
    userId,
    characterId,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);

  // Handle character update with lock management
  const handleUpdate = async (
    updates: Partial<Character>
  ): Promise<boolean> => {
    if (isReadOnly) return false;

    try {
      // Acquire lock if not editing
      if (!isEditing) {
        const lockAcquired = await acquireLock(characterId);
        if (!lockAcquired) {
          toast({
            title: "Character Locked",
            description: `This character is being edited by ${whoLocked(
              characterId
            )}`,
            variant: "destructive",
          });
          return false;
        }
        setIsEditing(true);
      }

      const success = await updateCharacter(characterId, updates);

      if (success) {
        toast({
          title: "Character Updated",
          description: "Changes saved successfully",
        });
      }

      return success;
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to save changes",
        variant: "destructive",
      });
      return false;
    }
  };

  // Handle HP changes
  const handleHPUpdate = async (
    change: number,
    isTemp: boolean = false
  ): Promise<boolean> => {
    if (isReadOnly) return false;

    try {
      const success = await updateHP(characterId, change, isTemp);
      if (success) {
        const changeText =
          change > 0 ? `healed ${change}` : `took ${Math.abs(change)} damage`;
        toast({
          title: "HP Updated",
          description: `${character?.name} ${changeText}${
            isTemp ? " (temporary)" : ""
          }`,
        });
      }
      return success;
    } catch (error) {
      toast({
        title: "HP Update Failed",
        description: "Failed to update hit points",
        variant: "destructive",
      });
      return false;
    }
  };

  // Handle condition changes
  const handleAddCondition = async (condition: string): Promise<boolean> => {
    if (isReadOnly) return false;

    try {
      const result = await addCondition(characterId, condition);
      if (result) {
        toast({
          title: "Condition Added",
          description: `Applied ${condition} to ${character?.name}`,
        });
        return true;
      }
      return false;
    } catch (error) {
      toast({
        title: "Failed to Add Condition",
        description: "Could not apply condition",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleRemoveCondition = async (condition: string): Promise<boolean> => {
    if (isReadOnly) return false;

    try {
      const result = await removeCondition(characterId, condition);
      if (result) {
        toast({
          title: "Condition Removed",
          description: `Removed ${condition} from ${character?.name}`,
        });
        return true;
      }
      return false;
    } catch (error) {
      toast({
        title: "Failed to Remove Condition",
        description: "Could not remove condition",
        variant: "destructive",
      });
      return false;
    }
  };

  // Handle dice rolls
  const handleRollDice = (type: string, formula: string) => {
    if (!character) return;

    const success = rollAbilityCheck(characterId, type);
    if (success) {
      toast({
        title: "Dice Rolled",
        description: `${character.name} rolled for ${type}`,
      });
    }
  };

  // Release lock when component unmounts or editing stops
  useEffect(() => {
    return () => {
      if (isEditing) {
        releaseLock(characterId);
      }
    };
  }, [isEditing, characterId, releaseLock]);

  // Handle editing state
  const startEditing = async (field?: string) => {
    if (isReadOnly) return;

    const lockAcquired = await acquireLock(characterId);
    if (!lockAcquired) {
      toast({
        title: "Character Locked",
        description: `This character is being edited by ${whoLocked(
          characterId
        )}`,
        variant: "destructive",
      });
      return;
    }

    setIsEditing(true);
    setEditingField(field || null);
  };

  const stopEditing = () => {
    setIsEditing(false);
    setEditingField(null);
    releaseLock(characterId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading character...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!character) {
    return (
      <Alert>
        <AlertDescription>Character not found</AlertDescription>
      </Alert>
    );
  }

  const isCharacterLocked = isLocked(characterId);
  const lockedBy = whoLocked(characterId);

  return (
    <div className="space-y-6">
      {/* Lock Status Alert */}
      {isCharacterLocked && (
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertDescription>
            This character is currently being edited by {lockedBy}
          </AlertDescription>
        </Alert>
      )}

      {/* Character Header */}
      <CharacterHeader
        character={character}
        campaignId={campaignId}
        userId={userId}
        isReadOnly={isReadOnly || isCharacterLocked}
        onUpdate={handleUpdate}
        isEditing={isEditing}
        onStartEditing={() => startEditing("header")}
        onStopEditing={stopEditing}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Attributes & Defenses */}
        <div className="space-y-6">
          <CharacterAttributes
            character={character}
            campaignId={campaignId}
            userId={userId}
            isReadOnly={isReadOnly || isCharacterLocked}
            onUpdate={handleUpdate}
            onRollDice={handleRollDice}
            isEditing={isEditing}
            onStartEditing={() => startEditing("attributes")}
          />

          <CharacterDefenses
            character={character}
            campaignId={campaignId}
            userId={userId}
            isReadOnly={isReadOnly || isCharacterLocked}
            onUpdate={handleUpdate}
            onUpdateHP={handleHPUpdate}
            isEditing={isEditing}
            onStartEditing={() => startEditing("defenses")}
          />

          <CharacterConditions
            character={character}
            campaignId={campaignId}
            userId={userId}
            isReadOnly={isReadOnly || isCharacterLocked}
            onAddCondition={handleAddCondition}
            onRemoveCondition={handleRemoveCondition}
          />
        </div>

        {/* Middle Column - Skills & Features */}
        <div className="space-y-6">
          <CharacterSkills
            character={character}
            campaignId={campaignId}
            userId={userId}
            isReadOnly={isReadOnly || isCharacterLocked}
            onUpdate={handleUpdate}
            onRollDice={handleRollDice}
            isEditing={isEditing}
            onStartEditing={() => startEditing("skills")}
          />

          <CharacterFeatures
            character={character}
            campaignId={campaignId}
            userId={userId}
            isReadOnly={isReadOnly || isCharacterLocked}
            onUpdate={handleUpdate}
            isEditing={isEditing}
            onStartEditing={() => startEditing("features")}
          />
        </div>

        {/* Right Column - Inventory & Actions */}
        <div className="space-y-6">
          <CharacterInventory
            character={character}
            campaignId={campaignId}
            userId={userId}
            isReadOnly={isReadOnly || isCharacterLocked}
            onUpdate={handleUpdate}
            isEditing={isEditing}
            onStartEditing={() => startEditing("inventory")}
          />

          <CharacterActions
            character={character}
            campaignId={campaignId}
            userId={userId}
            isReadOnly={isReadOnly || isCharacterLocked}
            onRollDice={handleRollDice}
            onUpdateHP={handleHPUpdate}
            onAddCondition={handleAddCondition}
            onRemoveCondition={handleRemoveCondition}
            onUpdate={handleUpdate}
          />
        </div>
      </div>
    </div>
  );
}
