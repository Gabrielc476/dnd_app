// src/app/compendium/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Search,
  Filter,
  Star,
  Sword,
  Gem,
  Users,
  Zap,
  Eye,
  Plus,
  ExternalLink,
  Crown,
  Shield,
  Scroll,
} from "lucide-react";

import { Spell, Item, MonsterTemplate } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";
import { useCompendium } from "@/hooks/useCompendium";
import { useToast } from "@/hooks/use-toast";
import { formatModifier, parseCR } from "@/lib/utils";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CompendiumFilters {
  search: string;
  type: string;
  level: string;
  school: string;
  class: string;
  rarity: string;
  challengeRating: string;
  source: string;
}

export default function CompendiumPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const {
    isLoading,
    error,
    searchSpells,
    getSpell,
    searchItems,
    getItem,
    searchMonsters,
    getMonster,
    metadata,
  } = useCompendium();

  // State
  const [activeTab, setActiveTab] = useState("spells");
  const [filters, setFilters] = useState<CompendiumFilters>({
    search: "",
    type: "",
    level: "",
    school: "",
    class: "",
    rarity: "",
    challengeRating: "",
    source: "",
  });

  // Results
  const [spells, setSpells] = useState<Spell[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [monsters, setMonsters] = useState<MonsterTemplate[]>([]);

  // Selected item for detail view
  const [selectedSpell, setSelectedSpell] = useState<Spell | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [selectedMonster, setSelectedMonster] =
    useState<MonsterTemplate | null>(null);

  // Search results loading
  const [searchLoading, setSearchLoading] = useState(false);

  // Perform search when filters change
  useEffect(() => {
    const performSearch = async () => {
      if (
        !filters.search &&
        !filters.type &&
        !filters.level &&
        !filters.school &&
        !filters.class &&
        !filters.rarity &&
        !filters.challengeRating
      ) {
        setSpells([]);
        setItems([]);
        setMonsters([]);
        return;
      }

      setSearchLoading(true);

      try {
        if (activeTab === "spells") {
          const spellResults = await searchSpells({
            name: filters.search,
            level: filters.level ? parseInt(filters.level) : undefined,
            school: filters.school,
            classes: filters.class,
          });
          setSpells(spellResults);
        } else if (activeTab === "items") {
          const itemResults = await searchItems({
            name: filters.search,
            type: filters.type,
            rarity: filters.rarity,
          });
          setItems(itemResults);
        } else if (activeTab === "monsters") {
          const monsterResults = await searchMonsters({
            name: filters.search,
            type: filters.type,
            challenge_rating: filters.challengeRating,
          });
          setMonsters(monsterResults);
        }
      } catch (error) {
        toast({
          title: "Search Failed",
          description: "Failed to search compendium. Please try again.",
          variant: "destructive",
        });
      } finally {
        setSearchLoading(false);
      }
    };

    const debounceTimeout = setTimeout(performSearch, 300);
    return () => clearTimeout(debounceTimeout);
  }, [filters, activeTab, searchSpells, searchItems, searchMonsters, toast]);

  const handleFilterChange = (key: keyof CompendiumFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      type: "",
      level: "",
      school: "",
      class: "",
      rarity: "",
      challengeRating: "",
      source: "",
    });
  };

  const SpellCard = ({ spell }: { spell: Spell }) => (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{spell.name}</CardTitle>
            <CardDescription>
              Level {spell.level} {spell.school}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="secondary">Level {spell.level}</Badge>
            <Badge variant="outline" className="text-xs">
              {spell.school}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-sm space-y-1">
          <div>
            <strong>Casting Time:</strong> {spell.casting_time}
          </div>
          <div>
            <strong>Range:</strong> {spell.range}
          </div>
          <div>
            <strong>Duration:</strong> {spell.duration}
          </div>
        </div>
        <div className="text-sm">
          <strong>Classes:</strong> {spell.classes.join(", ")}
        </div>
        <div className="flex items-center justify-between pt-2">
          <Badge variant="outline" className="text-xs">
            {spell.source}
          </Badge>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Eye className="h-3 w-3 mr-1" />
                View
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Scroll className="h-5 w-5" />
                  {spell.name}
                </DialogTitle>
                <DialogDescription>
                  Level {spell.level} {spell.school} spell
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-96">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Casting Time:</strong> {spell.casting_time}
                    </div>
                    <div>
                      <strong>Range:</strong> {spell.range}
                    </div>
                    <div>
                      <strong>Components:</strong> {spell.components}
                    </div>
                    <div>
                      <strong>Duration:</strong> {spell.duration}
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {spell.description}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Available To</h4>
                    <div className="flex flex-wrap gap-1">
                      {spell.classes.map((cls) => (
                        <Badge
                          key={cls}
                          variant="secondary"
                          className="text-xs"
                        >
                          {cls}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );

  const ItemCard = ({ item }: { item: Item }) => (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{item.name}</CardTitle>
            <CardDescription>{item.type}</CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge
              variant={
                item.rarity === "Legendary"
                  ? "destructive"
                  : item.rarity === "Very Rare"
                  ? "default"
                  : item.rarity === "Rare"
                  ? "secondary"
                  : "outline"
              }
            >
              {item.rarity}
            </Badge>
            {item.requires_attunement && (
              <Badge variant="outline" className="text-xs">
                Attunement
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-sm space-y-1">
          {item.weight && (
            <div>
              <strong>Weight:</strong> {item.weight} lbs
            </div>
          )}
          {item.value && (
            <div>
              <strong>Value:</strong> {item.value} gp
            </div>
          )}
        </div>
        {item.properties.length > 0 && (
          <div>
            <div className="text-sm mb-1">
              <strong>Properties:</strong>
            </div>
            <div className="flex flex-wrap gap-1">
              {item.properties.slice(0, 3).map((prop) => (
                <Badge key={prop} variant="outline" className="text-xs">
                  {prop}
                </Badge>
              ))}
              {item.properties.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{item.properties.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}
        <div className="flex items-center justify-between pt-2">
          <Badge variant="outline" className="text-xs">
            {item.source}
          </Badge>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Eye className="h-3 w-3 mr-1" />
                View
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Gem className="h-5 w-5" />
                  {item.name}
                </DialogTitle>
                <DialogDescription>
                  {item.rarity} {item.type}
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-96">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Type:</strong> {item.type}
                    </div>
                    <div>
                      <strong>Rarity:</strong> {item.rarity}
                    </div>
                    {item.weight && (
                      <div>
                        <strong>Weight:</strong> {item.weight} lbs
                      </div>
                    )}
                    {item.value && (
                      <div>
                        <strong>Value:</strong> {item.value} gp
                      </div>
                    )}
                  </div>
                  {item.requires_attunement && (
                    <Badge variant="outline">Requires Attunement</Badge>
                  )}
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {item.description}
                    </p>
                  </div>
                  {item.properties.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Properties</h4>
                      <div className="flex flex-wrap gap-1">
                        {item.properties.map((prop) => (
                          <Badge
                            key={prop}
                            variant="secondary"
                            className="text-xs"
                          >
                            {prop}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );

  const MonsterCard = ({ monster }: { monster: MonsterTemplate }) => (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{monster.name}</CardTitle>
            <CardDescription>
              {monster.size} {monster.type}, {monster.alignment}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="secondary">CR {monster.challenge_rating}</Badge>
            <Badge variant="outline" className="text-xs">
              {monster.type}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center">
            <div className="font-medium">AC</div>
            <div className="text-muted-foreground">{monster.armor_class}</div>
          </div>
          <div className="text-center">
            <div className="font-medium">HP</div>
            <div className="text-muted-foreground">{monster.hit_points}</div>
          </div>
          <div className="text-center">
            <div className="font-medium">Speed</div>
            <div className="text-muted-foreground">
              {Object.entries(monster.speed)
                .map(
                  ([type, value]) =>
                    `${value}${type === "walk" ? "" : ` ${type}`}`
                )
                .join(", ")}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-6 gap-1 text-xs">
          <div className="text-center">
            <div className="font-medium">STR</div>
            <div className="text-muted-foreground">
              {monster.strength} ({formatModifier(monster.strength)})
            </div>
          </div>
          <div className="text-center">
            <div className="font-medium">DEX</div>
            <div className="text-muted-foreground">
              {monster.dexterity} ({formatModifier(monster.dexterity)})
            </div>
          </div>
          <div className="text-center">
            <div className="font-medium">CON</div>
            <div className="text-muted-foreground">
              {monster.constitution} ({formatModifier(monster.constitution)})
            </div>
          </div>
          <div className="text-center">
            <div className="font-medium">INT</div>
            <div className="text-muted-foreground">
              {monster.intelligence} ({formatModifier(monster.intelligence)})
            </div>
          </div>
          <div className="text-center">
            <div className="font-medium">WIS</div>
            <div className="text-muted-foreground">
              {monster.wisdom} ({formatModifier(monster.wisdom)})
            </div>
          </div>
          <div className="text-center">
            <div className="font-medium">CHA</div>
            <div className="text-muted-foreground">
              {monster.charisma} ({formatModifier(monster.charisma)})
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <Badge variant="outline" className="text-xs">
            {monster.source}
          </Badge>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Eye className="h-3 w-3 mr-1" />
                View
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {monster.name}
                </DialogTitle>
                <DialogDescription>
                  {monster.size} {monster.type}, {monster.alignment}
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-96">
                <div className="space-y-4">
                  {/* Basic Stats */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Armor Class:</strong> {monster.armor_class}{" "}
                      {monster.armor_desc && `(${monster.armor_desc})`}
                    </div>
                    <div>
                      <strong>Hit Points:</strong> {monster.hit_points} (
                      {monster.hit_dice})
                    </div>
                    <div>
                      <strong>Speed:</strong>{" "}
                      {Object.entries(monster.speed)
                        .map(
                          ([type, value]) =>
                            `${value}ft ${type === "walk" ? "" : type}`
                        )
                        .join(", ")}
                    </div>
                    <div>
                      <strong>Challenge:</strong> {monster.challenge_rating}
                    </div>
                  </div>

                  {/* Ability Scores */}
                  <div>
                    <h4 className="font-medium mb-2">Ability Scores</h4>
                    <div className="grid grid-cols-6 gap-2 text-center text-sm">
                      <div>
                        <div className="font-medium">STR</div>
                        <div>
                          {monster.strength} ({formatModifier(monster.strength)}
                          )
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">DEX</div>
                        <div>
                          {monster.dexterity} (
                          {formatModifier(monster.dexterity)})
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">CON</div>
                        <div>
                          {monster.constitution} (
                          {formatModifier(monster.constitution)})
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">INT</div>
                        <div>
                          {monster.intelligence} (
                          {formatModifier(monster.intelligence)})
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">WIS</div>
                        <div>
                          {monster.wisdom} ({formatModifier(monster.wisdom)})
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">CHA</div>
                        <div>
                          {monster.charisma} ({formatModifier(monster.charisma)}
                          )
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    {monster.senses && (
                      <div>
                        <strong>Senses:</strong> {monster.senses}
                      </div>
                    )}
                    {monster.languages && (
                      <div>
                        <strong>Languages:</strong> {monster.languages}
                      </div>
                    )}
                    {monster.damage_resistances.length > 0 && (
                      <div>
                        <strong>Damage Resistances:</strong>{" "}
                        {monster.damage_resistances.join(", ")}
                      </div>
                    )}
                    {monster.damage_immunities.length > 0 && (
                      <div>
                        <strong>Damage Immunities:</strong>{" "}
                        {monster.damage_immunities.join(", ")}
                      </div>
                    )}
                    {monster.condition_immunities.length > 0 && (
                      <div>
                        <strong>Condition Immunities:</strong>{" "}
                        {monster.condition_immunities.join(", ")}
                      </div>
                    )}
                  </div>

                  {/* Traits */}
                  {monster.traits.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Traits</h4>
                      <div className="space-y-2">
                        {monster.traits.map((trait, index) => (
                          <div key={index} className="text-sm">
                            <strong>{trait.name}.</strong> {trait.description}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  {monster.actions.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Actions</h4>
                      <div className="space-y-2">
                        {monster.actions.map((action, index) => (
                          <div key={index} className="text-sm">
                            <strong>{action.name}.</strong> {action.description}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Legendary Actions */}
                  {monster.legendary_actions.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Legendary Actions</h4>
                      <div className="space-y-2">
                        {monster.legendary_actions.map((action, index) => (
                          <div key={index} className="text-sm">
                            <strong>{action.name}.</strong> {action.description}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Error loading compendium: {error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-8 w-8" />
            D&D Compendium
          </h1>
          <p className="text-muted-foreground">
            Browse spells, items, and monsters from the D&D 5e rulebooks
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search the compendium..."
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Tab-specific Filters */}
            <div className="flex flex-wrap gap-2">
              {activeTab === "spells" && (
                <>
                  <Select
                    value={filters.level}
                    onValueChange={(value) =>
                      handleFilterChange("level", value)
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Levels</SelectItem>
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => (
                        <SelectItem key={level} value={level.toString()}>
                          {level === 0 ? "Cantrip" : `Level ${level}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={filters.school}
                    onValueChange={(value) =>
                      handleFilterChange("school", value)
                    }
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="School" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Schools</SelectItem>
                      {metadata.spellSchools.map((school) => (
                        <SelectItem key={school} value={school}>
                          {school}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={filters.class}
                    onValueChange={(value) =>
                      handleFilterChange("class", value)
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Classes</SelectItem>
                      {metadata.spellClasses.map((cls) => (
                        <SelectItem key={cls} value={cls}>
                          {cls}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}

              {activeTab === "items" && (
                <>
                  <Select
                    value={filters.type}
                    onValueChange={(value) => handleFilterChange("type", value)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Types</SelectItem>
                      {metadata.itemTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={filters.rarity}
                    onValueChange={(value) =>
                      handleFilterChange("rarity", value)
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Rarity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Rarities</SelectItem>
                      {metadata.itemRarities.map((rarity) => (
                        <SelectItem key={rarity} value={rarity}>
                          {rarity}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}

              {activeTab === "monsters" && (
                <>
                  <Select
                    value={filters.type}
                    onValueChange={(value) => handleFilterChange("type", value)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Types</SelectItem>
                      {metadata.monsterTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={filters.challengeRating}
                    onValueChange={(value) =>
                      handleFilterChange("challengeRating", value)
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="CR" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All CRs</SelectItem>
                      {metadata.challengeRatings.map((cr) => (
                        <SelectItem key={cr} value={cr}>
                          CR {cr}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}

              <Button variant="outline" onClick={resetFilters}>
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="spells" className="flex items-center gap-2">
            <Scroll className="h-4 w-4" />
            Spells
          </TabsTrigger>
          <TabsTrigger value="items" className="flex items-center gap-2">
            <Gem className="h-4 w-4" />
            Items
          </TabsTrigger>
          <TabsTrigger value="monsters" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Monsters
          </TabsTrigger>
        </TabsList>

        <TabsContent value="spells" className="space-y-4">
          {searchLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-20 bg-muted rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : spells.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-12">
                <Scroll className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {filters.search ||
                  filters.level ||
                  filters.school ||
                  filters.class
                    ? "No spells found"
                    : "Search for spells"}
                </h3>
                <p className="text-muted-foreground text-center">
                  {filters.search ||
                  filters.level ||
                  filters.school ||
                  filters.class
                    ? "Try adjusting your search criteria"
                    : "Use the search bar above to find spells by name, level, school, or class"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {spells.map((spell) => (
                <SpellCard key={spell._id} spell={spell} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="items" className="space-y-4">
          {searchLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-20 bg-muted rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : items.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-12">
                <Gem className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {filters.search || filters.type || filters.rarity
                    ? "No items found"
                    : "Search for items"}
                </h3>
                <p className="text-muted-foreground text-center">
                  {filters.search || filters.type || filters.rarity
                    ? "Try adjusting your search criteria"
                    : "Use the search bar above to find items by name, type, or rarity"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <ItemCard key={item._id} item={item} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="monsters" className="space-y-4">
          {searchLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-24 bg-muted rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : monsters.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {filters.search || filters.type || filters.challengeRating
                    ? "No monsters found"
                    : "Search for monsters"}
                </h3>
                <p className="text-muted-foreground text-center">
                  {filters.search || filters.type || filters.challengeRating
                    ? "Try adjusting your search criteria"
                    : "Use the search bar above to find monsters by name, type, or challenge rating"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {monsters.map((monster) => (
                <MonsterCard key={monster._id} monster={monster} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
