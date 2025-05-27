// src/components/npc/list/NPCList.tsx

"use client";

import React from "react";
import { NPCListProps } from "../types";
import { NPCCard } from "./NPCCard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users } from "lucide-react";

export function NPCList({
  npcs,
  selectedNPCs,
  viewMode,
  onSelectNPC,
  onSelectMultiple,
  onEditNPC,
  onDeleteNPC,
  onDuplicateNPC,
  isLoading = false,
  isReadOnly = false,
}: NPCListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading NPCs...</span>
        </CardContent>
      </Card>
    );
  }

  if (npcs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No NPCs Found</h3>
          <p className="text-muted-foreground mb-4">
            Get started by creating your first NPC or importing from the
            compendium.
          </p>
          {!isReadOnly && (
            <div className="flex gap-2">
              <Badge variant="outline">Create NPC</Badge>
              <Badge variant="outline">Import from Compendium</Badge>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {npcs.map((npc) => (
        <NPCCard
          key={npc._id}
          npc={npc}
          isSelected={selectedNPCs.includes(npc._id)}
          viewMode="grid"
          onSelect={onSelectNPC}
          onEdit={onEditNPC}
          onDelete={onDeleteNPC}
          onDuplicate={onDuplicateNPC}
          showActions={!isReadOnly}
          isReadOnly={isReadOnly}
        />
      ))}
    </div>
  );

  const renderListView = () => (
    <div className="space-y-2">
      {npcs.map((npc) => (
        <NPCCard
          key={npc._id}
          npc={npc}
          isSelected={selectedNPCs.includes(npc._id)}
          viewMode="list"
          onSelect={onSelectNPC}
          onEdit={onEditNPC}
          onDelete={onDeleteNPC}
          onDuplicate={onDuplicateNPC}
          showActions={!isReadOnly}
          isReadOnly={isReadOnly}
        />
      ))}
    </div>
  );

  const renderTableView = () => (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b">
              <tr className="text-left">
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Type</th>
                <th className="p-4 font-medium">CR</th>
                <th className="p-4 font-medium">Source</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {npcs.map((npc, index) => (
                <tr
                  key={npc._id}
                  className={`border-b hover:bg-muted/50 ${
                    selectedNPCs.includes(npc._id) ? "bg-muted" : ""
                  }`}
                  onClick={() => onSelectNPC(npc._id)}
                >
                  <td className="p-4">
                    <div className="font-medium">{npc.name}</div>
                  </td>
                  <td className="p-4">
                    <Badge variant="outline" className="text-xs">
                      {npc.type}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <Badge variant="secondary" className="text-xs">
                      CR {npc.challenge_rating}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <Badge
                      variant={npc.source === "custom" ? "default" : "outline"}
                      className="text-xs"
                    >
                      {npc.source === "custom" ? "Custom" : "Compendium"}
                    </Badge>
                  </td>
                  <td className="p-4">
                    {!isReadOnly && (
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditNPC(npc._id);
                          }}
                          className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDuplicateNPC(npc._id);
                          }}
                          className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
                        >
                          Copy
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteNPC(npc._id);
                          }}
                          className="px-2 py-1 text-xs bg-destructive text-destructive-foreground rounded hover:bg-destructive/90"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      {viewMode === "grid" && renderGridView()}
      {viewMode === "list" && renderListView()}
      {viewMode === "table" && renderTableView()}
    </div>
  );
}
