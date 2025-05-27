// src/components/npc/manager/NPCManager.tsx

"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  Plus,
  Search,
  Filter,
  Grid3X3,
  List,
  Table,
  Upload,
  Download,
  Settings,
  Eye,
  EyeOff,
} from "lucide-react";

import { NPC, NPCListItem } from "@/lib/types";
import { useNPC } from "@/hooks/useNPC";
import { useGameStore } from "@/stores/gameStore";
import { useToast } from "@/hooks/use-toast";

import {
  NPCManagerProps,
  NPCManagerState,
  NPCFilters,
  NPCEventHandlers,
} from "../types";

// Import sub-components
import { NPCList } from "../list/NPCList";
import { NPCForm } from "../forms/NPCForm";
import { NPCPreview } from "../list/NPCPreview";
import { NPCSearch } from "../search/NPCSearch";
import { NPCImporter } from "../import/NPCImporter";
import { NPCBulkActions } from "../bulk/NPCBulkActions";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function NPCManager({
  campaignId,
  userId,
  isReadOnly = false,
}: NPCManagerProps) {
  const { toast } = useToast();
  const { currentCampaign, isUserDM } = useGameStore();

  // NPC Hook
  const {
    npcs,
    npc: currentNPC,
    isLoading,
    error,
    connected,
    fetchNPCs,
    fetchNPC,
    createNPC,
    updateNPC,
    deleteNPC,
    importFromCompendium,
    bulkImport,
    isLocked,
    acquireLock,
    releaseLock,
    whoLocked,
  } = useNPC({
    campaignId,
    userId,
  });

  // Component State
  const [state, setState] = useState<NPCManagerState>({
    activeTab: "list",
    selectedNPCs: [],
    currentNPC: null,
    editingNPC: null,
    searchFilters: {},
    viewMode: "grid",
    showPreview: true,
    bulkMode: false,
  });

  const [filteredNPCs, setFilteredNPCs] = useState<NPCListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Load NPCs on mount
  useEffect(() => {
    fetchNPCs();
  }, [fetchNPCs]);

  // Filter NPCs based on search and filters
  useEffect(() => {
    let filtered = [...npcs];

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (npc) =>
          npc.name.toLowerCase().includes(query) ||
          npc.challenge_rating.includes(query) ||
          npc.type.toLowerCase().includes(query)
      );
    }

    // Apply filters
    if (state.searchFilters.challengeRating) {
      const crFilter = Array.isArray(state.searchFilters.challengeRating)
        ? state.searchFilters.challengeRating
        : [state.searchFilters.challengeRating];
      filtered = filtered.filter((npc) =>
        crFilter.includes(npc.challenge_rating)
      );
    }

    if (state.searchFilters.source && state.searchFilters.source !== "all") {
      filtered = filtered.filter(
        (npc) => npc.source === state.searchFilters.source
      );
    }

    setFilteredNPCs(filtered);
  }, [npcs, searchQuery, state.searchFilters]);

  // Event Handlers
  const handleCreateNPC = useCallback(() => {
    setState((prev) => ({
      ...prev,
      activeTab: "create",
      currentNPC: null,
      editingNPC: null,
    }));
  }, []);

  const handleEditNPC = useCallback(
    async (npcId: string) => {
      if (isReadOnly) return;

      // Check if NPC is locked
      if (isLocked(npcId)) {
        toast({
          title: "NPC Locked",
          description: `This NPC is being edited by ${whoLocked(npcId)}`,
          variant: "destructive",
        });
        return;
      }

      // Acquire lock
      const lockAcquired = await acquireLock(npcId);
      if (!lockAcquired) {
        toast({
          title: "Unable to Edit",
          description: "Could not acquire lock for this NPC",
          variant: "destructive",
        });
        return;
      }

      // Load NPC data and switch to edit mode
      const npcData = await fetchNPC(npcId);
      if (npcData) {
        setState((prev) => ({
          ...prev,
          activeTab: "edit",
          currentNPC: npcData,
          editingNPC: npcId,
        }));
      }
    },
    [isReadOnly, isLocked, whoLocked, acquireLock, fetchNPC, toast]
  );

  const handleDeleteNPC = useCallback(
    async (npcId: string) => {
      if (isReadOnly) return;

      const npc = npcs.find((n) => n._id === npcId);
      const confirmed = window.confirm(
        `Are you sure you want to delete "${
          npc?.name || "this NPC"
        }"? This action cannot be undone.`
      );

      if (confirmed) {
        const success = await deleteNPC(npcId);
        if (success) {
          toast({
            title: "NPC Deleted",
            description: `${npc?.name || "NPC"} has been deleted`,
          });

          // Clear selection if deleted NPC was selected
          setState((prev) => ({
            ...prev,
            selectedNPCs: prev.selectedNPCs.filter((id) => id !== npcId),
            currentNPC: prev.currentNPC?.id === npcId ? null : prev.currentNPC,
          }));
        }
      }
    },
    [isReadOnly, npcs, deleteNPC, toast]
  );

  const handleDuplicateNPC = useCallback(
    async (npcId: string) => {
      if (isReadOnly) return;

      const npcData = await fetchNPC(npcId);
      if (npcData) {
        setState((prev) => ({
          ...prev,
          activeTab: "create",
          currentNPC: {
            ...npcData,
            name: `${npcData.name} (Copy)`,
            _id: "", // Clear ID for duplication
          },
          editingNPC: null,
        }));
      }
    },
    [isReadOnly, fetchNPC]
  );

  const handleSelectNPC = useCallback((npcId: string) => {
    setState((prev) => ({
      ...prev,
      selectedNPCs: prev.selectedNPCs.includes(npcId)
        ? prev.selectedNPCs.filter((id) => id !== npcId)
        : [...prev.selectedNPCs, npcId],
    }));
  }, []);

  const handleSelectMultiple = useCallback((npcIds: string[]) => {
    setState((prev) => ({
      ...prev,
      selectedNPCs: npcIds,
    }));
  }, []);

  const handleImportNPCs = useCallback(() => {
    setState((prev) => ({
      ...prev,
      activeTab: "import",
    }));
  }, []);

  const handleSaveNPC = useCallback(
    async (npcData: NPC) => {
      try {
        let savedNPC: NPC | null = null;

        if (state.editingNPC) {
          // Update existing NPC
          savedNPC = await updateNPC(state.editingNPC, npcData);
          if (savedNPC) {
            toast({
              title: "NPC Updated",
              description: `${savedNPC.name} has been updated successfully`,
            });
            // Release lock
            releaseLock(state.editingNPC);
          }
        } else {
          // Create new NPC
          savedNPC = await createNPC({
            ...npcData,
            campaign_id: campaignId,
          });
          if (savedNPC) {
            toast({
              title: "NPC Created",
              description: `${savedNPC.name} has been created successfully`,
            });
          }
        }

        if (savedNPC) {
          // Return to list view
          setState((prev) => ({
            ...prev,
            activeTab: "list",
            currentNPC: null,
            editingNPC: null,
          }));
        }
      } catch (error) {
        toast({
          title: "Save Failed",
          description: "Failed to save NPC. Please try again.",
          variant: "destructive",
        });
      }
    },
    [state.editingNPC, updateNPC, createNPC, campaignId, releaseLock, toast]
  );

  const handleCancelEdit = useCallback(() => {
    // Release lock if editing
    if (state.editingNPC) {
      releaseLock(state.editingNPC);
    }

    setState((prev) => ({
      ...prev,
      activeTab: "list",
      currentNPC: null,
      editingNPC: null,
    }));
  }, [state.editingNPC, releaseLock]);

  const handleFiltersChange = useCallback((filters: NPCFilters) => {
    setState((prev) => ({
      ...prev,
      searchFilters: filters,
    }));
  }, []);

  const handleViewModeChange = useCallback(
    (mode: "grid" | "list" | "table") => {
      setState((prev) => ({
        ...prev,
        viewMode: mode,
      }));
    },
    []
  );

  const handleBulkModeToggle = useCallback(() => {
    setState((prev) => ({
      ...prev,
      bulkMode: !prev.bulkMode,
      selectedNPCs: prev.bulkMode ? [] : prev.selectedNPCs,
    }));
  }, []);

  const handleImportComplete = useCallback(
    (importedNPCs: NPC[]) => {
      toast({
        title: "Import Complete",
        description: `${importedNPCs.length} NPC(s) imported successfully`,
      });

      setState((prev) => ({
        ...prev,
        activeTab: "list",
      }));

      // Refresh NPC list
      fetchNPCs();
    },
    [toast, fetchNPCs]
  );

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>NPC Manager Error: {error}</AlertDescription>
      </Alert>
    );
  }

  const selectedCount = state.selectedNPCs.length;
  const totalNPCs = npcs.length;
  const filteredCount = filteredNPCs.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-6 w-6" />
              NPC Manager
              {!connected && (
                <Badge variant="destructive" className="text-xs">
                  Disconnected
                </Badge>
              )}
              {totalNPCs > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {filteredCount !== totalNPCs
                    ? `${filteredCount} of ${totalNPCs}`
                    : totalNPCs}{" "}
                  NPCs
                </Badge>
              )}
              {selectedCount > 0 && (
                <Badge variant="default" className="text-xs">
                  {selectedCount} Selected
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Bulk Mode Toggle */}
              <Button
                variant={state.bulkMode ? "default" : "outline"}
                size="sm"
                onClick={handleBulkModeToggle}
                disabled={totalNPCs === 0}
              >
                <List className="h-4 w-4 mr-1" />
                Bulk
              </Button>

              {/* View Mode Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    {state.viewMode === "grid" ? (
                      <Grid3X3 className="h-4 w-4" />
                    ) : state.viewMode === "list" ? (
                      <List className="h-4 w-4" />
                    ) : (
                      <Table className="h-4 w-4" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    onClick={() => handleViewModeChange("grid")}
                  >
                    <Grid3X3 className="h-4 w-4 mr-2" />
                    Grid View
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleViewModeChange("list")}
                  >
                    <List className="h-4 w-4 mr-2" />
                    List View
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleViewModeChange("table")}
                  >
                    <Table className="h-4 w-4 mr-2" />
                    Table View
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Preview Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setState((prev) => ({
                    ...prev,
                    showPreview: !prev.showPreview,
                  }))
                }
              >
                {state.showPreview ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>

              {/* Main Actions */}
              {!isReadOnly && isUserDM && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleImportNPCs}
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Import
                  </Button>
                  <Button size="sm" onClick={handleCreateNPC}>
                    <Plus className="h-4 w-4 mr-1" />
                    Create NPC
                  </Button>
                </>
              )}
            </div>
          </CardTitle>
          <CardDescription>
            Manage NPCs for {currentCampaign?.name || "your campaign"}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search NPCs</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name, type, or challenge rating..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <NPCSearch
              filters={state.searchFilters}
              onFiltersChange={handleFiltersChange}
              onSearch={setSearchQuery}
              onReset={() => {
                setSearchQuery("");
                handleFiltersChange({});
              }}
              isLoading={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {state.bulkMode && selectedCount > 0 && (
        <NPCBulkActions
          selectedNPCs={state.selectedNPCs}
          npcs={npcs}
          onBulkEdit={() => {
            /* TODO: Implement bulk edit */
          }}
          onBulkDelete={async (npcIds) => {
            const confirmed = window.confirm(
              `Delete ${npcIds.length} NPCs? This cannot be undone.`
            );
            if (confirmed) {
              // Delete NPCs one by one (could be optimized with bulk API)
              for (const npcId of npcIds) {
                await deleteNPC(npcId);
              }
              setState((prev) => ({
                ...prev,
                selectedNPCs: [],
              }));
            }
          }}
          onBulkExport={() => {
            /* TODO: Implement bulk export */
          }}
          onBulkTag={() => {
            /* TODO: Implement bulk tagging */
          }}
          onClearSelection={() =>
            setState((prev) => ({ ...prev, selectedNPCs: [] }))
          }
        />
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content Area */}
        <div className={state.showPreview ? "lg:col-span-3" : "lg:col-span-4"}>
          <Tabs
            value={state.activeTab}
            onValueChange={(tab) =>
              setState((prev) => ({ ...prev, activeTab: tab as any }))
            }
          >
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="list">NPCs</TabsTrigger>
              <TabsTrigger value="create">Create</TabsTrigger>
              <TabsTrigger value="edit" disabled={!state.editingNPC}>
                Edit
              </TabsTrigger>
              <TabsTrigger value="import">Import</TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="space-y-4">
              <NPCList
                npcs={filteredNPCs}
                selectedNPCs={state.selectedNPCs}
                viewMode={state.viewMode}
                onSelectNPC={handleSelectNPC}
                onSelectMultiple={handleSelectMultiple}
                onEditNPC={handleEditNPC}
                onDeleteNPC={handleDeleteNPC}
                onDuplicateNPC={handleDuplicateNPC}
                isLoading={isLoading}
                isReadOnly={isReadOnly}
              />
            </TabsContent>

            <TabsContent value="create" className="space-y-4">
              <NPCForm
                npc={state.currentNPC}
                campaignId={campaignId}
                userId={userId}
                mode={state.currentNPC?._id ? "duplicate" : "create"}
                onSave={handleSaveNPC}
                onCancel={handleCancelEdit}
                isReadOnly={isReadOnly}
              />
            </TabsContent>

            <TabsContent value="edit" className="space-y-4">
              {state.editingNPC && currentNPC && (
                <NPCForm
                  npc={currentNPC}
                  campaignId={campaignId}
                  userId={userId}
                  mode="edit"
                  onSave={handleSaveNPC}
                  onCancel={handleCancelEdit}
                  isReadOnly={isReadOnly}
                />
              )}
            </TabsContent>

            <TabsContent value="import" className="space-y-4">
              <NPCImporter
                campaignId={campaignId}
                onImport={handleImportComplete}
                onCancel={() =>
                  setState((prev) => ({ ...prev, activeTab: "list" }))
                }
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Preview Panel */}
        {state.showPreview && (
          <div className="lg:col-span-1">
            <NPCPreview
              npc={currentNPC}
              isLoading={isLoading}
              onEdit={() => {
                if (currentNPC) {
                  handleEditNPC(currentNPC._id);
                }
              }}
              onDuplicate={() => {
                if (currentNPC) {
                  handleDuplicateNPC(currentNPC._id);
                }
              }}
              onDelete={() => {
                if (currentNPC) {
                  handleDeleteNPC(currentNPC._id);
                }
              }}
              showActions={!isReadOnly && isUserDM}
              isReadOnly={isReadOnly}
            />
          </div>
        )}
      </div>
    </div>
  );
}
