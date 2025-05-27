// src/components/npc/utils/NPCStatBlock.tsx

"use client";

import React, { useRef } from "react";
import { Copy, Printer, Download, ExternalLink } from "lucide-react";
import { NPC } from "@/lib/types";
import { formatModifier, capitalize } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NPCStatBlockProps {
  npc: NPC;
  showControls?: boolean;
  isPrintFriendly?: boolean;
  className?: string;
  onExport?: (format: "json" | "pdf" | "foundry" | "roll20") => void;
}

export function NPCStatBlock({
  npc,
  showControls = true,
  isPrintFriendly = false,
  className = "",
  onExport,
}: NPCStatBlockProps) {
  const { toast } = useToast();
  const statBlockRef = useRef<HTMLDivElement>(null);

  // Calculate ability modifiers
  const getModifier = (score: number) => formatModifier(score);

  // Calculate proficiency bonus based on CR
  const getProficiencyBonus = () => {
    const cr = parseFloat(npc.stats.challenge_rating);
    if (cr <= 4) return 2;
    if (cr <= 8) return 3;
    if (cr <= 12) return 4;
    if (cr <= 16) return 5;
    if (cr <= 20) return 6;
    if (cr <= 24) return 7;
    if (cr <= 28) return 8;
    return 9;
  };

  const proficiencyBonus = getProficiencyBonus();

  // Format saving throws
  const formatSavingThrows = () => {
    if (!npc.stats.saving_throws) return null;

    return Object.entries(npc.stats.saving_throws)
      .map(
        ([ability, bonus]) =>
          `${ability.toUpperCase()} ${bonus >= 0 ? "+" : ""}${bonus}`
      )
      .join(", ");
  };

  // Format skills
  const formatSkills = () => {
    if (!npc.stats.skills) return null;

    return Object.entries(npc.stats.skills)
      .map(
        ([skill, bonus]) =>
          `${capitalize(skill)} ${bonus >= 0 ? "+" : ""}${bonus}`
      )
      .join(", ");
  };

  // Format damage types
  const formatDamageTypes = (types: string[], label: string) => {
    if (!types || types.length === 0) return null;
    return `${label} ${types.join(", ")}`;
  };

  // Format speed
  const formatSpeed = () => {
    const speed = npc.stats.speed;
    if (typeof speed === "number") {
      return `${speed} ft.`;
    }
    // If speed is an object with multiple types
    return `${speed} ft.`;
  };

  // Format senses
  const formatSenses = () => {
    const senses = npc.stats.senses;
    const passivePerception =
      10 + (npc.stats.skills?.perception || getModifierValue("wisdom"));

    if (senses) {
      return `${senses}, passive Perception ${passivePerception}`;
    }
    return `passive Perception ${passivePerception}`;
  };

  // Get modifier value for calculations
  const getModifierValue = (ability: keyof typeof npc.stats.attributes) => {
    return Math.floor((npc.stats.attributes[ability] - 10) / 2);
  };

  // Format languages
  const formatLanguages = () => {
    if (!npc.stats.languages || npc.stats.languages.length === 0) {
      return "—";
    }
    return npc.stats.languages.join(", ");
  };

  // Copy to clipboard
  const handleCopyToClipboard = async () => {
    if (!statBlockRef.current) return;

    try {
      const text = statBlockRef.current.innerText;
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to Clipboard",
        description: "Stat block copied successfully",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  // Print stat block
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const printContent = statBlockRef.current?.innerHTML;
    const printStyles = `
      <style>
        body { 
          font-family: 'Times New Roman', serif; 
          margin: 0; 
          padding: 20px; 
          line-height: 1.4;
          font-size: 11px;
        }
        .stat-block { 
          max-width: 400px; 
          border: 2px solid #922610;
          background: #fdf1dc;
        }
        .stat-block-header {
          background: #922610;
          color: white;
          padding: 5px;
          text-align: center;
          font-weight: bold;
        }
        .stat-block-content { padding: 10px; }
        .ability-scores { 
          display: grid; 
          grid-template-columns: repeat(6, 1fr); 
          gap: 5px; 
          margin: 10px 0;
        }
        .ability-score { 
          text-align: center; 
          font-size: 10px;
        }
        .ability-name { font-weight: bold; }
        .ability-value { font-size: 12px; }
        .separator { 
          border: none; 
          border-top: 1px solid #922610; 
          margin: 8px 0; 
        }
        .actions { margin-top: 10px; }
        .action { margin-bottom: 8px; }
        .action-name { font-weight: bold; font-style: italic; }
      </style>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${npc.name} - Stat Block</title>
          ${printStyles}
        </head>
        <body>
          <div class="stat-block">
            ${printContent}
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.print();
  };

  return (
    <TooltipProvider>
      <Card className={`stat-block ${className}`}>
        {showControls && !isPrintFriendly && (
          <div className="flex items-center justify-between p-2 border-b bg-muted/30">
            <span className="text-sm font-medium">Stat Block</span>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCopyToClipboard}
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy to clipboard</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handlePrint}
                    className="h-8 w-8 p-0"
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Print</TooltipContent>
              </Tooltip>

              {onExport && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onExport("json")}
                      className="h-8 w-8 p-0"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Export</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        )}

        <CardContent
          ref={statBlockRef}
          className="stat-block-content p-4 space-y-3"
        >
          {/* Header */}
          <div className="stat-block-header text-center">
            <h3 className="text-lg font-bold text-primary">{npc.name}</h3>
            <p className="text-sm text-muted-foreground">
              {npc.stats.challenge_rating &&
                `Medium ${npc.stats.attributes ? "humanoid" : "creature"}, ${
                  npc.stats.challenge_rating
                    ? `CR ${npc.stats.challenge_rating}`
                    : "CR ?"
                }`}
            </p>
          </div>

          <Separator className="separator" />

          {/* Basic Stats */}
          <div className="space-y-2 text-sm">
            <div>
              <strong>Armor Class</strong> {npc.stats.ac}
            </div>
            <div>
              <strong>Hit Points</strong> {npc.stats.hp.current}/
              {npc.stats.hp.max}
            </div>
            <div>
              <strong>Speed</strong> {formatSpeed()}
            </div>
          </div>

          <Separator className="separator" />

          {/* Ability Scores */}
          <div className="ability-scores grid grid-cols-6 gap-2 text-xs">
            {Object.entries(npc.stats.attributes).map(([ability, score]) => (
              <div key={ability} className="ability-score text-center">
                <div className="ability-name font-bold">
                  {ability.substring(0, 3).toUpperCase()}
                </div>
                <div className="ability-value text-sm">{score}</div>
                <div className="text-xs">({getModifier(score)})</div>
              </div>
            ))}
          </div>

          <Separator className="separator" />

          {/* Saves, Skills, Resistances */}
          <div className="space-y-1 text-sm">
            {formatSavingThrows() && (
              <div>
                <strong>Saving Throws</strong> {formatSavingThrows()}
              </div>
            )}

            {formatSkills() && (
              <div>
                <strong>Skills</strong> {formatSkills()}
              </div>
            )}

            {formatDamageTypes(
              npc.stats.damage_vulnerabilities,
              "Damage Vulnerabilities"
            ) && (
              <div>
                <strong>Damage Vulnerabilities</strong>{" "}
                {npc.stats.damage_vulnerabilities.join(", ")}
              </div>
            )}

            {formatDamageTypes(
              npc.stats.damage_resistances,
              "Damage Resistances"
            ) && (
              <div>
                <strong>Damage Resistances</strong>{" "}
                {npc.stats.damage_resistances.join(", ")}
              </div>
            )}

            {formatDamageTypes(
              npc.stats.damage_immunities,
              "Damage Immunities"
            ) && (
              <div>
                <strong>Damage Immunities</strong>{" "}
                {npc.stats.damage_immunities.join(", ")}
              </div>
            )}

            {npc.stats.condition_immunities.length > 0 && (
              <div>
                <strong>Condition Immunities</strong>{" "}
                {npc.stats.condition_immunities.join(", ")}
              </div>
            )}

            <div>
              <strong>Senses</strong> {formatSenses()}
            </div>

            <div>
              <strong>Languages</strong> {formatLanguages()}
            </div>

            <div>
              <strong>Challenge</strong> {npc.stats.challenge_rating} (
              {`${Math.floor(
                25 * Math.pow(parseFloat(npc.stats.challenge_rating), 2)
              )} XP`}
              )
            </div>

            <div>
              <strong>Proficiency Bonus</strong> +{proficiencyBonus}
            </div>
          </div>

          {/* Features/Traits */}
          {npc.features && npc.features.length > 0 && (
            <>
              <Separator className="separator" />
              <div className="space-y-2">
                {npc.features.map((feature, index) => (
                  <div key={index} className="text-sm">
                    <div className="action">
                      <span className="action-name font-bold italic">
                        {feature.name}.
                      </span>
                      <span className="ml-1">{feature.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Actions */}
          {npc.actions && npc.actions.length > 0 && (
            <>
              <Separator className="separator" />
              <div className="actions space-y-2">
                <h4 className="font-bold text-primary">Actions</h4>
                {npc.actions.map((action, index) => (
                  <div key={index} className="text-sm">
                    <div className="action">
                      <span className="action-name font-bold italic">
                        {action.name}.
                      </span>
                      <span className="ml-1">{action.description}</span>
                      {action.attack_bonus && (
                        <span className="ml-1">
                          Attack: +{action.attack_bonus} to hit
                        </span>
                      )}
                      {action.damage && (
                        <span className="ml-1">
                          Damage: {action.damage} {action.damage_type || ""}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Legendary Actions */}
          {npc.legendary_actions && npc.legendary_actions.length > 0 && (
            <>
              <Separator className="separator" />
              <div className="actions space-y-2">
                <h4 className="font-bold text-primary">Legendary Actions</h4>
                <p className="text-xs italic">
                  {npc.name} can take 3 legendary actions, choosing from the
                  options below. Only one legendary action option can be used at
                  a time and only at the end of another creature's turn.
                  {npc.name} regains spent legendary actions at the start of its
                  turn.
                </p>
                {npc.legendary_actions.map((action, index) => (
                  <div key={index} className="text-sm">
                    <div className="action">
                      <span className="action-name font-bold italic">
                        {action.name}.
                      </span>
                      <span className="ml-1">{action.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Reactions */}
          {npc.reactions && npc.reactions.length > 0 && (
            <>
              <Separator className="separator" />
              <div className="actions space-y-2">
                <h4 className="font-bold text-primary">Reactions</h4>
                {npc.reactions.map((reaction, index) => (
                  <div key={index} className="text-sm">
                    <div className="action">
                      <span className="action-name font-bold italic">
                        {reaction.name}.
                      </span>
                      <span className="ml-1">{reaction.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Source Attribution */}
          {npc.source === "compendium" && npc.compendium_id && (
            <>
              <Separator className="separator" />
              <div className="text-xs text-muted-foreground italic">
                Source: D&D 5e Compendium
              </div>
            </>
          )}

          {npc.description && (
            <>
              <Separator className="separator" />
              <div className="text-xs text-muted-foreground">
                <strong>Notes:</strong> {npc.description}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
