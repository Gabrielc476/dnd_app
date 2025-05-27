// src/components/campaign/builder/CampaignPreview.tsx

"use client";

import React from "react";
import {
  Eye,
  Users,
  Swords,
  Image as ImageIcon,
  Settings,
  MapPin,
  Shield,
  Clock,
  Dice1,
  Tag,
  Grid3X3,
  Zap,
  Save,
  Edit,
} from "lucide-react";
import { CampaignBuilderData } from "./CampaignBuilder";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CampaignPreviewProps {
  data: CampaignBuilderData;
  isEditing: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export function CampaignPreview({
  data,
  isEditing,
  onSave,
  onCancel,
}: CampaignPreviewProps) {
  const totalCreatures = data.encounters.reduce(
    (total, encounter) =>
      total + encounter.npcs.reduce((sum, npc) => sum + npc.quantity, 0),
    0
  );

  const totalTraps = data.encounters.reduce(
    (total, encounter) => total + encounter.traps.length,
    0
  );

  const mapImages = data.images.filter((img) => img.is_map);
  const regularImages = data.images.filter((img) => !img.is_map);

  const allTags = Array.from(
    new Set(data.images.flatMap((img) => img.tags))
  ).filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Campaign Preview
          </CardTitle>
          <CardDescription>
            Review your campaign before{" "}
            {isEditing ? "saving changes" : "creating"}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Validation Status */}
      {!data.isValid && (
        <Alert variant="destructive">
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">Campaign has validation errors:</p>
              <ul className="list-disc list-inside space-y-1">
                {data.validationErrors.map((error, index) => (
                  <li key={index} className="text-sm">
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Campaign Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            {data.name || "Untitled Campaign"}
          </CardTitle>
          {data.description && (
            <CardDescription className="text-base">
              {data.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{data.players.length}</div>
              <div className="text-sm text-muted-foreground">Players</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Swords className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{data.encounters.length}</div>
              <div className="text-sm text-muted-foreground">Encounters</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <ImageIcon className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{data.images.length}</div>
              <div className="text-sm text-muted-foreground">Images</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <MapPin className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{mapImages.length}</div>
              <div className="text-sm text-muted-foreground">Maps</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Encounters Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Swords className="h-5 w-5" />
              Encounters Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.encounters.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No encounters created yet
              </p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center justify-between p-2 bg-muted rounded">
                    <span>Total Creatures:</span>
                    <Badge variant="outline">{totalCreatures}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-muted rounded">
                    <span>Total Traps:</span>
                    <Badge variant="outline">{totalTraps}</Badge>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Encounter List:</h4>
                  {data.encounters.map((encounter, index) => (
                    <div
                      key={encounter.id}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <span className="text-sm font-medium">
                        {encounter.name}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {encounter.npcs.reduce(
                            (sum, npc) => sum + npc.quantity,
                            0
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          {encounter.traps.length}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Images Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Images & Maps
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.images.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No images uploaded yet
              </p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center justify-between p-2 bg-muted rounded">
                    <span>Battle Maps:</span>
                    <Badge variant="outline">{mapImages.length}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-muted rounded">
                    <span>Other Images:</span>
                    <Badge variant="outline">{regularImages.length}</Badge>
                  </div>
                </div>

                {allTags.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Image Tags:</h4>
                      <div className="flex flex-wrap gap-1">
                        {allTags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-xs"
                          >
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <Separator />
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Recent Images:</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {data.images.slice(0, 6).map((image) => (
                      <div
                        key={image.id}
                        className="aspect-square bg-muted rounded overflow-hidden relative"
                      >
                        <img
                          src={image.url}
                          alt={image.name}
                          className="w-full h-full object-cover"
                        />
                        {image.is_map && (
                          <div className="absolute top-1 right-1">
                            <Badge variant="secondary" className="text-xs p-1">
                              <Grid3X3 className="h-3 w-3" />
                            </Badge>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {data.images.length > 6 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{data.images.length - 6} more images
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Settings Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Campaign Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Player Permissions */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Player Permissions
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Character Creation:</span>
                  <Badge
                    variant={
                      data.settings.allowPlayerCharacterCreation
                        ? "default"
                        : "secondary"
                    }
                  >
                    {data.settings.allowPlayerCharacterCreation
                      ? "Allowed"
                      : "Restricted"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Player Dice Rolls:</span>
                  <Badge
                    variant={
                      data.settings.allowPlayerDiceRolls
                        ? "default"
                        : "secondary"
                    }
                  >
                    {data.settings.allowPlayerDiceRolls
                      ? "Allowed"
                      : "Restricted"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Combat Settings */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Combat Settings
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Turn Timer:</span>
                  <Badge
                    variant={
                      data.settings.combatTimerEnabled ? "default" : "secondary"
                    }
                  >
                    {data.settings.combatTimerEnabled
                      ? `${data.settings.combatTimerDuration}s`
                      : "Disabled"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Initiative Type:</span>
                  <Badge variant="outline">
                    {data.settings.initiativeType === "individual"
                      ? "Individual"
                      : "Group"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Rest Settings */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Dice1 className="h-4 w-4" />
                Rest & Recovery
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Rest Type:</span>
                  <Badge variant="outline">
                    {data.settings.restType === "short"
                      ? "Short Rest"
                      : data.settings.restType === "long"
                      ? "Long Rest"
                      : "Milestone"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DM Notes */}
      {data.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Private DM Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm whitespace-pre-wrap">{data.notes}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-medium">
                Ready to {isEditing ? "save changes" : "create your campaign"}?
              </h3>
              <p className="text-sm text-muted-foreground">
                {data.isValid
                  ? isEditing
                    ? "All changes look good and ready to save."
                    : "Your campaign is configured and ready to create."
                  : "Please fix the validation errors before proceeding."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button
                onClick={onSave}
                disabled={!data.isValid}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {isEditing ? "Save Changes" : "Create Campaign"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
