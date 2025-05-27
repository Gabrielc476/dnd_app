// src/components/npc/forms/NPCActionsEditor.tsx

import React, { useState } from "react";
import {
  Plus,
  Sword,
  Star,
  Shield as ShieldIcon,
  Edit,
  Trash2,
} from "lucide-react";
import { NPCActionsEditorProps, ActionEditorProps } from "../types";
import { NPCAction } from "@/lib/types";
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

export function NPCActionsEditor({
  actions,
  legendaryActions,
  reactions,
  onActionsChange,
  onLegendaryActionsChange,
  onReactionsChange,
  isReadOnly = false,
}: NPCActionsEditorProps) {
  const [expandedSections, setExpandedSections] = useState<{
    actions: boolean;
    legendary: boolean;
    reactions: boolean;
  }>({
    actions: true,
    legendary: false,
    reactions: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const createNewAction = (): NPCAction => ({
    name: "",
    description: "",
    attack_bonus: undefined,
    damage: undefined,
    damage_type: undefined,
  });

  const addAction = (type: "actions" | "legendary" | "reactions") => {
    const newAction = createNewAction();
    switch (type) {
      case "actions":
        onActionsChange([...actions, newAction]);
        break;
      case "legendary":
        onLegendaryActionsChange([...legendaryActions, newAction]);
        break;
      case "reactions":
        onReactionsChange([...reactions, newAction]);
        break;
    }
  };

  const updateAction = (
    type: "actions" | "legendary" | "reactions",
    index: number,
    updatedAction: NPCAction
  ) => {
    switch (type) {
      case "actions":
        const newActions = [...actions];
        newActions[index] = updatedAction;
        onActionsChange(newActions);
        break;
      case "legendary":
        const newLegendary = [...legendaryActions];
        newLegendary[index] = updatedAction;
        onLegendaryActionsChange(newLegendary);
        break;
      case "reactions":
        const newReactions = [...reactions];
        newReactions[index] = updatedAction;
        onReactionsChange(newReactions);
        break;
    }
  };

  const deleteAction = (
    type: "actions" | "legendary" | "reactions",
    index: number
  ) => {
    switch (type) {
      case "actions":
        onActionsChange(actions.filter((_, i) => i !== index));
        break;
      case "legendary":
        onLegendaryActionsChange(
          legendaryActions.filter((_, i) => i !== index)
        );
        break;
      case "reactions":
        onReactionsChange(reactions.filter((_, i) => i !== index));
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleSection("actions")}
          >
            <div className="flex items-center gap-2">
              <Sword className="h-5 w-5" />
              Actions ({actions.length})
            </div>
            <Button variant="ghost" size="sm">
              {expandedSections.actions ? "Collapse" : "Expand"}
            </Button>
          </CardTitle>
        </CardHeader>
        {expandedSections.actions && (
          <CardContent className="space-y-4">
            {actions.map((action, index) => (
              <ActionEditor
                key={index}
                action={action}
                onChange={(updatedAction) =>
                  updateAction("actions", index, updatedAction)
                }
                onDelete={() => deleteAction("actions", index)}
                isReadOnly={isReadOnly}
              />
            ))}
            {!isReadOnly && (
              <Button
                variant="outline"
                onClick={() => addAction("actions")}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Action
              </Button>
            )}
          </CardContent>
        )}
      </Card>

      {/* Legendary Actions */}
      <Card>
        <CardHeader>
          <CardTitle
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleSection("legendary")}
          >
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Legendary Actions ({legendaryActions.length})
            </div>
            <Button variant="ghost" size="sm">
              {expandedSections.legendary ? "Collapse" : "Expand"}
            </Button>
          </CardTitle>
        </CardHeader>
        {expandedSections.legendary && (
          <CardContent className="space-y-4">
            {legendaryActions.map((action, index) => (
              <ActionEditor
                key={index}
                action={action}
                onChange={(updatedAction) =>
                  updateAction("legendary", index, updatedAction)
                }
                onDelete={() => deleteAction("legendary", index)}
                isReadOnly={isReadOnly}
              />
            ))}
            {!isReadOnly && (
              <Button
                variant="outline"
                onClick={() => addAction("legendary")}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Legendary Action
              </Button>
            )}
          </CardContent>
        )}
      </Card>

      {/* Reactions */}
      <Card>
        <CardHeader>
          <CardTitle
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleSection("reactions")}
          >
            <div className="flex items-center gap-2">
              <ShieldIcon className="h-5 w-5" />
              Reactions ({reactions.length})
            </div>
            <Button variant="ghost" size="sm">
              {expandedSections.reactions ? "Collapse" : "Expand"}
            </Button>
          </CardTitle>
        </CardHeader>
        {expandedSections.reactions && (
          <CardContent className="space-y-4">
            {reactions.map((action, index) => (
              <ActionEditor
                key={index}
                action={action}
                onChange={(updatedAction) =>
                  updateAction("reactions", index, updatedAction)
                }
                onDelete={() => deleteAction("reactions", index)}
                isReadOnly={isReadOnly}
              />
            ))}
            {!isReadOnly && (
              <Button
                variant="outline"
                onClick={() => addAction("reactions")}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Reaction
              </Button>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}

// Action Editor Component
function ActionEditor({
  action,
  onChange,
  onDelete,
  isReadOnly = false,
}: ActionEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleChange = (field: keyof NPCAction, value: any) => {
    onChange({
      ...action,
      [field]: value,
    });
  };

  return (
    <Card className="border-2 border-dashed">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <Input
              value={action.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Action name"
              className="font-medium"
              disabled={isReadOnly}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            {!isReadOnly && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={action.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Describe what this action does..."
              rows={3}
              disabled={isReadOnly}
            />
          </div>

          {isExpanded && (
            <>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Attack Bonus</Label>
                  <Input
                    type="number"
                    value={action.attack_bonus || ""}
                    onChange={(e) =>
                      handleChange(
                        "attack_bonus",
                        e.target.value ? parseInt(e.target.value) : undefined
                      )
                    }
                    placeholder="e.g., +5"
                    disabled={isReadOnly}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Damage</Label>
                  <Input
                    value={action.damage || ""}
                    onChange={(e) => handleChange("damage", e.target.value)}
                    placeholder="e.g., 1d8+3"
                    disabled={isReadOnly}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Damage Type</Label>
                  <Input
                    value={action.damage_type || ""}
                    onChange={(e) =>
                      handleChange("damage_type", e.target.value)
                    }
                    placeholder="e.g., slashing"
                    disabled={isReadOnly}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
