// src/components/npc/forms/NPCStatsEditor.tsx

"use client";

import React, { useState, useCallback } from "react";
import { Calculator, Plus, X, Shield, Heart, Zap } from "lucide-react";
import {
  NPCStatsEditorProps,
  CREATURE_TYPES,
  CREATURE_SIZES,
  CHALLENGE_RATINGS,
  DAMAGE_TYPES,
  CONDITIONS,
} from "../types";
import { NPCStats } from "@/lib/types";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";

export function NPCStatsEditor({
  stats,
  onChange,
  isReadOnly = false,
  showCalculator = false,
}: NPCStatsEditorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleStatChange = useCallback(
    (field: keyof NPCStats, value: any) => {
      onChange({
        ...stats,
        [field]: value,
      });
    },
    [stats, onChange]
  );

  const handleAttributeChange = useCallback(
    (attribute: keyof NPCStats["attributes"], value: number) => {
      onChange({
        ...stats,
        attributes: {
          ...stats.attributes,
          [attribute]: Math.max(1, Math.min(30, value)),
        },
      });
    },
    [stats, onChange]
  );

  const handleHPChange = useCallback(
    (field: "current" | "max", value: number) => {
      onChange({
        ...stats,
        hp: {
          ...stats.hp,
          [field]: Math.max(1, value),
        },
      });
    },
    [stats, onChange]
  );

  const handleArrayFieldChange = useCallback(
    (field: keyof NPCStats, values: string[]) => {
      onChange({
        ...stats,
        [field]: values,
      });
    },
    [stats, onChange]
  );

  const addToArrayField = useCallback(
    (field: keyof NPCStats, value: string) => {
      const currentArray = (stats[field] as string[]) || [];
      if (!currentArray.includes(value)) {
        handleArrayFieldChange(field, [...currentArray, value]);
      }
    },
    [stats, handleArrayFieldChange]
  );

  const removeFromArrayField = useCallback(
    (field: keyof NPCStats, value: string) => {
      const currentArray = (stats[field] as string[]) || [];
      handleArrayFieldChange(
        field,
        currentArray.filter((item) => item !== value)
      );
    },
    [stats, handleArrayFieldChange]
  );

  const calculateModifier = (score: number): number => {
    return Math.floor((score - 10) / 2);
  };

  const formatModifier = (modifier: number): string => {
    return modifier >= 0 ? `+${modifier}` : `${modifier}`;
  };

  return (
    <div className="space-y-6">
      {/* Core Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Core Statistics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ac">Armor Class</Label>
              <Input
                id="ac"
                type="number"
                value={stats.ac}
                onChange={(e) =>
                  handleStatChange("ac", parseInt(e.target.value) || 10)
                }
                min={1}
                max={30}
                disabled={isReadOnly}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="speed">Speed (ft)</Label>
              <Input
                id="speed"
                type="number"
                value={stats.speed}
                onChange={(e) =>
                  handleStatChange("speed", parseInt(e.target.value) || 30)
                }
                min={0}
                disabled={isReadOnly}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cr">Challenge Rating</Label>
              <Select
                value={stats.challenge_rating}
                onValueChange={(value) =>
                  handleStatChange("challenge_rating", value)
                }
                disabled={isReadOnly}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHALLENGE_RATINGS.map((cr) => (
                    <SelectItem key={cr} value={cr}>
                      CR {cr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Hit Points */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Hit Points
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hp-current">Current HP</Label>
                <Input
                  id="hp-current"
                  type="number"
                  value={stats.hp.current}
                  onChange={(e) =>
                    handleHPChange("current", parseInt(e.target.value) || 1)
                  }
                  min={0}
                  max={stats.hp.max}
                  disabled={isReadOnly}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hp-max">Maximum HP</Label>
                <Input
                  id="hp-max"
                  type="number"
                  value={stats.hp.max}
                  onChange={(e) =>
                    handleHPChange("max", parseInt(e.target.value) || 1)
                  }
                  min={1}
                  disabled={isReadOnly}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ability Scores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Ability Scores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(stats.attributes).map(([attribute, score]) => {
              const modifier = calculateModifier(score);
              return (
                <div key={attribute} className="space-y-2">
                  <Label htmlFor={attribute}>
                    {attribute.charAt(0).toUpperCase() + attribute.slice(1)}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id={attribute}
                      type="number"
                      value={score}
                      onChange={(e) =>
                        handleAttributeChange(
                          attribute as keyof NPCStats["attributes"],
                          parseInt(e.target.value) || 10
                        )
                      }
                      min={1}
                      max={30}
                      className="w-20"
                      disabled={isReadOnly}
                    />
                    <Badge variant="outline" className="text-xs">
                      {formatModifier(modifier)}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Advanced Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Advanced Statistics
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? "Hide" : "Show"}
            </Button>
          </CardTitle>
        </CardHeader>
        {showAdvanced && (
          <CardContent className="space-y-6">
            {/* Saving Throws */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">
                Saving Throw Proficiencies
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.keys(stats.attributes).map((attribute) => (
                  <div key={attribute} className="flex items-center space-x-2">
                    <Checkbox
                      id={`save-${attribute}`}
                      checked={stats.saving_throws?.[attribute] !== undefined}
                      onCheckedChange={(checked) => {
                        const newSaves = { ...(stats.saving_throws || {}) };
                        if (checked) {
                          const modifier = calculateModifier(
                            stats.attributes[
                              attribute as keyof typeof stats.attributes
                            ]
                          );
                          newSaves[attribute] = modifier + 2; // +2 proficiency bonus for CR 0-4
                        } else {
                          delete newSaves[attribute];
                        }
                        handleStatChange("saving_throws", newSaves);
                      }}
                      disabled={isReadOnly}
                    />
                    <Label htmlFor={`save-${attribute}`} className="text-sm">
                      {attribute.charAt(0).toUpperCase() + attribute.slice(1)}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Damage Resistances */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Damage Resistances</h4>
              <div className="flex flex-wrap gap-2 mb-2">
                {stats.damage_resistances.map((resistance) => (
                  <Badge
                    key={resistance}
                    variant="secondary"
                    className="text-xs"
                  >
                    {resistance}
                    {!isReadOnly && (
                      <button
                        onClick={() =>
                          removeFromArrayField("damage_resistances", resistance)
                        }
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
              {!isReadOnly && (
                <Select
                  onValueChange={(value) =>
                    addToArrayField("damage_resistances", value)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Add damage resistance" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAMAGE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <Separator />

            {/* Damage Immunities */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Damage Immunities</h4>
              <div className="flex flex-wrap gap-2 mb-2">
                {stats.damage_immunities.map((immunity) => (
                  <Badge key={immunity} variant="default" className="text-xs">
                    {immunity}
                    {!isReadOnly && (
                      <button
                        onClick={() =>
                          removeFromArrayField("damage_immunities", immunity)
                        }
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
              {!isReadOnly && (
                <Select
                  onValueChange={(value) =>
                    addToArrayField("damage_immunities", value)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Add damage immunity" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAMAGE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <Separator />

            {/* Condition Immunities */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Condition Immunities</h4>
              <div className="flex flex-wrap gap-2 mb-2">
                {stats.condition_immunities.map((condition) => (
                  <Badge key={condition} variant="outline" className="text-xs">
                    {condition}
                    {!isReadOnly && (
                      <button
                        onClick={() =>
                          removeFromArrayField(
                            "condition_immunities",
                            condition
                          )
                        }
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
              {!isReadOnly && (
                <Select
                  onValueChange={(value) =>
                    addToArrayField("condition_immunities", value)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Add condition immunity" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map((condition) => (
                      <SelectItem key={condition} value={condition}>
                        {condition}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <Separator />

            {/* Languages */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Languages</h4>
              <div className="flex flex-wrap gap-2 mb-2">
                {stats.languages.map((language) => (
                  <Badge key={language} variant="secondary" className="text-xs">
                    {language}
                    {!isReadOnly && (
                      <button
                        onClick={() =>
                          removeFromArrayField("languages", language)
                        }
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
              {!isReadOnly && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Add language"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        const value = (
                          e.target as HTMLInputElement
                        ).value.trim();
                        if (value) {
                          addToArrayField("languages", value);
                          (e.target as HTMLInputElement).value = "";
                        }
                      }
                    }}
                  />
                </div>
              )}
            </div>

            <Separator />

            {/* Senses */}
            <div className="space-y-2">
              <Label htmlFor="senses">Senses</Label>
              <Input
                id="senses"
                value={stats.senses || ""}
                onChange={(e) => handleStatChange("senses", e.target.value)}
                placeholder="e.g., darkvision 60 ft., passive Perception 12"
                disabled={isReadOnly}
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* CR Calculator */}
      {showCalculator && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Challenge Rating Calculator
            </CardTitle>
            <CardDescription>
              Estimated CR based on current statistics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-2xl font-bold">
                CR {stats.challenge_rating}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Current Challenge Rating
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
