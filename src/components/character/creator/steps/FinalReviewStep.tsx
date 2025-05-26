// src/components/character/creator/steps/FinalReviewStep.tsx

"use client";

import React from "react";
import {
  User,
  Shield,
  Heart,
  Zap,
  BookOpen,
  Sword,
  Check,
  AlertTriangle,
} from "lucide-react";
import { StepComponentProps, calculateModifier } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

interface FinalReviewStepProps extends StepComponentProps {
  onCreateCharacter: () => void;
  isCreating: boolean;
}

export function FinalReviewStep({
  data,
  onCreateCharacter,
  isCreating,
}: FinalReviewStepProps) {
  const finalAttributes = {
    strength:
      data.attributes.strength +
      (data.race?.abilityScoreIncrease.strength || 0) +
      (data.subrace?.abilityScoreIncrease.strength || 0),
    dexterity:
      data.attributes.dexterity +
      (data.race?.abilityScoreIncrease.dexterity || 0) +
      (data.subrace?.abilityScoreIncrease.dexterity || 0),
    constitution:
      data.attributes.constitution +
      (data.race?.abilityScoreIncrease.constitution || 0) +
      (data.subrace?.abilityScoreIncrease.constitution || 0),
    intelligence:
      data.attributes.intelligence +
      (data.race?.abilityScoreIncrease.intelligence || 0) +
      (data.subrace?.abilityScoreIncrease.intelligence || 0),
    wisdom:
      data.attributes.wisdom +
      (data.race?.abilityScoreIncrease.wisdom || 0) +
      (data.subrace?.abilityScoreIncrease.wisdom || 0),
    charisma:
      data.attributes.charisma +
      (data.race?.abilityScoreIncrease.charisma || 0) +
      (data.subrace?.abilityScoreIncrease.charisma || 0),
  };

  const spellcastingAbility = data.characterClass?.spellcasting?.ability;
  const spellcastingModifier = spellcastingAbility
    ? calculateModifier(finalAttributes[spellcastingAbility])
    : 0;
  const spellSaveDC = spellcastingAbility ? 8 + 2 + spellcastingModifier : 0; // 8 + proficiency + ability modifier
  const spellAttackBonus = spellcastingAbility ? 2 + spellcastingModifier : 0; // proficiency + ability modifier

  const completionPercentage = Math.round(
    (((data.name ? 1 : 0) +
      (data.race ? 1 : 0) +
      (data.characterClass ? 1 : 0) +
      (data.background ? 1 : 0) +
      (data.alignment ? 1 : 0) +
      (data.startingEquipment.length > 0 ? 1 : 0)) /
      6) *
      100
  );

  return (
    <div className="space-y-6">
      {/* Completion Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Check className="h-5 w-5" />
            Character Completion
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span>{completionPercentage}%</span>
            </div>
            <Progress value={completionPercentage} className="w-full" />

            {!data.isValid && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">
                      Character has validation issues:
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                      {data.validationErrors.map((error, index) => (
                        <li key={index} className="text-sm">
                          {error}
                        </li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Character Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Character Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">
                  {data.name || "Unnamed Character"}
                </h3>
                <p className="text-muted-foreground">
                  Level 1 {data.race?.name}
                  {data.subrace ? ` (${data.subrace.name})` : ""}{" "}
                  {data.characterClass?.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {data.alignment}
                </p>
                {data.background && (
                  <p className="text-sm text-muted-foreground">
                    Background: {data.background.name}
                  </p>
                )}
              </div>

              {/* Core Stats */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Heart className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium">HP</span>
                  </div>
                  <div className="font-bold text-lg">{data.hitPoints}</div>
                </div>

                <div className="p-3 border rounded-lg">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Shield className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">AC</span>
                  </div>
                  <div className="font-bold text-lg">{data.armorClass}</div>
                </div>

                <div className="p-3 border rounded-lg">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-medium">Speed</span>
                  </div>
                  <div className="font-bold text-lg">{data.speed} ft</div>
                </div>
              </div>
            </div>

            {/* Ability Scores */}
            <div>
              <h4 className="font-medium mb-3">Ability Scores</h4>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(finalAttributes).map(([ability, score]) => (
                  <div
                    key={ability}
                    className="flex justify-between items-center p-2 border rounded"
                  >
                    <span className="text-sm font-medium capitalize">
                      {ability.slice(0, 3)}
                    </span>
                    <div className="text-right">
                      <div className="font-bold">{score}</div>
                      <div className="text-xs text-muted-foreground">
                        ({calculateModifier(score) >= 0 ? "+" : ""}
                        {calculateModifier(score)})
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Racial Features */}
      {data.race && (
        <Card>
          <CardHeader>
            <CardTitle>Racial Traits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">{data.race.name} Traits</h4>
                <div className="grid gap-2">
                  {data.race.traits.map((trait, index) => (
                    <div key={index} className="text-sm">
                      <span className="font-medium">{trait.name}:</span>{" "}
                      <span className="text-muted-foreground">
                        {trait.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {data.subrace && (
                <div>
                  <h4 className="font-medium mb-2">
                    {data.subrace.name} Traits
                  </h4>
                  <div className="grid gap-2">
                    {data.subrace.traits.map((trait, index) => (
                      <div key={index} className="text-sm">
                        <span className="font-medium">{trait.name}:</span>{" "}
                        <span className="text-muted-foreground">
                          {trait.description}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Class Features */}
      {data.characterClass && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sword className="h-5 w-5" />
              Class Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">
                  {data.characterClass.name} Features
                </h4>
                <div className="space-y-2">
                  {data.characterClass.features
                    .filter((f) => f.level === 1)
                    .map((feature, index) => (
                      <div key={index} className="text-sm">
                        <span className="font-medium">{feature.name}:</span>{" "}
                        <span className="text-muted-foreground">
                          {feature.description}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Proficiencies */}
              <Separator />
              <div>
                <h4 className="font-medium mb-2">Proficiencies</h4>
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="font-medium">Saving Throws:</span>{" "}
                    <span className="text-muted-foreground">
                      {data.characterClass.savingThrowProficiencies
                        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
                        .join(", ")}
                    </span>
                  </div>
                  {data.characterClass.proficiencies.armor.length > 0 && (
                    <div>
                      <span className="font-medium">Armor:</span>{" "}
                      <span className="text-muted-foreground">
                        {data.characterClass.proficiencies.armor.join(", ")}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Weapons:</span>{" "}
                    <span className="text-muted-foreground">
                      {data.characterClass.proficiencies.weapons.join(", ")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Spellcasting */}
      {data.characterClass?.spellcasting && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Spellcasting
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium">Spellcasting Ability:</span>{" "}
                  <span className="text-muted-foreground capitalize">
                    {spellcastingAbility} (
                    {finalAttributes[spellcastingAbility!]} /{" "}
                    {spellcastingModifier >= 0 ? "+" : ""}
                    {spellcastingModifier})
                  </span>
                </div>
                <div className="text-sm">
                  <span className="font-medium">Spell Save DC:</span>{" "}
                  <span className="text-muted-foreground">{spellSaveDC}</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium">Spell Attack Bonus:</span>{" "}
                  <span className="text-muted-foreground">
                    +{spellAttackBonus}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium">Cantrips Known:</span>{" "}
                  <span className="text-muted-foreground">
                    {data.characterClass.spellcasting.cantripsKnown[0]}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="font-medium">1st Level Spell Slots:</span>{" "}
                  <span className="text-muted-foreground">
                    {data.characterClass.spellcasting.spellSlots[0]["1"]}
                  </span>
                </div>
                {data.spellcasting && (
                  <div className="text-sm">
                    <span className="font-medium">Spells Selected:</span>{" "}
                    <span className="text-muted-foreground">
                      {(data.spellcasting.cantrips?.length || 0) +
                        (data.spellcasting.spells?.length || 0)}{" "}
                      total
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Equipment */}
      {data.startingEquipment.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Starting Equipment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {data.startingEquipment.map((item, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center text-sm"
                >
                  <span>{item.name}</span>
                  <div className="flex gap-2">
                    {item.quantity > 1 && (
                      <Badge variant="outline">{item.quantity}x</Badge>
                    )}
                    {item.equipped && (
                      <Badge variant="secondary">Equipped</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Languages & Other Features */}
      {(data.languages.length > 0 || data.features.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Additional Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.languages.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Languages</h4>
                  <div className="flex gap-1 flex-wrap">
                    {data.languages.map((language, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="text-xs"
                      >
                        {language}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {data.features.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Additional Features</h4>
                  <div className="space-y-2">
                    {data.features.map((feature, index) => (
                      <div key={index} className="text-sm">
                        <span className="font-medium">{feature.name}:</span>{" "}
                        <span className="text-muted-foreground">
                          {feature.description}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Final Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ready to Create Character?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Once you create this character, you'll be able to use them in your
              campaign. You can always modify details later through the
              character sheet.
            </div>

            <div className="flex justify-center">
              <Button
                onClick={onCreateCharacter}
                disabled={!data.isValid || isCreating}
                size="lg"
                className="px-8"
              >
                {isCreating ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                    Creating Character...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Create {data.name || "Character"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
