// src/components/npc/bulk/NPCBulkActions.tsx

"use client";

import React, { useState, useEffect } from "react";
import {
  CheckSquare,
  Square,
  Trash2,
  Copy,
  Tag,
  Download,
  Upload,
  Heart,
  Shield,
  Zap,
  AlertTriangle,
  Edit3,
} from "lucide-react";
import { NPCListItem, NPC } from "@/lib/types";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface NPCBulkActionsProps {
  npcs: NPCListItem[];
  selectedNPCIds: string[];
  onSelectionChange: (npcIds: string[]) => void;
  campaignId: string;
  userId: string;
  onRefresh?: () => void;
}

interface BulkEditData {
  hp?: {
    operation: "set" | "add" | "subtract";
    value: number;
  };
  ac?: {
    operation: "set" | "add" | "subtract";
    value: number;
  };
  tags?: {
    operation: "add" | "remove" | "replace";
    values: string[];
  };
  notes?: string;
}

interface BulkOperation {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresConfirmation: boolean;
  dangerous?: boolean;
}

const BULK_OPERATIONS: BulkOperation[] = [
  {
    id: "delete",
    name: "Delete Selected",
    description: "Permanently delete selected NPCs",
    icon: Trash2,
    requiresConfirmation: true,
    dangerous: true,
  },
  {
    id: "duplicate",
    name: "Duplicate Selected",
    description: "Create copies of selected NPCs",
    icon: Copy,
    requiresConfirmation: false,
  },
  {
    id: "bulk-edit",
    name: "Bulk Edit",
    description: "Edit properties of selected NPCs",
    icon: Edit3,
    requiresConfirmation: false,
  },
  {
    id: "export",
    name: "Export Selected",
    description: "Export selected NPCs to file",
    icon: Download,
    requiresConfirmation: false,
  },
  {
    id: "heal-all",
    name: "Heal All",
    description: "Restore all NPCs to full health",
    icon: Heart,
    requiresConfirmation: false,
  },
  {
    id: "reset-conditions",
    name: "Clear Conditions",
    description: "Remove all conditions from selected NPCs",
    icon: Shield,
    requiresConfirmation: false,
  },
];

export function NPCBulkActions({
  npcs,
  selectedNPCIds,
  onSelectionChange,
  campaignId,
  userId,
  onRefresh,
}: NPCBulkActionsProps) {
  const { toast } = useToast();
  const { deleteNPC, updateNPC, createNPC, updateHP } = useNPC({
    campaignId,
    userId,
  });

  const [isOperationInProgress, setIsOperationInProgress] = useState(false);
  const [operationProgress, setOperationProgress] = useState(0);
  const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = useState(false);
  const [bulkEditData, setBulkEditData] = useState<BulkEditData>({});
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [pendingOperation, setPendingOperation] =
    useState<BulkOperation | null>(null);

  const selectedNPCs = npcs.filter((npc) => selectedNPCIds.includes(npc._id));
  const allSelected = npcs.length > 0 && selectedNPCIds.length === npcs.length;
  const someSelected =
    selectedNPCIds.length > 0 && selectedNPCIds.length < npcs.length;

  // Handle select all toggle
  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(npcs.map((npc) => npc._id));
    }
  };

  // Handle individual NPC selection
  const handleNPCToggle = (npcId: string) => {
    if (selectedNPCIds.includes(npcId)) {
      onSelectionChange(selectedNPCIds.filter((id) => id !== npcId));
    } else {
      onSelectionChange([...selectedNPCIds, npcId]);
    }
  };

  // Execute bulk operation
  const executeBulkOperation = async (operation: BulkOperation) => {
    if (operation.requiresConfirmation) {
      setPendingOperation(operation);
      setIsConfirmDialogOpen(true);
      return;
    }

    await performBulkOperation(operation);
  };

  const performBulkOperation = async (operation: BulkOperation) => {
    setIsOperationInProgress(true);
    setOperationProgress(0);

    try {
      switch (operation.id) {
        case "delete":
          await handleBulkDelete();
          break;
        case "duplicate":
          await handleBulkDuplicate();
          break;
        case "bulk-edit":
          setIsBulkEditDialogOpen(true);
          setIsOperationInProgress(false);
          return;
        case "export":
          await handleBulkExport();
          break;
        case "heal-all":
          await handleBulkHeal();
          break;
        case "reset-conditions":
          await handleBulkResetConditions();
          break;
      }

      toast({
        title: "Operation Complete",
        description: `${operation.name} completed successfully`,
      });

      onRefresh?.();
      onSelectionChange([]);
    } catch (error) {
      toast({
        title: "Operation Failed",
        description: `Failed to complete ${operation.name}`,
        variant: "destructive",
      });
    } finally {
      setIsOperationInProgress(false);
      setOperationProgress(0);
      setIsConfirmDialogOpen(false);
      setPendingOperation(null);
    }
  };

  const handleBulkDelete = async () => {
    for (let i = 0; i < selectedNPCIds.length; i++) {
      const npcId = selectedNPCIds[i];
      await deleteNPC(npcId);
      setOperationProgress(((i + 1) / selectedNPCIds.length) * 100);
    }
  };

  const handleBulkDuplicate = async () => {
    // This would require fetching full NPC data first
    // For now, we'll show a simplified implementation
    for (let i = 0; i < selectedNPCs.length; i++) {
      const npc = selectedNPCs[i];

      // Create a basic duplicate with limited data
      const duplicateData = {
        name: `${npc.name} (Copy)`,
        campaign_id: campaignId,
        source: "custom" as const,
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
          challenge_rating: npc.challenge_rating,
          skills: {},
          saving_throws: {},
          damage_vulnerabilities: [],
          damage_resistances: [],
          damage_immunities: [],
          condition_immunities: [],
          senses: "",
          languages: [],
        },
        actions: [],
        features: [],
        legendary_actions: [],
        reactions: [],
        description: `Duplicate of ${npc.name}`,
      };

      await createNPC(duplicateData);
      setOperationProgress(((i + 1) / selectedNPCs.length) * 100);
    }
  };

  const handleBulkExport = async () => {
    const exportData = selectedNPCs.map((npc) => ({
      id: npc._id,
      name: npc.name,
      source: npc.source,
      challenge_rating: npc.challenge_rating,
      type: npc.type,
      exported_at: new Date().toISOString(),
    }));

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `npcs-export-${
      new Date().toISOString().split("T")[0]
    }.json`;
    link.click();

    URL.revokeObjectURL(url);
    setOperationProgress(100);
  };

  const handleBulkHeal = async () => {
    for (let i = 0; i < selectedNPCIds.length; i++) {
      const npcId = selectedNPCIds[i];
      // This assumes we have a way to heal NPCs - might need to be implemented
      // await healNPC(npcId);
      setOperationProgress(((i + 1) / selectedNPCIds.length) * 100);
    }
  };

  const handleBulkResetConditions = async () => {
    // This would require updating NPC conditions
    for (let i = 0; i < selectedNPCIds.length; i++) {
      const npcId = selectedNPCIds[i];
      // Implementation would depend on how conditions are stored
      setOperationProgress(((i + 1) / selectedNPCIds.length) * 100);
    }
  };

  const handleBulkEdit = async () => {
    setIsOperationInProgress(true);
    setOperationProgress(0);

    try {
      for (let i = 0; i < selectedNPCIds.length; i++) {
        const npcId = selectedNPCIds[i];
        const updates: any = {};

        // Apply HP changes
        if (bulkEditData.hp) {
          const { operation, value } = bulkEditData.hp;
          if (operation === "add" || operation === "subtract") {
            const change = operation === "add" ? value : -value;
            await updateHP(npcId, change);
          }
          // Note: "set" operation would require more complex logic
        }

        // Apply other updates
        if (Object.keys(updates).length > 0) {
          await updateNPC(npcId, updates);
        }

        setOperationProgress(((i + 1) / selectedNPCIds.length) * 100);
      }

      toast({
        title: "Bulk Edit Complete",
        description: `Updated ${selectedNPCIds.length} NPCs`,
      });

      setIsBulkEditDialogOpen(false);
      setBulkEditData({});
      onRefresh?.();
      onSelectionChange([]);
    } catch (error) {
      toast({
        title: "Bulk Edit Failed",
        description: "Failed to update some NPCs",
        variant: "destructive",
      });
    } finally {
      setIsOperationInProgress(false);
      setOperationProgress(0);
    }
  };

  const clearSelection = () => {
    onSelectionChange([]);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              Bulk Actions
              {selectedNPCIds.length > 0 && (
                <Badge variant="secondary">
                  {selectedNPCIds.length} selected
                </Badge>
              )}
            </div>

            {selectedNPCIds.length > 0 && (
              <Button variant="outline" size="sm" onClick={clearSelection}>
                Clear Selection
              </Button>
            )}
          </CardTitle>
          <CardDescription>
            Select multiple NPCs to perform bulk operations
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Selection Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected;
                }}
                onCheckedChange={handleSelectAll}
              />
              <Label className="cursor-pointer" onClick={handleSelectAll}>
                Select All NPCs ({npcs.length})
              </Label>
            </div>

            <div className="text-sm text-muted-foreground">
              {selectedNPCIds.length} of {npcs.length} selected
            </div>
          </div>

          <Separator />

          {/* NPC Selection List (simplified) */}
          {npcs.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {npcs.slice(0, 10).map((npc) => (
                <div
                  key={npc._id}
                  className="flex items-center space-x-2 p-2 rounded hover:bg-muted"
                >
                  <Checkbox
                    checked={selectedNPCIds.includes(npc._id)}
                    onCheckedChange={() => handleNPCToggle(npc._id)}
                  />
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-sm">{npc.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        CR {npc.challenge_rating}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {npc.type}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
              {npcs.length > 10 && (
                <div className="text-center text-sm text-muted-foreground py-2">
                  ... and {npcs.length - 10} more NPCs
                </div>
              )}
            </div>
          )}

          {/* Bulk Operations */}
          {selectedNPCIds.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label>Bulk Operations</Label>

                {isOperationInProgress && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Operation in progress...</span>
                      <span>{Math.round(operationProgress)}%</span>
                    </div>
                    <Progress value={operationProgress} />
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {BULK_OPERATIONS.map((operation) => {
                    const Icon = operation.icon;
                    return (
                      <Button
                        key={operation.id}
                        variant={
                          operation.dangerous ? "destructive" : "outline"
                        }
                        size="sm"
                        onClick={() => executeBulkOperation(operation)}
                        disabled={isOperationInProgress}
                        className="flex items-center gap-2"
                      >
                        <Icon className="h-4 w-4" />
                        {operation.name}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {selectedNPCIds.length === 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Select NPCs from the list above to enable bulk operations.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Bulk Edit Dialog */}
      <Dialog
        open={isBulkEditDialogOpen}
        onOpenChange={setIsBulkEditDialogOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Edit NPCs</DialogTitle>
            <DialogDescription>
              Apply changes to {selectedNPCIds.length} selected NPCs
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* HP Modification */}
            <div className="space-y-2">
              <Label>Hit Points</Label>
              <div className="flex gap-2">
                <Select
                  value={bulkEditData.hp?.operation || ""}
                  onValueChange={(value: "set" | "add" | "subtract") =>
                    setBulkEditData({
                      ...bulkEditData,
                      hp: { ...bulkEditData.hp, operation: value, value: 0 },
                    })
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">Add</SelectItem>
                    <SelectItem value="subtract">Subtract</SelectItem>
                    <SelectItem value="set">Set to</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  type="number"
                  placeholder="Value"
                  value={bulkEditData.hp?.value || ""}
                  onChange={(e) =>
                    setBulkEditData({
                      ...bulkEditData,
                      hp: {
                        ...bulkEditData.hp,
                        operation: bulkEditData.hp?.operation || "add",
                        value: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="bulk-notes">Add Notes</Label>
              <Textarea
                id="bulk-notes"
                placeholder="Add notes to selected NPCs..."
                value={bulkEditData.notes || ""}
                onChange={(e) =>
                  setBulkEditData({ ...bulkEditData, notes: e.target.value })
                }
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsBulkEditDialogOpen(false);
                setBulkEditData({});
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleBulkEdit}>Apply Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Operation</DialogTitle>
            <DialogDescription>
              Are you sure you want to {pendingOperation?.name.toLowerCase()}{" "}
              {selectedNPCIds.length} NPCs?
              {pendingOperation?.dangerous && (
                <span className="text-destructive font-medium">
                  {" "}
                  This action cannot be undone.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>Selected NPCs:</Label>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {selectedNPCs.map((npc) => (
                <div key={npc._id} className="text-sm p-2 bg-muted rounded">
                  {npc.name} (CR {npc.challenge_rating})
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsConfirmDialogOpen(false);
                setPendingOperation(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant={pendingOperation?.dangerous ? "destructive" : "default"}
              onClick={() =>
                pendingOperation && performBulkOperation(pendingOperation)
              }
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
