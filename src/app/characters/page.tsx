// src/app/characters/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Filter,
  Users,
  User,
  Sword,
  Shield,
  Heart,
  Star,
  Edit,
  Trash2,
  Eye,
  Copy,
  Grid3X3,
  List,
  SortAsc,
  SortDesc,
} from "lucide-react";

import { Character, CharacterListItem } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";
import { useCharacter } from "@/hooks/useCharacter";
import { useGameStore } from "@/stores/gameStore";
import { useToast } from "@/hooks/use-toast";
import { formatModifier, getHPColorClass } from "@/lib/utils";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type ViewMode = "grid" | "list";
type SortField = "name" | "level" | "class" | "race" | "campaign";
type SortOrder = "asc" | "desc";

interface CharacterFilters {
  search: string;
  class: string;
  race: string;
  level: string;
  campaign: string;
}

export default function CharactersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const { currentCampaign, campaigns } = useGameStore();

  // Character management hook
  const {
    characters,
    character: selectedCharacter,
    isLoading,
    error,
    fetchCharacters,
    fetchCharacter,
    deleteCharacter,
  } = useCharacter({
    campaignId: "", // We'll fetch all user characters
    userId: user?.id || "",
  });

  // Local state
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [filters, setFilters] = useState<CharacterFilters>({
    search: "",
    class: "all",
    race: "all",
    level: "all",
    campaign: "all",
  });
  const [filteredCharacters, setFilteredCharacters] = useState<
    CharacterListItem[]
  >([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [characterToDelete, setCharacterToDelete] =
    useState<CharacterListItem | null>(null);

  // Load characters on mount
  useEffect(() => {
    if (user) {
      fetchCharacters();
    }
  }, [user, fetchCharacters]);

  // Filter and sort characters
  useEffect(() => {
    let filtered = [...characters];

    // Apply filters
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (char) =>
          char.name.toLowerCase().includes(searchLower) ||
          char.class.toLowerCase().includes(searchLower) ||
          char.race.toLowerCase().includes(searchLower)
      );
    }

    if (filters.class && filters.class !== "all") {
      filtered = filtered.filter((char) => char.class === filters.class);
    }

    if (filters.race && filters.race !== "all") {
      filtered = filtered.filter((char) => char.race === filters.race);
    }

    if (filters.level && filters.level !== "all") {
      const level = parseInt(filters.level);
      filtered = filtered.filter((char) => char.level === level);
    }

    if (filters.campaign && filters.campaign !== "all") {
      filtered = filtered.filter(
        (char) => char.campaign_id === filters.campaign
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case "name":
          aValue = a.name;
          bValue = b.name;
          break;
        case "level":
          aValue = a.level;
          bValue = b.level;
          break;
        case "class":
          aValue = a.class;
          bValue = b.class;
          break;
        case "race":
          aValue = a.race;
          bValue = b.race;
          break;
        default:
          aValue = a.name;
          bValue = b.name;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortOrder === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortOrder === "asc"
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number);
      }
    });

    setFilteredCharacters(filtered);
  }, [characters, filters, sortField, sortOrder]);

  // Get unique values for filter dropdowns
  const uniqueClasses = [...new Set(characters.map((c) => c.class))].sort();
  const uniqueRaces = [...new Set(characters.map((c) => c.race))].sort();
  const uniqueLevels = [...new Set(characters.map((c) => c.level))].sort(
    (a, b) => a - b
  );

  const handleCreateCharacter = () => {
    router.push("/characters/create");
  };

  const handleViewCharacter = (characterId: string) => {
    router.push(`/characters/${characterId}`);
  };

  const handleEditCharacter = (characterId: string) => {
    router.push(`/characters/${characterId}/edit`);
  };

  const handleDuplicateCharacter = (characterId: string) => {
    router.push(`/characters/${characterId}/duplicate`);
  };

  const handleDeleteCharacter = (character: CharacterListItem) => {
    setCharacterToDelete(character);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteCharacter = async () => {
    if (!characterToDelete) return;

    const success = await deleteCharacter(characterToDelete._id);
    if (success) {
      toast({
        title: "Character Deleted",
        description: `${characterToDelete.name} has been deleted`,
      });
      setDeleteDialogOpen(false);
      setCharacterToDelete(null);
    } else {
      toast({
        title: "Delete Failed",
        description: "Failed to delete character. Please try again.",
        variant: "destructive",
      });
    }
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      class: "all",
      race: "all",
      level: "all",
      campaign: "all",
    });
  };

  const CharacterCard = ({ character }: { character: CharacterListItem }) => {
    const hpPercentage = (character.hp.current / character.hp.max) * 100;

    return (
      <Card className="hover:shadow-md transition-shadow group">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <Avatar>
                <AvatarFallback>
                  {character.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg">{character.name}</CardTitle>
                <CardDescription>
                  Level {character.level} {character.race} {character.class}
                </CardDescription>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100"
                >
                  •••
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => handleViewCharacter(character._id)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleEditCharacter(character._id)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDuplicateCharacter(character._id)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleDeleteCharacter(character)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Health Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center">
                <Heart className="h-3 w-3 mr-1" />
                HP
              </span>
              <span
                className={getHPColorClass(
                  character.hp.current,
                  character.hp.max
                )}
              >
                {character.hp.current}/{character.hp.max}
              </span>
            </div>
            <Progress value={hpPercentage} className="h-2" />
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <div className="font-medium">AC</div>
              <div className="text-muted-foreground">15</div>
            </div>
            <div className="text-center">
              <div className="font-medium">Init</div>
              <div className="text-muted-foreground">+2</div>
            </div>
            <div className="text-center">
              <div className="font-medium">Speed</div>
              <div className="text-muted-foreground">30ft</div>
            </div>
          </div>

          {/* Campaign Badge */}
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs">
              {campaigns.find((c) => c._id === character.campaign_id)?.name ||
                "Unknown Campaign"}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleViewCharacter(character._id)}
            >
              View
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const CharacterListItem = ({
    character,
  }: {
    character: CharacterListItem;
  }) => {
    const hpPercentage = (character.hp.current / character.hp.max) * 100;

    return (
      <Card className="hover:shadow-sm transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="h-10 w-10">
                <AvatarFallback>
                  {character.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium">{character.name}</h3>
                <p className="text-sm text-muted-foreground">
                  Level {character.level} {character.race} {character.class}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* HP Display */}
              <div className="text-right">
                <div className="text-sm font-medium">
                  <span
                    className={getHPColorClass(
                      character.hp.current,
                      character.hp.max
                    )}
                  >
                    {character.hp.current}/{character.hp.max}
                  </span>
                </div>
                <Progress value={hpPercentage} className="h-1 w-16" />
              </div>

              {/* Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    •••
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handleViewCharacter(character._id)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleEditCharacter(character._id)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDuplicateCharacter(character._id)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleDeleteCharacter(character)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Error loading characters: {error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Characters</h1>
          <p className="text-muted-foreground">
            Manage and view your D&D characters
          </p>
        </div>
        <Button onClick={handleCreateCharacter}>
          <Plus className="h-4 w-4 mr-2" />
          Create Character
        </Button>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search characters..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, search: e.target.value }))
                  }
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <Select
                value={filters.class}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, class: value }))
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {uniqueClasses.map((cls) => (
                    <SelectItem key={cls} value={cls}>
                      {cls}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.race}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, race: value }))
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Race" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Races</SelectItem>
                  {uniqueRaces.map((race) => (
                    <SelectItem key={race} value={race}>
                      {race}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.level}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, level: value }))
                }
              >
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  {uniqueLevels.map((level) => (
                    <SelectItem key={level} value={level.toString()}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={resetFilters}>
                Clear
              </Button>
            </div>

            {/* View Controls */}
            <div className="flex items-center gap-2">
              <Select
                value={`${sortField}-${sortOrder}`}
                onValueChange={(value) => {
                  const [field, order] = value.split("-") as [
                    SortField,
                    SortOrder
                  ];
                  setSortField(field);
                  setSortOrder(order);
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name-asc">Name A-Z</SelectItem>
                  <SelectItem value="name-desc">Name Z-A</SelectItem>
                  <SelectItem value="level-desc">Level High-Low</SelectItem>
                  <SelectItem value="level-asc">Level Low-High</SelectItem>
                  <SelectItem value="class-asc">Class A-Z</SelectItem>
                  <SelectItem value="race-asc">Race A-Z</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setViewMode(viewMode === "grid" ? "list" : "grid")
                }
              >
                {viewMode === "grid" ? (
                  <List className="h-4 w-4" />
                ) : (
                  <Grid3X3 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Characters Grid/List */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 bg-muted rounded-full"></div>
                  <div>
                    <div className="h-4 bg-muted rounded w-24 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-32"></div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-2 bg-muted rounded"></div>
                  <div className="h-8 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredCharacters.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <User className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {characters.length === 0
                ? "No characters yet"
                : "No characters match your filters"}
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {characters.length === 0
                ? "Create your first character to begin your adventure"
                : "Try adjusting your search filters or create a new character"}
            </p>
            <div className="flex gap-2">
              {characters.length > 0 && (
                <Button variant="outline" onClick={resetFilters}>
                  Clear Filters
                </Button>
              )}
              <Button onClick={handleCreateCharacter}>
                <Plus className="h-4 w-4 mr-2" />
                Create Character
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              : "space-y-2"
          }
        >
          {filteredCharacters.map((character) =>
            viewMode === "grid" ? (
              <CharacterCard key={character._id} character={character} />
            ) : (
              <CharacterListItem key={character._id} character={character} />
            )
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Character</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{characterToDelete?.name}"? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteCharacter}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
