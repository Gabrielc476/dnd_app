// src/components/npc/import/NPCTemplateManager.tsx

"use client";

import React, { useState, useEffect } from "react";
import {
  Template,
  Plus,
  Star,
  Copy,
  Trash2,
  Download,
  Upload,
  Share,
  Search,
  Filter,
} from "lucide-react";
import { NPC, NPCStats, NPCAction } from "@/lib/types";
import { useNPC } from "@/hooks/useNPC";
import { useToast } from "@/hooks/use-toast";

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

export interface NPCTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  isCustom: boolean;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  stats: Partial<NPCStats>;
  actions: NPCAction[];
  features: Array<{ name: string; description: string }>;
  author?: string;
  isShared?: boolean;
}

interface NPCTemplateManagerProps {
  campaignId: string;
  userId: string;
  onApplyTemplate?: (template: NPCTemplate) => void;
  onClose?: () => void;
}

const DEFAULT_CATEGORIES = [
  "Combat",
  "Social",
  "Utility",
  "Boss",
  "Minion",
  "Beast",
  "Humanoid",
  "Undead",
  "Fiend",
  "Celestial",
  "Custom",
];

const PREDEFINED_TEMPLATES: NPCTemplate[] = [
  {
    id: "guard-template",
    name: "Town Guard",
    description: "Basic humanoid guard for towns and cities",
    category: "Combat",
    tags: ["humanoid", "guard", "lawful"],
    isCustom: false,
    isFavorite: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    stats: {
      ac: 16,
      hp: { current: 11, max: 11 },
      speed: 30,
      attributes: {
        strength: 11,
        dexterity: 12,
        constitution: 12,
        intelligence: 10,
        wisdom: 11,
        charisma: 10,
      },
      challenge_rating: "1/8",
    },
    actions: [
      {
        name: "Spear",
        description:
          "Melee or Ranged Weapon Attack: +3 to hit, reach 5 ft. or range 20/60 ft., one target. Hit: 4 (1d6 + 1) piercing damage, or 5 (1d8 + 1) piercing damage if used with two hands to make a melee attack.",
        attack_bonus: 3,
        damage: "1d6+1",
        damage_type: "piercing",
      },
    ],
    features: [
      {
        name: "Keen Hearing and Sight",
        description:
          "The guard has advantage on Wisdom (Perception) checks that rely on hearing or sight.",
      },
    ],
  },
  {
    id: "merchant-template",
    name: "Merchant",
    description: "Non-combat NPC for trade and roleplay",
    category: "Social",
    tags: ["humanoid", "merchant", "neutral"],
    isCustom: false,
    isFavorite: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    stats: {
      ac: 11,
      hp: { current: 4, max: 4 },
      speed: 30,
      attributes: {
        strength: 9,
        dexterity: 12,
        constitution: 10,
        intelligence: 14,
        wisdom: 13,
        charisma: 15,
      },
      challenge_rating: "0",
      skills: { Insight: 3, Persuasion: 4 },
    },
    actions: [
      {
        name: "Dagger",
        description:
          "Melee or Ranged Weapon Attack: +3 to hit, reach 5 ft. or range 20/60 ft., one target. Hit: 3 (1d4 + 1) piercing damage.",
        attack_bonus: 3,
        damage: "1d4+1",
        damage_type: "piercing",
      },
    ],
    features: [
      {
        name: "Silver Tongue",
        description:
          "The merchant has proficiency in Deception and Persuasion checks.",
      },
    ],
  },
];

export function NPCTemplateManager({
  campaignId,
  userId,
  onApplyTemplate,
  onClose,
}: NPCTemplateManagerProps) {
  const { toast } = useToast();
  const { createNPC } = useNPC({ campaignId, userId });

  const [templates, setTemplates] = useState<NPCTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<NPCTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<NPCTemplate | null>(
    null
  );
  const [newTemplate, setNewTemplate] = useState<Partial<NPCTemplate>>({});

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  // Filter templates when search or filters change
  useEffect(() => {
    filterTemplates();
  }, [templates, searchQuery, selectedCategory, showFavoritesOnly]);

  const loadTemplates = () => {
    const savedTemplates = localStorage.getItem("npc-templates");
    const customTemplates = savedTemplates ? JSON.parse(savedTemplates) : [];
    const allTemplates = [...PREDEFINED_TEMPLATES, ...customTemplates];
    setTemplates(allTemplates);
  };

  const saveTemplates = (newTemplates: NPCTemplate[]) => {
    const customTemplates = newTemplates.filter((t) => t.isCustom);
    localStorage.setItem("npc-templates", JSON.stringify(customTemplates));
    setTemplates(newTemplates);
  };

  const filterTemplates = () => {
    let filtered = templates;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (template) =>
          template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          template.description
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          template.tags.some((tag) =>
            tag.toLowerCase().includes(searchQuery.toLowerCase())
          )
      );
    }

    // Category filter
    if (selectedCategory !== "All") {
      filtered = filtered.filter(
        (template) => template.category === selectedCategory
      );
    }

    // Favorites filter
    if (showFavoritesOnly) {
      filtered = filtered.filter((template) => template.isFavorite);
    }

    setFilteredTemplates(filtered);
  };

  const handleCreateTemplate = () => {
    setNewTemplate({
      name: "",
      description: "",
      category: "Custom",
      tags: [],
      isCustom: true,
      isFavorite: false,
      stats: {},
      actions: [],
      features: [],
    });
    setIsCreateDialogOpen(true);
  };

  const handleEditTemplate = (template: NPCTemplate) => {
    if (!template.isCustom) {
      toast({
        title: "Cannot Edit",
        description: "Predefined templates cannot be edited",
        variant: "destructive",
      });
      return;
    }
    setSelectedTemplate(template);
    setNewTemplate({ ...template });
    setIsEditDialogOpen(true);
  };

  const handleSaveTemplate = () => {
    if (!newTemplate.name?.trim()) {
      toast({
        title: "Validation Error",
        description: "Template name is required",
        variant: "destructive",
      });
      return;
    }

    const templateToSave: NPCTemplate = {
      id: selectedTemplate?.id || Date.now().toString(),
      name: newTemplate.name!,
      description: newTemplate.description || "",
      category: newTemplate.category || "Custom",
      tags: newTemplate.tags || [],
      isCustom: true,
      isFavorite: newTemplate.isFavorite || false,
      createdAt: selectedTemplate?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      stats: newTemplate.stats || {},
      actions: newTemplate.actions || [],
      features: newTemplate.features || [],
      author: userId,
    };

    const updatedTemplates = selectedTemplate
      ? templates.map((t) =>
          t.id === selectedTemplate.id ? templateToSave : t
        )
      : [...templates, templateToSave];

    saveTemplates(updatedTemplates);

    toast({
      title: "Template Saved",
      description: `Template "${templateToSave.name}" has been saved`,
    });

    setIsCreateDialogOpen(false);
    setIsEditDialogOpen(false);
    setSelectedTemplate(null);
    setNewTemplate({});
  };

  const handleDeleteTemplate = (template: NPCTemplate) => {
    if (!template.isCustom) {
      toast({
        title: "Cannot Delete",
        description: "Predefined templates cannot be deleted",
        variant: "destructive",
      });
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${template.name}"?`
    );
    if (!confirmed) return;

    const updatedTemplates = templates.filter((t) => t.id !== template.id);
    saveTemplates(updatedTemplates);

    toast({
      title: "Template Deleted",
      description: `Template "${template.name}" has been deleted`,
    });
  };

  const handleToggleFavorite = (template: NPCTemplate) => {
    const updatedTemplate = { ...template, isFavorite: !template.isFavorite };
    const updatedTemplates = templates.map((t) =>
      t.id === template.id ? updatedTemplate : t
    );

    if (template.isCustom) {
      saveTemplates(updatedTemplates);
    } else {
      setTemplates(updatedTemplates);
    }
  };

  const handleDuplicateTemplate = (template: NPCTemplate) => {
    const duplicated: NPCTemplate = {
      ...template,
      id: Date.now().toString(),
      name: `${template.name} (Copy)`,
      isCustom: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: userId,
    };

    const updatedTemplates = [...templates, duplicated];
    saveTemplates(updatedTemplates);

    toast({
      title: "Template Duplicated",
      description: `Created copy of "${template.name}"`,
    });
  };

  const handleApplyTemplate = async (template: NPCTemplate) => {
    if (onApplyTemplate) {
      onApplyTemplate(template);
      onClose?.();
    } else {
      // Create NPC from template
      try {
        const npcData = {
          name: `New ${template.name}`,
          campaign_id: campaignId,
          source: "custom" as const,
          stats: {
            ac: template.stats.ac || 10,
            hp: template.stats.hp || { current: 1, max: 1 },
            speed: template.stats.speed || 30,
            attributes: template.stats.attributes || {
              strength: 10,
              dexterity: 10,
              constitution: 10,
              intelligence: 10,
              wisdom: 10,
              charisma: 10,
            },
            challenge_rating: template.stats.challenge_rating || "0",
            skills: template.stats.skills || {},
            saving_throws: template.stats.saving_throws || {},
            damage_vulnerabilities: template.stats.damage_vulnerabilities || [],
            damage_resistances: template.stats.damage_resistances || [],
            damage_immunities: template.stats.damage_immunities || [],
            condition_immunities: template.stats.condition_immunities || [],
            senses: template.stats.senses || "",
            languages: template.stats.languages || [],
          },
          actions: template.actions,
          features: template.features,
          legendary_actions: [],
          reactions: [],
          description: template.description,
        };

        await createNPC(npcData);

        toast({
          title: "NPC Created",
          description: `Created NPC from template "${template.name}"`,
        });

        onClose?.();
      } catch (error) {
        toast({
          title: "Failed to Create NPC",
          description: "Could not create NPC from template",
          variant: "destructive",
        });
      }
    }
  };

  const handleExportTemplates = () => {
    const customTemplates = templates.filter((t) => t.isCustom);
    const dataStr = JSON.stringify(customTemplates, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "npc-templates.json";
    link.click();

    URL.revokeObjectURL(url);

    toast({
      title: "Templates Exported",
      description: "Templates have been exported to JSON file",
    });
  };

  const handleImportTemplates = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedTemplates = JSON.parse(e.target?.result as string);
        const validTemplates = importedTemplates.filter(
          (t: any) => t.name && t.id
        );

        const updatedTemplates = [...templates, ...validTemplates];
        saveTemplates(updatedTemplates);

        toast({
          title: "Templates Imported",
          description: `Imported ${validTemplates.length} templates`,
        });
      } catch (error) {
        toast({
          title: "Import Failed",
          description: "Invalid template file format",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  const categories = ["All", ...DEFAULT_CATEGORIES];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Template className="h-5 w-5" />
              NPC Templates
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportTemplates}
              >
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  document.getElementById("import-templates")?.click()
                }
              >
                <Upload className="h-4 w-4 mr-1" />
                Import
              </Button>
              <input
                id="import-templates"
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImportTemplates}
              />

              <Button size="sm" onClick={handleCreateTemplate}>
                <Plus className="h-4 w-4 mr-1" />
                New Template
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Manage and apply NPC templates to quickly create consistent NPCs
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="favorites-only"
                  checked={showFavoritesOnly}
                  onCheckedChange={setShowFavoritesOnly}
                />
                <Label htmlFor="favorites-only">Favorites only</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <div className="text-sm text-muted-foreground">
                {filteredTemplates.length} of {templates.length} templates
              </div>
            </div>
          </div>

          <Separator />

          {/* Templates Grid */}
          <ScrollArea className="h-96">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => (
                <Card key={template.id} className="relative">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          {template.name}
                          {template.isFavorite && (
                            <Star className="h-4 w-4 fill-current text-yellow-500" />
                          )}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {template.description}
                        </CardDescription>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleFavorite(template)}
                      >
                        <Star
                          className={`h-4 w-4 ${
                            template.isFavorite
                              ? "fill-current text-yellow-500"
                              : ""
                          }`}
                        />
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-xs">
                        {template.category}
                      </Badge>
                      {template.tags.slice(0, 2).map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                      {template.tags.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{template.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="pt-2">
                    <div className="flex justify-between items-center text-xs text-muted-foreground mb-3">
                      <span>CR {template.stats.challenge_rating || "0"}</span>
                      <span>{template.isCustom ? "Custom" : "Built-in"}</span>
                    </div>

                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        onClick={() => handleApplyTemplate(template)}
                        className="flex-1"
                      >
                        Apply
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDuplicateTemplate(template)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>

                      {template.isCustom && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditTemplate(template)}
                          >
                            <Filter className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteTemplate(template)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>

          {filteredTemplates.length === 0 && (
            <Alert>
              <AlertDescription>
                No templates found matching your criteria.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Template Dialog */}
      <Dialog
        open={isCreateDialogOpen || isEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setIsEditDialogOpen(false);
            setSelectedTemplate(null);
            setNewTemplate({});
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditDialogOpen ? "Edit Template" : "Create Template"}
            </DialogTitle>
            <DialogDescription>
              {isEditDialogOpen
                ? "Modify the template details"
                : "Create a new NPC template"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="template-name">Name *</Label>
                <Input
                  id="template-name"
                  value={newTemplate.name || ""}
                  onChange={(e) =>
                    setNewTemplate({ ...newTemplate, name: e.target.value })
                  }
                  placeholder="Template name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="template-category">Category</Label>
                <Select
                  value={newTemplate.category}
                  onValueChange={(value) =>
                    setNewTemplate({ ...newTemplate, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEFAULT_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-description">Description</Label>
              <Textarea
                id="template-description"
                value={newTemplate.description || ""}
                onChange={(e) =>
                  setNewTemplate({
                    ...newTemplate,
                    description: e.target.value,
                  })
                }
                placeholder="Template description"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-tags">Tags (comma-separated)</Label>
              <Input
                id="template-tags"
                value={newTemplate.tags?.join(", ") || ""}
                onChange={(e) =>
                  setNewTemplate({
                    ...newTemplate,
                    tags: e.target.value.split(",").map((tag) => tag.trim()),
                  })
                }
                placeholder="combat, humanoid, guard"
              />
            </div>

            {/* Basic Stats (simplified for template creation) */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Challenge Rating</Label>
                <Input
                  value={newTemplate.stats?.challenge_rating || ""}
                  onChange={(e) =>
                    setNewTemplate({
                      ...newTemplate,
                      stats: {
                        ...newTemplate.stats,
                        challenge_rating: e.target.value,
                      },
                    })
                  }
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label>Armor Class</Label>
                <Input
                  type="number"
                  value={newTemplate.stats?.ac || ""}
                  onChange={(e) =>
                    setNewTemplate({
                      ...newTemplate,
                      stats: {
                        ...newTemplate.stats,
                        ac: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                  placeholder="10"
                />
              </div>

              <div className="space-y-2">
                <Label>Hit Points</Label>
                <Input
                  type="number"
                  value={newTemplate.stats?.hp?.max || ""}
                  onChange={(e) => {
                    const hp = parseInt(e.target.value) || 0;
                    setNewTemplate({
                      ...newTemplate,
                      stats: {
                        ...newTemplate.stats,
                        hp: { current: hp, max: hp },
                      },
                    });
                  }}
                  placeholder="1"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setIsEditDialogOpen(false);
                setSelectedTemplate(null);
                setNewTemplate({});
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate}>
              {isEditDialogOpen ? "Save Changes" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
