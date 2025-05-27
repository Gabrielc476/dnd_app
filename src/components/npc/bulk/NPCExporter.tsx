// src/components/npc/bulk/NPCExporter.tsx

"use client";

import React, { useState } from "react";
import {
  Download,
  FileText,
  FileJson,
  Printer,
  Share2,
  Copy,
  Settings,
  Eye,
  CheckCircle,
} from "lucide-react";
import { NPC, NPCListItem } from "@/lib/types";
import { useNPC } from "@/hooks/useNPC";
import { useToast } from "@/hooks/use-toast";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface NPCExporterProps {
  npcs: NPCListItem[];
  selectedNPCIds: string[];
  campaignId: string;
  userId: string;
  onClose?: () => void;
}

type ExportFormat =
  | "json"
  | "pdf"
  | "html"
  | "roll20"
  | "foundry"
  | "statblock";

interface ExportOptions {
  format: ExportFormat;
  includeStats: boolean;
  includeActions: boolean;
  includeFeatures: boolean;
  includeLegendaryActions: boolean;
  includeReactions: boolean;
  includeDescription: boolean;
  includeCustomFields: boolean;
  groupByCategory: boolean;
  includeImages: boolean;
  printFriendly: boolean;
}

const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: "json",
  includeStats: true,
  includeActions: true,
  includeFeatures: true,
  includeLegendaryActions: true,
  includeReactions: true,
  includeDescription: true,
  includeCustomFields: false,
  groupByCategory: false,
  includeImages: false,
  printFriendly: false,
};

const EXPORT_FORMATS = [
  {
    id: "json" as ExportFormat,
    name: "JSON",
    description: "Machine-readable format for data backup",
    icon: FileJson,
    extension: "json",
  },
  {
    id: "pdf" as ExportFormat,
    name: "PDF",
    description: "Print-ready statblocks for physical use",
    icon: FileText,
    extension: "pdf",
  },
  {
    id: "html" as ExportFormat,
    name: "HTML",
    description: "Web page with formatted statblocks",
    icon: Eye,
    extension: "html",
  },
  {
    id: "statblock" as ExportFormat,
    name: "Stat Block",
    description: "D&D 5e formatted stat blocks",
    icon: Printer,
    extension: "txt",
  },
  {
    id: "roll20" as ExportFormat,
    name: "Roll20",
    description: "Roll20 VTT compatible format",
    icon: Share2,
    extension: "json",
  },
  {
    id: "foundry" as ExportFormat,
    name: "Foundry VTT",
    description: "Foundry Virtual Tabletop format",
    icon: Settings,
    extension: "json",
  },
];

export function NPCExporter({
  npcs,
  selectedNPCIds,
  campaignId,
  userId,
  onClose,
}: NPCExporterProps) {
  const { toast } = useToast();
  const { fetchNPC } = useNPC({ campaignId, userId });

  const [exportOptions, setExportOptions] = useState<ExportOptions>(
    DEFAULT_EXPORT_OPTIONS
  );
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [previewData, setPreviewData] = useState<string>("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>("");

  const selectedNPCs = npcs.filter((npc) => selectedNPCIds.includes(npc._id));

  const handleOptionChange = (key: keyof ExportOptions, value: any) => {
    setExportOptions((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const fetchFullNPCData = async (npcIds: string[]): Promise<NPC[]> => {
    const fullNPCs: NPC[] = [];

    for (let i = 0; i < npcIds.length; i++) {
      const npcId = npcIds[i];
      try {
        const fullNPC = await fetchNPC(npcId);
        if (fullNPC) {
          fullNPCs.push(fullNPC);
        }
        setExportProgress(((i + 1) / npcIds.length) * 50); // First 50% for fetching
      } catch (error) {
        console.error(`Failed to fetch NPC ${npcId}:`, error);
      }
    }

    return fullNPCs;
  };

  const formatNPCForExport = (npc: NPC): any => {
    const exportNPC: any = {
      id: npc._id,
      name: npc.name,
      source: npc.source,
    };

    if (exportOptions.includeStats) {
      exportNPC.stats = npc.stats;
    }

    if (exportOptions.includeActions) {
      exportNPC.actions = npc.actions;
    }

    if (exportOptions.includeFeatures) {
      exportNPC.features = npc.features;
    }

    if (exportOptions.includeLegendaryActions) {
      exportNPC.legendary_actions = npc.legendary_actions;
    }

    if (exportOptions.includeReactions) {
      exportNPC.reactions = npc.reactions;
    }

    if (exportOptions.includeDescription) {
      exportNPC.description = npc.description;
    }

    if (exportOptions.includeCustomFields) {
      exportNPC.created_at = npc.created_at;
      exportNPC.updated_at = npc.updated_at;
      exportNPC.campaign_id = npc.campaign_id;
    }

    return exportNPC;
  };

  const generateJSONExport = (npcs: NPC[]): string => {
    const exportData = {
      export_metadata: {
        format: "npc_export_v1",
        exported_at: new Date().toISOString(),
        campaign_id: campaignId,
        total_npcs: npcs.length,
        exported_by: userId,
      },
      npcs: npcs.map(formatNPCForExport),
    };

    return JSON.stringify(exportData, null, 2);
  };

  const generateStatBlockExport = (npcs: NPC[]): string => {
    return npcs
      .map((npc) => {
        const formatNPC = formatNPCForExport(npc);
        let statBlock = `${npc.name}\n`;
        statBlock += `${"=".repeat(npc.name.length)}\n\n`;

        if (formatNPC.stats) {
          const stats = formatNPC.stats;
          statBlock += `*${
            stats.challenge_rating ? `CR ${stats.challenge_rating}` : "CR 0"
          }*\n\n`;

          statBlock += `**Armor Class** ${stats.ac}\n`;
          statBlock += `**Hit Points** ${stats.hp?.max || 1}\n`;
          statBlock += `**Speed** ${stats.speed || 30} ft.\n\n`;

          if (stats.attributes) {
            const attrs = stats.attributes;
            statBlock += `**STR** ${attrs.strength} (${
              Math.floor((attrs.strength - 10) / 2) >= 0 ? "+" : ""
            }${Math.floor((attrs.strength - 10) / 2)}) `;
            statBlock += `**DEX** ${attrs.dexterity} (${
              Math.floor((attrs.dexterity - 10) / 2) >= 0 ? "+" : ""
            }${Math.floor((attrs.dexterity - 10) / 2)}) `;
            statBlock += `**CON** ${attrs.constitution} (${
              Math.floor((attrs.constitution - 10) / 2) >= 0 ? "+" : ""
            }${Math.floor((attrs.constitution - 10) / 2)})\n`;
            statBlock += `**INT** ${attrs.intelligence} (${
              Math.floor((attrs.intelligence - 10) / 2) >= 0 ? "+" : ""
            }${Math.floor((attrs.intelligence - 10) / 2)}) `;
            statBlock += `**WIS** ${attrs.wisdom} (${
              Math.floor((attrs.wisdom - 10) / 2) >= 0 ? "+" : ""
            }${Math.floor((attrs.wisdom - 10) / 2)}) `;
            statBlock += `**CHA** ${attrs.charisma} (${
              Math.floor((attrs.charisma - 10) / 2) >= 0 ? "+" : ""
            }${Math.floor((attrs.charisma - 10) / 2)})\n\n`;
          }

          if (stats.senses) {
            statBlock += `**Senses** ${stats.senses}\n`;
          }

          if (stats.languages && stats.languages.length > 0) {
            statBlock += `**Languages** ${stats.languages.join(", ")}\n`;
          }
        }

        if (formatNPC.features && formatNPC.features.length > 0) {
          statBlock += `\n**Features**\n`;
          formatNPC.features.forEach((feature: any) => {
            statBlock += `***${feature.name}*** ${feature.description}\n\n`;
          });
        }

        if (formatNPC.actions && formatNPC.actions.length > 0) {
          statBlock += `**Actions**\n`;
          formatNPC.actions.forEach((action: any) => {
            statBlock += `***${action.name}*** ${action.description}\n\n`;
          });
        }

        if (
          formatNPC.legendary_actions &&
          formatNPC.legendary_actions.length > 0
        ) {
          statBlock += `**Legendary Actions**\n`;
          formatNPC.legendary_actions.forEach((action: any) => {
            statBlock += `***${action.name}*** ${action.description}\n\n`;
          });
        }

        if (formatNPC.reactions && formatNPC.reactions.length > 0) {
          statBlock += `**Reactions**\n`;
          formatNPC.reactions.forEach((reaction: any) => {
            statBlock += `***${reaction.name}*** ${reaction.description}\n\n`;
          });
        }

        return statBlock + "\n" + "─".repeat(50) + "\n\n";
      })
      .join("");
  };

  const generateHTMLExport = (npcs: NPC[]): string => {
    const npcsData = npcs.map(formatNPCForExport);

    let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NPC Export - ${new Date().toLocaleDateString()}</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; }
        .npc-card { border: 1px solid #ccc; border-radius: 8px; padding: 20px; margin-bottom: 20px; background: #f9f9f9; }
        .npc-name { font-size: 24px; font-weight: bold; margin-bottom: 10px; color: #8B4513; }
        .npc-stats { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin: 15px 0; }
        .stat { text-align: center; padding: 10px; background: white; border-radius: 4px; }
        .stat-name { font-weight: bold; font-size: 12px; }
        .stat-value { font-size: 18px; font-weight: bold; }
        .stat-mod { font-size: 12px; color: #666; }
        .section { margin: 15px 0; }
        .section-title { font-weight: bold; font-size: 16px; margin-bottom: 8px; color: #8B4513; }
        .feature, .action { margin-bottom: 10px; }
        .feature-name, .action-name { font-weight: bold; font-style: italic; }
        ${
          exportOptions.printFriendly
            ? `
        @media print {
            .npc-card { break-inside: avoid; border: 2px solid #000; }
            body { margin: 0; }
        }`
            : ""
        }
    </style>
</head>
<body>
    <h1>NPC Export</h1>
    <p><strong>Exported:</strong> ${new Date().toLocaleString()}</p>
    <p><strong>Total NPCs:</strong> ${npcs.length}</p>
    <hr>
`;

    npcsData.forEach((npc) => {
      html += `
    <div class="npc-card">
        <div class="npc-name">${npc.name}</div>
        ${
          npc.stats
            ? `
        <div><strong>CR ${
          npc.stats.challenge_rating || 0
        }</strong> | <strong>AC:</strong> ${
                npc.stats.ac
              } | <strong>HP:</strong> ${npc.stats.hp?.max || 1}</div>
        ${
          npc.stats.attributes
            ? `
        <div class="npc-stats">
            <div class="stat">
                <div class="stat-name">STR</div>
                <div class="stat-value">${npc.stats.attributes.strength}</div>
                <div class="stat-mod">(${
                  Math.floor((npc.stats.attributes.strength - 10) / 2) >= 0
                    ? "+"
                    : ""
                }${Math.floor((npc.stats.attributes.strength - 10) / 2)})</div>
            </div>
            <div class="stat">
                <div class="stat-name">DEX</div>
                <div class="stat-value">${npc.stats.attributes.dexterity}</div>
                <div class="stat-mod">(${
                  Math.floor((npc.stats.attributes.dexterity - 10) / 2) >= 0
                    ? "+"
                    : ""
                }${Math.floor((npc.stats.attributes.dexterity - 10) / 2)})</div>
            </div>
            <div class="stat">
                <div class="stat-name">CON</div>
                <div class="stat-value">${
                  npc.stats.attributes.constitution
                }</div>
                <div class="stat-mod">(${
                  Math.floor((npc.stats.attributes.constitution - 10) / 2) >= 0
                    ? "+"
                    : ""
                }${Math.floor(
                (npc.stats.attributes.constitution - 10) / 2
              )})</div>
            </div>
            <div class="stat">
                <div class="stat-name">INT</div>
                <div class="stat-value">${
                  npc.stats.attributes.intelligence
                }</div>
                <div class="stat-mod">(${
                  Math.floor((npc.stats.attributes.intelligence - 10) / 2) >= 0
                    ? "+"
                    : ""
                }${Math.floor(
                (npc.stats.attributes.intelligence - 10) / 2
              )})</div>
            </div>
            <div class="stat">
                <div class="stat-name">WIS</div>
                <div class="stat-value">${npc.stats.attributes.wisdom}</div>
                <div class="stat-mod">(${
                  Math.floor((npc.stats.attributes.wisdom - 10) / 2) >= 0
                    ? "+"
                    : ""
                }${Math.floor((npc.stats.attributes.wisdom - 10) / 2)})</div>
            </div>
            <div class="stat">
                <div class="stat-name">CHA</div>
                <div class="stat-value">${npc.stats.attributes.charisma}</div>
                <div class="stat-mod">(${
                  Math.floor((npc.stats.attributes.charisma - 10) / 2) >= 0
                    ? "+"
                    : ""
                }${Math.floor((npc.stats.attributes.charisma - 10) / 2)})</div>
            </div>
        </div>`
            : ""
        }`
            : ""
        }
        
        ${
          npc.features && npc.features.length > 0
            ? `
        <div class="section">
            <div class="section-title">Features</div>
            ${npc.features
              .map(
                (f: any) => `
            <div class="feature">
                <span class="feature-name">${f.name}.</span> ${f.description}
            </div>`
              )
              .join("")}
        </div>`
            : ""
        }
        
        ${
          npc.actions && npc.actions.length > 0
            ? `
        <div class="section">
            <div class="section-title">Actions</div>
            ${npc.actions
              .map(
                (a: any) => `
            <div class="action">
                <span class="action-name">${a.name}.</span> ${a.description}
            </div>`
              )
              .join("")}
        </div>`
            : ""
        }
        
        ${
          npc.legendary_actions && npc.legendary_actions.length > 0
            ? `
        <div class="section">
            <div class="section-title">Legendary Actions</div>
            ${npc.legendary_actions
              .map(
                (la: any) => `
            <div class="action">
                <span class="action-name">${la.name}.</span> ${la.description}
            </div>`
              )
              .join("")}
        </div>`
            : ""
        }
    </div>`;
    });

    html += `
</body>
</html>`;

    return html;
  };

  const generateExportData = async (): Promise<string> => {
    const fullNPCs = await fetchFullNPCData(selectedNPCIds);

    setExportProgress(75); // 75% complete after processing

    let exportData: string;

    switch (exportOptions.format) {
      case "json":
      case "roll20":
      case "foundry":
        exportData = generateJSONExport(fullNPCs);
        break;
      case "statblock":
        exportData = generateStatBlockExport(fullNPCs);
        break;
      case "html":
        exportData = generateHTMLExport(fullNPCs);
        break;
      case "pdf":
        // For PDF, we'd typically use a library like jsPDF or Puppeteer
        // For now, we'll export as HTML that can be printed to PDF
        exportData = generateHTMLExport(fullNPCs);
        break;
      default:
        exportData = generateJSONExport(fullNPCs);
    }

    setExportProgress(100);
    return exportData;
  };

  const handleExport = async () => {
    if (selectedNPCIds.length === 0) {
      toast({
        title: "No NPCs Selected",
        description: "Please select NPCs to export",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      const exportData = await generateExportData();

      // Create and download file
      const format = EXPORT_FORMATS.find((f) => f.id === exportOptions.format);
      const mimeType =
        exportOptions.format === "html"
          ? "text/html"
          : exportOptions.format === "json"
          ? "application/json"
          : "text/plain";

      const blob = new Blob([exportData], { type: mimeType });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `npcs-export-${new Date().toISOString().split("T")[0]}.${
        format?.extension || "txt"
      }`;
      link.click();

      URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: `Successfully exported ${selectedNPCIds.length} NPCs as ${format?.name}`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export NPCs. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const handlePreview = async () => {
    if (selectedNPCIds.length === 0) return;

    setIsExporting(true);
    try {
      const exportData = await generateExportData();
      setPreviewData(exportData);
      setIsPreviewOpen(true);
    } catch (error) {
      toast({
        title: "Preview Failed",
        description: "Failed to generate preview",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(previewData);
    toast({
      title: "Copied",
      description: "Export data copied to clipboard",
    });
  };

  const selectedFormat = EXPORT_FORMATS.find(
    (f) => f.id === exportOptions.format
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export NPCs
            {selectedNPCIds.length > 0 && (
              <Badge variant="secondary">
                {selectedNPCIds.length} selected
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Export selected NPCs in various formats for backup or use in other
            tools
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {selectedNPCIds.length === 0 && (
            <Alert>
              <AlertDescription>
                Select NPCs from your list to enable export options.
              </AlertDescription>
            </Alert>
          )}

          {selectedNPCIds.length > 0 && (
            <>
              {/* Selected NPCs */}
              <div className="space-y-2">
                <Label>Selected NPCs ({selectedNPCs.length})</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedNPCs.slice(0, 5).map((npc) => (
                    <Badge key={npc._id} variant="outline">
                      {npc.name}
                    </Badge>
                  ))}
                  {selectedNPCs.length > 5 && (
                    <Badge variant="outline">
                      +{selectedNPCs.length - 5} more
                    </Badge>
                  )}
                </div>
              </div>

              <Separator />

              {/* Export Format Selection */}
              <div className="space-y-3">
                <Label>Export Format</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {EXPORT_FORMATS.map((format) => {
                    const Icon = format.icon;
                    const isSelected = exportOptions.format === format.id;

                    return (
                      <div
                        key={format.id}
                        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                        onClick={() => handleOptionChange("format", format.id)}
                      >
                        <div className="flex items-start gap-3">
                          <Icon className="h-5 w-5 mt-1" />
                          <div className="space-y-1">
                            <div className="font-medium">{format.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {format.description}
                            </div>
                          </div>
                          {isSelected && (
                            <CheckCircle className="h-5 w-5 text-primary ml-auto" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Export Options */}
              <div className="space-y-3">
                <Label>Export Options</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-stats"
                        checked={exportOptions.includeStats}
                        onCheckedChange={(checked) =>
                          handleOptionChange("includeStats", checked)
                        }
                      />
                      <Label htmlFor="include-stats">Include Stats</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-actions"
                        checked={exportOptions.includeActions}
                        onCheckedChange={(checked) =>
                          handleOptionChange("includeActions", checked)
                        }
                      />
                      <Label htmlFor="include-actions">Include Actions</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-features"
                        checked={exportOptions.includeFeatures}
                        onCheckedChange={(checked) =>
                          handleOptionChange("includeFeatures", checked)
                        }
                      />
                      <Label htmlFor="include-features">Include Features</Label>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-legendary"
                        checked={exportOptions.includeLegendaryActions}
                        onCheckedChange={(checked) =>
                          handleOptionChange("includeLegendaryActions", checked)
                        }
                      />
                      <Label htmlFor="include-legendary">
                        Legendary Actions
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-reactions"
                        checked={exportOptions.includeReactions}
                        onCheckedChange={(checked) =>
                          handleOptionChange("includeReactions", checked)
                        }
                      />
                      <Label htmlFor="include-reactions">
                        Include Reactions
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-description"
                        checked={exportOptions.includeDescription}
                        onCheckedChange={(checked) =>
                          handleOptionChange("includeDescription", checked)
                        }
                      />
                      <Label htmlFor="include-description">
                        Include Description
                      </Label>
                    </div>
                  </div>
                </div>

                {(exportOptions.format === "html" ||
                  exportOptions.format === "pdf") && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="print-friendly"
                      checked={exportOptions.printFriendly}
                      onCheckedChange={(checked) =>
                        handleOptionChange("printFriendly", checked)
                      }
                    />
                    <Label htmlFor="print-friendly">
                      Print-friendly format
                    </Label>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              {isExporting && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Exporting NPCs...</span>
                    <span>{Math.round(exportProgress)}%</span>
                  </div>
                  <Progress value={exportProgress} />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting
                    ? "Exporting..."
                    : `Export as ${selectedFormat?.name}`}
                </Button>

                <Button
                  variant="outline"
                  onClick={handlePreview}
                  disabled={isExporting}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Export Preview</DialogTitle>
            <DialogDescription>
              Preview of {selectedNPCIds.length} NPCs in {selectedFormat?.name}{" "}
              format
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-96 w-full">
            <pre className="text-xs p-4 bg-muted rounded whitespace-pre-wrap">
              {previewData}
            </pre>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={copyToClipboard}>
              <Copy className="h-4 w-4 mr-2" />
              Copy to Clipboard
            </Button>
            <Button onClick={() => setIsPreviewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
