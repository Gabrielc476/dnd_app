// src/components/character/CharacterSkills.tsx
"use client";

import React, { useState } from "react";
import { Character, Proficiency } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Brain, Dice6, Edit3, Save, X, Star } from "lucide-react";
import { formatModifier, getProficiencyBonus } from "@/lib/utils";

interface CharacterSkillsProps {
  character: Character;
  campaignId: string;
  userId: string;
  isReadOnly?: boolean;
  onUpdate?: (updates: Partial<Character>) => Promise<boolean>;
  onRollDice?: (type: string, formula: string) => void;
  isEditing?: boolean;
  onStartEditing?: () => void;
}

interface SkillInfo {
  name: string;
  attribute: keyof Character["attributes"];
  proficient: boolean;
  expertise: boolean;
  modifier: number;
  total: number;
}

const SKILLS: Array<{
  name: string;
  attribute: keyof Character["attributes"];
}> = [
  { name: "Acrobatics", attribute: "dexterity" },
  { name: "Animal Handling", attribute: "wisdom" },
  { name: "Arcana", attribute: "intelligence" },
  { name: "Athletics", attribute: "strength" },
  { name: "Deception", attribute: "charisma" },
  { name: "History", attribute: "intelligence" },
  { name: "Insight", attribute: "wisdom" },
  { name: "Intimidation", attribute: "charisma" },
  { name: "Investigation", attribute: "intelligence" },
  { name: "Medicine", attribute: "wisdom" },
  { name: "Nature", attribute: "intelligence" },
  { name: "Perception", attribute: "wisdom" },
  { name: "Performance", attribute: "charisma" },
  { name: "Persuasion", attribute: "charisma" },
  { name: "Religion", attribute: "intelligence" },
  { name: "Sleight of Hand", attribute: "dexterity" },
  { name: "Stealth", attribute: "dexterity" },
  { name: "Survival", attribute: "wisdom" },
];

export function CharacterSkills({
  character,
  campaignId,
  userId,
  isReadOnly = false,
  onUpdate,
  onRollDice,
  isEditing = false,
  onStartEditing,
}: CharacterSkillsProps) {
  const [editingProficiencies, setEditingProficiencies] = useState(
    character.proficiencies
  );

  const proficiencyBonus = getProficiencyBonus(character.level);

  const getSkillInfo = (skillName: string): SkillInfo => {
    const skill = SKILLS.find((s) => s.name === skillName)!;
    const attributeValue = character.attributes[skill.attribute];
    const attributeModifier = Math.floor((attributeValue - 10) / 2);

    const skillProficiency = character.proficiencies.find(
      (p) => p.type === "skill" && p.name === skillName
    );

    const proficient = !!skillProficiency;
    const expertise = skillProficiency?.expertise || false;

    let total = attributeModifier;
    if (proficient) {
      total += proficiencyBonus;
      if (expertise) {
        total += proficiencyBonus; // Double proficiency for expertise
      }
    }

    return {
      name: skillName,
      attribute: skill.attribute,
      proficient,
      expertise,
      modifier: attributeModifier,
      total,
    };
  };

  const handleSave = async () => {
    if (onUpdate) {
      await onUpdate({ proficiencies: editingProficiencies });
    }
  };

  const handleCancel = () => {
    setEditingProficiencies(character.proficiencies);
  };

  const toggleSkillProficiency = (skillName: string) => {
    const existingIndex = editingProficiencies.findIndex(
      (p) => p.type === "skill" && p.name === skillName
    );

    if (existingIndex >= 0) {
      // Remove proficiency
      setEditingProficiencies((prev) =>
        prev.filter((_, i) => i !== existingIndex)
      );
    } else {
      // Add proficiency
      setEditingProficiencies((prev) => [
        ...prev,
        { name: skillName, type: "skill", expertise: false },
      ]);
    }
  };

  const toggleSkillExpertise = (skillName: string) => {
    setEditingProficiencies((prev) =>
      prev.map((p) =>
        p.type === "skill" && p.name === skillName
          ? { ...p, expertise: !p.expertise }
          : p
      )
    );
  };

  const rollSkill = (skillInfo: SkillInfo) => {
    if (onRollDice) {
      onRollDice(`${skillInfo.name} Check`, "1d20");
    }
  };

  // Get other proficiencies (tools, languages, weapons, armor)
  const otherProficiencies = character.proficiencies.filter(
    (p) => !["skill", "saving_throw"].includes(p.type)
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Skills & Proficiencies
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

      <CardContent>
        <ScrollArea className="h-80">
          <div className="space-y-2">
            {SKILLS.map((skill) => {
              const skillInfo = getSkillInfo(skill.name);
              const editingProficiency = editingProficiencies.find(
                (p) => p.type === "skill" && p.name === skill.name
              );
              const editingProficient = !!editingProficiency;
              const editingExpertise = editingProficiency?.expertise || false;

              return (
                <div
                  key={skill.name}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={editingProficient}
                          onCheckedChange={() =>
                            toggleSkillProficiency(skill.name)
                          }
                        />
                        {editingProficient && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant={
                                  editingExpertise ? "default" : "outline"
                                }
                                size="sm"
                                onClick={() => toggleSkillExpertise(skill.name)}
                                className="w-6 h-6 p-0"
                              >
                                <Star className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Expertise (Double Proficiency)</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    ) : (
                      <div className="w-6 flex justify-center">
                        {skillInfo.proficient && (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-primary rounded-full" />
                            {skillInfo.expertise && (
                              <Star className="h-3 w-3 fill-current text-yellow-500" />
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex-1">
                      <div className="font-medium">{skill.name}</div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {skill.attribute.slice(0, 3)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono w-8 text-right">
                      {formatModifier(skillInfo.total)}
                    </span>
                    {!isReadOnly && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => rollSkill(skillInfo)}
                        className="w-8 h-8 p-0"
                      >
                        <Dice6 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Other Proficiencies */}
        {otherProficiencies.length > 0 && (
          <>
            <Separator className="my-4" />
            <div>
              <h4 className="text-sm font-medium mb-2">Other Proficiencies</h4>
              <div className="flex flex-wrap gap-1">
                {otherProficiencies.map((prof, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {prof.name}
                    <span className="ml-1 text-muted-foreground">
                      ({prof.type.replace("_", " ")})
                    </span>
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Passive Perception */}
        <Separator className="my-4" />
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Passive Perception</span>
          <span className="text-lg font-bold">
            {10 + getSkillInfo("Perception").total}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
