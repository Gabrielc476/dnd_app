// src/components/campaign/builder/CampaignSettings.tsx

"use client";

import React from "react";
import { Settings, Shield, Clock, Dice1, Bed } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface CampaignSettingsData {
  allowPlayerCharacterCreation: boolean;
  allowPlayerDiceRolls: boolean;
  combatTimerEnabled: boolean;
  combatTimerDuration: number;
  initiativeType: "group" | "individual";
  restType: "short" | "long" | "milestone";
}

interface CampaignSettingsProps {
  settings: CampaignSettingsData;
  onUpdate: (settings: CampaignSettingsData) => void;
  isReadOnly?: boolean;
}

export function CampaignSettings({
  settings,
  onUpdate,
  isReadOnly = false,
}: CampaignSettingsProps) {
  const updateSetting = <K extends keyof CampaignSettingsData>(
    key: K,
    value: CampaignSettingsData[K]
  ) => {
    onUpdate({
      ...settings,
      [key]: value,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Campaign Settings
          </CardTitle>
          <CardDescription>
            Configure how players interact with your campaign
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Player Permissions */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Player Permissions</h3>
            </div>

            <div className="space-y-4 pl-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="allow-character-creation">
                    Allow Character Creation
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Let players create their own characters
                  </p>
                </div>
                <Switch
                  id="allow-character-creation"
                  checked={settings.allowPlayerCharacterCreation}
                  onCheckedChange={(checked) =>
                    updateSetting("allowPlayerCharacterCreation", checked)
                  }
                  disabled={isReadOnly}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="allow-dice-rolls">
                    Allow Player Dice Rolls
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Players can roll dice without DM approval
                  </p>
                </div>
                <Switch
                  id="allow-dice-rolls"
                  checked={settings.allowPlayerDiceRolls}
                  onCheckedChange={(checked) =>
                    updateSetting("allowPlayerDiceRolls", checked)
                  }
                  disabled={isReadOnly}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Combat Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Combat Settings</h3>
            </div>

            <div className="space-y-4 pl-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="combat-timer">Enable Turn Timer</Label>
                  <p className="text-sm text-muted-foreground">
                    Limit how long each player can take per turn
                  </p>
                </div>
                <Switch
                  id="combat-timer"
                  checked={settings.combatTimerEnabled}
                  onCheckedChange={(checked) =>
                    updateSetting("combatTimerEnabled", checked)
                  }
                  disabled={isReadOnly}
                />
              </div>

              {settings.combatTimerEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="timer-duration">
                    Timer Duration (seconds)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="timer-duration"
                      type="number"
                      min={30}
                      max={300}
                      value={settings.combatTimerDuration}
                      onChange={(e) =>
                        updateSetting(
                          "combatTimerDuration",
                          parseInt(e.target.value) || 60
                        )
                      }
                      disabled={isReadOnly}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">
                      seconds
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Recommended: 60-120 seconds for new players, 30-60 for
                    experienced groups
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="initiative-type">Initiative Type</Label>
                <Select
                  value={settings.initiativeType}
                  onValueChange={(value: "group" | "individual") =>
                    updateSetting("initiativeType", value)
                  }
                  disabled={isReadOnly}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">
                      Individual Initiative
                    </SelectItem>
                    <SelectItem value="group">Group Initiative</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {settings.initiativeType === "individual"
                    ? "Each participant rolls separately"
                    : "Players and enemies act as groups"}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Rest and Recovery */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Bed className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Rest and Recovery</h3>
            </div>

            <div className="space-y-4 pl-6">
              <div className="space-y-2">
                <Label htmlFor="rest-type">Rest Type</Label>
                <Select
                  value={settings.restType}
                  onValueChange={(value: "short" | "long" | "milestone") =>
                    updateSetting("restType", value)
                  }
                  disabled={isReadOnly}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short Rest (1 hour)</SelectItem>
                    <SelectItem value="long">Long Rest (8 hours)</SelectItem>
                    <SelectItem value="milestone">
                      Milestone Leveling
                    </SelectItem>
                  </SelectContent>
                </Select>
                <div className="text-xs text-muted-foreground space-y-1">
                  {settings.restType === "short" && (
                    <p>
                      Players recover resources more frequently (faster paced)
                    </p>
                  )}
                  {settings.restType === "long" && (
                    <p>Standard D&D rules for rest and recovery</p>
                  )}
                  {settings.restType === "milestone" && (
                    <p>Characters advance when reaching story milestones</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dice1 className="h-5 w-5" />
            Configuration Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
              <p>
                <strong>Character Creation:</strong> Allowing player character
                creation gives players more agency but requires review to ensure
                characters fit the campaign.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
              <p>
                <strong>Dice Rolls:</strong> Enabling player dice rolls speeds
                up gameplay but gives you less control over roll verification.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
              <p>
                <strong>Turn Timer:</strong> Helps maintain pace in combat but
                may stress new players. Consider your group's experience level.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
              <p>
                <strong>Initiative:</strong> Group initiative is faster but less
                tactical. Individual initiative gives more strategic options.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
              <p>
                <strong>Rest Type:</strong> Choose based on your campaign's
                pacing needs. These settings can be changed later if needed.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
