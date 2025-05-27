// src/components/campaign/builder/EncounterBuilder.tsx

"use client";

import React, { useState } from "react";
import {
  Swords,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  MapPin,
  Users,
  Zap,
} from "lucide-react";
import { Encounter, NPCReference, Trap } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { generateId } from "@/lib/utils";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface EncounterBuilderProps {
  campaignId?: string;
  encounters: Encounter[];
  onUpdate: (encounters: Encounter[]) => void;
  isReadOnly?: boolean;
}

interface EncounterFormData {
  name: string;
  description: string;
  notes: string;
  npcs: NPCReference[];
  traps: Trap[];
  mapImageId?: string;
}

const defaultEncounterData: EncounterFormData = {
  name: "",
  description: "",
  notes: "",
  npcs: [],
  traps: [],
};

// Mock NPCs - em produção viria de uma API
const mockNPCs = [
  { id: "npc1", name: "Goblin Warrior", cr: "1/4", type: "humanoid" },
  { id: "npc2", name: "Orc Berserker", cr: "1", type: "humanoid" },
  { id: "npc3", name: "Dire Wolf", cr: "1", type: "beast" },
  { id: "npc4", name: "Troll", cr: "5", type: "giant" },
];

export function EncounterBuilder({
  campaignId,
  encounters,
  onUpdate,
  isReadOnly = false,
}: EncounterBuilderProps) {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEncounter, setEditingEncounter] = useState<Encounter | null>(
    null
  );
  const [formData, setFormData] =
    useState<EncounterFormData>(defaultEncounterData);

  const handleCreateEncounter = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Encounter name is required",
        variant: "destructive",
      });
      return;
    }

    const newEncounter: Encounter = {
      id: generateId(),
      name: formData.name,
      description: formData.description,
      notes: formData.notes,
      npcs: formData.npcs,
      traps: formData.traps,
      map_image_id: formData.mapImageId,
    };

    onUpdate([...encounters, newEncounter]);
    setFormData(defaultEncounterData);
    setIsCreateDialogOpen(false);

    toast({
      title: "Encounter Created",
      description: `"${newEncounter.name}" has been added to the campaign`,
    });
  };

  const handleEditEncounter = (encounter: Encounter) => {
    setEditingEncounter(encounter);
    setFormData({
      name: encounter.name,
      description: encounter.description || "",
      notes: encounter.notes || "",
      npcs: encounter.npcs,
      traps: encounter.traps,
      mapImageId: encounter.map_image_id,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateEncounter = () => {
    if (!editingEncounter || !formData.name.trim()) return;

    const updatedEncounter: Encounter = {
      ...editingEncounter,
      name: formData.name,
      description: formData.description,
      notes: formData.notes,
      npcs: formData.npcs,
      traps: formData.traps,
      map_image_id: formData.mapImageId,
    };

    const updatedEncounters = encounters.map((enc) =>
      enc.id === editingEncounter.id ? updatedEncounter : enc
    );

    onUpdate(updatedEncounters);
    setEditingEncounter(null);
    setFormData(defaultEncounterData);
    setIsEditDialogOpen(false);

    toast({
      title: "Encounter Updated",
      description: `"${updatedEncounter.name}" has been updated`,
    });
  };

  const handleDeleteEncounter = (encounterId: string) => {
    const encounter = encounters.find((enc) => enc.id === encounterId);
    const updatedEncounters = encounters.filter(
      (enc) => enc.id !== encounterId
    );
    onUpdate(updatedEncounters);

    toast({
      title: "Encounter Deleted",
      description: `"${encounter?.name}" has been removed`,
    });
  };

  const addNPCToEncounter = (npcId: string) => {
    const existingNPC = formData.npcs.find((npc) => npc.npc_id === npcId);
    if (existingNPC) {
      // Increase quantity
      const updatedNPCs = formData.npcs.map((npc) =>
        npc.npc_id === npcId ? { ...npc, quantity: npc.quantity + 1 } : npc
      );
      setFormData({ ...formData, npcs: updatedNPCs });
    } else {
      // Add new NPC
      const newNPCRef: NPCReference = {
        npc_id: npcId,
        quantity: 1,
        hidden: false,
      };
      setFormData({ ...formData, npcs: [...formData.npcs, newNPCRef] });
    }
  };

  const removeNPCFromEncounter = (npcId: string) => {
    const updatedNPCs = formData.npcs.filter((npc) => npc.npc_id !== npcId);
    setFormData({ ...formData, npcs: updatedNPCs });
  };

  const addTrapToEncounter = () => {
    const newTrap: Trap = {
      name: "New Trap",
      description: "",
      dc: 15,
      damage: "1d6",
      triggered: false,
    };
    setFormData({ ...formData, traps: [...formData.traps, newTrap] });
  };

  const updateTrap = (index: number, updatedTrap: Trap) => {
    const updatedTraps = formData.traps.map((trap, i) =>
      i === index ? updatedTrap : trap
    );
    setFormData({ ...formData, traps: updatedTraps });
  };

  const removeTrap = (index: number) => {
    const updatedTraps = formData.traps.filter((_, i) => i !== index);
    setFormData({ ...formData, traps: updatedTraps });
  };

  const EncounterForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="encounter-name">
            Encounter Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="encounter-name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter encounter name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="encounter-description">Description</Label>
          <Textarea
            id="encounter-description"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="Describe the encounter, setting, and context..."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="encounter-notes">DM Notes</Label>
          <Textarea
            id="encounter-notes"
            value={formData.notes}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
            placeholder="Private notes for the DM..."
            rows={2}
          />
        </div>
      </div>

      <Separator />

      {/* NPCs and Creatures */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">NPCs & Creatures</h4>
          <Select onValueChange={addNPCToEncounter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Add NPC" />
            </SelectTrigger>
            <SelectContent>
              {mockNPCs.map((npc) => (
                <SelectItem key={npc.id} value={npc.id}>
                  {npc.name} (CR {npc.cr})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {formData.npcs.length > 0 && (
          <div className="space-y-2">
            {formData.npcs.map((npcRef) => {
              const npc = mockNPCs.find((n) => n.id === npcRef.npc_id);
              return (
                <div
                  key={npcRef.npc_id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm font-medium">{npc?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        CR {npc?.cr} • {npc?.type}
                      </p>
                    </div>
                    <Badge variant="outline">x{npcRef.quantity}</Badge>
                    {npcRef.hidden && (
                      <Badge variant="secondary">
                        <EyeOff className="h-3 w-3 mr-1" />
                        Hidden
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeNPCFromEncounter(npcRef.npc_id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Separator />

      {/* Traps and Hazards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Traps & Hazards</h4>
          <Button
            variant="outline"
            size="sm"
            onClick={addTrapToEncounter}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Trap
          </Button>
        </div>

        {formData.traps.length > 0 && (
          <div className="space-y-3">
            {formData.traps.map((trap, index) => (
              <div key={index} className="p-3 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <Input
                    value={trap.name}
                    onChange={(e) =>
                      updateTrap(index, { ...trap, name: e.target.value })
                    }
                    placeholder="Trap name"
                    className="font-medium"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTrap(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Textarea
                  value={trap.description}
                  onChange={(e) =>
                    updateTrap(index, { ...trap, description: e.target.value })
                  }
                  placeholder="Trap description and effects..."
                  rows={2}
                />
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">DC</Label>
                    <Input
                      type="number"
                      value={trap.dc}
                      onChange={(e) =>
                        updateTrap(index, {
                          ...trap,
                          dc: parseInt(e.target.value) || 15,
                        })
                      }
                      min={5}
                      max={30}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Damage</Label>
                    <Input
                      value={trap.damage}
                      onChange={(e) =>
                        updateTrap(index, { ...trap, damage: e.target.value })
                      }
                      placeholder="1d6"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Swords className="h-5 w-5" />
              Encounters
              <Badge variant="outline">{encounters.length} encounters</Badge>
            </div>
            {!isReadOnly && (
              <Dialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Create Encounter
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Encounter</DialogTitle>
                    <DialogDescription>
                      Design a combat or roleplay encounter for your campaign
                    </DialogDescription>
                  </DialogHeader>
                  <EncounterForm />
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleCreateEncounter}>
                      Create Encounter
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </CardTitle>
          <CardDescription>
            Create and manage encounters for your campaign
          </CardDescription>
        </CardHeader>
        <CardContent>
          {encounters.length === 0 ? (
            <div className="text-center py-8">
              <Swords className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Encounters Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create encounters to add structure to your campaign
              </p>
              {!isReadOnly && (
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create First Encounter
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {encounters.map((encounter) => (
                <div
                  key={encounter.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-medium">{encounter.name}</h3>
                      {encounter.description && (
                        <p className="text-sm text-muted-foreground">
                          {encounter.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditEncounter(encounter)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {!isReadOnly && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete Encounter
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "
                                {encounter.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  handleDeleteEncounter(encounter.id)
                                }
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {encounter.npcs.reduce(
                        (total, npc) => total + npc.quantity,
                        0
                      )}{" "}
                      creatures
                    </div>
                    <div className="flex items-center gap-1">
                      <Zap className="h-4 w-4" />
                      {encounter.traps.length} traps
                    </div>
                    {encounter.map_image_id && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        Has map
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Encounter</DialogTitle>
            <DialogDescription>Modify the encounter details</DialogDescription>
          </DialogHeader>
          <EncounterForm isEdit />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateEncounter}>Update Encounter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
