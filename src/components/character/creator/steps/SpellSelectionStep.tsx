// src/components/character/creator/steps/SpellSelectionStep.tsx

"use client";

import React, { useState, useEffect } from "react";
import { Search, Sparkles, Book, Zap, Star } from "lucide-react";
import { StepComponentProps, calculateModifier } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

// Mock spell data - in a real app, this would come from an API
interface Spell {
  id: string;
  name: string;
  level: number;
  school: string;
  casting_time: string;
  range: string;
  components: string;
  duration: string;
  description: string;
  classes: string[];
}

const AVAILABLE_SPELLS: Spell[] = [
  // Cantrips (Level 0)
  {
    id: "fire-bolt",
    name: "Fire Bolt",
    level: 0,
    school: "Evocation",
    casting_time: "1 action",
    range: "120 feet",
    components: "V, S",
    duration: "Instantaneous",
    description:
      "You hurl a mote of fire at a creature or object within range. Make a ranged spell attack against the target. On a hit, the target takes 1d10 fire damage.",
    classes: ["Wizard", "Sorcerer"],
  },
  {
    id: "mage-hand",
    name: "Mage Hand",
    level: 0,
    school: "Conjuration",
    casting_time: "1 action",
    range: "30 feet",
    components: "V, S",
    duration: "1 minute",
    description:
      "A spectral, floating hand appears at a point you choose within range. The hand can manipulate objects, open doors, or perform simple tasks.",
    classes: ["Wizard", "Sorcerer", "Bard", "Warlock"],
  },
  {
    id: "prestidigitation",
    name: "Prestidigitation",
    level: 0,
    school: "Transmutation",
    casting_time: "1 action",
    range: "10 feet",
    components: "V, S",
    duration: "Up to 1 hour",
    description:
      "This spell is a minor magical trick that novice spellcasters use for practice. You create one of several minor magical effects.",
    classes: ["Wizard", "Sorcerer", "Bard", "Warlock"],
  },
  {
    id: "sacred-flame",
    name: "Sacred Flame",
    level: 0,
    school: "Evocation",
    casting_time: "1 action",
    range: "60 feet",
    components: "V, S",
    duration: "Instantaneous",
    description:
      "Flame-like radiance descends on a creature that you can see within range. The target must succeed on a Dexterity saving throw or take 1d8 radiant damage.",
    classes: ["Cleric"],
  },
  {
    id: "guidance",
    name: "Guidance",
    level: 0,
    school: "Divination",
    casting_time: "1 action",
    range: "Touch",
    components: "V, S",
    duration: "Concentration, up to 1 minute",
    description:
      "You touch one willing creature. Once before the spell ends, the target can roll a d4 and add the number rolled to one ability check of its choice.",
    classes: ["Cleric", "Druid"],
  },
  {
    id: "light",
    name: "Light",
    level: 0,
    school: "Evocation",
    casting_time: "1 action",
    range: "Touch",
    components: "V, M",
    duration: "1 hour",
    description:
      "You touch one object that is no larger than 10 feet in any dimension. Until the spell ends, the object sheds bright light in a 20-foot radius.",
    classes: ["Cleric", "Wizard", "Sorcerer", "Bard"],
  },

  // 1st Level Spells
  {
    id: "magic-missile",
    name: "Magic Missile",
    level: 1,
    school: "Evocation",
    casting_time: "1 action",
    range: "120 feet",
    components: "V, S",
    duration: "Instantaneous",
    description:
      "You create three glowing darts of magical force. Each dart hits a creature of your choice that you can see within range. A dart deals 1d4 + 1 force damage to its target.",
    classes: ["Wizard", "Sorcerer"],
  },
  {
    id: "shield",
    name: "Shield",
    level: 1,
    school: "Abjuration",
    casting_time: "1 reaction",
    range: "Self",
    components: "V, S",
    duration: "1 round",
    description:
      "An invisible barrier of magical force appears and protects you. Until the start of your next turn, you have a +5 bonus to AC.",
    classes: ["Wizard", "Sorcerer"],
  },
  {
    id: "cure-wounds",
    name: "Cure Wounds",
    level: 1,
    school: "Evocation",
    casting_time: "1 action",
    range: "Touch",
    components: "V, S",
    duration: "Instantaneous",
    description:
      "A creature you touch regains a number of hit points equal to 1d8 + your spellcasting ability modifier.",
    classes: ["Cleric", "Bard", "Druid", "Paladin", "Ranger"],
  },
  {
    id: "healing-word",
    name: "Healing Word",
    level: 1,
    school: "Evocation",
    casting_time: "1 bonus action",
    range: "60 feet",
    components: "V",
    duration: "Instantaneous",
    description:
      "A creature of your choice that you can see within range regains hit points equal to 1d4 + your spellcasting ability modifier.",
    classes: ["Cleric", "Bard", "Druid"],
  },
  {
    id: "bless",
    name: "Bless",
    level: 1,
    school: "Enchantment",
    casting_time: "1 action",
    range: "30 feet",
    components: "V, S, M",
    duration: "Concentration, up to 1 minute",
    description:
      "You bless up to three creatures of your choice within range. Whenever a target makes an attack roll or a saving throw before the spell ends, the target can roll a d4 and add the number rolled to the attack roll or saving throw.",
    classes: ["Cleric", "Paladin"],
  },
  {
    id: "sleep",
    name: "Sleep",
    level: 1,
    school: "Enchantment",
    casting_time: "1 action",
    range: "90 feet",
    components: "V, S, M",
    duration: "1 minute",
    description:
      "This spell sends creatures into a magical slumber. Roll 5d8; the total is how many hit points of creatures this spell can affect.",
    classes: ["Wizard", "Sorcerer", "Bard"],
  },
];

const SPELL_SCHOOLS = [
  "Abjuration",
  "Conjuration",
  "Divination",
  "Enchantment",
  "Evocation",
  "Illusion",
  "Necromancy",
  "Transmutation",
];

export function SpellSelectionStep({ data, onUpdate }: StepComponentProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSchool, setFilterSchool] = useState<string>("");
  const [filterLevel, setFilterLevel] = useState<number | "">("");
  const [selectedCantrips, setSelectedCantrips] = useState<string[]>(
    data.spellcasting?.cantrips || []
  );
  const [selectedSpells, setSelectedSpells] = useState<string[]>(
    data.spellcasting?.spells || []
  );

  // Check if character has spellcasting
  const hasSpellcasting = data.characterClass?.spellcasting;

  if (!hasSpellcasting) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Spell Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Your selected class ({data.characterClass?.name}) does not have
              spellcasting abilities. You can skip this step.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const spellcastingAbility = hasSpellcasting.ability;
  const spellcastingModifier = calculateModifier(
    data.attributes[spellcastingAbility]
  );
  const cantripsKnown = hasSpellcasting.cantripsKnown[0] || 0;
  const firstLevelSpells = hasSpellcasting.spellsKnown?.[0] || 0;

  // Filter available spells
  const availableSpells = AVAILABLE_SPELLS.filter((spell) => {
    // Must be available to the character's class
    if (!spell.classes.includes(data.characterClass!.name)) return false;

    // Apply search filter
    if (
      searchTerm &&
      !spell.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !spell.description.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }

    // Apply school filter
    if (filterSchool && spell.school !== filterSchool) return false;

    // Apply level filter
    if (filterLevel !== "" && spell.level !== filterLevel) return false;

    return true;
  });

  const cantrips = availableSpells.filter((spell) => spell.level === 0);
  const firstLevelSpellList = availableSpells.filter(
    (spell) => spell.level === 1
  );

  const handleCantripSelect = (spellId: string, selected: boolean) => {
    let newSelection: string[];

    if (selected) {
      if (selectedCantrips.length >= cantripsKnown) {
        return; // Can't select more cantrips
      }
      newSelection = [...selectedCantrips, spellId];
    } else {
      newSelection = selectedCantrips.filter((id) => id !== spellId);
    }

    setSelectedCantrips(newSelection);
    onUpdate({
      spellcasting: {
        ...data.spellcasting,
        ability: spellcastingAbility,
        cantrips: newSelection,
        spells: selectedSpells,
      },
    });
  };

  const handleSpellSelect = (spellId: string, selected: boolean) => {
    let newSelection: string[];

    if (selected) {
      if (selectedSpells.length >= firstLevelSpells) {
        return; // Can't select more spells
      }
      newSelection = [...selectedSpells, spellId];
    } else {
      newSelection = selectedSpells.filter((id) => id !== spellId);
    }

    setSelectedSpells(newSelection);
    onUpdate({
      spellcasting: {
        ...data.spellcasting,
        ability: spellcastingAbility,
        cantrips: selectedCantrips,
        spells: newSelection,
      },
    });
  };

  const getSpellIcon = (school: string) => {
    switch (school) {
      case "Evocation":
        return <Zap className="h-4 w-4" />;
      case "Conjuration":
        return <Star className="h-4 w-4" />;
      case "Divination":
        return <Book className="h-4 w-4" />;
      default:
        return <Sparkles className="h-4 w-4" />;
    }
  };

  const getSchoolColor = (school: string) => {
    const colors: Record<string, string> = {
      Abjuration: "bg-blue-100 text-blue-800",
      Conjuration: "bg-purple-100 text-purple-800",
      Divination: "bg-yellow-100 text-yellow-800",
      Enchantment: "bg-pink-100 text-pink-800",
      Evocation: "bg-red-100 text-red-800",
      Illusion: "bg-indigo-100 text-indigo-800",
      Necromancy: "bg-gray-100 text-gray-800",
      Transmutation: "bg-green-100 text-green-800",
    };
    return colors[school] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-6">
      {/* Spellcasting Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Spellcasting Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm">
                <span className="font-medium">Spellcasting Ability:</span>{" "}
                <span className="text-muted-foreground capitalize">
                  {spellcastingAbility} ({data.attributes[spellcastingAbility]}{" "}
                  / {spellcastingModifier >= 0 ? "+" : ""}
                  {spellcastingModifier})
                </span>
              </div>
              <div className="text-sm">
                <span className="font-medium">Spell Save DC:</span>{" "}
                <span className="text-muted-foreground">
                  {8 + 2 + spellcastingModifier}
                </span>
              </div>
              <div className="text-sm">
                <span className="font-medium">Spell Attack Bonus:</span>{" "}
                <span className="text-muted-foreground">
                  +{2 + spellcastingModifier}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm">
                <span className="font-medium">Cantrips Known:</span>{" "}
                <span className="text-muted-foreground">{cantripsKnown}</span>
              </div>
              {firstLevelSpells > 0 && (
                <div className="text-sm">
                  <span className="font-medium">1st Level Spells:</span>{" "}
                  <span className="text-muted-foreground">
                    {firstLevelSpells} known
                  </span>
                </div>
              )}
              <div className="text-sm">
                <span className="font-medium">1st Level Spell Slots:</span>{" "}
                <span className="text-muted-foreground">
                  {hasSpellcasting.spellSlots[0]["1"]}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Spell Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search spells..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <select
              value={filterSchool}
              onChange={(e) => setFilterSchool(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="">All Schools</option>
              {SPELL_SCHOOLS.map((school) => (
                <option key={school} value={school}>
                  {school}
                </option>
              ))}
            </select>

            <select
              value={filterLevel}
              onChange={(e) =>
                setFilterLevel(
                  e.target.value === "" ? "" : parseInt(e.target.value)
                )
              }
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="">All Levels</option>
              <option value={0}>Cantrips</option>
              <option value={1}>1st Level</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Spell Selection */}
      <Tabs defaultValue="cantrips">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="cantrips">
            Cantrips ({selectedCantrips.length}/{cantripsKnown})
          </TabsTrigger>
          <TabsTrigger value="spells">
            1st Level Spells ({selectedSpells.length}/{firstLevelSpells})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cantrips" className="space-y-4">
          <Alert>
            <AlertDescription>
              Select {cantripsKnown} cantrips. Cantrips can be cast at will
              without expending spell slots.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4">
            {cantrips.map((spell) => (
              <Card
                key={spell.id}
                className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                  selectedCantrips.includes(spell.id)
                    ? "ring-2 ring-primary"
                    : ""
                }`}
              >
                <CardContent className="pt-4">
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={selectedCantrips.includes(spell.id)}
                      onCheckedChange={(checked) =>
                        handleCantripSelect(spell.id, !!checked)
                      }
                      disabled={
                        !selectedCantrips.includes(spell.id) &&
                        selectedCantrips.length >= cantripsKnown
                      }
                    />

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getSpellIcon(spell.school)}
                        <h4 className="font-medium">{spell.name}</h4>
                        <Badge
                          className={`text-xs ${getSchoolColor(spell.school)}`}
                        >
                          {spell.school}
                        </Badge>
                      </div>

                      <p className="text-sm text-muted-foreground mb-2">
                        {spell.description}
                      </p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                        <div>
                          <span className="font-medium">Casting Time:</span>{" "}
                          {spell.casting_time}
                        </div>
                        <div>
                          <span className="font-medium">Range:</span>{" "}
                          {spell.range}
                        </div>
                        <div>
                          <span className="font-medium">Components:</span>{" "}
                          {spell.components}
                        </div>
                        <div>
                          <span className="font-medium">Duration:</span>{" "}
                          {spell.duration}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {cantrips.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No cantrips found matching your filters.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="spells" className="space-y-4">
          {firstLevelSpells > 0 ? (
            <>
              <Alert>
                <AlertDescription>
                  Select {firstLevelSpells} 1st level spells. These spells
                  require spell slots to cast.
                </AlertDescription>
              </Alert>

              <div className="grid gap-4">
                {firstLevelSpellList.map((spell) => (
                  <Card
                    key={spell.id}
                    className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                      selectedSpells.includes(spell.id)
                        ? "ring-2 ring-primary"
                        : ""
                    }`}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-4">
                        <Checkbox
                          checked={selectedSpells.includes(spell.id)}
                          onCheckedChange={(checked) =>
                            handleSpellSelect(spell.id, !!checked)
                          }
                          disabled={
                            !selectedSpells.includes(spell.id) &&
                            selectedSpells.length >= firstLevelSpells
                          }
                        />

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getSpellIcon(spell.school)}
                            <h4 className="font-medium">{spell.name}</h4>
                            <Badge variant="outline">1st Level</Badge>
                            <Badge
                              className={`text-xs ${getSchoolColor(
                                spell.school
                              )}`}
                            >
                              {spell.school}
                            </Badge>
                          </div>

                          <p className="text-sm text-muted-foreground mb-2">
                            {spell.description}
                          </p>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                            <div>
                              <span className="font-medium">Casting Time:</span>{" "}
                              {spell.casting_time}
                            </div>
                            <div>
                              <span className="font-medium">Range:</span>{" "}
                              {spell.range}
                            </div>
                            <div>
                              <span className="font-medium">Components:</span>{" "}
                              {spell.components}
                            </div>
                            <div>
                              <span className="font-medium">Duration:</span>{" "}
                              {spell.duration}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {firstLevelSpellList.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Book className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No 1st level spells found matching your filters.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Alert>
              <AlertDescription>
                Your class does not learn additional 1st level spells at
                character creation. You may gain spells through your class
                features or spell scrolls during gameplay.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>

      {/* Selection Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Spell Selection Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Selected Cantrips */}
            <div>
              <h4 className="font-medium mb-2">
                Selected Cantrips ({selectedCantrips.length}/{cantripsKnown})
              </h4>
              {selectedCantrips.length > 0 ? (
                <div className="flex gap-2 flex-wrap">
                  {selectedCantrips.map((cantripId) => {
                    const spell = AVAILABLE_SPELLS.find(
                      (s) => s.id === cantripId
                    );
                    return spell ? (
                      <Badge key={cantripId} variant="secondary">
                        {spell.name}
                      </Badge>
                    ) : null;
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No cantrips selected
                </p>
              )}
            </div>

            {/* Selected Spells */}
            {firstLevelSpells > 0 && (
              <div>
                <h4 className="font-medium mb-2">
                  Selected 1st Level Spells ({selectedSpells.length}/
                  {firstLevelSpells})
                </h4>
                {selectedSpells.length > 0 ? (
                  <div className="flex gap-2 flex-wrap">
                    {selectedSpells.map((spellId) => {
                      const spell = AVAILABLE_SPELLS.find(
                        (s) => s.id === spellId
                      );
                      return spell ? (
                        <Badge key={spellId} variant="outline">
                          {spell.name}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No spells selected
                  </p>
                )}
              </div>
            )}

            {/* Completion Status */}
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${
                    selectedCantrips.length === cantripsKnown
                      ? "bg-green-500"
                      : "bg-red-500"
                  }`}
                />
                <span className="text-sm">
                  Cantrips:{" "}
                  {selectedCantrips.length === cantripsKnown
                    ? "Complete"
                    : `${selectedCantrips.length}/${cantripsKnown} selected`}
                </span>
              </div>

              {firstLevelSpells > 0 && (
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      selectedSpells.length === firstLevelSpells
                        ? "bg-green-500"
                        : "bg-red-500"
                    }`}
                  />
                  <span className="text-sm">
                    1st Level Spells:{" "}
                    {selectedSpells.length === firstLevelSpells
                      ? "Complete"
                      : `${selectedSpells.length}/${firstLevelSpells} selected`}
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
