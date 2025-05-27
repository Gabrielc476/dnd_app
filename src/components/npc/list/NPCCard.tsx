// src/components/npc/list/NPCCard.tsx

import React from "react";
import {
  MoreHorizontal,
  Edit,
  Copy,
  Trash2,
  Shield,
  Heart,
  Zap,
} from "lucide-react";
import { NPCCardProps } from "../types";
import { parseCR } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";

export function NPCCard({
  npc,
  isSelected = false,
  viewMode,
  onSelect,
  onEdit,
  onDelete,
  onDuplicate,
  showActions = true,
  isReadOnly = false,
}: NPCCardProps) {
  const crValue = parseCR(npc.challenge_rating);
  const xpValue = getCRExperience(crValue);

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't select if clicking on action buttons
    if ((e.target as HTMLElement).closest("button")) {
      return;
    }
    onSelect(npc._id);
  };

  if (viewMode === "list") {
    return (
      <Card
        className={`cursor-pointer transition-colors hover:bg-muted/50 ${
          isSelected ? "ring-2 ring-primary" : ""
        }`}
        onClick={handleCardClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Checkbox
                checked={isSelected}
                onChange={() => onSelect(npc._id)}
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{npc.name}</h3>
                  <Badge variant="outline" className="text-xs">
                    {npc.type}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    CR {npc.challenge_rating}
                  </Badge>
                  <Badge
                    variant={npc.source === "custom" ? "default" : "outline"}
                    className="text-xs"
                  >
                    {npc.source === "custom" ? "Custom" : "Compendium"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {xpValue.toLocaleString()} XP
                </p>
              </div>
            </div>

            {showActions && !isReadOnly && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(npc._id)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDuplicate(npc._id)}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(npc._id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Grid view
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? "ring-2 ring-primary shadow-md" : ""
      }`}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{npc.name}</h3>
            <p className="text-sm text-muted-foreground">{npc.type}</p>
          </div>
          {showActions && !isReadOnly && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(npc._id)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDuplicate(npc._id)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(npc._id)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Challenge Rating and XP */}
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-xs">
              CR {npc.challenge_rating}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {xpValue.toLocaleString()} XP
            </span>
          </div>

          {/* Source */}
          <div className="flex justify-center">
            <Badge
              variant={npc.source === "custom" ? "default" : "outline"}
              className="text-xs"
            >
              {npc.source === "custom" ? "Custom" : "Compendium"}
            </Badge>
          </div>

          {/* Selection Checkbox (for bulk operations) */}
          <div className="flex justify-center">
            <Checkbox
              checked={isSelected}
              onChange={() => onSelect(npc._id)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
