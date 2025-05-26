// ========================================
// components/spells/SpellSearchResults.tsx
// ========================================

import React from "react";
import { Search, BookOpen } from "lucide-react";
import { Spell } from "@/lib/types";
import { SearchSpellCard } from "./SearchSpellCard";

interface SpellSearchResultsProps {
  searchResults: Spell[];
  preparedSpellIds: string[];
  isSearching: boolean;
  hasSearchCriteria: boolean;
  isReadOnly?: boolean;
  onPrepareSpell: (spell: Spell) => void;
  onUnprepareSpell: (spell: Spell) => void;
}

export function SpellSearchResults({
  searchResults,
  preparedSpellIds,
  isSearching,
  hasSearchCriteria,
  isReadOnly = false,
  onPrepareSpell,
  onUnprepareSpell,
}: SpellSearchResultsProps) {
  if (isSearching) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Searching spells...</p>
      </div>
    );
  }

  if (searchResults.length > 0) {
    return (
      <div className="grid gap-3">
        {searchResults.map((spell) => (
          <SearchSpellCard
            key={spell._id}
            spell={spell}
            isPrepared={preparedSpellIds.includes(spell._id)}
            isReadOnly={isReadOnly}
            onPrepareSpell={onPrepareSpell}
            onUnprepareSpell={onUnprepareSpell}
          />
        ))}
      </div>
    );
  }

  if (hasSearchCriteria) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No spells found</p>
        <p className="text-sm">Try adjusting your search filters</p>
      </div>
    );
  }

  return (
    <div className="text-center py-8 text-muted-foreground">
      <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p>Enter search criteria to find spells</p>
    </div>
  );
}
