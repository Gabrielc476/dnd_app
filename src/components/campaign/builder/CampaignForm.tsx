// src/components/campaign/builder/CampaignForm.tsx

"use client";

import React from "react";
import { FileText, Edit } from "lucide-react";
import { CampaignBuilderData } from "./CampaignBuilder";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CampaignFormProps {
  data: CampaignBuilderData;
  onUpdate: (updates: Partial<CampaignBuilderData>) => void;
  isReadOnly?: boolean;
}

export function CampaignForm({
  data,
  onUpdate,
  isReadOnly = false,
}: CampaignFormProps) {
  const handleNameChange = (value: string) => {
    onUpdate({ name: value });
  };

  const handleDescriptionChange = (value: string) => {
    onUpdate({ description: value });
  };

  const handleNotesChange = (value: string) => {
    onUpdate({ notes: value });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Basic Information
          </CardTitle>
          <CardDescription>
            Set up the basic details for your campaign
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Campaign Name */}
          <div className="space-y-2">
            <Label htmlFor="campaign-name">
              Campaign Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="campaign-name"
              value={data.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Enter campaign name (e.g., 'Lost Mine of Phandelver')"
              disabled={isReadOnly}
              className={!data.name.trim() ? "border-destructive" : ""}
            />
            <p className="text-sm text-muted-foreground">
              Choose a memorable name for your campaign ({data.name.length}/100
              characters)
            </p>
            {data.name.length > 100 && (
              <Alert variant="destructive">
                <AlertDescription>
                  Campaign name must be less than 100 characters
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Campaign Description */}
          <div className="space-y-2">
            <Label htmlFor="campaign-description">Campaign Description</Label>
            <Textarea
              id="campaign-description"
              value={data.description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder="Describe your campaign setting, theme, and what players can expect..."
              disabled={isReadOnly}
              rows={5}
              className="resize-none"
            />
            <p className="text-sm text-muted-foreground">
              Provide an overview of your campaign world and story (
              {data.description.length}/2000 characters)
            </p>
            {data.description.length > 2000 && (
              <Alert variant="destructive">
                <AlertDescription>
                  Description must be less than 2000 characters
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Campaign Notes */}
          <div className="space-y-2">
            <Label htmlFor="campaign-notes">Private Notes</Label>
            <Textarea
              id="campaign-notes"
              value={data.notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Add private notes for yourself as the DM (not visible to players)..."
              disabled={isReadOnly}
              rows={4}
              className="resize-none"
            />
            <p className="text-sm text-muted-foreground">
              These notes are only visible to you as the DM
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Campaign Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Campaign Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
              <p>
                <strong>Campaign Name:</strong> Choose something that captures
                the essence of your adventure. This will be visible to all
                players.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
              <p>
                <strong>Description:</strong> Describe the setting, tone, and
                what kind of adventure awaits. This helps players understand
                what to expect and create appropriate characters.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
              <p>
                <strong>Private Notes:</strong> Use this space for plot hooks,
                recurring NPCs, important dates, or any other information you
                want to keep handy during sessions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
