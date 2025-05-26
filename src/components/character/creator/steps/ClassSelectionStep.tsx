// src/components/character/creator/steps/ClassSelectionStep.tsx

"use client";

import React, { useState } from "react";
import { Search, Sword, Wand2, Shield, Heart } from "lucide-react";
import { StepComponentProps, CharacterClass } from "../types";
import { calculateModifier } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

// Mock class data - in a real app, this would come from an API or database
const AVAILABLE_CLASSES: CharacterClass[] = [
  {
    id: "fighter",
    name: "Fighter",
    description:
      "Masters of martial combat, skilled with a variety of weapons and armor.",
    hitDie: 10,
    primaryAbility: ["strength", "dexterity"],
    savingThrowProficiencies: ["strength", "constitution"],
    skillProficiencies: {
      choose: 2,
      from: [
        "Acrobatics",
        "Animal Handling",
        "Athletics",
        "History",
        "Insight",
        "Intimidation",
        "Perception",
        "Survival",
      ],
    },
    proficiencies: {
      armor: ["All armor", "shields"],
      weapons: ["Simple weapons", "martial weapons"],
      tools: [],
    },
    equipment: [
      {
        category: "Armor",
        options: [
          { name: "Chain mail", items: ["Chain mail"] },
          {
            name: "Leather armor + explorer's pack",
            items: ["Leather armor", "Longbow", "20 arrows"],
          },
        ],
      },
      {
        category: "Primary Weapon",
        options: [
          {
            name: "Martial weapon + shield",
            items: ["Any martial weapon", "Shield"],
          },
          {
            name: "Two martial weapons",
            items: ["Any martial weapon", "Any martial weapon"],
          },
        ],
      },
    ],
    features: [
      {
        name: "Fighting Style",
        level: 1,
        description:
          "You adopt a particular style of fighting as your specialty.",
      },
      {
        name: "Second Wind",
        level: 1,
        description:
          "You can use a bonus action to regain hit points equal to 1d10 + your fighter level.",
      },
    ],
  },
  {
    id: "wizard",
    name: "Wizard",
    description:
      "Scholarly magic-users capable of manipulating the structures of reality.",
    hitDie: 6,
    primaryAbility: ["intelligence"],
    savingThrowProficiencies: ["intelligence", "wisdom"],
    skillProficiencies: {
      choose: 2,
      from: [
        "Arcana",
        "History",
        "Insight",
        "Investigation",
        "Medicine",
        "Religion",
      ],
    },
    proficiencies: {
      armor: [],
      weapons: [
        "Daggers",
        "darts",
        "slings",
        "quarterstaffs",
        "light crossbows",
      ],
      tools: [],
    },
    spellcasting: {
      ability: "intelligence",
      ritual: true,
      spellcastingFocus: "Arcane Focus",
      cantripsKnown: [
        3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5,
      ],
      spellsKnown: [
        6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40,
        42, 44,
      ],
      spellSlots: [
        { "1": 2 },
        { "1": 3 },
        { "1": 4, "2": 2 },
        { "1": 4, "2": 3 },
        { "1": 4, "2": 3, "3": 2 },
      ],
    },
    equipment: [
      {
        category: "Weapon",
        options: [
          { name: "Quarterstaff", items: ["Quarterstaff"] },
          { name: "Dagger", items: ["Dagger"] },
        ],
      },
      {
        category: "Equipment Pack",
        options: [
          {
            name: "Explorer's pack",
            items: [
              "Backpack",
              "Bedroll",
              "Mess kit",
              "Tinderbox",
              "10 torches",
              "10 days of rations",
              "Waterskin",
              "50 feet of hempen rope",
            ],
          },
        ],
      },
    ],
    features: [
      {
        name: "Spellcasting",
        level: 1,
        description:
          "You can cast wizard spells using Intelligence as your spellcasting ability.",
      },
      {
        name: "Arcane Recovery",
        level: 1,
        description:
          "You can recover some expended spell slots during a short rest.",
      },
    ],
  },
  {
    id: "rogue",
    name: "Rogue",
    description:
      "Scoundrels who use stealth and trickery to overcome obstacles.",
    hitDie: 8,
    primaryAbility: ["dexterity"],
    savingThrowProficiencies: ["dexterity", "intelligence"],
    skillProficiencies: {
      choose: 4,
      from: [
        "Acrobatics",
        "Athletics",
        "Deception",
        "Insight",
        "Intimidation",
        "Investigation",
        "Perception",
        "Performance",
        "Persuasion",
        "Sleight of Hand",
        "Stealth",
      ],
    },
    proficiencies: {
      armor: ["Light armor"],
      weapons: [
        "Simple weapons",
        "hand crossbows",
        "longswords",
        "rapiers",
        "shortswords",
      ],
      tools: ["Thieves' tools"],
    },
    equipment: [
      {
        category: "Armor",
        options: [
          {
            name: "Leather armor",
            items: ["Leather armor", "Two daggers", "Thieves' tools"],
          },
        ],
      },
      {
        category: "Primary Weapon",
        options: [
          { name: "Rapier", items: ["Rapier"] },
          { name: "Shortsword", items: ["Shortsword"] },
        ],
      },
    ],
    features: [
      {
        name: "Expertise",
        level: 1,
        description:
          "Choose two skills you're proficient in. Your proficiency bonus is doubled for ability checks using those skills.",
      },
      {
        name: "Sneak Attack",
        level: 1,
        description:
          "Once per turn, you can deal extra damage when you hit with a finesse or ranged weapon under certain conditions.",
      },
      {
        name: "Thieves' Cant",
        level: 1,
        description:
          "You know thieves' cant, a secret mix of dialect, jargon, and code.",
      },
    ],
  },
  {
    id: "cleric",
    name: "Cleric",
    description:
      "Divine spellcasters who serve deities and channel divine magic.",
    hitDie: 8,
    primaryAbility: ["wisdom"],
    savingThrowProficiencies: ["wisdom", "charisma"],
    skillProficiencies: {
      choose: 2,
      from: ["History", "Insight", "Medicine", "Persuasion", "Religion"],
    },
    proficiencies: {
      armor: ["Light armor", "medium armor", "shields"],
      weapons: ["Simple weapons"],
      tools: [],
    },
    spellcasting: {
      ability: "wisdom",
      ritual: true,
      spellcastingFocus: "Holy Symbol",
      cantripsKnown: [
        3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5,
      ],
      spellSlots: [
        { "1": 2 },
        { "1": 3 },
        { "1": 4, "2": 2 },
        { "1": 4, "2": 3 },
        { "1": 4, "2": 3, "3": 2 },
      ],
    },
    equipment: [
      {
        category: "Armor & Shield",
        options: [
          { name: "Scale mail + shield", items: ["Scale mail", "Shield"] },
          { name: "Leather armor", items: ["Leather armor"] },
        ],
      },
      {
        category: "Primary Weapon",
        options: [
          { name: "Mace", items: ["Mace"] },
          { name: "Warhammer", items: ["Warhammer"] },
        ],
      },
    ],
    features: [
      {
        name: "Spellcasting",
        level: 1,
        description:
          "You can cast cleric spells using Wisdom as your spellcasting ability.",
      },
      {
        name: "Divine Domain",
        level: 1,
        description:
          "Choose a domain that grants you domain spells and other features.",
      },
    ],
  },
];

export function ClassSelectionStep({ data, onUpdate }: StepComponentProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState<CharacterClass | null>(
    data.characterClass
  );

  const filteredClasses = AVAILABLE_CLASSES.filter(
    (cls) =>
      cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleClassSelect = (characterClass: CharacterClass) => {
    setSelectedClass(characterClass);

    // Calculate hit points (max HP at level 1)
    const conModifier = calculateModifier(data.attributes.constitution);
    const hitPoints = characterClass.hitDie + conModifier;

    onUpdate({
      characterClass,
      hitPoints: Math.max(1, hitPoints), // Minimum 1 HP
    });
  };

  const getClassIcon = (className: string) => {
    switch (className.toLowerCase()) {
      case "fighter":
        return <Sword className="h-5 w-5" />;
      case "wizard":
        return <Wand2 className="h-5 w-5" />;
      case "cleric":
        return <Shield className="h-5 w-5" />;
      case "rogue":
        return <Heart className="h-5 w-5" />;
      default:
        return <Sword className="h-5 w-5" />;
    }
  };

  const formatAbilities = (abilities: string[]) => {
    return abilities
      .map((ability) => ability.charAt(0).toUpperCase() + ability.slice(1))
      .join(" or ");
  };

  const calculateSuitability = (characterClass: CharacterClass) => {
    let score = 0;
    let maxScore = characterClass.primaryAbility.length;

    characterClass.primaryAbility.forEach((ability) => {
      const abilityScore = data.attributes[ability];
      if (abilityScore >= 15) score += 1;
      else if (abilityScore >= 13) score += 0.7;
      else if (abilityScore >= 10) score += 0.3;
    });

    return Math.round((score / maxScore) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search classes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Class Selection */}
      <div className="grid gap-4">
        {filteredClasses.map((characterClass) => {
          const suitability = calculateSuitability(characterClass);

          return (
            <Card
              key={characterClass.id}
              className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                selectedClass?.id === characterClass.id
                  ? "ring-2 ring-primary"
                  : ""
              }`}
              onClick={() => handleClassSelect(characterClass)}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getClassIcon(characterClass.name)}
                    <span>{characterClass.name}</span>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">d{characterClass.hitDie} HP</Badge>
                    <Badge
                      variant={
                        suitability >= 70
                          ? "default"
                          : suitability >= 40
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {suitability}% match
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  {characterClass.description}
                </p>

                <div className="space-y-4">
                  {/* Primary Abilities */}
                  <div>
                    <h4 className="font-medium mb-2">Primary Ability</h4>
                    <p className="text-sm text-muted-foreground">
                      {formatAbilities(characterClass.primaryAbility)}
                    </p>
                    <div className="mt-2 space-y-1">
                      {characterClass.primaryAbility.map((ability) => {
                        const score = data.attributes[ability];
                        const modifier = calculateModifier(score);
                        return (
                          <div
                            key={ability}
                            className="flex justify-between text-sm"
                          >
                            <span className="capitalize">{ability}:</span>
                            <span
                              className={
                                score >= 13
                                  ? "text-green-600"
                                  : score >= 10
                                  ? "text-yellow-600"
                                  : "text-red-600"
                              }
                            >
                              {score} ({modifier >= 0 ? "+" : ""}
                              {modifier})
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <Separator />

                  {/* Proficiencies */}
                  <div>
                    <h4 className="font-medium mb-2">Proficiencies</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Saving Throws:</span>{" "}
                        <span className="text-muted-foreground">
                          {characterClass.savingThrowProficiencies
                            .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
                            .join(", ")}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Skills:</span>{" "}
                        <span className="text-muted-foreground">
                          Choose {characterClass.skillProficiencies.choose} from{" "}
                          {characterClass.skillProficiencies.from.length}{" "}
                          options
                        </span>
                      </div>
                      {characterClass.proficiencies.armor.length > 0 && (
                        <div>
                          <span className="font-medium">Armor:</span>{" "}
                          <span className="text-muted-foreground">
                            {characterClass.proficiencies.armor.join(", ")}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Weapons:</span>{" "}
                        <span className="text-muted-foreground">
                          {characterClass.proficiencies.weapons.join(", ")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Starting Features */}
                  <div>
                    <h4 className="font-medium mb-2">Starting Features</h4>
                    <div className="space-y-2">
                      {characterClass.features
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

                  {/* Spellcasting Info */}
                  {characterClass.spellcasting && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-medium mb-2">Spellcasting</h4>
                        <div className="text-sm space-y-1">
                          <div>
                            <span className="font-medium">Ability:</span>{" "}
                            <span className="text-muted-foreground capitalize">
                              {characterClass.spellcasting.ability} (
                              {
                                data.attributes[
                                  characterClass.spellcasting.ability
                                ]
                              }
                              /{" "}
                              {calculateModifier(
                                data.attributes[
                                  characterClass.spellcasting.ability
                                ]
                              ) >= 0
                                ? "+"
                                : ""}
                              {calculateModifier(
                                data.attributes[
                                  characterClass.spellcasting.ability
                                ]
                              )}
                              )
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">Cantrips:</span>{" "}
                            <span className="text-muted-foreground">
                              {characterClass.spellcasting.cantripsKnown[0]}{" "}
                              known at 1st level
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">
                              1st Level Spells:
                            </span>{" "}
                            <span className="text-muted-foreground">
                              {characterClass.spellcasting.spellSlots[0]["1"]}{" "}
                              slots
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Suitability Indicator */}
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Attribute Match</span>
                      <span>{suitability}%</span>
                    </div>
                    <Progress value={suitability} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      Based on your current ability scores
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Selection Summary */}
      {selectedClass && (
        <Card>
          <CardHeader>
            <CardTitle>Class Selection Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm">Class: {selectedClass.name}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Starting Hit Points: {data.hitPoints} (d{selectedClass.hitDie} +
                CON modifier)
              </div>
              {selectedClass.spellcasting && (
                <div className="text-sm text-muted-foreground">
                  Spellcasting class - you'll select spells in a later step
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
