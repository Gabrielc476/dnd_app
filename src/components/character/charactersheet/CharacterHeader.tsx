// src/components/character/CharacterHeader.tsx
"use client";

import React, { useState } from "react";
import { Character } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Edit3, Save, X, User, Award, Star } from "lucide-react";
import { formatModifier } from "@/lib/utils";

interface CharacterHeaderProps {
  character: Character;
  campaignId: string;
  userId: string;
  isReadOnly?: boolean;
  onUpdate?: (updates: Partial<Character>) => Promise<boolean>;
  isEditing?: boolean;
  onStartEditing?: () => void;
  onStopEditing?: () => void;
}

export function CharacterHeader({
  character,
  campaignId,
  userId,
  isReadOnly = false,
  onUpdate,
  isEditing = false,
  onStartEditing,
  onStopEditing,
}: CharacterHeaderProps) {
  const [editValues, setEditValues] = useState({
    name: character.name,
    race: character.race,
    class: character.class,
    level: character.level,
    background: character.background || "",
    alignment: character.alignment || "",
    experience_points: character.experience_points,
  });

  const handleSave = async () => {
    if (onUpdate) {
      const success = await onUpdate(editValues);
      if (success) {
        onStopEditing?.();
      }
    }
  };

  const handleCancel = () => {
    setEditValues({
      name: character.name,
      race: character.race,
      class: character.class,
      level: character.level,
      background: character.background || "",
      alignment: character.alignment || "",
      experience_points: character.experience_points,
    });
    onStopEditing?.();
  };

  const toggleInspiration = async () => {
    if (onUpdate) {
      await onUpdate({ inspiration: !character.inspiration });
    }
  };

  const proficiencyBonus = Math.floor((character.level - 1) / 4) + 2;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Character Details
          </CardTitle>
          {!isReadOnly && !isEditing && (
            <Button variant="outline" size="sm" onClick={onStartEditing}>
              <Edit3 className="h-4 w-4" />
            </Button>
          )}
          {isEditing && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSave}>
                <Save className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleCancel}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Character Name */}
        <div className="text-center">
          {isEditing ? (
            <Input
              value={editValues.name}
              onChange={(e) =>
                setEditValues({ ...editValues, name: e.target.value })
              }
              className="text-2xl font-bold text-center"
              placeholder="Character Name"
            />
          ) : (
            <h1 className="text-2xl font-bold">{character.name}</h1>
          )}
        </div>

        {/* Basic Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Level */}
          <div className="text-center">
            <label className="text-sm font-medium text-muted-foreground">
              Level
            </label>
            {isEditing ? (
              <Input
                type="number"
                min="1"
                max="20"
                value={editValues.level}
                onChange={(e) =>
                  setEditValues({
                    ...editValues,
                    level: parseInt(e.target.value) || 1,
                  })
                }
                className="text-center"
              />
            ) : (
              <div className="text-2xl font-bold">{character.level}</div>
            )}
          </div>

          {/* Race */}
          <div className="text-center">
            <label className="text-sm font-medium text-muted-foreground">
              Race
            </label>
            {isEditing ? (
              <Input
                value={editValues.race}
                onChange={(e) =>
                  setEditValues({ ...editValues, race: e.target.value })
                }
                className="text-center"
                placeholder="Race"
              />
            ) : (
              <div className="text-lg font-medium">{character.race}</div>
            )}
          </div>

          {/* Class */}
          <div className="text-center">
            <label className="text-sm font-medium text-muted-foreground">
              Class
            </label>
            {isEditing ? (
              <Input
                value={editValues.class}
                onChange={(e) =>
                  setEditValues({ ...editValues, class: e.target.value })
                }
                className="text-center"
                placeholder="Class"
              />
            ) : (
              <div className="text-lg font-medium">{character.class}</div>
            )}
          </div>

          {/* Proficiency Bonus */}
          <div className="text-center">
            <label className="text-sm font-medium text-muted-foreground">
              Proficiency
            </label>
            <div className="text-2xl font-bold">
              {formatModifier(proficiencyBonus)}
            </div>
          </div>
        </div>

        {/* Secondary Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Background */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Background
            </label>
            {isEditing ? (
              <Input
                value={editValues.background}
                onChange={(e) =>
                  setEditValues({ ...editValues, background: e.target.value })
                }
                placeholder="Background"
              />
            ) : (
              <div className="text-sm">{character.background || "None"}</div>
            )}
          </div>

          {/* Alignment */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Alignment
            </label>
            {isEditing ? (
              <Select
                value={editValues.alignment}
                onValueChange={(value) =>
                  setEditValues({ ...editValues, alignment: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select alignment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Lawful Good">Lawful Good</SelectItem>
                  <SelectItem value="Neutral Good">Neutral Good</SelectItem>
                  <SelectItem value="Chaotic Good">Chaotic Good</SelectItem>
                  <SelectItem value="Lawful Neutral">Lawful Neutral</SelectItem>
                  <SelectItem value="True Neutral">True Neutral</SelectItem>
                  <SelectItem value="Chaotic Neutral">
                    Chaotic Neutral
                  </SelectItem>
                  <SelectItem value="Lawful Evil">Lawful Evil</SelectItem>
                  <SelectItem value="Neutral Evil">Neutral Evil</SelectItem>
                  <SelectItem value="Chaotic Evil">Chaotic Evil</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="text-sm">{character.alignment || "None"}</div>
            )}
          </div>

          {/* Experience Points */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Experience
            </label>
            {isEditing ? (
              <Input
                type="number"
                min="0"
                value={editValues.experience_points}
                onChange={(e) =>
                  setEditValues({
                    ...editValues,
                    experience_points: parseInt(e.target.value) || 0,
                  })
                }
              />
            ) : (
              <div className="text-sm">
                {character.experience_points.toLocaleString()} XP
              </div>
            )}
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap gap-2 justify-center">
          {/* Inspiration */}
          <Button
            variant={character.inspiration ? "default" : "outline"}
            size="sm"
            onClick={toggleInspiration}
            disabled={isReadOnly}
            className="flex items-center gap-1"
          >
            <Star
              className={`h-4 w-4 ${
                character.inspiration ? "fill-current" : ""
              }`}
            />
            Inspiration
          </Button>

          {/* Level Badge */}
          <Badge variant="secondary" className="flex items-center gap-1">
            <Award className="h-3 w-3" />
            Level {character.level}
          </Badge>

          {/* Proficiency Badge */}
          <Badge variant="outline">
            Proficiency {formatModifier(proficiencyBonus)}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
