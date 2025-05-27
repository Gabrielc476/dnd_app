// src/components/npc/import/NPCImporter.tsx

"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Filter,
  Download,
  Check,
  X,
  Loader2,
  BookOpen,
  AlertCircle,
} from "lucide-react";
import { NPCImporterProps, ImportableMonster } from "../types";
import { useCompendium } from "@/hooks/useCompendium";
import { useToast } from "@/hooks/use-toast";
import { NPC } from "@/lib/types";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

export function NPCImporter({
  campaignId,
  onImport,
  onCancel,
  maxImports = 50,
}: NPCImporterProps) {
  const { toast } = useToast();
  const {
    searchMonsters,
    getMonster,
    getMonsterTypes,
    getMonsterChallengeRatings,
    isLoading,
    error,
  } = useCompendium();

  const [monsters, setMonsters] = useState<ImportableMonster[]>([]);
  const [filteredMonsters, setFilteredMonsters] = useState<ImportableMonster[]>(
    []
  );
  const [selectedMonsters, setSelectedMonsters] = useState<ImportableMonster[]>(
    []
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    type: "",
    challengeRating: "",
    source: "",
  });
  const [isImporting, setIsImporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [monstersPerPage] = useState(20);

  // Load initial monsters and filter options
  useEffect(() => {
    const loadMonsters = async () => {
      try {
        const results = await searchMonsters({ limit: 200 });
        const importableMonsters: ImportableMonster[] = results.map(
          (monster) => ({
            id: monster._id,
            name: monster.name,
            type: monster.type,
            challenge_rating: monster.challenge_rating,
            source: monster.source,
            hit_points: monster.hit_points,
            armor_class: monster.armor_class,
            selected: false,
          })
        );
        setMonsters(importableMonsters);
        setFilteredMonsters(importableMonsters);
      } catch (error) {
        toast({
          title: "Failed to Load Monsters",
          description: "Could not load monsters from compendium",
          variant: "destructive",
        });
      }
    };

    loadMonsters();
  }, [searchMonsters, toast]);

  // Filter monsters based on search and filters
  useEffect(() => {
    let filtered = [...monsters];

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (monster) =>
          monster.name.toLowerCase().includes(query) ||
          monster.type.toLowerCase().includes(query) ||
          monster.challenge_rating.includes(query)
      );
    }

    // Apply filters
    if (filters.type) {
      filtered = filtered.filter((monster) => monster.type === filters.type);
    }

    if (filters.challengeRating) {
      filtered = filtered.filter(
        (monster) => monster.challenge_rating === filters.challengeRating
      );
    }

    if (filters.source) {
      filtered = filtered.filter(
        (monster) => monster.source === filters.source
      );
    }

    setFilteredMonsters(filtered);
    setCurrentPage(1);
  }, [monsters, searchQuery, filters]);

  // Handle monster selection
  const handleMonsterToggle = useCallback(
    (monster: ImportableMonster) => {
      const isCurrentlySelected = selectedMonsters.some(
        (m) => m.id === monster.id
      );

      if (isCurrentlySelected) {
        setSelectedMonsters((prev) => prev.filter((m) => m.id !== monster.id));
      } else {
        if (selectedMonsters.length >= maxImports) {
          toast({
            title: "Import Limit Reached",
            description: `You can only import up to ${maxImports} NPCs at once`,
            variant: "destructive",
          });
          return;
        }
        setSelectedMonsters((prev) => [
          ...prev,
          { ...monster, customName: "" },
        ]);
      }
    },
    [selectedMonsters, maxImports, toast]
  );

  // Handle custom name change
  const handleCustomNameChange = useCallback(
    (monsterId: string, customName: string) => {
      setSelectedMonsters((prev) =>
        prev.map((monster) =>
          monster.id === monsterId ? { ...monster, customName } : monster
        )
      );
    },
    []
  );

  // Handle import
  const handleImport = useCallback(async () => {
    if (selectedMonsters.length === 0) {
      toast({
        title: "No Monsters Selected",
        description: "Please select at least one monster to import",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    try {
      const importedNPCs: NPC[] = [];

      for (const monster of selectedMonsters) {
        try {
          // Get full monster data from compendium
          const fullMonster = await getMonster(monster.id);

          // Convert to NPC format
          const npc: NPC = {
            _id: "", // Will be assigned by backend
            name: monster.customName || monster.name,
            source: "compendium",
            compendium_id: monster.id,
            campaign_id: campaignId,
            stats: {
              ac: fullMonster.armor_class,
              hp: {
                current: fullMonster.hit_points,
                max: fullMonster.hit_points,
              },
              speed: fullMonster.speed.walk || 30,
              attributes: {
                strength: fullMonster.strength,
                dexterity: fullMonster.dexterity,
                constitution: fullMonster.constitution,
                intelligence: fullMonster.intelligence,
                wisdom: fullMonster.wisdom,
                charisma: fullMonster.charisma,
              },
              saving_throws: fullMonster.saving_throws,
              skills: fullMonster.skills,
              damage_vulnerabilities: fullMonster.damage_vulnerabilities || [],
              damage_resistances: fullMonster.damage_resistances || [],
              damage_immunities: fullMonster.damage_immunities || [],
              condition_immunities: fullMonster.condition_immunities || [],
              senses: fullMonster.senses,
              languages: fullMonster.languages?.split(", ") || [],
              challenge_rating: fullMonster.challenge_rating,
            },
            actions:
              fullMonster.actions?.map((action) => ({
                name: action.name,
                description: action.description,
                attack_bonus: action.attack_bonus,
                damage: action.damage,
                damage_type: action.damage_type,
              })) || [],
            legendary_actions:
              fullMonster.legendary_actions?.map((action) => ({
                name: action.name,
                description: action.description,
              })) || [],
            reactions: [], // Most monsters don't have reactions defined separately
            features:
              fullMonster.traits?.map((trait) => ({
                name: trait.name,
                description: trait.description,
              })) || [],
            description: `${fullMonster.size} ${fullMonster.type}, ${fullMonster.alignment}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          importedNPCs.push(npc);
        } catch (error) {
          console.error(`Failed to import ${monster.name}:`, error);
          toast({
            title: "Import Error",
            description: `Failed to import ${monster.name}`,
            variant: "destructive",
          });
        }
      }

      if (importedNPCs.length > 0) {
        onImport(importedNPCs);
      }
    } finally {
      setIsImporting(false);
    }
  }, [selectedMonsters, campaignId, getMonster, onImport, toast]);

  // Clear all selections
  const handleClearAll = useCallback(() => {
    setSelectedMonsters([]);
  }, []);

  // Pagination
  const totalPages = Math.ceil(filteredMonsters.length / monstersPerPage);
  const startIndex = (currentPage - 1) * monstersPerPage;
  const endIndex = startIndex + monstersPerPage;
  const currentMonsters = filteredMonsters.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Import NPCs from Compendium
          </CardTitle>
          <CardDescription>
            Select monsters from the D&D 5e compendium to import as NPCs
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="space-y-2">
              <Label htmlFor="search">Search Monsters</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name, type, or challenge rating..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type-filter">Creature Type</Label>
                <Select
                  value={filters.type}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Types</SelectItem>
                    <SelectItem value="Aberration">Aberration</SelectItem>
                    <SelectItem value="Beast">Beast</SelectItem>
                    <SelectItem value="Celestial">Celestial</SelectItem>
                    <SelectItem value="Construct">Construct</SelectItem>
                    <SelectItem value="Dragon">Dragon</SelectItem>
                    <SelectItem value="Elemental">Elemental</SelectItem>
                    <SelectItem value="Fey">Fey</SelectItem>
                    <SelectItem value="Fiend">Fiend</SelectItem>
                    <SelectItem value="Giant">Giant</SelectItem>
                    <SelectItem value="Humanoid">Humanoid</SelectItem>
                    <SelectItem value="Monstrosity">Monstrosity</SelectItem>
                    <SelectItem value="Ooze">Ooze</SelectItem>
                    <SelectItem value="Plant">Plant</SelectItem>
                    <SelectItem value="Undead">Undead</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cr-filter">Challenge Rating</Label>
                <Select
                  value={filters.challengeRating}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, challengeRating: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All CRs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All CRs</SelectItem>
                    <SelectItem value="0">CR 0</SelectItem>
                    <SelectItem value="1/8">CR 1/8</SelectItem>
                    <SelectItem value="1/4">CR 1/4</SelectItem>
                    <SelectItem value="1/2">CR 1/2</SelectItem>
                    <SelectItem value="1">CR 1</SelectItem>
                    <SelectItem value="2">CR 2</SelectItem>
                    <SelectItem value="3">CR 3</SelectItem>
                    <SelectItem value="4">CR 4</SelectItem>
                    <SelectItem value="5">CR 5</SelectItem>
                    <SelectItem value="10">CR 10+</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="source-filter">Source</Label>
                <Select
                  value={filters.source}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, source: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Sources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Sources</SelectItem>
                    <SelectItem value="Monster Manual">
                      Monster Manual
                    </SelectItem>
                    <SelectItem value="Volo's Guide">Volo's Guide</SelectItem>
                    <SelectItem value="Mordenkainen's Tome">
                      Mordenkainen's Tome
                    </SelectItem>
                    <SelectItem value="Basic Rules">Basic Rules</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selection Status */}
      {selectedMonsters.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>
                {selectedMonsters.length} monster
                {selectedMonsters.length !== 1 ? "s" : ""} selected
                {maxImports &&
                  ` (${maxImports - selectedMonsters.length} remaining)`}
              </span>
              <Button variant="ghost" size="sm" onClick={handleClearAll}>
                Clear All
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Monster List */}
      <Card>
        <CardHeader>
          <CardTitle>Available Monsters ({filteredMonsters.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading monsters...</span>
            </div>
          ) : currentMonsters.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              No monsters found matching your criteria.
            </div>
          ) : (
            <div className="space-y-2">
              {currentMonsters.map((monster) => {
                const isSelected = selectedMonsters.some(
                  (m) => m.id === monster.id
                );
                const selectedMonster = selectedMonsters.find(
                  (m) => m.id === monster.id
                );

                return (
                  <div
                    key={monster.id}
                    className={`flex items-center space-x-4 p-4 border rounded-lg transition-colors ${
                      isSelected
                        ? "bg-muted border-primary"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleMonsterToggle(monster)}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {monster.name}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {monster.type}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          CR {monster.challenge_rating}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        AC {monster.armor_class} • {monster.hit_points} HP
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-48">
                        <Input
                          placeholder="Custom name (optional)"
                          value={selectedMonster?.customName || ""}
                          onChange={(e) =>
                            handleCustomNameChange(monster.id, e.target.value)
                          }
                          size="sm"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Monsters for Import */}
      {selectedMonsters.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Selected for Import</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {selectedMonsters.map((monster) => (
                  <div
                    key={monster.id}
                    className="flex items-center justify-between p-2 bg-muted rounded"
                  >
                    <div>
                      <span className="font-medium">
                        {monster.customName || monster.name}
                      </span>
                      {monster.customName && (
                        <span className="text-sm text-muted-foreground ml-2">
                          (originally {monster.name})
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMonsterToggle(monster)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between">
            <Button variant="outline" onClick={onCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>

            <Button
              onClick={handleImport}
              disabled={selectedMonsters.length === 0 || isImporting}
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Import {selectedMonsters.length} NPC
                  {selectedMonsters.length !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
