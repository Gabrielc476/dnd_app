// src/components/npc/search/NPCFilters.tsx

"use client";

import React, { useState, useEffect } from "react";
import { Filter, X, RotateCcw, Bookmark, ChevronDown } from "lucide-react";
import { useCompendium } from "@/hooks/useCompendium";
import { parseCR } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface NPCFilterState {
  challengeRating: {
    min: number;
    max: number;
  };
  types: string[];
  sizes: string[];
  alignments: string[];
  sources: string[];
  tags: string[];
  damageTypes: {
    vulnerabilities: string[];
    resistances: string[];
    immunities: string[];
  };
  conditionImmunities: string[];
  environments: string[];
  legendaryActions: boolean | null;
  spellcaster: boolean | null;
  flyingSpeed: boolean | null;
  swimmingSpeed: boolean | null;
  customFilters: {
    minHP: number | null;
    maxHP: number | null;
    minAC: number | null;
    maxAC: number | null;
  };
}

export interface SavedFilter {
  id: string;
  name: string;
  filters: NPCFilterState;
  createdAt: string;
}

interface NPCFiltersProps {
  filters: NPCFilterState;
  onFiltersChange: (filters: NPCFilterState) => void;
  onApply: () => void;
  resultsCount?: number;
  isLoading?: boolean;
}

const DEFAULT_FILTERS: NPCFilterState = {
  challengeRating: { min: 0, max: 30 },
  types: [],
  sizes: [],
  alignments: [],
  sources: [],
  tags: [],
  damageTypes: {
    vulnerabilities: [],
    resistances: [],
    immunities: [],
  },
  conditionImmunities: [],
  environments: [],
  legendaryActions: null,
  spellcaster: null,
  flyingSpeed: null,
  swimmingSpeed: null,
  customFilters: {
    minHP: null,
    maxHP: null,
    minAC: null,
    maxAC: null,
  },
};

const CREATURE_TYPES = [
  "Aberration",
  "Beast",
  "Celestial",
  "Construct",
  "Dragon",
  "Elemental",
  "Fey",
  "Fiend",
  "Giant",
  "Humanoid",
  "Monstrosity",
  "Ooze",
  "Plant",
  "Undead",
];

const CREATURE_SIZES = [
  "Tiny",
  "Small",
  "Medium",
  "Large",
  "Huge",
  "Gargantuan",
];

const ALIGNMENTS = [
  "Lawful Good",
  "Neutral Good",
  "Chaotic Good",
  "Lawful Neutral",
  "True Neutral",
  "Chaotic Neutral",
  "Lawful Evil",
  "Neutral Evil",
  "Chaotic Evil",
  "Unaligned",
];

const DAMAGE_TYPES = [
  "Acid",
  "Bludgeoning",
  "Cold",
  "Fire",
  "Force",
  "Lightning",
  "Necrotic",
  "Piercing",
  "Poison",
  "Psychic",
  "Radiant",
  "Slashing",
  "Thunder",
];

const CONDITIONS = [
  "Blinded",
  "Charmed",
  "Deafened",
  "Exhaustion",
  "Frightened",
  "Grappled",
  "Incapacitated",
  "Invisible",
  "Paralyzed",
  "Petrified",
  "Poisoned",
  "Prone",
  "Restrained",
  "Stunned",
  "Unconscious",
];

const ENVIRONMENTS = [
  "Arctic",
  "Coastal",
  "Desert",
  "Forest",
  "Grassland",
  "Hill",
  "Mountain",
  "Swamp",
  "Underdark",
  "Underwater",
  "Urban",
];

export function NPCFilters({
  filters,
  onFiltersChange,
  onApply,
  resultsCount = 0,
  isLoading = false,
}: NPCFiltersProps) {
  const { getMonsterChallengeRatings } = useCompendium();

  const [availableCRs, setAvailableCRs] = useState<string[]>([]);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    basic: true,
    challenge: true,
    abilities: false,
    damage: false,
    environment: false,
    custom: false,
  });

  const [saveFilterName, setSaveFilterName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Load available challenge ratings
  useEffect(() => {
    const loadCRs = async () => {
      try {
        const crs = await getMonsterChallengeRatings();
        setAvailableCRs(crs.sort((a, b) => parseCR(a) - parseCR(b)));
      } catch (error) {
        console.error("Failed to load challenge ratings:", error);
      }
    };
    loadCRs();
  }, [getMonsterChallengeRatings]);

  // Load saved filters from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("npc-saved-filters");
    if (saved) {
      try {
        setSavedFilters(JSON.parse(saved));
      } catch (error) {
        console.error("Failed to load saved filters:", error);
      }
    }
  }, []);

  const updateFilters = (updates: Partial<NPCFilterState>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleReset = () => {
    onFiltersChange(DEFAULT_FILTERS);
  };

  const handleSaveFilter = () => {
    if (!saveFilterName.trim()) return;

    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: saveFilterName.trim(),
      filters: { ...filters },
      createdAt: new Date().toISOString(),
    };

    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    localStorage.setItem("npc-saved-filters", JSON.stringify(updated));

    setSaveFilterName("");
    setShowSaveDialog(false);
  };

  const handleLoadFilter = (savedFilter: SavedFilter) => {
    onFiltersChange(savedFilter.filters);
  };

  const handleDeleteFilter = (filterId: string) => {
    const updated = savedFilters.filter((f) => f.id !== filterId);
    setSavedFilters(updated);
    localStorage.setItem("npc-saved-filters", JSON.stringify(updated));
  };

  const getActiveFiltersCount = () => {
    let count = 0;

    if (filters.challengeRating.min > 0 || filters.challengeRating.max < 30)
      count++;
    if (filters.types.length > 0) count++;
    if (filters.sizes.length > 0) count++;
    if (filters.alignments.length > 0) count++;
    if (filters.sources.length > 0) count++;
    if (filters.tags.length > 0) count++;
    if (filters.damageTypes.vulnerabilities.length > 0) count++;
    if (filters.damageTypes.resistances.length > 0) count++;
    if (filters.damageTypes.immunities.length > 0) count++;
    if (filters.conditionImmunities.length > 0) count++;
    if (filters.environments.length > 0) count++;
    if (filters.legendaryActions !== null) count++;
    if (filters.spellcaster !== null) count++;
    if (filters.flyingSpeed !== null) count++;
    if (filters.swimmingSpeed !== null) count++;
    if (filters.customFilters.minHP !== null) count++;
    if (filters.customFilters.maxHP !== null) count++;
    if (filters.customFilters.minAC !== null) count++;
    if (filters.customFilters.maxAC !== null) count++;

    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFiltersCount} active
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={activeFiltersCount === 0}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSaveDialog(!showSaveDialog)}
            >
              <Bookmark className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Save Filter Dialog */}
        {showSaveDialog && (
          <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
            <Label htmlFor="filter-name">Save Current Filters</Label>
            <div className="flex gap-2">
              <Input
                id="filter-name"
                placeholder="Filter name..."
                value={saveFilterName}
                onChange={(e) => setSaveFilterName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveFilter()}
              />
              <Button
                size="sm"
                onClick={handleSaveFilter}
                disabled={!saveFilterName.trim()}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowSaveDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Saved Filters */}
        {savedFilters.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Saved Filters</Label>
            <div className="flex flex-wrap gap-2">
              {savedFilters.map((savedFilter) => (
                <div key={savedFilter.id} className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleLoadFilter(savedFilter)}
                    className="h-7 text-xs"
                  >
                    {savedFilter.name}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteFilter(savedFilter.id)}
                    className="h-7 w-7 p-0 hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Basic Filters */}
        <Collapsible
          open={expandedSections.basic}
          onOpenChange={() => toggleSection("basic")}
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between p-0 h-auto"
            >
              <span className="font-medium">Basic Filters</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  expandedSections.basic ? "rotate-180" : ""
                }`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4">
            {/* Creature Types */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Creature Types</Label>
              <div className="grid grid-cols-2 gap-2">
                {CREATURE_TYPES.map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={`type-${type}`}
                      checked={filters.types.includes(type)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          updateFilters({ types: [...filters.types, type] });
                        } else {
                          updateFilters({
                            types: filters.types.filter((t) => t !== type),
                          });
                        }
                      }}
                    />
                    <Label htmlFor={`type-${type}`} className="text-sm">
                      {type}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Creature Sizes */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Sizes</Label>
              <div className="flex flex-wrap gap-2">
                {CREATURE_SIZES.map((size) => (
                  <div key={size} className="flex items-center space-x-2">
                    <Checkbox
                      id={`size-${size}`}
                      checked={filters.sizes.includes(size)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          updateFilters({ sizes: [...filters.sizes, size] });
                        } else {
                          updateFilters({
                            sizes: filters.sizes.filter((s) => s !== size),
                          });
                        }
                      }}
                    />
                    <Label htmlFor={`size-${size}`} className="text-sm">
                      {size}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Sources */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Sources</Label>
              <div className="flex flex-wrap gap-2">
                {["Custom", "Compendium"].map((source) => (
                  <div key={source} className="flex items-center space-x-2">
                    <Checkbox
                      id={`source-${source}`}
                      checked={filters.sources.includes(source.toLowerCase())}
                      onCheckedChange={(checked) => {
                        const sourceValue = source.toLowerCase();
                        if (checked) {
                          updateFilters({
                            sources: [...filters.sources, sourceValue],
                          });
                        } else {
                          updateFilters({
                            sources: filters.sources.filter(
                              (s) => s !== sourceValue
                            ),
                          });
                        }
                      }}
                    />
                    <Label htmlFor={`source-${source}`} className="text-sm">
                      {source}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Challenge Rating */}
        <Collapsible
          open={expandedSections.challenge}
          onOpenChange={() => toggleSection("challenge")}
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between p-0 h-auto"
            >
              <span className="font-medium">Challenge Rating</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  expandedSections.challenge ? "rotate-180" : ""
                }`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">
                  CR Range: {filters.challengeRating.min} -{" "}
                  {filters.challengeRating.max}
                </Label>
                <Slider
                  value={[
                    filters.challengeRating.min,
                    filters.challengeRating.max,
                  ]}
                  onValueChange={([min, max]) =>
                    updateFilters({ challengeRating: { min, max } })
                  }
                  max={30}
                  min={0}
                  step={0.125}
                  className="w-full"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-sm">Min CR</Label>
                  <Input
                    type="number"
                    min="0"
                    max="30"
                    step="0.125"
                    value={filters.challengeRating.min}
                    onChange={(e) =>
                      updateFilters({
                        challengeRating: {
                          ...filters.challengeRating,
                          min: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <Label className="text-sm">Max CR</Label>
                  <Input
                    type="number"
                    min="0"
                    max="30"
                    step="0.125"
                    value={filters.challengeRating.max}
                    onChange={(e) =>
                      updateFilters({
                        challengeRating: {
                          ...filters.challengeRating,
                          max: parseFloat(e.target.value) || 30,
                        },
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Special Abilities */}
        <Collapsible
          open={expandedSections.abilities}
          onOpenChange={() => toggleSection("abilities")}
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between p-0 h-auto"
            >
              <span className="font-medium">Special Abilities</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  expandedSections.abilities ? "rotate-180" : ""
                }`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Has Legendary Actions</Label>
                <Select
                  value={
                    filters.legendaryActions === null
                      ? "any"
                      : filters.legendaryActions
                      ? "yes"
                      : "no"
                  }
                  onValueChange={(value) =>
                    updateFilters({
                      legendaryActions:
                        value === "any" ? null : value === "yes",
                    })
                  }
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm">Is Spellcaster</Label>
                <Select
                  value={
                    filters.spellcaster === null
                      ? "any"
                      : filters.spellcaster
                      ? "yes"
                      : "no"
                  }
                  onValueChange={(value) =>
                    updateFilters({
                      spellcaster: value === "any" ? null : value === "yes",
                    })
                  }
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm">Has Flying Speed</Label>
                <Select
                  value={
                    filters.flyingSpeed === null
                      ? "any"
                      : filters.flyingSpeed
                      ? "yes"
                      : "no"
                  }
                  onValueChange={(value) =>
                    updateFilters({
                      flyingSpeed: value === "any" ? null : value === "yes",
                    })
                  }
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm">Has Swimming Speed</Label>
                <Select
                  value={
                    filters.swimmingSpeed === null
                      ? "any"
                      : filters.swimmingSpeed
                      ? "yes"
                      : "no"
                  }
                  onValueChange={(value) =>
                    updateFilters({
                      swimmingSpeed: value === "any" ? null : value === "yes",
                    })
                  }
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Custom Filters */}
        <Collapsible
          open={expandedSections.custom}
          onOpenChange={() => toggleSection("custom")}
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between p-0 h-auto"
            >
              <span className="font-medium">Custom Ranges</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  expandedSections.custom ? "rotate-180" : ""
                }`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Min HP</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Any"
                  value={filters.customFilters.minHP || ""}
                  onChange={(e) =>
                    updateFilters({
                      customFilters: {
                        ...filters.customFilters,
                        minHP: e.target.value ? parseInt(e.target.value) : null,
                      },
                    })
                  }
                />
              </div>
              <div>
                <Label className="text-sm">Max HP</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Any"
                  value={filters.customFilters.maxHP || ""}
                  onChange={(e) =>
                    updateFilters({
                      customFilters: {
                        ...filters.customFilters,
                        maxHP: e.target.value ? parseInt(e.target.value) : null,
                      },
                    })
                  }
                />
              </div>
              <div>
                <Label className="text-sm">Min AC</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Any"
                  value={filters.customFilters.minAC || ""}
                  onChange={(e) =>
                    updateFilters({
                      customFilters: {
                        ...filters.customFilters,
                        minAC: e.target.value ? parseInt(e.target.value) : null,
                      },
                    })
                  }
                />
              </div>
              <div>
                <Label className="text-sm">Max AC</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Any"
                  value={filters.customFilters.maxAC || ""}
                  onChange={(e) =>
                    updateFilters({
                      customFilters: {
                        ...filters.customFilters,
                        maxAC: e.target.value ? parseInt(e.target.value) : null,
                      },
                    })
                  }
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Apply Button */}
        <div className="flex items-center justify-between pt-4">
          <span className="text-sm text-muted-foreground">
            {isLoading ? "Searching..." : `${resultsCount} results`}
          </span>
          <Button onClick={onApply} disabled={isLoading}>
            {isLoading ? "Searching..." : "Apply Filters"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
