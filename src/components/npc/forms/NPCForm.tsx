// src/components/npc/forms/NPCForm.tsx

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Save, X, AlertTriangle, Eye, EyeOff } from "lucide-react";
import {
  NPCFormProps,
  NPCFormData,
  CREATURE_TYPES,
  CREATURE_SIZES,
  CHALLENGE_RATINGS,
} from "../types";
import { NPC, NPCStats, NPCAction } from "@/lib/types";
import { NPCStatsEditor } from "./NPCStatsEditor";
import { NPCActionsEditor } from "./NPCActionsEditor";
import { NPCStatBlock } from "../utils/NPCStatBlock";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const defaultNPCData: NPCFormData = {
  name: "",
  source: "custom",
  campaign_id: "",
  stats: {
    ac: 10,
    hp: { current: 1, max: 1 },
    speed: 30,
    attributes: {
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
    },
    damage_vulnerabilities: [],
    damage_resistances: [],
    damage_immunities: [],
    condition_immunities: [],
    languages: [],
    challenge_rating: "0",
  },
  actions: [],
  legendary_actions: [],
  reactions: [],
  features: [],
  tags: [],
  isValid: false,
  validationErrors: [],
};

export function NPCForm({
  npc,
  campaignId,
  userId,
  mode,
  onSave,
  onCancel,
  isReadOnly = false,
}: NPCFormProps) {
  const [formData, setFormData] = useState<NPCFormData>(defaultNPCData);
  const [activeTab, setActiveTab] = useState("basic");
  const [showPreview, setShowPreview] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Initialize form data
  useEffect(() => {
    if (npc && (mode === "edit" || mode === "duplicate")) {
      setFormData({
        name: mode === "duplicate" ? `${npc.name} (Copy)` : npc.name,
        source: npc.source,
        compendium_id: npc.compendium_id,
        campaign_id: campaignId,
        stats: npc.stats,
        actions: npc.actions,
        legendary_actions: npc.legendary_actions,
        reactions: npc.reactions,
        features: npc.features,
        description: npc.description,
        tags: [], // TODO: Extract tags from NPC if implemented
        notes: "", // TODO: Extract notes from NPC if implemented
        isValid: true,
        validationErrors: [],
      });
    } else {
      setFormData({
        ...defaultNPCData,
        campaign_id: campaignId,
      });
    }
  }, [npc, mode, campaignId]);

  // Validation
  useEffect(() => {
    const errors: string[] = [];

    if (!formData.name.trim()) {
      errors.push("Name is required");
    }

    if (formData.name.length > 100) {
      errors.push("Name must be less than 100 characters");
    }

    if (!formData.stats.challenge_rating) {
      errors.push("Challenge Rating is required");
    }

    if (formData.stats.hp.max < 1) {
      errors.push("Hit Points must be at least 1");
    }

    if (formData.stats.ac < 1) {
      errors.push("Armor Class must be at least 1");
    }

    // Validate attributes
    const attributes = Object.values(formData.stats.attributes);
    if (attributes.some((score) => score < 1 || score > 30)) {
      errors.push("Ability scores must be between 1 and 30");
    }

    setFormData((prev) => ({
      ...prev,
      isValid: errors.length === 0,
      validationErrors: errors,
    }));
  }, [formData.name, formData.stats]);

  // Handle form changes
  const handleBasicChange = useCallback(
    (field: keyof NPCFormData, value: any) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
      setHasUnsavedChanges(true);
    },
    []
  );

  const handleStatsChange = useCallback((stats: NPCStats) => {
    setFormData((prev) => ({
      ...prev,
      stats,
    }));
    setHasUnsavedChanges(true);
  }, []);

  const handleActionsChange = useCallback((actions: NPCAction[]) => {
    setFormData((prev) => ({
      ...prev,
      actions,
    }));
    setHasUnsavedChanges(true);
  }, []);

  const handleLegendaryActionsChange = useCallback(
    (legendaryActions: NPCAction[]) => {
      setFormData((prev) => ({
        ...prev,
        legendary_actions: legendaryActions,
      }));
      setHasUnsavedChanges(true);
    },
    []
  );

  const handleReactionsChange = useCallback((reactions: NPCAction[]) => {
    setFormData((prev) => ({
      ...prev,
      reactions,
    }));
    setHasUnsavedChanges(true);
  }, []);

  const handleFeaturesChange = useCallback(
    (features: Array<{ name: string; description: string }>) => {
      setFormData((prev) => ({
        ...prev,
        features,
      }));
      setHasUnsavedChanges(true);
    },
    []
  );

  // Handle save
  const handleSave = useCallback(() => {
    if (!formData.isValid) {
      return;
    }

    const npcData: NPC = {
      _id: mode === "edit" && npc ? npc._id : "",
      name: formData.name,
      source: formData.source,
      compendium_id: formData.compendium_id,
      campaign_id: formData.campaign_id,
      stats: formData.stats,
      actions: formData.actions,
      legendary_actions: formData.legendary_actions,
      reactions: formData.reactions,
      features: formData.features,
      description: formData.description,
      created_at:
        mode === "edit" && npc ? npc.created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onSave(npcData);
    setHasUnsavedChanges(false);
  }, [formData, mode, npc, onSave]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        "You have unsaved changes. Are you sure you want to cancel?"
      );
      if (!confirmed) return;
    }
    onCancel();
  }, [hasUnsavedChanges, onCancel]);

  // Convert form data to NPC for preview
  const previewNPC: NPC = {
    _id: npc?._id || "preview",
    name: formData.name || "Unnamed NPC",
    source: formData.source,
    compendium_id: formData.compendium_id,
    campaign_id: formData.campaign_id,
    stats: formData.stats,
    actions: formData.actions,
    legendary_actions: formData.legendary_actions,
    reactions: formData.reactions,
    features: formData.features,
    description: formData.description,
    created_at: npc?.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {mode === "create"
                ? "Create NPC"
                : mode === "edit"
                ? "Edit NPC"
                : "Duplicate NPC"}
              {hasUnsavedChanges && (
                <Badge variant="outline" className="text-xs">
                  Unsaved Changes
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? (
                  <EyeOff className="h-4 w-4 mr-1" />
                ) : (
                  <Eye className="h-4 w-4 mr-1" />
                )}
                Preview
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!formData.isValid || isReadOnly}
              >
                <Save className="h-4 w-4 mr-1" />
                {mode === "create" ? "Create" : "Save"}
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            {mode === "create"
              ? "Create a new NPC for your campaign"
              : mode === "edit"
              ? "Modify the selected NPC"
              : "Create a copy of the selected NPC"}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Validation Errors */}
      {formData.validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">Please fix the following issues:</p>
              <ul className="list-disc list-inside space-y-1">
                {formData.validationErrors.map((error, index) => (
                  <li key={index} className="text-sm">
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className={showPreview ? "lg:col-span-2" : "lg:col-span-3"}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="stats">Statistics</TabsTrigger>
              <TabsTrigger value="actions">Actions</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          handleBasicChange("name", e.target.value)
                        }
                        placeholder="Enter NPC name"
                        disabled={isReadOnly}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="source">Source</Label>
                      <Select
                        value={formData.source}
                        onValueChange={(value) =>
                          handleBasicChange(
                            "source",
                            value as "custom" | "compendium"
                          )
                        }
                        disabled={isReadOnly}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="custom">Custom</SelectItem>
                          <SelectItem value="compendium">Compendium</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description || ""}
                      onChange={(e) =>
                        handleBasicChange("description", e.target.value)
                      }
                      placeholder="Describe this NPC..."
                      rows={4}
                      disabled={isReadOnly}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes || ""}
                      onChange={(e) =>
                        handleBasicChange("notes", e.target.value)
                      }
                      placeholder="Internal notes (not visible to players)..."
                      rows={3}
                      disabled={isReadOnly}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="stats" className="space-y-4">
              <NPCStatsEditor
                stats={formData.stats}
                onChange={handleStatsChange}
                isReadOnly={isReadOnly}
                showCalculator={true}
              />
            </TabsContent>

            <TabsContent value="actions" className="space-y-4">
              <NPCActionsEditor
                actions={formData.actions}
                legendaryActions={formData.legendary_actions}
                reactions={formData.reactions}
                onActionsChange={handleActionsChange}
                onLegendaryActionsChange={handleLegendaryActionsChange}
                onReactionsChange={handleReactionsChange}
                isReadOnly={isReadOnly}
              />
            </TabsContent>

            <TabsContent value="features" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Features & Traits</CardTitle>
                  <CardDescription>
                    Special abilities and characteristics of this NPC
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {formData.features.map((feature, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Feature {index + 1}</Label>
                        {!isReadOnly && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newFeatures = formData.features.filter(
                                (_, i) => i !== index
                              );
                              handleFeaturesChange(newFeatures);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <Input
                        value={feature.name}
                        onChange={(e) => {
                          const newFeatures = [...formData.features];
                          newFeatures[index] = {
                            ...feature,
                            name: e.target.value,
                          };
                          handleFeaturesChange(newFeatures);
                        }}
                        placeholder="Feature name"
                        disabled={isReadOnly}
                      />
                      <Textarea
                        value={feature.description}
                        onChange={(e) => {
                          const newFeatures = [...formData.features];
                          newFeatures[index] = {
                            ...feature,
                            description: e.target.value,
                          };
                          handleFeaturesChange(newFeatures);
                        }}
                        placeholder="Feature description"
                        rows={3}
                        disabled={isReadOnly}
                      />
                      {index < formData.features.length - 1 && <Separator />}
                    </div>
                  ))}

                  {!isReadOnly && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        const newFeatures = [
                          ...formData.features,
                          { name: "", description: "" },
                        ];
                        handleFeaturesChange(newFeatures);
                      }}
                    >
                      Add Feature
                    </Button>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Preview Panel */}
        {showPreview && (
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Preview</CardTitle>
                <CardDescription>
                  How this NPC will appear in the game
                </CardDescription>
              </CardHeader>
              <CardContent>
                <NPCStatBlock
                  npc={previewNPC}
                  variant="compact"
                  showActions={formData.actions.length > 0}
                  showLegendaryActions={formData.legendary_actions.length > 0}
                  showReactions={formData.reactions.length > 0}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
