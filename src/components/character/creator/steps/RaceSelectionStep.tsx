// src/components/character/creator/steps/RaceSelectionStep.tsx

"use client";

import React, { useState } from "react";
import { Search } from "lucide-react";
import { StepComponentProps, Race, Subrace } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

// Mock race data - in a real app, this would come from an API or database
const AVAILABLE_RACES: Race[] = [
  {
    id: "human",
    name: "Human",
    description:
      "Versatile and ambitious, humans are the most adaptable and driven people among the common races.",
    abilityScoreIncrease: {
      strength: 1,
      dexterity: 1,
      constitution: 1,
      intelligence: 1,
      wisdom: 1,
      charisma: 1,
    },
    size: "Medium",
    speed: 30,
    languages: ["Common"],
    proficiencies: [],
    traits: [
      {
        name: "Extra Language",
        description:
          "You can speak, read, and write one extra language of your choice.",
      },
      {
        name: "Extra Skill",
        description: "You gain proficiency in one skill of your choice.",
      },
    ],
  },
  {
    id: "elf",
    name: "Elf",
    description:
      "Elves are magical people of otherworldly grace, living in the world but not entirely part of it.",
    abilityScoreIncrease: {
      dexterity: 2,
    },
    size: "Medium",
    speed: 30,
    languages: ["Common", "Elvish"],
    proficiencies: ["Perception"],
    traits: [
      {
        name: "Darkvision",
        description:
          "You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light.",
      },
      {
        name: "Keen Senses",
        description: "You have proficiency in the Perception skill.",
      },
      {
        name: "Fey Ancestry",
        description:
          "You have advantage on saving throws against being charmed, and magic can't put you to sleep.",
      },
      {
        name: "Trance",
        description:
          "You don't need to sleep and can't be forced to sleep. Instead, you meditate deeply for 4 hours a day.",
      },
    ],
    subraces: [
      {
        id: "high-elf",
        name: "High Elf",
        description: "High elves have keen minds and master basic magic.",
        abilityScoreIncrease: {
          intelligence: 1,
        },
        traits: [
          {
            name: "Elf Weapon Training",
            description:
              "You have proficiency with longswords, shortbows, longbows, and shortbows.",
          },
          {
            name: "Cantrip",
            description:
              "You know one cantrip of your choice from the wizard spell list.",
          },
        ],
      },
      {
        id: "wood-elf",
        name: "Wood Elf",
        description:
          "Wood elves have keen senses and intuition, and their fleet feet carry them quickly through their forest homes.",
        abilityScoreIncrease: {
          wisdom: 1,
        },
        traits: [
          {
            name: "Elf Weapon Training",
            description:
              "You have proficiency with longswords, shortbows, longbows, and shortbows.",
          },
          {
            name: "Fleet of Foot",
            description: "Your base walking speed increases to 35 feet.",
          },
          {
            name: "Mask of the Wild",
            description:
              "You can attempt to hide even when you are only lightly obscured by foliage, heavy rain, falling snow, mist, and other natural phenomena.",
          },
        ],
      },
    ],
  },
  {
    id: "dwarf",
    name: "Dwarf",
    description:
      "Bold and hardy, dwarves are known as skilled warriors, miners, and workers of stone and metal.",
    abilityScoreIncrease: {
      constitution: 2,
    },
    size: "Medium",
    speed: 25,
    languages: ["Common", "Dwarvish"],
    proficiencies: [],
    traits: [
      {
        name: "Darkvision",
        description:
          "You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light.",
      },
      {
        name: "Dwarven Resilience",
        description:
          "You have advantage on saving throws against poison, and resistance against poison damage.",
      },
      {
        name: "Dwarven Combat Training",
        description:
          "You have proficiency with battleaxes, handaxes, light hammers, and warhammers.",
      },
      {
        name: "Stonecunning",
        description:
          "Whenever you make an Intelligence (History) check related to the origin of stonework, you are considered proficient and add double your proficiency bonus.",
      },
    ],
    subraces: [
      {
        id: "hill-dwarf",
        name: "Hill Dwarf",
        description:
          "Hill dwarves have keen senses, deep intuition, and remarkable resilience.",
        abilityScoreIncrease: {
          wisdom: 1,
        },
        traits: [
          {
            name: "Dwarven Toughness",
            description:
              "Your hit point maximum increases by 1, and it increases by 1 every time you gain a level.",
          },
        ],
      },
      {
        id: "mountain-dwarf",
        name: "Mountain Dwarf",
        description:
          "Mountain dwarves are strong and hardy, accustomed to a difficult life in rugged terrain.",
        abilityScoreIncrease: {
          strength: 2,
        },
        traits: [
          {
            name: "Armor Proficiency",
            description: "You have proficiency with light and medium armor.",
          },
        ],
      },
    ],
  },
  {
    id: "halfling",
    name: "Halfling",
    description:
      "The diminutive halflings survive in a world full of larger creatures by avoiding notice or finding ways to live in harmony.",
    abilityScoreIncrease: {
      dexterity: 2,
    },
    size: "Small",
    speed: 25,
    languages: ["Common", "Halfling"],
    proficiencies: [],
    traits: [
      {
        name: "Lucky",
        description:
          "When you roll a 1 on the d20 for an attack roll, ability check, or saving throw, you can reroll the die and must use the new roll.",
      },
      {
        name: "Brave",
        description:
          "You have advantage on saving throws against being frightened.",
      },
      {
        name: "Halfling Nimbleness",
        description:
          "You can move through the space of any creature that is of a size larger than yours.",
      },
    ],
    subraces: [
      {
        id: "lightfoot-halfling",
        name: "Lightfoot Halfling",
        description:
          "Lightfoot halflings can easily hide from notice, even using other people as cover.",
        abilityScoreIncrease: {
          charisma: 1,
        },
        traits: [
          {
            name: "Naturally Stealthy",
            description:
              "You can attempt to hide even when you are obscured only by a creature that is at least one size larger than you.",
          },
        ],
      },
      {
        id: "stout-halfling",
        name: "Stout Halfling",
        description:
          "Stout halflings have more dwarven blood and are hardier than their lightfoot kin.",
        abilityScoreIncrease: {
          constitution: 1,
        },
        traits: [
          {
            name: "Stout Resilience",
            description:
              "You have advantage on saving throws against poison, and resistance against poison damage.",
          },
        ],
      },
    ],
  },
];

export function RaceSelectionStep({ data, onUpdate }: StepComponentProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRace, setSelectedRace] = useState<Race | null>(data.race);
  const [selectedSubrace, setSelectedSubrace] = useState<Subrace | null>(
    data.subrace
  );

  const filteredRaces = AVAILABLE_RACES.filter(
    (race) =>
      race.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      race.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRaceSelect = (race: Race) => {
    setSelectedRace(race);
    setSelectedSubrace(null); // Reset subrace when changing race

    onUpdate({
      race,
      subrace: null,
      // Update attributes based on racial bonuses
      attributes: {
        ...data.attributes,
        strength:
          data.attributes.strength -
          (data.race?.abilityScoreIncrease.strength || 0) +
          (race.abilityScoreIncrease.strength || 0),
        dexterity:
          data.attributes.dexterity -
          (data.race?.abilityScoreIncrease.dexterity || 0) +
          (race.abilityScoreIncrease.dexterity || 0),
        constitution:
          data.attributes.constitution -
          (data.race?.abilityScoreIncrease.constitution || 0) +
          (race.abilityScoreIncrease.constitution || 0),
        intelligence:
          data.attributes.intelligence -
          (data.race?.abilityScoreIncrease.intelligence || 0) +
          (race.abilityScoreIncrease.intelligence || 0),
        wisdom:
          data.attributes.wisdom -
          (data.race?.abilityScoreIncrease.wisdom || 0) +
          (race.abilityScoreIncrease.wisdom || 0),
        charisma:
          data.attributes.charisma -
          (data.race?.abilityScoreIncrease.charisma || 0) +
          (race.abilityScoreIncrease.charisma || 0),
      },
      speed: race.speed,
      languages: [...new Set([...data.languages, ...race.languages])],
    });
  };

  const handleSubraceSelect = (subrace: Subrace) => {
    setSelectedSubrace(subrace);

    onUpdate({
      subrace,
      // Update attributes based on subracial bonuses
      attributes: {
        ...data.attributes,
        strength:
          data.attributes.strength -
          (data.subrace?.abilityScoreIncrease.strength || 0) +
          (subrace.abilityScoreIncrease.strength || 0),
        dexterity:
          data.attributes.dexterity -
          (data.subrace?.abilityScoreIncrease.dexterity || 0) +
          (subrace.abilityScoreIncrease.dexterity || 0),
        constitution:
          data.attributes.constitution -
          (data.subrace?.abilityScoreIncrease.constitution || 0) +
          (subrace.abilityScoreIncrease.constitution || 0),
        intelligence:
          data.attributes.intelligence -
          (data.subrace?.abilityScoreIncrease.intelligence || 0) +
          (subrace.abilityScoreIncrease.intelligence || 0),
        wisdom:
          data.attributes.wisdom -
          (data.subrace?.abilityScoreIncrease.wisdom || 0) +
          (subrace.abilityScoreIncrease.wisdom || 0),
        charisma:
          data.attributes.charisma -
          (data.subrace?.abilityScoreIncrease.charisma || 0) +
          (subrace.abilityScoreIncrease.charisma || 0),
      },
    });
  };

  const formatAbilityBonus = (bonuses: Partial<typeof data.attributes>) => {
    return Object.entries(bonuses)
      .filter(([_, value]) => value && value > 0)
      .map(
        ([key, value]) =>
          `+${value} ${key.charAt(0).toUpperCase() + key.slice(1)}`
      )
      .join(", ");
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search races..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Race Selection */}
      <div className="grid gap-4">
        {filteredRaces.map((race) => (
          <Card
            key={race.id}
            className={`cursor-pointer transition-colors hover:bg-muted/50 ${
              selectedRace?.id === race.id ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => handleRaceSelect(race)}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{race.name}</span>
                <div className="flex gap-1">
                  <Badge variant="outline">{race.size}</Badge>
                  <Badge variant="outline">{race.speed} ft</Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{race.description}</p>

              {/* Ability Score Increases */}
              <div className="mb-4">
                <h4 className="font-medium mb-2">Ability Score Increase</h4>
                <p className="text-sm text-muted-foreground">
                  {formatAbilityBonus(race.abilityScoreIncrease)}
                </p>
              </div>

              {/* Languages */}
              <div className="mb-4">
                <h4 className="font-medium mb-2">Languages</h4>
                <div className="flex gap-1 flex-wrap">
                  {race.languages.map((lang) => (
                    <Badge key={lang} variant="secondary" className="text-xs">
                      {lang}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Traits */}
              <div>
                <h4 className="font-medium mb-2">Racial Traits</h4>
                <div className="space-y-2">
                  {race.traits.map((trait, index) => (
                    <div key={index} className="text-sm">
                      <span className="font-medium">{trait.name}:</span>{" "}
                      <span className="text-muted-foreground">
                        {trait.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Subrace Selection */}
      {selectedRace?.subraces && selectedRace.subraces.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Choose a Subrace</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={selectedSubrace?.id || ""}
              onValueChange={(value) => {
                const subrace = selectedRace.subraces?.find(
                  (sr) => sr.id === value
                );
                if (subrace) handleSubraceSelect(subrace);
              }}
            >
              <div className="space-y-4">
                {selectedRace.subraces.map((subrace) => (
                  <div key={subrace.id} className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value={subrace.id} id={subrace.id} />
                      <Label htmlFor={subrace.id} className="flex-1">
                        <div className="font-medium">{subrace.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {subrace.description}
                        </div>
                        {Object.keys(subrace.abilityScoreIncrease).length >
                          0 && (
                          <div className="text-sm text-primary mt-1">
                            {formatAbilityBonus(subrace.abilityScoreIncrease)}
                          </div>
                        )}
                      </Label>
                    </div>

                    {selectedSubrace?.id === subrace.id && (
                      <div className="ml-6 space-y-2">
                        {subrace.traits.map((trait, index) => (
                          <div key={index} className="text-sm">
                            <span className="font-medium">{trait.name}:</span>{" "}
                            <span className="text-muted-foreground">
                              {trait.description}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* Selection Summary */}
      {selectedRace && (
        <Card>
          <CardHeader>
            <CardTitle>Race Selection Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm">
                  Race: {selectedRace.name}
                  {selectedSubrace && ` (${selectedSubrace.name})`}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                Ability bonuses, traits, and languages have been applied to your
                character.
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
