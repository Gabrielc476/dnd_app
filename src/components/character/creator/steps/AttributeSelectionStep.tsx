// src/components/character/creator/steps/AttributeSelectionStep.tsx

"use client";

import React, { useState, useEffect } from "react";
import { Dice6, RotateCcw, Calculator } from "lucide-react";
import {
  StepComponentProps,
  ATTRIBUTE_GENERATION_METHODS,
  STANDARD_ARRAY,
  calculateModifier,
  getPointBuyCost,
  isValidPointBuyScore,
} from "../types";
import { Attributes } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";

const ATTRIBUTE_NAMES: (keyof Attributes)[] = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
];

const ATTRIBUTE_LABELS: Record<keyof Attributes, string> = {
  strength: "Strength",
  dexterity: "Dexterity",
  constitution: "Constitution",
  intelligence: "Intelligence",
  wisdom: "Wisdom",
  charisma: "Charisma",
};

const ATTRIBUTE_DESCRIPTIONS: Record<keyof Attributes, string> = {
  strength: "Measures physical power, athletics, and carrying capacity",
  dexterity: "Measures agility, reflexes, and balance",
  constitution: "Measures health, stamina, and vital force",
  intelligence: "Measures reasoning ability, memory, and knowledge",
  wisdom: "Measures awareness, insight, and mental fortitude",
  charisma: "Measures force of personality and leadership ability",
};

export function AttributeSelectionStep({ data, onUpdate }: StepComponentProps) {
  const [rolledArrays, setRolledArrays] = useState<number[][]>([]);
  const [selectedRolledArray, setSelectedRolledArray] = useState<number | null>(
    null
  );
  const [draggedAttribute, setDraggedAttribute] = useState<
    keyof Attributes | null
  >(null);

  // Initialize point buy if needed
  useEffect(() => {
    if (
      data.attributeMethod === "pointBuy" &&
      data.pointBuyRemaining === undefined
    ) {
      // Start with base 8s and 27 points to spend
      const baseAttributes: Attributes = {
        strength: 8,
        dexterity: 8,
        constitution: 8,
        intelligence: 8,
        wisdom: 8,
        charisma: 8,
      };

      onUpdate({
        attributes: baseAttributes,
        pointBuyRemaining: 27,
      });
    }
  }, [data.attributeMethod, data.pointBuyRemaining, onUpdate]);

  const handleMethodChange = (
    method: "pointBuy" | "standardArray" | "rolled"
  ) => {
    if (method === "standardArray") {
      onUpdate({
        attributeMethod: method,
        attributes: { ...STANDARD_ARRAY },
        pointBuyRemaining: undefined,
      });
    } else if (method === "pointBuy") {
      const baseAttributes: Attributes = {
        strength: 8,
        dexterity: 8,
        constitution: 8,
        intelligence: 8,
        wisdom: 8,
        charisma: 8,
      };

      onUpdate({
        attributeMethod: method,
        attributes: baseAttributes,
        pointBuyRemaining: 27,
      });
    } else if (method === "rolled") {
      generateRolledArrays();
      onUpdate({
        attributeMethod: method,
        pointBuyRemaining: undefined,
      });
    }
  };

  const generateRolledArrays = () => {
    const arrays: number[][] = [];

    // Generate 3 different rolled arrays
    for (let i = 0; i < 3; i++) {
      const array: number[] = [];
      for (let j = 0; j < 6; j++) {
        // Roll 4d6, drop lowest
        const rolls = Array.from(
          { length: 4 },
          () => Math.floor(Math.random() * 6) + 1
        );
        rolls.sort((a, b) => b - a);
        array.push(rolls[0] + rolls[1] + rolls[2]);
      }
      arrays.push(array.sort((a, b) => b - a));
    }

    setRolledArrays(arrays);
    setSelectedRolledArray(null);
  };

  const handleRolledArraySelect = (arrayIndex: number) => {
    setSelectedRolledArray(arrayIndex);
    const selectedArray = rolledArrays[arrayIndex];

    // Assign highest scores to most important attributes typically
    const newAttributes: Attributes = {
      strength: selectedArray[0] || 8,
      dexterity: selectedArray[1] || 8,
      constitution: selectedArray[2] || 8,
      intelligence: selectedArray[3] || 8,
      wisdom: selectedArray[4] || 8,
      charisma: selectedArray[5] || 8,
    };

    onUpdate({ attributes: newAttributes });
  };

  const handlePointBuyChange = (
    attribute: keyof Attributes,
    newValue: number
  ) => {
    if (!isValidPointBuyScore(newValue) || data.attributeMethod !== "pointBuy")
      return;

    const currentValue = data.attributes[attribute];
    const currentCost = getPointBuyCost(currentValue);
    const newCost = getPointBuyCost(newValue);
    const costDifference = newCost - currentCost;

    const newRemaining = (data.pointBuyRemaining || 0) - costDifference;

    if (newRemaining < 0) return; // Can't afford this change

    onUpdate({
      attributes: {
        ...data.attributes,
        [attribute]: newValue,
      },
      pointBuyRemaining: newRemaining,
    });
  };

  const handleStandardArrayDrag = (
    draggedAttr: keyof Attributes,
    targetAttr: keyof Attributes
  ) => {
    if (data.attributeMethod !== "standardArray") return;

    const newAttributes = { ...data.attributes };
    const temp = newAttributes[draggedAttr];
    newAttributes[draggedAttr] = newAttributes[targetAttr];
    newAttributes[targetAttr] = temp;

    onUpdate({ attributes: newAttributes });
  };

  const applyRacialBonuses = (baseAttributes: Attributes): Attributes => {
    const result = { ...baseAttributes };

    if (data.race?.abilityScoreIncrease) {
      Object.entries(data.race.abilityScoreIncrease).forEach(
        ([attr, bonus]) => {
          if (bonus && attr in result) {
            result[attr as keyof Attributes] += bonus;
          }
        }
      );
    }

    if (data.subrace?.abilityScoreIncrease) {
      Object.entries(data.subrace.abilityScoreIncrease).forEach(
        ([attr, bonus]) => {
          if (bonus && attr in result) {
            result[attr as keyof Attributes] += bonus;
          }
        }
      );
    }

    return result;
  };

  const finalAttributes = applyRacialBonuses(data.attributes);

  return (
    <div className="space-y-6">
      {/* Method Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Choose Ability Score Generation Method</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={data.attributeMethod}
            onValueChange={handleMethodChange}
          >
            <div className="space-y-4">
              {ATTRIBUTE_GENERATION_METHODS.map((method) => (
                <div key={method.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={method.id} id={method.id} />
                  <Label htmlFor={method.id} className="flex-1">
                    <div className="font-medium">{method.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {method.description}
                    </div>
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Point Buy Interface */}
      {data.attributeMethod === "pointBuy" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Point Buy System
              <Badge variant="outline">
                {data.pointBuyRemaining || 0} points remaining
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  You have 27 points to spend. Scores start at 8 and cost points
                  to increase (8-13 costs 1 point each, 14 costs 2 points, 15
                  costs 2 points).
                </AlertDescription>
              </Alert>

              <div className="grid gap-4">
                {ATTRIBUTE_NAMES.map((attr) => (
                  <div
                    key={attr}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium">
                        {ATTRIBUTE_LABELS[attr]}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {ATTRIBUTE_DESCRIPTIONS[attr]}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handlePointBuyChange(
                              attr,
                              data.attributes[attr] - 1
                            )
                          }
                          disabled={data.attributes[attr] <= 8}
                        >
                          -
                        </Button>

                        <div className="text-center">
                          <div className="font-mono text-lg font-bold">
                            {data.attributes[attr]}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            (
                            {calculateModifier(finalAttributes[attr]) >= 0
                              ? "+"
                              : ""}
                            {calculateModifier(finalAttributes[attr])})
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handlePointBuyChange(
                              attr,
                              data.attributes[attr] + 1
                            )
                          }
                          disabled={
                            data.attributes[attr] >= 15 ||
                            (data.pointBuyRemaining || 0) <
                              getPointBuyCost(data.attributes[attr] + 1) -
                                getPointBuyCost(data.attributes[attr])
                          }
                        >
                          +
                        </Button>
                      </div>

                      <div className="text-sm text-muted-foreground w-16">
                        Cost: {getPointBuyCost(data.attributes[attr])}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Standard Array Interface */}
      {data.attributeMethod === "standardArray" && (
        <Card>
          <CardHeader>
            <CardTitle>Standard Array Assignment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  Assign the standard scores (15, 14, 13, 12, 10, 8) to your
                  abilities. Drag and drop to rearrange.
                </AlertDescription>
              </Alert>

              <div className="grid gap-4">
                {ATTRIBUTE_NAMES.map((attr) => (
                  <div
                    key={attr}
                    className="flex items-center justify-between p-4 border rounded-lg cursor-move hover:bg-muted/50"
                    draggable
                    onDragStart={() => setDraggedAttribute(attr)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedAttribute && draggedAttribute !== attr) {
                        handleStandardArrayDrag(draggedAttribute, attr);
                      }
                      setDraggedAttribute(null);
                    }}
                  >
                    <div className="flex-1">
                      <div className="font-medium">
                        {ATTRIBUTE_LABELS[attr]}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {ATTRIBUTE_DESCRIPTIONS[attr]}
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="font-mono text-lg font-bold">
                        {data.attributes[attr]}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        (
                        {calculateModifier(finalAttributes[attr]) >= 0
                          ? "+"
                          : ""}
                        {calculateModifier(finalAttributes[attr])})
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rolled Arrays Interface */}
      {data.attributeMethod === "rolled" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dice6 className="h-5 w-5" />
              Rolled Ability Scores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={generateRolledArrays}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Roll New Arrays
                </Button>
                <Badge variant="outline">4d6 drop lowest, 6 times</Badge>
              </div>

              {rolledArrays.length > 0 && (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Choose one of the rolled arrays below:
                  </div>

                  {rolledArrays.map((array, index) => (
                    <Card
                      key={index}
                      className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                        selectedRolledArray === index
                          ? "ring-2 ring-primary"
                          : ""
                      }`}
                      onClick={() => handleRolledArraySelect(index)}
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-4">
                          <div className="font-medium">Array {index + 1}:</div>
                          <div className="flex gap-2">
                            {array.map((score, scoreIndex) => (
                              <Badge
                                key={scoreIndex}
                                variant="outline"
                                className="font-mono"
                              >
                                {score}
                              </Badge>
                            ))}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Total:{" "}
                            {array.reduce((sum, score) => sum + score, 0)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Final Attributes Display */}
      <Card>
        <CardHeader>
          <CardTitle>Final Ability Scores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {ATTRIBUTE_NAMES.map((attr) => (
              <div key={attr} className="text-center p-4 border rounded-lg">
                <div className="font-medium text-sm">
                  {ATTRIBUTE_LABELS[attr]}
                </div>
                <div className="font-mono text-2xl font-bold">
                  {finalAttributes[attr]}
                </div>
                <div className="text-sm text-muted-foreground">
                  ({calculateModifier(finalAttributes[attr]) >= 0 ? "+" : ""}
                  {calculateModifier(finalAttributes[attr])})
                </div>
                {finalAttributes[attr] !== data.attributes[attr] && (
                  <div className="text-xs text-primary mt-1">
                    Base: {data.attributes[attr]} + Racial:{" "}
                    {finalAttributes[attr] - data.attributes[attr]}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Racial Bonuses Summary */}
          {(data.race || data.subrace) && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Racial Bonuses Applied</h4>
              <div className="text-sm space-y-1">
                {data.race &&
                  Object.entries(data.race.abilityScoreIncrease).map(
                    ([attr, bonus]) =>
                      bonus && (
                        <div key={attr}>
                          {data.race!.name}: +{bonus}{" "}
                          {ATTRIBUTE_LABELS[attr as keyof Attributes]}
                        </div>
                      )
                  )}
                {data.subrace &&
                  Object.entries(data.subrace.abilityScoreIncrease).map(
                    ([attr, bonus]) =>
                      bonus && (
                        <div key={attr}>
                          {data.subrace!.name}: +{bonus}{" "}
                          {ATTRIBUTE_LABELS[attr as keyof Attributes]}
                        </div>
                      )
                  )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
