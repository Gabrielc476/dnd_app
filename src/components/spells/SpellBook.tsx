// ========================================
// components/spells/SpellBook.tsx (MAIN COMPONENT)
// ========================================

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { RotateCcw, BookOpen } from "lucide-react";
import { Character, Spell } from "@/lib/types";
import { SpellSlot, SpellFilters } from "./types";
import { PreparedSpellsList } from "./PreparedSpellsList";
import { SpellSlotsList } from "./SpellSlotsList";
import { SpellSearchFilters } from "./SpellSearchFilters";
import { SpellSearchResults } from "./SpellSearchResults";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TooltipProvider } from "@/components/ui/tooltip";

interface SpellBookProps {
  character: Character;
  campaignId: string;
  userId: string;
  isReadOnly?: boolean;
}

export function SpellBook({
  character,
  campaignId,
  userId,
  isReadOnly = false,
}: SpellBookProps) {
  const [activeTab, setActiveTab] = useState("prepared");
  const [searchFilters, setSearchFilters] = useState<SpellFilters>({});
  const [searchResults, setSearchResults] = useState<Spell[]>([]);
  const [preparedSpells, setPreparedSpells] = useState<Spell[]>([]);
  const [isSearching, setIsSearching] = useState(false);

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

  // Event handlers
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

  const handleUnprepareSpell = async (spell: Spell) => {
    if (isReadOnly || !connected) return;
    try {
      const success = sendMessage("spell", {
        type: "spell",
        action: "unprepare",
        character_id: character._id,
        data: { spell_id: spell._id },
      });
      if (success) {
        setPreparedSpells((prev) => prev.filter((s) => s._id !== spell._id));
      }
    } catch (error) {
      console.error("Failed to unprepare spell:", error);
    }
  };

  const handleCastSpell = async (spell: Spell, level: number) => {
    if (isReadOnly || !connected) return;
    try {
      const success = castSpell(character._id, spell._id, level);
      if (success) {
        console.log(`Cast ${spell.name} at level ${level}`);
      }
    } catch (error) {
      console.error("Failed to cast spell:", error);
    }
  };

  const handleResetSpellSlots = async () => {
    if (isReadOnly || !connected) return;
    try {
      await resetSpellSlots(character._id);
    } catch (error) {
      console.error("Failed to reset spell slots:", error);
    }
  };

  // Calculate available spell slots
  const availableSpellSlots: SpellSlot[] = Object.entries(
    character.spellcasting?.spell_slots || {}
  )
    .map(([level, slot]) => ({
      level: parseInt(level),
      used: slot.used,
      total: slot.total,
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

  const hasSearchCriteria = !!(
    searchFilters.name ||
    searchFilters.level ||
    searchFilters.school ||
    searchFilters.class
  );

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
            Manage your character's spells and spell slots
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

            <TabsContent value="prepared" className="space-y-4">
              <PreparedSpellsList
                spells={preparedSpells}
                availableSpellSlots={availableSpellSlots}
                isReadOnly={isReadOnly}
                onCastSpell={handleCastSpell}
                onUnprepareSpell={handleUnprepareSpell}
              />
            </TabsContent>

            <TabsContent value="slots" className="space-y-4">
              <SpellSlotsList spellSlots={availableSpellSlots} />
            </TabsContent>

            <TabsContent value="search" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Find Spells</h3>

                <SpellSearchFilters
                  filters={searchFilters}
                  onFiltersChange={setSearchFilters}
                />

                <SpellSearchResults
                  searchResults={searchResults}
                  preparedSpellIds={
                    character.spellcasting?.prepared_spells || []
                  }
                  isSearching={isSearching}
                  hasSearchCriteria={hasSearchCriteria}
                  isReadOnly={isReadOnly}
                  onPrepareSpell={handlePrepareSpell}
                  onUnprepareSpell={handleUnprepareSpell}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
