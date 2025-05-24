// ========================================
// components/spells/SpellSearchFilters.tsx
// ========================================

import React from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SpellSearchFiltersProps {
  filters: SpellSearchFilters;
  onFiltersChange: (filters: SpellSearchFilters) => void;
}

export function SpellSearchFilters({
  filters,
  onFiltersChange,
}: SpellSearchFiltersProps) {
  const updateFilter = (key: keyof SpellSearchFilters, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Input
        placeholder="Spell name..."
        value={filters.name || ""}
        onChange={(e) => updateFilter("name", e.target.value)}
        className="col-span-2"
      />

      <Select
        value={filters.level || ""}
        onValueChange={(value) => updateFilter("level", value)}
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
        value={filters.school || ""}
        onValueChange={(value) => updateFilter("school", value)}
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
  );
}
