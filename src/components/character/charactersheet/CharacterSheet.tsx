// src/components/character/CharacterSheet.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Character } from "@/lib/types";
import { useCharacter } from "@/hooks/useCharacter";
import { useCharacterSocket } from "@/lib/socket";
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

  // WebSocket for dice rolls
  const {
    socket,
    connected,
    rollAbilityCheck: rollAbilityCheckSocket,
  } = useCharacterSocket(campaignId, userId, characterId);

  const [isEditing, setIsEditing] = useState(false);

  // Listen for roll results
  useEffect(() => {
    if (!socket || !connected) return;

    const handleRollResult = (data: any) => {
      if (data.character_id === characterId) {
        const resultText = data.advantage
          ? `with advantage`
          : data.disadvantage
          ? `with disadvantage`
          : ``;

        toast({
          title: "Roll Result",
          description: `${character?.name} rolled ${
            data.result
          } ${resultText} (${data.formula}${
            data.modifier
              ? data.modifier >= 0
                ? `+${data.modifier}`
                : data.modifier
              : ""
          }) for ${data.roll_type}`,
        });
      }
    };

    socket.on("roll_result", handleRollResult);

    return () => {
      socket.off("roll_result", handleRollResult);
    };
  }, [socket, connected, characterId, character?.name, toast]);

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
  const handleRollDice = (
    type: string,
    formula: string,
    advantage: boolean = false,
    disadvantage: boolean = false
  ) => {
    if (!character) return;

    // Check if we can use WebSocket
    if (connected && socket) {
      // Parse the formula to extract dice and modifier
      const formulaMatch = formula.match(/^(\d+)d(\d+)([+-]\d+)?$/);
      let diceCount = 1;
      let diceSize = 20;
      let modifier = 0;

      if (formulaMatch) {
        diceCount = parseInt(formulaMatch[1]);
        diceSize = parseInt(formulaMatch[2]);
        if (formulaMatch[3]) {
          modifier = parseInt(formulaMatch[3]);
        }
      }

      // Send roll event through WebSocket
      const rollEvent = {
        type: "roll",
        action: "custom",
        character_id: characterId,
        formula: formula,
        modifier: modifier,
        advantage: advantage,
        disadvantage: disadvantage,
        roll_type: type,
      };

      socket.emit("roll", rollEvent);

      toast({
        title: "Dice Rolling...",
        description: `${character.name} is rolling ${formula} for ${type}`,
      });
    } else {
      // Fallback to local roll simulation
      const formulaMatch = formula.match(/^(\d+)d(\d+)([+-]\d+)?$/);
      let diceCount = 1;
      let diceSize = 20;
      let modifier = 0;

      if (formulaMatch) {
        diceCount = parseInt(formulaMatch[1]);
        diceSize = parseInt(formulaMatch[2]);
        if (formulaMatch[3]) {
          modifier = parseInt(formulaMatch[3]);
        }
      }

      // Simulate dice roll
      let total = 0;
      const rolls: number[] = [];

      for (let i = 0; i < diceCount; i++) {
        const roll = Math.floor(Math.random() * diceSize) + 1;
        rolls.push(roll);
      }

      if (advantage && diceCount === 1 && diceSize === 20) {
        // Roll twice and take the higher
        const secondRoll = Math.floor(Math.random() * 20) + 1;
        rolls.push(secondRoll);
        total = Math.max(rolls[0], secondRoll) + modifier;
      } else if (disadvantage && diceCount === 1 && diceSize === 20) {
        // Roll twice and take the lower
        const secondRoll = Math.floor(Math.random() * 20) + 1;
        rolls.push(secondRoll);
        total = Math.min(rolls[0], secondRoll) + modifier;
      } else {
        // Normal roll
        total = rolls.reduce((sum, roll) => sum + roll, 0) + modifier;
      }

      // Get attribute modifier if it's an ability check
      const abilityMap: Record<string, keyof Character["attributes"]> = {
        STR: "strength",
        DEX: "dexterity",
        CON: "constitution",
        INT: "intelligence",
        WIS: "wisdom",
        CHA: "charisma",
      };

      let abilityModifier = 0;
      const abilityKey = Object.keys(abilityMap).find((key) =>
        type.toUpperCase().includes(key)
      );

      if (abilityKey && character.attributes) {
        const ability = abilityMap[abilityKey];
        const score = character.attributes[ability];
        abilityModifier = Math.floor((score - 10) / 2);
        total += abilityModifier;
      }

      // Special case for initiative
      if (type.toLowerCase().includes("initiative")) {
        const dexModifier = Math.floor(
          (character.attributes.dexterity - 10) / 2
        );
        total += dexModifier + (character.initiative_bonus || 0);
      }

      toast({
        title: "Dice Rolled",
        description: `${
          character.name
        } rolled ${total} for ${type} (${rolls.join(", ")}${
          modifier !== 0 ? ` ${modifier >= 0 ? "+" : ""}${modifier}` : ""
        }${
          abilityModifier !== 0
            ? ` ${abilityModifier >= 0 ? "+" : ""}${abilityModifier}`
            : ""
        })`,
      });

      // Still try to send through the character hook for logging
      const isAbilityCheck = abilityKey !== undefined;
      if (isAbilityCheck && abilityKey) {
        const ability = abilityMap[abilityKey];
        rollAbilityCheck(characterId, ability);
      } else {
        rollAbilityCheck(characterId, type.toLowerCase().replace(/\s+/g, "_"));
      }
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
  const startEditing = async () => {
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
  };

  const stopEditing = () => {
    setIsEditing(false);
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
        <AlertDescription>Error: {error}</AlertDescription>
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
        onStartEditing={startEditing}
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
            onStartEditing={startEditing}
          />

          <CharacterDefenses
            character={character}
            campaignId={campaignId}
            userId={userId}
            isReadOnly={isReadOnly || isCharacterLocked}
            onUpdate={handleUpdate}
            onUpdateHP={handleHPUpdate}
            isEditing={isEditing}
            onStartEditing={startEditing}
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
            onStartEditing={startEditing}
          />

          <CharacterFeatures
            character={character}
            campaignId={campaignId}
            userId={userId}
            isReadOnly={isReadOnly || isCharacterLocked}
            onUpdate={handleUpdate}
            isEditing={isEditing}
            onStartEditing={startEditing}
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
            onStartEditing={startEditing}
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
