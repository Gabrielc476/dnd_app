// src/components/npc/list/NPCPreview.tsx

import React from "react";
import { Edit, Copy, Trash2, Download, FileText } from "lucide-react";
import { NPCPreviewProps } from "../types";
import { NPCStatBlock } from "../utils/NPCStatBlock";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export function NPCPreview({
  npc,
  isLoading = false,
  onEdit,
  onDuplicate,
  onDelete,
  onExport,
  showActions = true,
  isReadOnly = false,
}: NPCPreviewProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!npc) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No NPC Selected</h3>
          <p className="text-muted-foreground">
            Select an NPC from the list to view its details here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="truncate">{npc.name}</span>
            {showActions && !isReadOnly && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit?.()}
                  title="Edit NPC"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDuplicate?.()}
                  title="Duplicate NPC"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete?.()}
                  title="Delete NPC"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardTitle>
          <CardDescription>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">
                {npc.stats.attributes ? "Custom" : "Template"}
              </Badge>
              <Badge variant="secondary">CR {npc.stats.challenge_rating}</Badge>
              <Badge variant={npc.source === "custom" ? "default" : "outline"}>
                {npc.source === "custom" ? "Custom" : "Compendium"}
              </Badge>
            </div>
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Stat Block */}
      <NPCStatBlock
        npc={npc}
        variant="compact"
        showActions={true}
        showLegendaryActions={npc.legendary_actions.length > 0}
        showReactions={npc.reactions.length > 0}
      />

      {/* Export Actions */}
      {onExport && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Export Options</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExport("json")}
                className="text-xs"
              >
                <Download className="h-3 w-3 mr-1" />
                JSON
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExport("pdf")}
                className="text-xs"
              >
                <Download className="h-3 w-3 mr-1" />
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExport("roll20")}
                className="text-xs"
              >
                <Download className="h-3 w-3 mr-1" />
                Roll20
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExport("foundry")}
                className="text-xs"
              >
                <Download className="h-3 w-3 mr-1" />
                Foundry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper function to get CR experience value
function getCRExperience(cr: number): number {
  const xpTable: Record<number, number> = {
    0: 10,
    0.125: 25,
    0.25: 50,
    0.5: 100,
    1: 200,
    2: 450,
    3: 700,
    4: 1100,
    5: 1800,
    6: 2300,
    7: 2900,
    8: 3900,
    9: 5000,
    10: 5900,
    11: 7200,
    12: 8400,
    13: 10000,
    14: 11500,
    15: 13000,
    16: 15000,
    17: 18000,
    18: 20000,
    19: 22000,
    20: 25000,
    21: 33000,
    22: 41000,
    23: 50000,
    24: 62000,
    25: 75000,
    26: 90000,
    27: 105000,
    28: 120000,
    29: 135000,
    30: 155000,
  };

  return xpTable[cr] || 0;
}
