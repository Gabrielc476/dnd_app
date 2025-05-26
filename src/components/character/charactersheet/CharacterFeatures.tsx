// src/components/character/CharacterFeatures.tsx
"use client";

import React, { useState } from "react";
import { Character, Feature } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  BookOpen,
  Plus,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronRight,
  Save,
  X,
} from "lucide-react";

interface CharacterFeaturesProps {
  character: Character;
  campaignId: string;
  userId: string;
  isReadOnly?: boolean;
  onUpdate?: (updates: Partial<Character>) => Promise<boolean>;
  isEditing?: boolean;
  onStartEditing?: () => void;
}

export function CharacterFeatures({
  character,
  campaignId,
  userId,
  isReadOnly = false,
  onUpdate,
  isEditing = false,
  onStartEditing,
}: CharacterFeaturesProps) {
  const [editingFeatures, setEditingFeatures] = useState(character.features);
  const [addFeatureDialog, setAddFeatureDialog] = useState(false);
  const [editFeatureDialog, setEditFeatureDialog] = useState(false);
  const [currentFeature, setCurrentFeature] = useState<Feature>({
    name: "",
    description: "",
  });
  const [editingIndex, setEditingIndex] = useState(-1);
  const [expandedFeatures, setExpandedFeatures] = useState<Set<number>>(
    new Set()
  );

  const handleSave = async () => {
    if (onUpdate) {
      await onUpdate({ features: editingFeatures });
    }
  };

  const handleCancel = () => {
    setEditingFeatures(character.features);
  };

  const handleAddFeature = () => {
    if (currentFeature.name && currentFeature.description) {
      setEditingFeatures((prev) => [...prev, currentFeature]);
      setCurrentFeature({ name: "", description: "" });
      setAddFeatureDialog(false);
    }
  };

  const handleEditFeature = (index: number) => {
    setCurrentFeature(editingFeatures[index]);
    setEditingIndex(index);
    setEditFeatureDialog(true);
  };

  const handleUpdateFeature = () => {
    if (
      currentFeature.name &&
      currentFeature.description &&
      editingIndex >= 0
    ) {
      setEditingFeatures((prev) =>
        prev.map((feature, i) =>
          i === editingIndex ? currentFeature : feature
        )
      );
      setCurrentFeature({ name: "", description: "" });
      setEditingIndex(-1);
      setEditFeatureDialog(false);
    }
  };

  const handleDeleteFeature = (index: number) => {
    setEditingFeatures((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleFeatureExpansion = (index: number) => {
    setExpandedFeatures((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const featuresToShow = isEditing ? editingFeatures : character.features;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Features & Traits
          </CardTitle>
          <div className="flex gap-2">
            {!isReadOnly && !isEditing && (
              <>
                <Dialog
                  open={addFeatureDialog}
                  onOpenChange={setAddFeatureDialog}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add Feature</DialogTitle>
                      <DialogDescription>
                        Add a new feature or trait to {character.name}.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Name</label>
                        <Input
                          placeholder="Feature name"
                          value={currentFeature.name}
                          onChange={(e) =>
                            setCurrentFeature({
                              ...currentFeature,
                              name: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">
                          Description
                        </label>
                        <Textarea
                          placeholder="Feature description"
                          value={currentFeature.description}
                          onChange={(e) =>
                            setCurrentFeature({
                              ...currentFeature,
                              description: e.target.value,
                            })
                          }
                          rows={4}
                        />
                      </div>
                    </div>

                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setAddFeatureDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddFeature}
                        disabled={
                          !currentFeature.name || !currentFeature.description
                        }
                      >
                        Add Feature
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Button variant="outline" size="sm" onClick={onStartEditing}>
                  <Edit3 className="h-4 w-4" />
                </Button>
              </>
            )}
            {isEditing && (
              <>
                <Button variant="outline" size="sm" onClick={handleSave}>
                  <Save className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {featuresToShow.length === 0 ? (
          <div className="text-center text-muted-foreground py-4">
            No features or traits
          </div>
        ) : (
          <ScrollArea className="h-80">
            <div className="space-y-3">
              {featuresToShow.map((feature, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <Collapsible
                    open={expandedFeatures.has(index)}
                    onOpenChange={() => toggleFeatureExpansion(index)}
                  >
                    <div className="flex items-center justify-between">
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className="flex items-center gap-2 p-0 h-auto font-medium"
                        >
                          {expandedFeatures.has(index) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          {feature.name}
                        </Button>
                      </CollapsibleTrigger>

                      {isEditing && (
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditFeature(index)}
                            className="h-6 w-6 p-0"
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteFeature(index)}
                            className="h-6 w-6 p-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <CollapsibleContent className="mt-2">
                      <Separator className="mb-2" />
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {feature.description}
                      </p>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Edit Feature Dialog */}
        <Dialog open={editFeatureDialog} onOpenChange={setEditFeatureDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Feature</DialogTitle>
              <DialogDescription>Edit the selected feature.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  placeholder="Feature name"
                  value={currentFeature.name}
                  onChange={(e) =>
                    setCurrentFeature({
                      ...currentFeature,
                      name: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  placeholder="Feature description"
                  value={currentFeature.description}
                  onChange={(e) =>
                    setCurrentFeature({
                      ...currentFeature,
                      description: e.target.value,
                    })
                  }
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditFeatureDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateFeature}
                disabled={!currentFeature.name || !currentFeature.description}
              >
                Update Feature
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
