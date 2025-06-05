// src/app/characters/import/page.tsx
"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Upload,
  FileText,
  Download,
  CheckCircle,
  AlertCircle,
  X,
  Eye,
  UserPlus,
} from "lucide-react";

import { Character } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";
import { useCharacter } from "@/hooks/useCharacter";
import { useGameStore } from "@/stores/gameStore";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ImportedCharacter {
  id: string;
  data: Partial<Character>;
  status: "pending" | "success" | "error";
  error?: string;
  preview?: {
    name: string;
    level: number;
    race: string;
    class: string;
  };
}

export default function ImportCharactersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentCampaign } = useGameStore();
  const { createCharacter } = useCharacter({
    campaignId: currentCampaign?._id || "",
    userId: user?.id || "",
  });
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importedCharacters, setImportedCharacters] = useState<
    ImportedCharacter[]
  >([]);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedCharacter, setSelectedCharacter] =
    useState<ImportedCharacter | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const characterData = JSON.parse(content);

          // Validate character data
          const validationResult = validateCharacterData(characterData);

          const importedChar: ImportedCharacter = {
            id: Math.random().toString(36).substr(2, 9),
            data: characterData,
            status: validationResult.isValid ? "pending" : "error",
            error: validationResult.error,
            preview: {
              name: characterData.name || "Unknown",
              level: characterData.level || 1,
              race: characterData.race || "Unknown",
              class: characterData.class || "Unknown",
            },
          };

          setImportedCharacters((prev) => [...prev, importedChar]);
        } catch (error) {
          const importedChar: ImportedCharacter = {
            id: Math.random().toString(36).substr(2, 9),
            data: {},
            status: "error",
            error: "Invalid JSON file",
            preview: {
              name: file.name,
              level: 0,
              race: "Error",
              class: "Error",
            },
          };

          setImportedCharacters((prev) => [...prev, importedChar]);
        }
      };
      reader.readAsText(file);
    });
  };

  // Validate character data
  const validateCharacterData = (
    data: any
  ): { isValid: boolean; error?: string } => {
    if (!data.name) return { isValid: false, error: "Missing character name" };
    if (!data.race) return { isValid: false, error: "Missing race" };
    if (!data.class) return { isValid: false, error: "Missing class" };
    if (!data.level || data.level < 1 || data.level > 20) {
      return { isValid: false, error: "Invalid level (must be 1-20)" };
    }
    if (!data.attributes)
      return { isValid: false, error: "Missing attributes" };

    return { isValid: true };
  };

  // Import characters
  const handleImportCharacters = async () => {
    if (!currentCampaign) {
      toast({
        title: "No Campaign Selected",
        description: "Please select a campaign before importing characters",
        variant: "destructive",
      });
      return;
    }

    const validCharacters = importedCharacters.filter(
      (char) => char.status === "pending"
    );
    if (validCharacters.length === 0) {
      toast({
        title: "No Valid Characters",
        description: "No valid characters found to import",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);

    for (const character of validCharacters) {
      try {
        const characterData = {
          ...character.data,
          campaign_id: currentCampaign._id,
          owner_id: user?.id,
          // Reset certain fields for import
          _id: undefined,
          created_at: undefined,
          updated_at: undefined,
          hp: {
            current: character.data.hp?.max || 10,
            max: character.data.hp?.max || 10,
          },
          temporary_hp: 0,
          conditions: [],
          inspiration: false,
        };

        await createCharacter(characterData);

        setImportedCharacters((prev) =>
          prev.map((char) =>
            char.id === character.id
              ? { ...char, status: "success" as const }
              : char
          )
        );
      } catch (error) {
        setImportedCharacters((prev) =>
          prev.map((char) =>
            char.id === character.id
              ? { ...char, status: "error" as const, error: "Import failed" }
              : char
          )
        );
      }
    }

    setIsImporting(false);

    const successCount = importedCharacters.filter(
      (char) => char.status === "success"
    ).length;
    toast({
      title: "Import Complete",
      description: `${successCount} character(s) imported successfully`,
    });
  };

  // Remove character from list
  const removeCharacter = (id: string) => {
    setImportedCharacters((prev) => prev.filter((char) => char.id !== id));
  };

  // Clear all characters
  const clearAll = () => {
    setImportedCharacters([]);
  };

  const pendingCount = importedCharacters.filter(
    (char) => char.status === "pending"
  ).length;
  const errorCount = importedCharacters.filter(
    (char) => char.status === "error"
  ).length;
  const successCount = importedCharacters.filter(
    (char) => char.status === "success"
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Import Characters
          </h1>
          <p className="text-muted-foreground">
            Import character data from JSON files
          </p>
        </div>
      </div>

      {/* Campaign Check */}
      {!currentCampaign && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You need to select a campaign before importing characters.
            <Button
              variant="link"
              className="p-0 h-auto ml-1"
              onClick={() => router.push("/campaign")}
            >
              Select a campaign
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upload Section */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Files
            </CardTitle>
            <CardDescription>
              Select character JSON files to import
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file-upload">Character Files</Label>
              <Input
                ref={fileInputRef}
                id="file-upload"
                type="file"
                accept=".json"
                multiple
                onChange={handleFileUpload}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">
                Select one or more JSON files containing character data
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="font-medium">Supported Formats</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• D&D VTT exported characters</li>
                <li>• D&D Beyond character exports</li>
                <li>• Roll20 character sheets</li>
                <li>• Custom JSON format</li>
              </ul>
            </div>

            {importedCharacters.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Import Status</span>
                    <Button variant="outline" size="sm" onClick={clearAll}>
                      Clear All
                    </Button>
                  </div>
                  <div className="space-y-1 text-sm">
                    {pendingCount > 0 && (
                      <div className="flex justify-between">
                        <span>Ready to import:</span>
                        <Badge variant="secondary">{pendingCount}</Badge>
                      </div>
                    )}
                    {errorCount > 0 && (
                      <div className="flex justify-between">
                        <span>Errors:</span>
                        <Badge variant="destructive">{errorCount}</Badge>
                      </div>
                    )}
                    {successCount > 0 && (
                      <div className="flex justify-between">
                        <span>Imported:</span>
                        <Badge variant="default">{successCount}</Badge>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Characters List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Characters to Import
                </CardTitle>
                <CardDescription>
                  Review and manage characters before importing
                </CardDescription>
              </div>
              {pendingCount > 0 && (
                <Button
                  onClick={handleImportCharacters}
                  disabled={!currentCampaign || isImporting}
                >
                  {isImporting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Import {pendingCount} Character(s)
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {importedCharacters.length === 0 ? (
              <div className="text-center py-12">
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  No characters uploaded
                </h3>
                <p className="text-muted-foreground mb-4">
                  Upload JSON files containing character data to get started
                </p>
                <Button onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Choose Files
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {importedCharacters.map((character) => (
                    <div
                      key={character.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {character.preview?.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-medium">
                            {character.preview?.name}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            Level {character.preview?.level}{" "}
                            {character.preview?.race} {character.preview?.class}
                          </p>
                          {character.error && (
                            <p className="text-xs text-destructive mt-1">
                              {character.error}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {character.status === "pending" && (
                          <Badge variant="secondary">Ready</Badge>
                        )}
                        {character.status === "success" && (
                          <Badge variant="default">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Imported
                          </Badge>
                        )}
                        {character.status === "error" && (
                          <Badge variant="destructive">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Error
                          </Badge>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedCharacter(character);
                            setShowPreview(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCharacter(character.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Import Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Import Instructions</CardTitle>
          <CardDescription>
            How to prepare and import character data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="prepare" className="space-y-4">
            <TabsList>
              <TabsTrigger value="prepare">Prepare Files</TabsTrigger>
              <TabsTrigger value="format">File Format</TabsTrigger>
              <TabsTrigger value="troubleshoot">Troubleshooting</TabsTrigger>
            </TabsList>

            <TabsContent value="prepare" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">From D&D Beyond</h4>
                  <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                    <li>Go to your character page on D&D Beyond</li>
                    <li>Click "Export" and select JSON format</li>
                    <li>Save the file to your computer</li>
                    <li>Upload the file here</li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-medium mb-2">From This System</h4>
                  <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                    <li>Go to the character you want to export</li>
                    <li>Click the Actions menu and select "Export"</li>
                    <li>Save the JSON file</li>
                    <li>Upload it to import to another campaign</li>
                  </ol>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="format" className="space-y-4">
              <div className="space-y-4">
                <Alert>
                  <AlertDescription>
                    Character files must be in JSON format and include at
                    minimum: name, race, class, level, and attributes.
                  </AlertDescription>
                </Alert>

                <div>
                  <h4 className="font-medium mb-2">Required Fields</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• name (string)</li>
                    <li>• race (string)</li>
                    <li>• class (string)</li>
                    <li>• level (number, 1-20)</li>
                    <li>
                      • attributes (object with strength, dexterity, etc.)
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Optional Fields</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• background, alignment, experience_points</li>
                    <li>• inventory, proficiencies, features</li>
                    <li>• spellcasting data</li>
                    <li>• hit points and armor class</li>
                  </ul>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="troubleshoot" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Common Issues</h4>
                  <div className="space-y-3">
                    <div>
                      <p className="font-medium text-sm">Invalid JSON File</p>
                      <p className="text-xs text-muted-foreground">
                        Ensure the file is properly formatted JSON. Use a JSON
                        validator if needed.
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        Missing Required Fields
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Check that name, race, class, level, and attributes are
                        all present.
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-sm">Import Fails</p>
                      <p className="text-xs text-muted-foreground">
                        Try selecting a campaign first, or check that you have
                        permission to create characters.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Character Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Character Preview</DialogTitle>
            <DialogDescription>
              Review character data before importing
            </DialogDescription>
          </DialogHeader>
          {selectedCharacter && (
            <ScrollArea className="h-[400px]">
              <pre className="text-xs bg-muted p-4 rounded overflow-auto">
                {JSON.stringify(selectedCharacter.data, null, 2)}
              </pre>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
