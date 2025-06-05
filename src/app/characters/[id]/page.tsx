// src/app/characters/[id]/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Edit,
  Copy,
  Trash2,
  Settings,
  Share2,
  Download,
  User,
  Shield,
  Crown,
} from "lucide-react";

import { Character } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";
import { useCharacter } from "@/hooks/useCharacter";
import { useGameStore } from "@/stores/gameStore";
import { useToast } from "@/hooks/use-toast";
import { CharacterSheet } from "@/components/character/charactersheet";
import { SpellBook } from "@/components/spells";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export default function CharacterDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const { currentCampaign, isUserDM } = useGameStore();
  const { toast } = useToast();

  const characterId = params?.id as string;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("sheet");

  const { character, isLoading, error, fetchCharacter, deleteCharacter } =
    useCharacter({
      campaignId: currentCampaign?._id || "",
      userId: user?.id || "",
      characterId,
    });

  useEffect(() => {
    if (characterId && user) {
      fetchCharacter(characterId);
    }
  }, [characterId, user, fetchCharacter]);

  const handleEdit = () => {
    router.push(`/characters/${characterId}/edit`);
  };

  const handleDuplicate = () => {
    router.push(`/characters/${characterId}/duplicate`);
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!character) return;

    const success = await deleteCharacter(characterId);
    if (success) {
      toast({
        title: "Character Deleted",
        description: `${character.name} has been deleted`,
      });
      router.push("/characters");
    } else {
      toast({
        title: "Delete Failed",
        description: "Failed to delete character. Please try again.",
        variant: "destructive",
      });
    }
    setDeleteDialogOpen(false);
  };

  const handleShare = async () => {
    if (!character) return;

    try {
      await navigator.share({
        title: `${character.name} - D&D Character`,
        text: `Check out my D&D character: ${character.name}, a level ${character.level} ${character.race} ${character.class}`,
        url: window.location.href,
      });
    } catch (error) {
      // Fallback to copying URL
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link Copied",
        description: "Character link copied to clipboard",
      });
    }
  };

  const handleExport = () => {
    if (!character) return;

    const dataStr = JSON.stringify(character, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${character.name
      .toLowerCase()
      .replace(/\s+/g, "-")}-character.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Character Exported",
      description: "Character data has been downloaded",
    });
  };

  // Check if user can edit this character
  const canEdit = character && (character.owner_id === user?.id || isUserDM);

  const canDelete = character && character.owner_id === user?.id;

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <Alert variant="destructive">
          <AlertDescription>Error loading character: {error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading || !character) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback>
                {character.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {character.name}
              </h1>
              <p className="text-muted-foreground">
                Level {character.level} {character.race} {character.class}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Character Status Badges */}
          <Badge variant="outline">
            {character.owner_id === user?.id ? (
              <>
                <User className="h-3 w-3 mr-1" />
                Your Character
              </>
            ) : (
              <>
                <Shield className="h-3 w-3 mr-1" />
                Party Member
              </>
            )}
          </Badge>

          {isUserDM && (
            <Badge variant="secondary">
              <Crown className="h-3 w-3 mr-1" />
              DM View
            </Badge>
          )}

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {canEdit && (
                <DropdownMenuItem onClick={handleEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Character
                </DropdownMenuItem>
              )}

              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>

              <DropdownMenuItem onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </DropdownMenuItem>

              <DropdownMenuItem onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </DropdownMenuItem>

              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Character Content */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="sheet">Character Sheet</TabsTrigger>
          {character.spellcasting && (
            <TabsTrigger value="spells">Spellbook</TabsTrigger>
          )}
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="sheet">
          <CharacterSheet
            characterId={characterId}
            campaignId={currentCampaign?._id || ""}
            userId={user?.id || ""}
            isReadOnly={!canEdit}
          />
        </TabsContent>

        {character.spellcasting && (
          <TabsContent value="spells">
            <SpellBook
              character={character}
              campaignId={currentCampaign?._id || ""}
              userId={user?.id || ""}
              isReadOnly={!canEdit}
            />
          </TabsContent>
        )}

        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle>Character Notes</CardTitle>
              <CardDescription>
                Personal notes, background details, and campaign memories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Background */}
                <div>
                  <h4 className="font-medium mb-2">Background</h4>
                  <p className="text-sm text-muted-foreground">
                    {character.background || "No background specified"}
                  </p>
                </div>

                {/* Alignment */}
                <div>
                  <h4 className="font-medium mb-2">Alignment</h4>
                  <p className="text-sm text-muted-foreground">
                    {character.alignment || "No alignment specified"}
                  </p>
                </div>

                {/* Features */}
                {character.features && character.features.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Features & Traits</h4>
                    <div className="space-y-2">
                      {character.features.map((feature, index) => (
                        <div key={index} className="border rounded-lg p-3">
                          <h5 className="font-medium text-sm">
                            {feature.name}
                          </h5>
                          <p className="text-xs text-muted-foreground mt-1">
                            {feature.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Experience Points */}
                <div>
                  <h4 className="font-medium mb-2">Experience</h4>
                  <p className="text-sm text-muted-foreground">
                    {character.experience_points || 0} XP
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Character</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{character.name}"? This action
              cannot be undone. All character data, including stats, inventory,
              and progression will be permanently lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete Character
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
