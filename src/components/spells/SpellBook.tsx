// components/spells/SpellBook.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  Zap,
  RotateCcw,
  BookOpen,
  Sparkles,
  X,
} from "lucide-react";
import { Character, Spell } from "@/lib/types";
import { useCompendium } from "@/hooks/useCompendium";
import { useSpellSocket } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface SpellBookProps {
  character: Character;
  campaignId: string;
  userId: string;
  isReadOnly?: boolean;
}

interface SpellSearchFilters {
  level?: string;
  school?: string;
  class?: string;
  name?: string;
}

export function SpellBook({
  character,
  campaignId,
  userId,
  isReadOnly = false,
}: SpellBookProps) {
  const [activeTab, setActiveTab] = useState("prepared");
  const [searchFilters, setSearchFilters] = useState<SpellSearchFilters>({});
  const [searchResults, setSearchResults] = useState<Spell[]>([]);
  const [preparedSpells, setPreparedSpells] = useState<Spell[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Constants used in the component
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

  const SPELL_LEVELS = [
    { value: "0", label: "Cantrip" },
    { value: "1", label: "1st Level" },
    { value: "2", label: "2nd Level" },
    { value: "3", label: "3rd Level" },
    { value: "4", label: "4th Level" },
    { value: "5", label: "5th Level" },
    { value: "6", label: "6th Level" },
    { value: "7", label: "7th Level" },
    { value: "8", label: "8th Level" },
    { value: "9", label: "9th Level" },
  ];

  // Hooks
  const { searchSpells, getSpell } = useCompendium();
  const {
    connected,
    error: socketError,
    prepareSpell,
    castSpell,
    resetSpellSlots,
    isLocked,
    whoLocked,
    sendMessage,
  } = useSpellSocket(campaignId, userId, character._id);

  // Check if character has spellcasting
  const hasSpellcasting =
    character.spellcasting !== undefined && character.spellcasting !== null;

  // Load prepared spells on mount
  useEffect(() => {
    const loadPreparedSpells = async () => {
      if (!hasSpellcasting || !character.spellcasting?.prepared_spells) return;

      const spells = await Promise.all(
        character.spellcasting.prepared_spells.map(async (spellId) => {
          try {
            return await getSpell(spellId);
          } catch (error) {
            console.error(`Failed to load spell ${spellId}:`, error);
            return null;
          }
        })
      );

      setPreparedSpells(
        spells.filter((spell): spell is Spell => spell !== null)
      );
    };

    loadPreparedSpells();
  }, [character.spellcasting?.prepared_spells, getSpell, hasSpellcasting]);

  // Search spells based on filters
  const handleSearch = useCallback(async () => {
    if (
      !searchFilters.name &&
      !searchFilters.level &&
      !searchFilters.school &&
      !searchFilters.class
    ) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchSpells({
        name: searchFilters.name,
        level: searchFilters.level,
        school: searchFilters.school,
        classes: searchFilters.class,
        limit: 50,
      });
      setSearchResults(results);
    } catch (error) {
      console.error("Failed to search spells:", error);
    } finally {
      setIsSearching(false);
    }
  }, [searchFilters, searchSpells]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(handleSearch, 300);
    return () => clearTimeout(timer);
  }, [searchFilters, handleSearch]);

  // Prepare spell
  const handlePrepareSpell = async (spell: Spell) => {
    if (isReadOnly || !connected) return;

    try {
      const success = await prepareSpell(character._id, spell._id);
      if (success) {
        setPreparedSpells((prev) => [...prev, spell]);
      }
    } catch (error) {
      console.error("Failed to prepare spell:", error);
    }
  };

  // Unprepare spell
  const handleUnprepareSpell = async (spell: Spell) => {
    if (isReadOnly || !connected) return;

    try {
      // Fallback: Send generic spell event for unprepare
      const success = sendMessage("spell", {
        type: "spell",
        action: "unprepare", // This would need to be added to SpellEvent type
        character_id: character._id,
        data: { spell_id: spell._id },
      });

      if (success) {
        // Optimistic update - remove from local state immediately
        setPreparedSpells((prev) => prev.filter((s) => s._id !== spell._id));
      }
    } catch (error) {
      console.error("Failed to unprepare spell:", error);
    }
  };

  // Cast spell
  const handleCastSpell = async (spell: Spell, level: number) => {
    if (isReadOnly || !connected) return;

    try {
      const success = castSpell(character._id, spell._id, level);
      if (success) {
        // Spell cast successfully
        console.log(`Cast ${spell.name} at level ${level}`);
      }
    } catch (error) {
      console.error("Failed to cast spell:", error);
    }
  };

  // Reset spell slots
  const handleResetSpellSlots = async () => {
    if (isReadOnly || !connected) return;

    try {
      await resetSpellSlots(character._id);
    } catch (error) {
      console.error("Failed to reset spell slots:", error);
    }
  };

  // Calculate available spell slots
  const availableSpellSlots = Object.entries(
    character.spellcasting?.spell_slots || {}
  )
    .map(([level, slot]) => ({
      level: parseInt(level),
      ...slot,
      available: slot.total - slot.used,
    }))
    .filter((slot) => slot.total > 0);

  if (!hasSpellcasting) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Spellbook
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              This character does not have spellcasting abilities.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Spellbook
              {isLocked(character._id, "character") && (
                <Badge variant="secondary" className="text-xs">
                  Locked by {whoLocked(character._id, "character")}
                </Badge>
              )}
            </div>
            {!isReadOnly && connected && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetSpellSlots}
                className="flex items-center gap-1"
              >
                <RotateCcw className="h-4 w-4" />
                Reset Slots
              </Button>
            )}
          </CardTitle>
          <CardDescription>
            Manage your character&apos;s spells and spell slots
          </CardDescription>
          {socketError && (
            <Alert variant="destructive">
              <AlertDescription>{socketError}</AlertDescription>
            </Alert>
          )}
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="prepared">Prepared Spells</TabsTrigger>
              <TabsTrigger value="slots">Spell Slots</TabsTrigger>
              <TabsTrigger value="search">Find Spells</TabsTrigger>
            </TabsList>

            {/* Prepared Spells Tab */}
            <TabsContent value="prepared" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Prepared Spells ({preparedSpells.length})
                </h3>
              </div>

              {preparedSpells.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No spells prepared</p>
                  <p className="text-sm">
                    Use the &quot;Find Spells&quot; tab to prepare spells
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {preparedSpells.map((spell) => (
                    <Card
                      key={spell._id}
                      className="transition-colors hover:bg-muted/50"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">{spell.name}</h4>
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "text-white text-xs",
                                  spell.level === 0
                                    ? "bg-gray-500"
                                    : spell.level <= 2
                                    ? "bg-green-500"
                                    : spell.level <= 4
                                    ? "bg-blue-500"
                                    : spell.level <= 6
                                    ? "bg-purple-500"
                                    : spell.level <= 8
                                    ? "bg-red-500"
                                    : "bg-yellow-500"
                                )}
                              >
                                {spell.level === 0
                                  ? "Cantrip"
                                  : `Level ${spell.level}`}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {spell.school.substring(0, 3).toUpperCase()}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground mb-3">
                              <div>
                                <span className="font-medium">Cast Time:</span>
                                <br />
                                {spell.casting_time}
                              </div>
                              <div>
                                <span className="font-medium">Range:</span>
                                <br />
                                {spell.range}
                              </div>
                              <div>
                                <span className="font-medium">Duration:</span>
                                <br />
                                {spell.duration}
                              </div>
                            </div>

                            <p className="text-sm text-muted-foreground mb-3">
                              <span className="font-medium">Components:</span>{" "}
                              {spell.components}
                            </p>

                            <ScrollArea className="max-h-20">
                              <p className="text-sm">{spell.description}</p>
                            </ScrollArea>
                          </div>

                          <div className="flex flex-col gap-2 ml-4">
                            {!isReadOnly && (
                              <>
                                {/* Cast Spell Button */}
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      className="flex items-center gap-1"
                                      disabled={
                                        spell.level > 0 &&
                                        availableSpellSlots.every(
                                          (slot) => slot.available === 0
                                        )
                                      }
                                    >
                                      <Zap className="h-4 w-4" />
                                      Cast
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>
                                        Cast {spell.name}
                                      </DialogTitle>
                                      <DialogDescription>
                                        Choose the spell slot level to use
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      {spell.level === 0 ? (
                                        <div>
                                          <p className="text-sm text-muted-foreground mb-4">
                                            Cantrips don&apos;t require spell
                                            slots
                                          </p>
                                          <Button
                                            onClick={() =>
                                              handleCastSpell(spell, 0)
                                            }
                                            className="w-full"
                                          >
                                            Cast Cantrip
                                          </Button>
                                        </div>
                                      ) : (
                                        <div className="space-y-2">
                                          {availableSpellSlots
                                            .filter(
                                              (slot) =>
                                                slot.level >= spell.level &&
                                                slot.available > 0
                                            )
                                            .map((slot) => (
                                              <Button
                                                key={slot.level}
                                                variant="outline"
                                                onClick={() =>
                                                  handleCastSpell(
                                                    spell,
                                                    slot.level
                                                  )
                                                }
                                                className="w-full justify-between"
                                              >
                                                <span>
                                                  Level {slot.level} Slot
                                                </span>
                                                <span className="text-sm text-muted-foreground">
                                                  {slot.available} available
                                                </span>
                                              </Button>
                                            ))}
                                        </div>
                                      )}
                                    </div>
                                  </DialogContent>
                                </Dialog>

                                {/* Unprepare Spell Button */}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUnprepareSpell(spell)}
                                  className="flex items-center gap-1"
                                >
                                  <X className="h-4 w-4" />
                                  Remove
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Spell Slots Tab */}
            <TabsContent value="slots" className="space-y-4">
              <h3 className="text-lg font-semibold">Spell Slots</h3>

              {availableSpellSlots.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No spell slots available</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {availableSpellSlots.map((slot) => (
                    <Card key={slot.level}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">
                            Level {slot.level} Slots
                          </h4>
                          <span className="text-sm text-muted-foreground">
                            {slot.available} / {slot.total}
                          </span>
                        </div>
                        <Progress
                          value={(slot.available / slot.total) * 100}
                          className="h-2"
                        />
                        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                          <span>{slot.used} used</span>
                          <span>{slot.available} available</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Search Spells Tab */}
            <TabsContent value="search" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Find Spells</h3>

                {/* Search Filters */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Input
                    placeholder="Spell name..."
                    value={searchFilters.name || ""}
                    onChange={(e) =>
                      setSearchFilters((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    className="col-span-2"
                  />

                  <Select
                    value={searchFilters.level || ""}
                    onValueChange={(value) =>
                      setSearchFilters((prev) => ({ ...prev, level: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Levels</SelectItem>
                      {SPELL_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={searchFilters.school || ""}
                    onValueChange={(value) =>
                      setSearchFilters((prev) => ({ ...prev, school: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="School" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Schools</SelectItem>
                      {SPELL_SCHOOLS.map((school) => (
                        <SelectItem key={school} value={school}>
                          {school}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Search Results */}
                {isSearching ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">
                      Searching spells...
                    </p>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="grid gap-3">
                    {searchResults.map((spell) => (
                      <Card
                        key={spell._id}
                        className="transition-colors hover:bg-muted/50"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-medium">{spell.name}</h4>
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    "text-white text-xs",
                                    spell.level === 0
                                      ? "bg-gray-500"
                                      : spell.level <= 2
                                      ? "bg-green-500"
                                      : spell.level <= 4
                                      ? "bg-blue-500"
                                      : spell.level <= 6
                                      ? "bg-purple-500"
                                      : spell.level <= 8
                                      ? "bg-red-500"
                                      : "bg-yellow-500"
                                  )}
                                >
                                  {spell.level === 0
                                    ? "Cantrip"
                                    : `Level ${spell.level}`}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {spell.school.substring(0, 3).toUpperCase()}
                                </Badge>
                                {character.spellcasting?.prepared_spells?.includes(
                                  spell._id
                                ) && (
                                  <Badge variant="default" className="text-xs">
                                    Prepared
                                  </Badge>
                                )}
                              </div>

                              <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground mb-2">
                                <div>
                                  <span className="font-medium">
                                    Cast Time:
                                  </span>{" "}
                                  {spell.casting_time}
                                </div>
                                <div>
                                  <span className="font-medium">Range:</span>{" "}
                                  {spell.range}
                                </div>
                                <div>
                                  <span className="font-medium">Duration:</span>{" "}
                                  {spell.duration}
                                </div>
                              </div>

                              <ScrollArea className="max-h-16">
                                <p className="text-sm">{spell.description}</p>
                              </ScrollArea>
                            </div>

                            {!isReadOnly && (
                              <div className="ml-4">
                                {character.spellcasting?.prepared_spells?.includes(
                                  spell._id
                                ) ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleUnprepareSpell(spell)}
                                    className="flex items-center gap-1"
                                  >
                                    <X className="h-4 w-4" />
                                    Remove
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => handlePrepareSpell(spell)}
                                    className="flex items-center gap-1"
                                  >
                                    <Plus className="h-4 w-4" />
                                    Prepare
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : searchFilters.name ||
                  searchFilters.level ||
                  searchFilters.school ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No spells found</p>
                    <p className="text-sm">Try adjusting your search filters</p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Enter search criteria to find spells</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
