// src/components/character/creator/steps/BasicInfoStep.tsx

"use client";

import React from "react";
import { StepComponentProps, ALIGNMENTS } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

export function BasicInfoStep({ data, onUpdate }: StepComponentProps) {
  const handleNameChange = (value: string) => {
    onUpdate({ name: value });
  };

  const handleAlignmentChange = (value: string) => {
    onUpdate({ alignment: value });
  };

  return (
    <div className="space-y-6">
      {/* Character Name */}
      <Card>
        <CardHeader>
          <CardTitle>Character Identity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="character-name">Character Name *</Label>
            <Input
              id="character-name"
              value={data.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Enter your character's name"
              className="text-lg"
            />
            <p className="text-sm text-muted-foreground">
              Choose a memorable name for your character
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Alignment */}
      <Card>
        <CardHeader>
          <CardTitle>Moral Compass</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="alignment">Alignment *</Label>
            <Select
              value={data.alignment}
              onValueChange={handleAlignmentChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select alignment" />
              </SelectTrigger>
              <SelectContent>
                {ALIGNMENTS.map((alignment) => (
                  <SelectItem key={alignment} value={alignment}>
                    {alignment}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Your character's moral and ethical outlook
            </p>
          </div>

          {/* Alignment Description */}
          {data.alignment && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">{data.alignment}</h4>
              <p className="text-sm text-muted-foreground">
                {getAlignmentDescription(data.alignment)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Character Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Character Notes (Optional)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="character-notes">Initial Character Concept</Label>
            <Textarea
              id="character-notes"
              placeholder="Describe your character concept, backstory ideas, or any notes..."
              className="min-h-[100px]"
            />
            <p className="text-sm text-muted-foreground">
              These notes are just for your reference and can be changed later
            </p>
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
                  data.name.trim() ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <span className="text-sm">
                Character Name: {data.name.trim() ? "Complete" : "Required"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full ${
                  data.alignment ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <span className="text-sm">
                Alignment: {data.alignment ? "Complete" : "Required"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getAlignmentDescription(alignment: string): string {
  const descriptions: Record<string, string> = {
    "Lawful Good":
      "You act as a good person is expected or required to act. You combine a commitment to oppose evil with the discipline to fight relentlessly.",
    "Neutral Good":
      "You do the best that a good person can do. You are devoted to helping others and are guided by conscience.",
    "Chaotic Good":
      "You act as your conscience directs you with little regard for what others expect of you. You make your own way, but you're kind and benevolent.",
    "Lawful Neutral":
      "You act in accordance with law, tradition, or personal codes. Order and organization are paramount to you.",
    "True Neutral":
      "You prefer to steer clear of moral questions and don't take sides, doing what seems best at the time.",
    "Chaotic Neutral":
      "You follow your whims, holding your personal freedom above all else. You are an individualist first and last.",
    "Lawful Evil":
      "You methodically take what you want within the limits of a code of tradition, loyalty, or order.",
    "Neutral Evil":
      "You do whatever you can get away with, without compassion or qualms. You are out for yourself, pure and simple.",
    "Chaotic Evil":
      "You act with arbitrary violence, spurred by your greed, hatred, or bloodlust. You are hot-tempered, vicious, and unpredictable.",
  };

  return descriptions[alignment] || "Unknown alignment";
}
