// src/components/character/creator/steps/EquipmentSelectionStep.tsx

"use client";

import React, { useState, useEffect } from "react";
import { Package, Sword, Shield, Shirt, Plus, Minus } from "lucide-react";
import { StepComponentProps, ClassEquipment, EquipmentOption } from "../types";
import { InventoryItem } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Equipment packages for quick selection
const EQUIPMENT_PACKAGES = {
  explorer: {
    name: "Explorer's Pack",
    items: [
      { item_id: "backpack", name: "Backpack", quantity: 1, equipped: false },
      { item_id: "bedroll", name: "Bedroll", quantity: 1, equipped: false },
      { item_id: "mess-kit", name: "Mess kit", quantity: 1, equipped: false },
      { item_id: "tinderbox", name: "Tinderbox", quantity: 1, equipped: false },
      { item_id: "torch", name: "Torch", quantity: 10, equipped: false },
      {
        item_id: "rations",
        name: "Rations (1 day)",
        quantity: 10,
        equipped: false,
      },
      { item_id: "waterskin", name: "Waterskin", quantity: 1, equipped: false },
      {
        item_id: "rope",
        name: "Hempen rope (50 feet)",
        quantity: 1,
        equipped: false,
      },
    ],
  },
  dungeoneer: {
    name: "Dungeoneer's Pack",
    items: [
      { item_id: "backpack", name: "Backpack", quantity: 1, equipped: false },
      { item_id: "crowbar", name: "Crowbar", quantity: 1, equipped: false },
      { item_id: "hammer", name: "Hammer", quantity: 1, equipped: false },
      { item_id: "piton", name: "Piton", quantity: 10, equipped: false },
      { item_id: "torch", name: "Torch", quantity: 10, equipped: false },
      { item_id: "tinderbox", name: "Tinderbox", quantity: 1, equipped: false },
      {
        item_id: "rations",
        name: "Rations (1 day)",
        quantity: 10,
        equipped: false,
      },
      { item_id: "waterskin", name: "Waterskin", quantity: 1, equipped: false },
      {
        item_id: "rope",
        name: "Hempen rope (50 feet)",
        quantity: 1,
        equipped: false,
      },
    ],
  },
  entertainer: {
    name: "Entertainer's Pack",
    items: [
      { item_id: "backpack", name: "Backpack", quantity: 1, equipped: false },
      { item_id: "bedroll", name: "Bedroll", quantity: 1, equipped: false },
      {
        item_id: "costume",
        name: "Costume clothes",
        quantity: 2,
        equipped: false,
      },
      { item_id: "candle", name: "Candle", quantity: 5, equipped: false },
      {
        item_id: "rations",
        name: "Rations (1 day)",
        quantity: 5,
        equipped: false,
      },
      { item_id: "waterskin", name: "Waterskin", quantity: 1, equipped: false },
      {
        item_id: "disguise-kit",
        name: "Disguise kit",
        quantity: 1,
        equipped: false,
      },
    ],
  },
};

export function EquipmentSelectionStep({ data, onUpdate }: StepComponentProps) {
  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, string>
  >({});
  const [selectedPackage, setSelectedPackage] = useState<string>("");
  const [useClassEquipment, setUseClassEquipment] = useState(true);
  const [customEquipment, setCustomEquipment] = useState<InventoryItem[]>([]);

  useEffect(() => {
    // Initialize equipment based on class and background
    if (
      data.characterClass &&
      data.background &&
      data.startingEquipment.length === 0
    ) {
      const backgroundEquipment = data.background.equipment || [];
      onUpdate({
        startingEquipment: [...backgroundEquipment],
      });
    }
  }, [
    data.characterClass,
    data.background,
    data.startingEquipment.length,
    onUpdate,
  ]);

  const handleClassEquipmentOption = (
    categoryId: string,
    optionName: string
  ) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [categoryId]: optionName,
    }));

    // Update equipment based on selections
    updateEquipmentFromSelections({
      ...selectedOptions,
      [categoryId]: optionName,
    });
  };

  const handlePackageSelect = (packageKey: string) => {
    setSelectedPackage(packageKey);
    const packageItems =
      EQUIPMENT_PACKAGES[packageKey as keyof typeof EQUIPMENT_PACKAGES]
        ?.items || [];

    // Combine background equipment with package equipment
    const backgroundEquipment = data.background?.equipment || [];
    const classEquipment = getClassEquipmentItems();

    onUpdate({
      startingEquipment: [
        ...backgroundEquipment,
        ...classEquipment,
        ...packageItems,
      ],
      selectedEquipmentPackage: packageKey,
    });
  };

  const updateEquipmentFromSelections = (
    selections: Record<string, string>
  ) => {
    const classEquipment = getClassEquipmentItemsFromSelections(selections);
    const backgroundEquipment = data.background?.equipment || [];
    const packageItems = selectedPackage
      ? EQUIPMENT_PACKAGES[selectedPackage as keyof typeof EQUIPMENT_PACKAGES]
          ?.items || []
      : [];

    onUpdate({
      startingEquipment: [
        ...backgroundEquipment,
        ...classEquipment,
        ...packageItems,
        ...customEquipment,
      ],
    });
  };

  const getClassEquipmentItems = (): InventoryItem[] => {
    return getClassEquipmentItemsFromSelections(selectedOptions);
  };

  const getClassEquipmentItemsFromSelections = (
    selections: Record<string, string>
  ): InventoryItem[] => {
    if (!data.characterClass?.equipment) return [];

    const items: InventoryItem[] = [];

    data.characterClass.equipment.forEach((category, categoryIndex) => {
      const selectedOptionName = selections[`category-${categoryIndex}`];
      if (selectedOptionName) {
        const selectedOption = category.options.find(
          (opt) => opt.name === selectedOptionName
        );
        if (selectedOption) {
          selectedOption.items.forEach((itemName) => {
            items.push({
              item_id: itemName.toLowerCase().replace(/\s+/g, "-"),
              name: itemName,
              quantity: selectedOption.quantity || 1,
              equipped: false,
            });
          });
        }
      }
    });

    return items;
  };

  const addCustomItem = () => {
    const newItem: InventoryItem = {
      item_id: `custom-${Date.now()}`,
      name: "New Item",
      quantity: 1,
      equipped: false,
    };

    const newCustomEquipment = [...customEquipment, newItem];
    setCustomEquipment(newCustomEquipment);
    updateEquipmentFromSelections(selectedOptions);
  };

  const updateCustomItem = (index: number, updates: Partial<InventoryItem>) => {
    const newCustomEquipment = customEquipment.map((item, i) =>
      i === index ? { ...item, ...updates } : item
    );
    setCustomEquipment(newCustomEquipment);
    updateEquipmentFromSelections(selectedOptions);
  };

  const removeCustomItem = (index: number) => {
    const newCustomEquipment = customEquipment.filter((_, i) => i !== index);
    setCustomEquipment(newCustomEquipment);
    updateEquipmentFromSelections(selectedOptions);
  };

  const getEquipmentIcon = (itemName: string) => {
    const name = itemName.toLowerCase();
    if (
      name.includes("armor") ||
      name.includes("mail") ||
      name.includes("leather")
    ) {
      return <Shirt className="h-4 w-4" />;
    }
    if (name.includes("shield")) {
      return <Shield className="h-4 w-4" />;
    }
    if (
      name.includes("sword") ||
      name.includes("weapon") ||
      name.includes("bow") ||
      name.includes("axe")
    ) {
      return <Sword className="h-4 w-4" />;
    }
    return <Package className="h-4 w-4" />;
  };

  const calculateArmorClass = (): number => {
    const dexModifier = Math.floor((data.attributes.dexterity - 10) / 2);
    let baseAC = 10 + dexModifier; // Unarmored AC
    let hasShield = false;

    data.startingEquipment.forEach((item) => {
      const name = item.name.toLowerCase();
      if (name.includes("leather armor")) {
        baseAC = 11 + dexModifier;
      } else if (name.includes("chain mail")) {
        baseAC = 16;
      } else if (name.includes("scale mail")) {
        baseAC = 14 + Math.min(dexModifier, 2);
      } else if (name.includes("shield")) {
        hasShield = true;
      }
    });

    return baseAC + (hasShield ? 2 : 0);
  };

  // Update AC when equipment changes
  useEffect(() => {
    const newAC = calculateArmorClass();
    if (newAC !== data.armorClass) {
      onUpdate({ armorClass: newAC });
    }
  }, [data.startingEquipment, data.attributes.dexterity]);

  return (
    <div className="space-y-6">
      <Tabs
        value={useClassEquipment ? "class" : "custom"}
        onValueChange={(value) => setUseClassEquipment(value === "class")}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="class">Class Equipment</TabsTrigger>
          <TabsTrigger value="custom">Custom Selection</TabsTrigger>
        </TabsList>

        <TabsContent value="class" className="space-y-6">
          {/* Class Equipment Options */}
          {data.characterClass?.equipment &&
            data.characterClass.equipment.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Class Starting Equipment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {data.characterClass.equipment.map(
                      (category, categoryIndex) => (
                        <div key={categoryIndex}>
                          <h4 className="font-medium mb-3">
                            {category.category}
                          </h4>
                          <RadioGroup
                            value={
                              selectedOptions[`category-${categoryIndex}`] || ""
                            }
                            onValueChange={(value) =>
                              handleClassEquipmentOption(
                                `category-${categoryIndex}`,
                                value
                              )
                            }
                          >
                            <div className="space-y-3">
                              {category.options.map((option, optionIndex) => (
                                <div
                                  key={optionIndex}
                                  className="flex items-center space-x-2"
                                >
                                  <RadioGroupItem
                                    value={option.name}
                                    id={`${categoryIndex}-${optionIndex}`}
                                  />
                                  <Label
                                    htmlFor={`${categoryIndex}-${optionIndex}`}
                                    className="flex-1"
                                  >
                                    <div className="font-medium">
                                      {option.name}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {option.items.join(", ")}
                                      {option.quantity &&
                                        option.quantity > 1 &&
                                        ` (${option.quantity}x)`}
                                    </div>
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </RadioGroup>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

          {/* Equipment Packages */}
          <Card>
            <CardHeader>
              <CardTitle>Equipment Pack (Optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <AlertDescription>
                    Choose an equipment pack for adventuring gear, or skip to
                    select items individually.
                  </AlertDescription>
                </Alert>

                <RadioGroup
                  value={selectedPackage}
                  onValueChange={handlePackageSelect}
                >
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="" id="no-package" />
                      <Label htmlFor="no-package">No Package</Label>
                    </div>

                    {Object.entries(EQUIPMENT_PACKAGES).map(([key, pack]) => (
                      <div key={key} className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value={key} id={key} />
                          <Label htmlFor={key} className="font-medium">
                            {pack.name}
                          </Label>
                        </div>

                        {selectedPackage === key && (
                          <div className="ml-6 space-y-1">
                            {pack.items.map((item, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-2 text-sm text-muted-foreground"
                              >
                                {getEquipmentIcon(item.name)}
                                <span>{item.name}</span>
                                {item.quantity > 1 && (
                                  <Badge variant="outline" className="text-xs">
                                    {item.quantity}x
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom" className="space-y-6">
          {/* Custom Equipment Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Custom Equipment
                <Button
                  onClick={addCustomItem}
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" />
                  Add Item
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {customEquipment.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No custom equipment added yet.</p>
                  <p className="text-sm">
                    Click "Add Item" to start building your equipment list.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {customEquipment.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 p-4 border rounded-lg"
                    >
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label className="text-xs">Item Name</Label>
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) =>
                              updateCustomItem(index, { name: e.target.value })
                            }
                            className="w-full px-2 py-1 text-sm border rounded"
                          />
                        </div>

                        <div>
                          <Label className="text-xs">Quantity</Label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              updateCustomItem(index, {
                                quantity: parseInt(e.target.value) || 1,
                              })
                            }
                            className="w-full px-2 py-1 text-sm border rounded"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={item.equipped}
                            onChange={(e) =>
                              updateCustomItem(index, {
                                equipped: e.target.checked,
                              })
                            }
                            className="rounded"
                          />
                          <Label className="text-xs">Equipped</Label>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeCustomItem(index)}
                        className="flex items-center gap-1"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Equipment Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Equipment Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Derived Stats */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 border rounded-lg">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Shield className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Armor Class</span>
                </div>
                <div className="font-bold text-lg">{calculateArmorClass()}</div>
              </div>

              <div className="p-3 border rounded-lg">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Package className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Total Items</span>
                </div>
                <div className="font-bold text-lg">
                  {data.startingEquipment.length}
                </div>
              </div>

              <div className="p-3 border rounded-lg">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Sword className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium">Equipped</span>
                </div>
                <div className="font-bold text-lg">
                  {
                    data.startingEquipment.filter((item) => item.equipped)
                      .length
                  }
                </div>
              </div>
            </div>

            <Separator />

            {/* Equipment List */}
            <div>
              <h4 className="font-medium mb-3">All Equipment</h4>
              {data.startingEquipment.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No equipment selected yet.</p>
                </div>
              ) : (
                <div className="grid gap-2 max-h-60 overflow-y-auto">
                  {data.startingEquipment.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <div className="flex items-center gap-2">
                        {getEquipmentIcon(item.name)}
                        <span className="text-sm">{item.name}</span>
                      </div>
                      <div className="flex gap-1">
                        {item.quantity > 1 && (
                          <Badge variant="outline" className="text-xs">
                            {item.quantity}x
                          </Badge>
                        )}
                        {item.equipped && (
                          <Badge variant="secondary" className="text-xs">
                            Equipped
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requirements Status */}
      <Card>
        <CardHeader>
          <CardTitle>Step Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full ${
                  data.startingEquipment.length > 0
                    ? "bg-green-500"
                    : "bg-red-500"
                }`}
              />
              <span className="text-sm">
                Starting Equipment:{" "}
                {data.startingEquipment.length > 0 ? "Complete" : "Required"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
