// src/components/npc/search/NPCSearch.tsx

import React from "react";
import { Search, Filter, X, RotateCcw } from "lucide-react";
import { NPCSearchProps } from "../types";

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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export function NPCSearch({
  filters,
  onFiltersChange,
  onSearch,
  onReset,
  suggestions = [],
  isLoading = false,
}: NPCSearchProps) {
  const hasActiveFilters = Object.values(filters).some(
    (value) => value && value !== "all"
  );

  const handleFilterChange = (key: keyof typeof filters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const clearFilter = (key: keyof typeof filters) => {
    onFiltersChange({
      ...filters,
      [key]: undefined,
    });
  };

  return (
    <div className="flex items-center gap-2">
      {/* Advanced Filters Popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="relative">
            <Filter className="h-4 w-4 mr-1" />
            Filters
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-xs">
                !
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Advanced Filters</h4>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={onReset}>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reset
                </Button>
              )}
            </div>

            <Separator />

            {/* Challenge Rating Filter */}
            <div className="space-y-2">
              <Label>Challenge Rating</Label>
              <Select
                value={(filters.challengeRating as string) || ""}
                onValueChange={(value) =>
                  handleFilterChange("challengeRating", value || undefined)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Challenge Ratings" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Challenge Ratings</SelectItem>
                  <SelectItem value="0">CR 0</SelectItem>
                  <SelectItem value="1/8">CR 1/8</SelectItem>
                  <SelectItem value="1/4">CR 1/4</SelectItem>
                  <SelectItem value="1/2">CR 1/2</SelectItem>
                  <SelectItem value="1">CR 1</SelectItem>
                  <SelectItem value="2">CR 2</SelectItem>
                  <SelectItem value="3">CR 3</SelectItem>
                  <SelectItem value="4">CR 4</SelectItem>
                  <SelectItem value="5">CR 5</SelectItem>
                  <SelectItem value="10+">CR 10+</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Creature Type Filter */}
            <div className="space-y-2">
              <Label>Creature Type</Label>
              <Select
                value={(filters.creatureType as string) || ""}
                onValueChange={(value) =>
                  handleFilterChange("creatureType", value || undefined)
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

            {/* Source Filter */}
            <div className="space-y-2">
              <Label>Source</Label>
              <Select
                value={(filters.source as string) || "all"}
                onValueChange={(value) =>
                  handleFilterChange(
                    "source",
                    value === "all" ? undefined : value
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="custom">Custom NPCs</SelectItem>
                  <SelectItem value="compendium">Compendium NPCs</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={(filters.status as string) || "all"}
                onValueChange={(value) =>
                  handleFilterChange(
                    "status",
                    value === "all" ? undefined : value
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="alive">Alive</SelectItem>
                  <SelectItem value="dead">Dead</SelectItem>
                  <SelectItem value="unconscious">Unconscious</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex items-center gap-1 flex-wrap">
          {filters.challengeRating && (
            <Badge variant="secondary" className="text-xs">
              CR {filters.challengeRating}
              <button
                onClick={() => clearFilter("challengeRating")}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.creatureType && (
            <Badge variant="secondary" className="text-xs">
              {filters.creatureType}
              <button
                onClick={() => clearFilter("creatureType")}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.source && filters.source !== "all" && (
            <Badge variant="secondary" className="text-xs">
              {filters.source === "custom" ? "Custom" : "Compendium"}
              <button
                onClick={() => clearFilter("source")}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.status && filters.status !== "all" && (
            <Badge variant="secondary" className="text-xs">
              {filters.status}
              <button
                onClick={() => clearFilter("status")}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
