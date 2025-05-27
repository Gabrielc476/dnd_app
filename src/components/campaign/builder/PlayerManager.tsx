// src/components/campaign/builder/PlayerManager.tsx

"use client";

import React, { useState, useEffect } from "react";
import { Users, UserPlus, UserMinus, Mail, Search, Crown } from "lucide-react";
import { useCampaign } from "@/hooks/useCampaign";
import { useToast } from "@/hooks/use-toast";

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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PlayerManagerProps {
  campaignId?: string;
  players: string[];
  onUpdate: (players: string[]) => void;
  isReadOnly?: boolean;
}

interface PlayerInfo {
  id: string;
  username: string;
  email: string;
  isOnline: boolean;
  characterCount: number;
  lastSeen?: string;
}

// Mock data - em produção, isso viria de uma API
const mockUsers: PlayerInfo[] = [
  {
    id: "user1",
    username: "aragorn_ranger",
    email: "aragorn@fellowship.com",
    isOnline: true,
    characterCount: 2,
    lastSeen: "now",
  },
  {
    id: "user2",
    username: "gandalf_grey",
    email: "gandalf@wizard.com",
    isOnline: false,
    characterCount: 1,
    lastSeen: "2 hours ago",
  },
  {
    id: "user3",
    username: "legolas_elf",
    email: "legolas@mirkwood.com",
    isOnline: true,
    characterCount: 1,
    lastSeen: "now",
  },
];

export function PlayerManager({
  campaignId,
  players,
  onUpdate,
  isReadOnly = false,
}: PlayerManagerProps) {
  const { toast } = useToast();
  const { addPlayer, removePlayer } = useCampaign({
    campaignId,
    userId: "", // Will be provided by context
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [isAddPlayerDialogOpen, setIsAddPlayerDialogOpen] = useState(false);
  const [filteredUsers, setFilteredUsers] = useState<PlayerInfo[]>([]);
  const [playersInfo, setPlayersInfo] = useState<PlayerInfo[]>([]);

  // Load player information
  useEffect(() => {
    // Em produção, isso buscaria informações reais dos usuários
    const playerInfos = players.map((playerId) => {
      const userInfo = mockUsers.find((user) => user.id === playerId);
      return (
        userInfo || {
          id: playerId,
          username: `User ${playerId}`,
          email: `user${playerId}@example.com`,
          isOnline: false,
          characterCount: 0,
        }
      );
    });
    setPlayersInfo(playerInfos);
  }, [players]);

  // Filter users for search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const availableUsers = mockUsers.filter(
      (user) =>
        !players.includes(user.id) &&
        (user.username.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query))
    );

    setFilteredUsers(availableUsers);
  }, [searchQuery, players]);

  const handleAddPlayer = async (playerId: string) => {
    if (isReadOnly) return;

    try {
      if (campaignId) {
        // Use API to add player
        const success = await addPlayer(campaignId, playerId);
        if (success) {
          onUpdate([...players, playerId]);
          toast({
            title: "Player Added",
            description: "Player has been added to the campaign",
          });
        }
      } else {
        // Just update local state for new campaigns
        onUpdate([...players, playerId]);
        toast({
          title: "Player Added",
          description: "Player will be added when the campaign is created",
        });
      }

      setIsAddPlayerDialogOpen(false);
      setSearchQuery("");
    } catch (error) {
      toast({
        title: "Failed to Add Player",
        description: "Could not add player to campaign",
        variant: "destructive",
      });
    }
  };

  const handleRemovePlayer = async (playerId: string) => {
    if (isReadOnly) return;

    try {
      if (campaignId) {
        // Use API to remove player
        const success = await removePlayer(campaignId, playerId);
        if (success) {
          onUpdate(players.filter((id) => id !== playerId));
          toast({
            title: "Player Removed",
            description: "Player has been removed from the campaign",
          });
        }
      } else {
        // Just update local state for new campaigns
        onUpdate(players.filter((id) => id !== playerId));
        toast({
          title: "Player Removed",
          description: "Player removed from campaign",
        });
      }
    } catch (error) {
      toast({
        title: "Failed to Remove Player",
        description: "Could not remove player from campaign",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Player Management
              <Badge variant="outline">{players.length} players</Badge>
            </div>
            {!isReadOnly && (
              <Dialog
                open={isAddPlayerDialogOpen}
                onOpenChange={setIsAddPlayerDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Add Player
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Player to Campaign</DialogTitle>
                    <DialogDescription>
                      Search for users to invite to your campaign
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="player-search">Search Users</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="player-search"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search by username or email..."
                          className="pl-10"
                        />
                      </div>
                    </div>

                    {filteredUsers.length > 0 && (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {filteredUsers.map((user) => (
                          <div
                            key={user.id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium">
                                    {user.username}
                                  </p>
                                  {user.isOnline && (
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {user.email}
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleAddPlayer(user.id)}
                            >
                              Add
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {searchQuery && filteredUsers.length === 0 && (
                      <Alert>
                        <AlertDescription>
                          No users found matching "{searchQuery}"
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsAddPlayerDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </CardTitle>
          <CardDescription>
            Manage players who can participate in this campaign
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {playersInfo.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Players Yet</h3>
              <p className="text-muted-foreground mb-4">
                Add players to your campaign to get started
              </p>
              {!isReadOnly && (
                <Button
                  onClick={() => setIsAddPlayerDialogOpen(true)}
                  className="flex items-center gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  Add First Player
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {playersInfo.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium">
                          {player.username}
                        </h4>
                        {player.isOnline ? (
                          <Badge variant="default" className="text-xs">
                            Online
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Offline
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {player.email}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{player.characterCount} characters</span>
                        <span>Last seen: {player.lastSeen}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-1"
                    >
                      <Mail className="h-3 w-3" />
                      Message
                    </Button>
                    {!isReadOnly && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Player</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove {player.username}{" "}
                              from this campaign? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemovePlayer(player.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remove Player
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Player Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Player Management Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
              <p>
                <strong>Invite Players:</strong> Use the search function to find
                registered users and add them to your campaign.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
              <p>
                <strong>Player Status:</strong> Online players can immediately
                participate in sessions, while offline players will receive
                notifications.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
              <p>
                <strong>Character Management:</strong> Players can create
                multiple characters, but typically use one per campaign.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
