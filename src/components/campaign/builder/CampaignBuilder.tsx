// src/components/campaign/builder/CampaignBuilder.tsx

"use client";

import React, { useState, useEffect } from "react";
import { MapPin, Users, Settings, Eye, Save, X } from "lucide-react";
import { Campaign } from "@/lib/types";
import { useCampaign } from "@/hooks/useCampaign";
import { useToast } from "@/hooks/use-toast";

import { CampaignForm } from "./CampaignForm";
import { PlayerManager } from "./PlayerManager";
import { EncounterBuilder } from "./EncounterBuilder";
import { ImageManager } from "./ImageManager";
import { CampaignSettings } from "./CampaignSettings";
import { CampaignPreview } from "./CampaignPreview";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export interface CampaignBuilderProps {
  campaignId?: string; // If editing existing campaign
  userId: string;
  onCampaignSaved?: (campaign: Campaign) => void;
  onCancel?: () => void;
  isReadOnly?: boolean;
}

export interface CampaignBuilderData {
  name: string;
  description: string;
  notes: string;
  players: string[];
  encounters: any[];
  images: any[];
  settings: {
    allowPlayerCharacterCreation: boolean;
    allowPlayerDiceRolls: boolean;
    combatTimerEnabled: boolean;
    combatTimerDuration: number;
    initiativeType: "group" | "individual";
    restType: "short" | "long" | "milestone";
  };
  isValid: boolean;
  validationErrors: string[];
}

const defaultCampaignData: CampaignBuilderData = {
  name: "",
  description: "",
  notes: "",
  players: [],
  encounters: [],
  images: [],
  settings: {
    allowPlayerCharacterCreation: true,
    allowPlayerDiceRolls: true,
    combatTimerEnabled: false,
    combatTimerDuration: 60,
    initiativeType: "individual",
    restType: "long",
  },
  isValid: false,
  validationErrors: [],
};

export function CampaignBuilder({
  campaignId,
  userId,
  onCampaignSaved,
  onCancel,
  isReadOnly = false,
}: CampaignBuilderProps) {
  const { toast } = useToast();
  const isEditing = !!campaignId;

  const {
    campaign,
    isLoading,
    error,
    connected,
    fetchCampaign,
    createCampaign,
    updateCampaign,
    acquireLock,
    releaseLock,
    isLocked,
    whoLocked,
  } = useCampaign({
    campaignId,
    userId,
  });

  const [activeTab, setActiveTab] = useState("basic");
  const [campaignData, setCampaignData] =
    useState<CampaignBuilderData>(defaultCampaignData);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isEditingLocked, setIsEditingLocked] = useState(false);

  // Load existing campaign data
  useEffect(() => {
    if (isEditing && campaignId) {
      fetchCampaign(campaignId);
    }
  }, [isEditing, campaignId, fetchCampaign]);

  // Populate form when campaign data loads
  useEffect(() => {
    if (campaign && isEditing) {
      setCampaignData({
        name: campaign.name,
        description: campaign.description || "",
        notes: campaign.notes || "",
        players: campaign.players,
        encounters: campaign.encounters,
        images: campaign.images,
        settings: {
          allowPlayerCharacterCreation: true,
          allowPlayerDiceRolls: true,
          combatTimerEnabled: false,
          combatTimerDuration: 60,
          initiativeType: "individual",
          restType: "long",
        },
        isValid: true,
        validationErrors: [],
      });
    }
  }, [campaign, isEditing]);

  // Validate campaign data
  useEffect(() => {
    const errors: string[] = [];

    if (!campaignData.name.trim()) {
      errors.push("Campaign name is required");
    }

    if (campaignData.name.length > 100) {
      errors.push("Campaign name must be less than 100 characters");
    }

    if (campaignData.description.length > 2000) {
      errors.push("Description must be less than 2000 characters");
    }

    setCampaignData((prev) => ({
      ...prev,
      isValid: errors.length === 0,
      validationErrors: errors,
    }));
  }, [campaignData.name, campaignData.description]);

  // Handle data updates
  const handleDataUpdate = (updates: Partial<CampaignBuilderData>) => {
    setCampaignData((prev) => ({
      ...prev,
      ...updates,
    }));
    setHasUnsavedChanges(true);
  };

  // Handle save
  const handleSave = async () => {
    if (!campaignData.isValid) {
      toast({
        title: "Validation Error",
        description: "Please fix the validation errors before saving",
        variant: "destructive",
      });
      return;
    }

    try {
      if (isEditing && campaignId) {
        // Acquire lock for editing
        if (!isEditingLocked && !isReadOnly) {
          const lockAcquired = await acquireLock(campaignId, "campaign");
          if (!lockAcquired) {
            toast({
              title: "Campaign Locked",
              description: `This campaign is being edited by ${whoLocked(
                campaignId,
                "campaign"
              )}`,
              variant: "destructive",
            });
            return;
          }
          setIsEditingLocked(true);
        }

        // Update existing campaign
        const updatedCampaign = await updateCampaign(campaignId, {
          name: campaignData.name,
          description: campaignData.description,
          notes: campaignData.notes,
        });

        if (updatedCampaign) {
          setHasUnsavedChanges(false);
          toast({
            title: "Campaign Updated",
            description: "Changes saved successfully",
          });
          onCampaignSaved?.(updatedCampaign);
        }
      } else {
        // Create new campaign
        const newCampaign = await createCampaign({
          name: campaignData.name,
          description: campaignData.description,
        });

        if (newCampaign) {
          setHasUnsavedChanges(false);
          toast({
            title: "Campaign Created",
            description: `"${newCampaign.name}" has been created successfully`,
          });
          onCampaignSaved?.(newCampaign);
        }
      }
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save campaign. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        "You have unsaved changes. Are you sure you want to cancel?"
      );
      if (!confirmed) return;
    }

    // Release lock if we had one
    if (isEditingLocked && campaignId) {
      releaseLock(campaignId, "campaign");
    }

    onCancel?.();
  };

  // Clean up lock on unmount
  useEffect(() => {
    return () => {
      if (isEditingLocked && campaignId) {
        releaseLock(campaignId, "campaign");
      }
    };
  }, [isEditingLocked, campaignId, releaseLock]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Loading campaign...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Error loading campaign: {error}</AlertDescription>
      </Alert>
    );
  }

  const isLockActive = isLocked(campaignId || "", "campaign");
  const lockedBy = whoLocked(campaignId || "", "campaign");

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-6 w-6" />
              {isEditing ? "Edit Campaign" : "Create Campaign"}
              {hasUnsavedChanges && (
                <Badge variant="outline" className="text-xs">
                  Unsaved Changes
                </Badge>
              )}
              {!connected && (
                <Badge variant="destructive" className="text-xs">
                  Disconnected
                </Badge>
              )}
              {isLockActive && (
                <Badge variant="secondary" className="text-xs">
                  Locked by {lockedBy}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!campaignData.isValid || isLockActive || isReadOnly}
              >
                <Save className="h-4 w-4 mr-1" />
                {isEditing ? "Save Changes" : "Create Campaign"}
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            {isEditing
              ? "Modify your campaign settings and content"
              : "Set up your new D&D campaign"}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Lock Warning */}
      {isLockActive && (
        <Alert>
          <AlertDescription>
            This campaign is currently being edited by {lockedBy}. You cannot
            make changes at this time.
          </AlertDescription>
        </Alert>
      )}

      {/* Validation Errors */}
      {campaignData.validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">Please fix the following issues:</p>
              <ul className="list-disc list-inside space-y-1">
                {campaignData.validationErrors.map((error, index) => (
                  <li key={index} className="text-sm">
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="players">Players</TabsTrigger>
          <TabsTrigger value="encounters">Encounters</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="preview">
            <Eye className="h-4 w-4 mr-1" />
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <CampaignForm
            data={campaignData}
            onUpdate={handleDataUpdate}
            isReadOnly={isReadOnly || isLockActive}
          />
        </TabsContent>

        <TabsContent value="players" className="space-y-4">
          <PlayerManager
            campaignId={campaignId}
            players={campaignData.players}
            onUpdate={(players) => handleDataUpdate({ players })}
            isReadOnly={isReadOnly || isLockActive}
          />
        </TabsContent>

        <TabsContent value="encounters" className="space-y-4">
          <EncounterBuilder
            campaignId={campaignId}
            encounters={campaignData.encounters}
            onUpdate={(encounters) => handleDataUpdate({ encounters })}
            isReadOnly={isReadOnly || isLockActive}
          />
        </TabsContent>

        <TabsContent value="images" className="space-y-4">
          <ImageManager
            campaignId={campaignId}
            userId={userId}
            images={campaignData.images}
            onUpdate={(images) => handleDataUpdate({ images })}
            isReadOnly={isReadOnly || isLockActive}
          />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <CampaignSettings
            settings={campaignData.settings}
            onUpdate={(settings) => handleDataUpdate({ settings })}
            isReadOnly={isReadOnly || isLockActive}
          />
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <CampaignPreview
            data={campaignData}
            isEditing={isEditing}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
