// src/components/character/creator/CharacterCreator.tsx

"use client";

import React, { useState, useCallback, useEffect } from "react";
import { UserPlus, ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { Character } from "@/lib/types";
import { useCharacter } from "@/hooks/useCharacter";
import { useToast } from "@/hooks/use-toast";
import {
  CharacterCreationData,
  CreationStep,
  CharacterCreatorProps,
  STANDARD_ARRAY,
  validateCharacterData,
} from "./types";

// Import step components
import { BasicInfoStep } from "./steps/BasicInfoStep";
import { RaceSelectionStep } from "./steps/RaceSelectionStep";
import { ClassSelectionStep } from "./steps/ClassSelectionStep";
import { AttributeSelectionStep } from "./steps/AttributeSelectionStep";
import { BackgroundSelectionStep } from "./steps/BackgroundSelectionStep";
import { EquipmentSelectionStep } from "./steps/EquipmentSelectionStep";
import { SpellSelectionStep } from "./steps/SpellSelectionStep";
import { FinalReviewStep } from "./steps/FinalReviewStep";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

const CREATION_STEPS: CreationStep[] = [
  {
    id: "basic",
    title: "Basic Info",
    description: "Name and basic character details",
    isComplete: false,
    isRequired: true,
  },
  {
    id: "race",
    title: "Race",
    description: "Choose your character's race",
    isComplete: false,
    isRequired: true,
  },
  {
    id: "class",
    title: "Class",
    description: "Select your character class",
    isComplete: false,
    isRequired: true,
  },
  {
    id: "attributes",
    title: "Abilities",
    description: "Set ability scores",
    isComplete: false,
    isRequired: true,
  },
  {
    id: "background",
    title: "Background",
    description: "Choose character background",
    isComplete: false,
    isRequired: true,
  },
  {
    id: "equipment",
    title: "Equipment",
    description: "Select starting equipment",
    isComplete: false,
    isRequired: true,
  },
  {
    id: "spells",
    title: "Spells",
    description: "Choose spells (if applicable)",
    isComplete: false,
    isRequired: false,
  },
  {
    id: "review",
    title: "Review",
    description: "Final review and create",
    isComplete: false,
    isRequired: true,
  },
];

export function CharacterCreator({
  campaignId,
  userId,
  onCharacterCreated,
  onCancel,
}: CharacterCreatorProps) {
  const { toast } = useToast();
  const { createCharacter, isLoading } = useCharacter({
    campaignId,
    userId,
  });

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [steps, setSteps] = useState<CreationStep[]>(CREATION_STEPS);
  const [characterData, setCharacterData] = useState<CharacterCreationData>({
    name: "",
    race: null,
    subrace: null,
    characterClass: null,
    background: null,
    alignment: "",
    attributes: { ...STANDARD_ARRAY },
    attributeMethod: "standardArray",
    hitPoints: 0,
    armorClass: 10,
    speed: 30,
    initiativeBonus: 0,
    proficiencies: [],
    languages: [],
    startingEquipment: [],
    features: [],
    isValid: false,
    validationErrors: [],
  });

  // Validate character data and update step completion
  useEffect(() => {
    const errors = validateCharacterData(characterData);

    setCharacterData((prev) => ({
      ...prev,
      isValid: errors.length === 0,
      validationErrors: errors,
    }));

    // Update step completion status
    setSteps((prevSteps) =>
      prevSteps.map((step) => {
        let isComplete = false;

        switch (step.id) {
          case "basic":
            isComplete =
              !!characterData.name.trim() && !!characterData.alignment;
            break;
          case "race":
            isComplete = !!characterData.race;
            break;
          case "class":
            isComplete = !!characterData.characterClass;
            break;
          case "attributes":
            isComplete = Object.values(characterData.attributes).every(
              (score) => score >= 8 && score <= 20
            );
            break;
          case "background":
            isComplete = !!characterData.background;
            break;
          case "equipment":
            isComplete = characterData.startingEquipment.length > 0;
            break;
          case "spells":
            // Optional step - complete if not needed or if spells are selected
            isComplete =
              !characterData.characterClass?.spellcasting ||
              (characterData.spellcasting?.cantrips?.length || 0) > 0;
            break;
          case "review":
            isComplete = characterData.isValid;
            break;
        }

        return { ...step, isComplete };
      })
    );
  }, [characterData]);

  const handleDataUpdate = useCallback(
    (updates: Partial<CharacterCreationData>) => {
      setCharacterData((prev) => ({
        ...prev,
        ...updates,
      }));
    },
    []
  );

  const handleNext = useCallback(() => {
    const nextIndex = Math.min(currentStepIndex + 1, steps.length - 1);

    // Skip spell selection if character doesn't have spellcasting
    if (
      steps[nextIndex].id === "spells" &&
      !characterData.characterClass?.spellcasting
    ) {
      setCurrentStepIndex(Math.min(nextIndex + 1, steps.length - 1));
    } else {
      setCurrentStepIndex(nextIndex);
    }
  }, [
    currentStepIndex,
    steps.length,
    characterData.characterClass?.spellcasting,
  ]);

  const handlePrevious = useCallback(() => {
    const prevIndex = Math.max(currentStepIndex - 1, 0);

    // Skip spell selection if character doesn't have spellcasting
    if (
      steps[prevIndex].id === "spells" &&
      !characterData.characterClass?.spellcasting
    ) {
      setCurrentStepIndex(Math.max(prevIndex - 1, 0));
    } else {
      setCurrentStepIndex(prevIndex);
    }
  }, [currentStepIndex, characterData.characterClass?.spellcasting]);

  const handleStepClick = useCallback(
    (stepIndex: number) => {
      // Skip spell selection if character doesn't have spellcasting
      if (
        steps[stepIndex].id === "spells" &&
        !characterData.characterClass?.spellcasting
      ) {
        return;
      }

      setCurrentStepIndex(stepIndex);
    },
    [steps, characterData.characterClass?.spellcasting]
  );

  const handleCreateCharacter = async () => {
    if (!characterData.isValid) {
      toast({
        title: "Validation Error",
        description: "Please complete all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      // Convert CharacterCreationData to Character format
      const newCharacterData = {
        name: characterData.name,
        campaign_id: campaignId,
        owner_id: userId,
        race: characterData.race!.name,
        class: characterData.characterClass!.name,
        level: 1,
        attributes: characterData.attributes,
        hp: {
          current: characterData.hitPoints,
          max: characterData.hitPoints,
        },
        temporary_hp: 0,
        armor_class: characterData.armorClass,
        speed: characterData.speed,
        initiative_bonus: characterData.initiativeBonus,
        inventory: characterData.startingEquipment,
        proficiencies: characterData.proficiencies,
        features: characterData.features,
        background: characterData.background?.name,
        alignment: characterData.alignment,
        experience_points: 0,
        inspiration: false,
        conditions: [],
      };

      // Add spellcasting if applicable
      if (
        characterData.spellcasting &&
        characterData.characterClass?.spellcasting
      ) {
        newCharacterData.spellcasting = {
          ability: characterData.spellcasting.ability,
          spell_slots: {
            "1": { used: 0, total: 2 }, // Default level 1 spell slots
          },
          prepared_spells: characterData.spellcasting.spells || [],
        };
      }

      const createdCharacter = await createCharacter(newCharacterData);

      if (createdCharacter) {
        toast({
          title: "Character Created!",
          description: `${createdCharacter.name} has been created successfully`,
        });
        onCharacterCreated(createdCharacter);
      }
    } catch (error) {
      toast({
        title: "Creation Failed",
        description: "Failed to create character. Please try again.",
        variant: "destructive",
      });
    }
  };

  const currentStep = steps[currentStepIndex];
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const renderStepContent = () => {
    const stepProps = {
      data: characterData,
      onUpdate: handleDataUpdate,
      onNext: handleNext,
      onPrevious: handlePrevious,
      isFirstStep: currentStepIndex === 0,
      isLastStep: currentStepIndex === steps.length - 1,
    };

    switch (currentStep.id) {
      case "basic":
        return <BasicInfoStep {...stepProps} />;
      case "race":
        return <RaceSelectionStep {...stepProps} />;
      case "class":
        return <ClassSelectionStep {...stepProps} />;
      case "attributes":
        return <AttributeSelectionStep {...stepProps} />;
      case "background":
        return <BackgroundSelectionStep {...stepProps} />;
      case "equipment":
        return <EquipmentSelectionStep {...stepProps} />;
      case "spells":
        return <SpellSelectionStep {...stepProps} />;
      case "review":
        return (
          <FinalReviewStep
            {...stepProps}
            onCreateCharacter={handleCreateCharacter}
            isCreating={isLoading}
          />
        );
      default:
        return <div>Unknown step</div>;
    }
  };

  const canProceed = currentStep.isComplete || !currentStep.isRequired;
  const showSpellStep = characterData.characterClass?.spellcasting;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-6 w-6" />
            Character Creator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>

          {/* Step Navigation */}
          <div className="flex flex-wrap gap-2">
            {steps.map((step, index) => {
              // Hide spell step if not applicable
              if (step.id === "spells" && !showSpellStep) {
                return null;
              }

              return (
                <Button
                  key={step.id}
                  variant={index === currentStepIndex ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleStepClick(index)}
                  className="flex items-center gap-1"
                  disabled={step.id === "spells" && !showSpellStep}
                >
                  {step.isComplete && <Check className="h-3 w-3" />}
                  <span className="hidden sm:inline">{step.title}</span>
                  <span className="sm:hidden">{index + 1}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Current Step */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {currentStep.title}
                {currentStep.isComplete && (
                  <Badge variant="secondary" className="text-xs">
                    <Check className="h-3 w-3 mr-1" />
                    Complete
                  </Badge>
                )}
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                {currentStep.description}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {currentStep.isRequired && (
                <Badge variant="outline" className="text-xs">
                  Required
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>{renderStepContent()}</CardContent>
      </Card>

      {/* Validation Errors */}
      {characterData.validationErrors.length > 0 && (
        <Alert variant="destructive">
          <X className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">Please fix the following issues:</p>
              <ul className="list-disc list-inside space-y-1">
                {characterData.validationErrors.map((error, index) => (
                  <li key={index} className="text-sm">
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Navigation Footer */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStepIndex === 0}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Button>

              {currentStepIndex === steps.length - 1 ? (
                <Button
                  onClick={handleCreateCharacter}
                  disabled={!characterData.isValid || isLoading}
                  className="flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Create Character
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed}
                  className="flex items-center gap-2"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
