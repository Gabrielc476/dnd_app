// src/components/character/CharacterInventory.tsx
"use client";

import React, { useState } from "react";
import { Character, InventoryItem } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Package,
  Plus,
  Edit3,
  Trash2,
  Save,
  X,
  Weight,
  DollarSign,
} from "lucide-react";

interface CharacterInventoryProps {
  character: Character;
  campaignId: string;
  userId: string;
  isReadOnly?: boolean;
  onUpdate?: (updates: Partial<Character>) => Promise<boolean>;
  isEditing?: boolean;
  onStartEditing?: () => void;
}

export function CharacterInventory({
  character,
  campaignId,
  userId,
  isReadOnly = false,
  onUpdate,
  isEditing = false,
  onStartEditing,
}: CharacterInventoryProps) {
  const [editingInventory, setEditingInventory] = useState(character.inventory);
  const [addItemDialog, setAddItemDialog] = useState(false);
  const [editItemDialog, setEditItemDialog] = useState(false);
  const [currentItem, setCurrentItem] = useState<InventoryItem>({
    item_id: "",
    name: "",
    quantity: 1,
    equipped: false,
    description: "",
    weight: 0,
    value: 0,
  });
  const [editingIndex, setEditingIndex] = useState(-1);

  const handleSave = async () => {
    if (onUpdate) {
      await onUpdate({ inventory: editingInventory });
    }
  };

  const handleCancel = () => {
    setEditingInventory(character.inventory);
  };

  const handleAddItem = () => {
    if (currentItem.name) {
      const newItem = {
        ...currentItem,
        item_id: `item_${Date.now()}`, // Generate simple ID
      };
      setEditingInventory((prev) => [...prev, newItem]);
      setCurrentItem({
        item_id: "",
        name: "",
        quantity: 1,
        equipped: false,
        description: "",
        weight: 0,
        value: 0,
      });
      setAddItemDialog(false);
    }
  };

  const handleEditItem = (index: number) => {
    setCurrentItem(editingInventory[index]);
    setEditingIndex(index);
    setEditItemDialog(true);
  };

  const handleUpdateItem = () => {
    if (currentItem.name && editingIndex >= 0) {
      setEditingInventory((prev) =>
        prev.map((item, i) => (i === editingIndex ? currentItem : item))
      );
      setCurrentItem({
        item_id: "",
        name: "",
        quantity: 1,
        equipped: false,
        description: "",
        weight: 0,
        value: 0,
      });
      setEditingIndex(-1);
      setEditItemDialog(false);
    }
  };

  const handleDeleteItem = (index: number) => {
    setEditingInventory((prev) => prev.filter((_, i) => i !== index));
  };

  const handleToggleEquipped = (index: number) => {
    setEditingInventory((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, equipped: !item.equipped } : item
      )
    );
  };

  const inventoryToShow = isEditing ? editingInventory : character.inventory;

  // Calculate totals
  const totalWeight = inventoryToShow.reduce(
    (sum, item) => sum + (item.weight || 0) * item.quantity,
    0
  );
  const totalValue = inventoryToShow.reduce(
    (sum, item) => sum + (item.value || 0) * item.quantity,
    0
  );

  const equippedItems = inventoryToShow.filter((item) => item.equipped);
  const unequippedItems = inventoryToShow.filter((item) => !item.equipped);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventory
          </CardTitle>
          <div className="flex gap-2">
            {!isReadOnly && !isEditing && (
              <>
                <Dialog open={addItemDialog} onOpenChange={setAddItemDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add Item</DialogTitle>
                      <DialogDescription>
                        Add a new item to {character.name}'s inventory.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Name *</label>
                          <Input
                            placeholder="Item name"
                            value={currentItem.name}
                            onChange={(e) =>
                              setCurrentItem({
                                ...currentItem,
                                name: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">
                            Quantity
                          </label>
                          <Input
                            type="number"
                            min="1"
                            value={currentItem.quantity}
                            onChange={(e) =>
                              setCurrentItem({
                                ...currentItem,
                                quantity: parseInt(e.target.value) || 1,
                              })
                            }
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">
                            Weight (lbs)
                          </label>
                          <Input
                            type="number"
                            min="0"
                            step="0.1"
                            value={currentItem.weight || 0}
                            onChange={(e) =>
                              setCurrentItem({
                                ...currentItem,
                                weight: parseFloat(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">
                            Value (gp)
                          </label>
                          <Input
                            type="number"
                            min="0"
                            value={currentItem.value || 0}
                            onChange={(e) =>
                              setCurrentItem({
                                ...currentItem,
                                value: parseInt(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium">
                          Description
                        </label>
                        <Textarea
                          placeholder="Item description"
                          value={currentItem.description || ""}
                          onChange={(e) =>
                            setCurrentItem({
                              ...currentItem,
                              description: e.target.value,
                            })
                          }
                          rows={3}
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="equipped"
                          checked={currentItem.equipped}
                          onCheckedChange={(checked) =>
                            setCurrentItem({
                              ...currentItem,
                              equipped: !!checked,
                            })
                          }
                        />
                        <label
                          htmlFor="equipped"
                          className="text-sm font-medium"
                        >
                          Equipped
                        </label>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setAddItemDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddItem}
                        disabled={!currentItem.name}
                      >
                        Add Item
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

        {/* Inventory Summary */}
        <div className="flex justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1">
                  <Weight className="h-4 w-4" />
                  {totalWeight.toFixed(1)} lbs
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Total Weight</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  {totalValue} gp
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Total Value</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div>{inventoryToShow.length} items</div>
        </div>
      </CardHeader>

      <CardContent>
        {inventoryToShow.length === 0 ? (
          <div className="text-center text-muted-foreground py-4">
            No items in inventory
          </div>
        ) : (
          <ScrollArea className="h-80">
            <div className="space-y-4">
              {/* Equipped Items */}
              {equippedItems.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    Equipped Items
                    <Badge variant="secondary" className="text-xs">
                      {equippedItems.length}
                    </Badge>
                  </h4>
                  <div className="space-y-2">
                    {equippedItems.map((item, index) => {
                      const originalIndex = inventoryToShow.indexOf(item);
                      return (
                        <div
                          key={item.item_id}
                          className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            {isEditing && (
                              <Checkbox
                                checked={item.equipped}
                                onCheckedChange={() =>
                                  handleToggleEquipped(originalIndex)
                                }
                              />
                            )}
                            <div className="flex-1">
                              <div className="font-medium">{item.name}</div>
                              <div className="text-xs text-muted-foreground">
                                Qty: {item.quantity}
                                {item.weight &&
                                  ` • ${(item.weight * item.quantity).toFixed(
                                    1
                                  )} lbs`}
                                {item.value &&
                                  ` • ${item.value * item.quantity} gp`}
                              </div>
                              {item.description && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {item.description}
                                </div>
                              )}
                            </div>
                          </div>

                          {isEditing && (
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditItem(originalIndex)}
                                className="h-6 w-6 p-0"
                              >
                                <Edit3 className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteItem(originalIndex)}
                                className="h-6 w-6 p-0"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {unequippedItems.length > 0 && <Separator className="my-4" />}
                </div>
              )}

              {/* Unequipped Items */}
              {unequippedItems.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    Other Items
                    <Badge variant="outline" className="text-xs">
                      {unequippedItems.length}
                    </Badge>
                  </h4>
                  <div className="space-y-2">
                    {unequippedItems.map((item, index) => {
                      const originalIndex = inventoryToShow.indexOf(item);
                      return (
                        <div
                          key={item.item_id}
                          className="flex items-center justify-between p-2 rounded-lg border"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            {isEditing && (
                              <Checkbox
                                checked={item.equipped}
                                onCheckedChange={() =>
                                  handleToggleEquipped(originalIndex)
                                }
                              />
                            )}
                            <div className="flex-1">
                              <div className="font-medium">{item.name}</div>
                              <div className="text-xs text-muted-foreground">
                                Qty: {item.quantity}
                                {item.weight &&
                                  ` • ${(item.weight * item.quantity).toFixed(
                                    1
                                  )} lbs`}
                                {item.value &&
                                  ` • ${item.value * item.quantity} gp`}
                              </div>
                              {item.description && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {item.description}
                                </div>
                              )}
                            </div>
                          </div>

                          {isEditing && (
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditItem(originalIndex)}
                                className="h-6 w-6 p-0"
                              >
                                <Edit3 className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteItem(originalIndex)}
                                className="h-6 w-6 p-0"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {/* Edit Item Dialog */}
        <Dialog open={editItemDialog} onOpenChange={setEditItemDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Item</DialogTitle>
              <DialogDescription>Edit the selected item.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Name *</label>
                  <Input
                    placeholder="Item name"
                    value={currentItem.name}
                    onChange={(e) =>
                      setCurrentItem({ ...currentItem, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Quantity</label>
                  <Input
                    type="number"
                    min="1"
                    value={currentItem.quantity}
                    onChange={(e) =>
                      setCurrentItem({
                        ...currentItem,
                        quantity: parseInt(e.target.value) || 1,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Weight (lbs)</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={currentItem.weight || 0}
                    onChange={(e) =>
                      setCurrentItem({
                        ...currentItem,
                        weight: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Value (gp)</label>
                  <Input
                    type="number"
                    min="0"
                    value={currentItem.value || 0}
                    onChange={(e) =>
                      setCurrentItem({
                        ...currentItem,
                        value: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  placeholder="Item description"
                  value={currentItem.description || ""}
                  onChange={(e) =>
                    setCurrentItem({
                      ...currentItem,
                      description: e.target.value,
                    })
                  }
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="equipped-edit"
                  checked={currentItem.equipped}
                  onCheckedChange={(checked) =>
                    setCurrentItem({ ...currentItem, equipped: !!checked })
                  }
                />
                <label htmlFor="equipped-edit" className="text-sm font-medium">
                  Equipped
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditItemDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateItem} disabled={!currentItem.name}>
                Update Item
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
