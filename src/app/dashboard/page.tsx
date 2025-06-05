// src/app/dashboard/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Users,
  Swords,
  Calendar,
  TrendingUp,
  Activity,
  Star,
  Clock,
  MapPin,
  Shield,
  Dice6,
  BookOpen,
  Settings,
  BarChart3,
  User,
  Crown,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useCampaign } from "@/hooks/useCampaign";
import { useCharacter } from "@/hooks/useCharacter";
import { useGameStore } from "@/stores/gameStore";
import { useToast } from "@/hooks/use-toast";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DashboardStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalCharacters: number;
  totalSessions: number;
  hoursPlayed: number;
  favoriteClass: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const {
    campaigns,
    isLoading: campaignsLoading,
    error: campaignsError,
    fetchCampaigns,
    createCampaign,
  } = useCampaign({ userId: user?.id || "" });

  const {
    characters,
    isLoading: charactersLoading,
    error: charactersError,
    fetchCharacters,
  } = useCharacter({
    campaignId: "", // We'll fetch all characters for the user
    userId: user?.id || "",
  });

  const [stats, setStats] = useState<DashboardStats>({
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalCharacters: 0,
    totalSessions: 0,
    hoursPlayed: 0,
    favoriteClass: "Fighter",
  });

  const [recentActivity, setRecentActivity] = useState([
    {
      id: "1",
      type: "session",
      description: "Played session in 'Lost Mines of Phandelver'",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      icon: Dice6,
    },
    {
      id: "2",
      type: "character",
      description: "Updated character 'Thorin Ironbeard'",
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
      icon: User,
    },
    {
      id: "3",
      type: "campaign",
      description: "Created new campaign 'Curse of Strahd'",
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      icon: MapPin,
    },
  ]);

  // Load data on mount
  useEffect(() => {
    if (user) {
      fetchCampaigns();
      // We would need to modify the hook to fetch all user characters
      // For now, we'll simulate the data
    }
  }, [user, fetchCampaigns]);

  // Calculate stats when data changes
  useEffect(() => {
    if (campaigns && characters) {
      const activeCampaigns = campaigns.filter((c) => c.active).length;

      setStats({
        totalCampaigns: campaigns.length,
        activeCampaigns,
        totalCharacters: characters.length,
        totalSessions: Math.floor(Math.random() * 50) + 10, // Mock data
        hoursPlayed: Math.floor(Math.random() * 200) + 50, // Mock data
        favoriteClass: getMostPlayedClass(characters),
      });
    }
  }, [campaigns, characters]);

  const getMostPlayedClass = (chars: any[]) => {
    if (!chars.length) return "Fighter";

    const classCounts = chars.reduce((acc, char) => {
      acc[char.class] = (acc[char.class] || 0) + 1;
      return acc;
    }, {});

    return (
      Object.entries(classCounts).sort(
        ([, a], [, b]) => (b as number) - (a as number)
      )[0]?.[0] || "Fighter"
    );
  };

  const handleCreateCampaign = async () => {
    if (!user) return;

    try {
      const newCampaign = await createCampaign({
        name: "New Campaign",
        description: "A new adventure awaits!",
      });

      if (newCampaign) {
        toast({
          title: "Campaign Created",
          description: `"${newCampaign.name}" has been created successfully`,
        });
        router.push(`/campaign/${newCampaign._id}/edit`);
      }
    } catch (error) {
      toast({
        title: "Failed to Create Campaign",
        description: "Could not create new campaign. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  if (campaignsError || charactersError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Error loading dashboard data: {campaignsError || charactersError}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {user?.username}!
          </h1>
          <p className="text-muted-foreground">
            Ready for your next adventure?
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={user?.role === "dm" ? "default" : "secondary"}>
            {user?.role === "dm" ? (
              <>
                <Crown className="h-3 w-3 mr-1" />
                Dungeon Master
              </>
            ) : (
              <>
                <Shield className="h-3 w-3 mr-1" />
                Player
              </>
            )}
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Campaigns
            </CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCampaigns}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeCampaigns} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Characters</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCharacters}</div>
            <p className="text-xs text-muted-foreground">
              Favorite: {stats.favoriteClass}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Sessions Played
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSessions}</div>
            <p className="text-xs text-muted-foreground">
              {stats.hoursPlayed}h total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">XP This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,350</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="characters">Characters</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            {/* Recent Campaigns */}
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Recent Campaigns</CardTitle>
                <CardDescription>
                  Your most recently active campaigns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {campaignsLoading ? (
                    <div className="flex items-center justify-center p-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : campaigns.length === 0 ? (
                    <div className="text-center p-8">
                      <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">
                        No campaigns yet
                      </p>
                      <Button onClick={handleCreateCampaign}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create First Campaign
                      </Button>
                    </div>
                  ) : (
                    campaigns.slice(0, 3).map((campaign) => (
                      <div key={campaign._id} className="flex items-center">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback>
                            {campaign.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="ml-4 space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {campaign.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {campaign.player_count} players
                          </p>
                        </div>
                        <div className="ml-auto font-medium">
                          <Badge
                            variant={campaign.active ? "default" : "secondary"}
                          >
                            {campaign.active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks and shortcuts</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <Button
                  onClick={handleCreateCampaign}
                  className="justify-start"
                  disabled={campaignsLoading}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Campaign
                </Button>
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={() => router.push("/characters/create")}
                >
                  <User className="h-4 w-4 mr-2" />
                  Create Character
                </Button>
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={() => router.push("/combat")}
                >
                  <Swords className="h-4 w-4 mr-2" />
                  Start Combat
                </Button>
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={() => router.push("/compendium")}
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Browse Compendium
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Your Campaigns</h3>
            <Button onClick={handleCreateCampaign}>
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {campaignsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-20 bg-muted rounded"></div>
                  </CardContent>
                </Card>
              ))
            ) : campaigns.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center p-8">
                  <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No campaigns yet</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Create your first campaign to start your D&D adventure
                  </p>
                  <Button onClick={handleCreateCampaign}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Campaign
                  </Button>
                </CardContent>
              </Card>
            ) : (
              campaigns.map((campaign) => (
                <Card
                  key={campaign._id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => router.push(`/campaign/${campaign._id}`)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {campaign.name}
                      <Badge
                        variant={campaign.active ? "default" : "secondary"}
                      >
                        {campaign.active ? "Active" : "Inactive"}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {campaign.description || "No description"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Users className="h-4 w-4 mr-1" />
                      {campaign.player_count} players
                      <Separator orientation="vertical" className="mx-2 h-4" />
                      <Calendar className="h-4 w-4 mr-1" />
                      {new Date(campaign.created_at).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="characters" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Your Characters</h3>
            <Button onClick={() => router.push("/characters/create")}>
              <Plus className="h-4 w-4 mr-2" />
              New Character
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {charactersLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-16 bg-muted rounded"></div>
                  </CardContent>
                </Card>
              ))
            ) : characters.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center p-8">
                  <User className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    No characters yet
                  </h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Create your first character to begin your adventure
                  </p>
                  <Button onClick={() => router.push("/characters/create")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Character
                  </Button>
                </CardContent>
              </Card>
            ) : (
              characters.slice(0, 6).map((character) => (
                <Card
                  key={character._id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => router.push(`/characters/${character._id}`)}
                >
                  <CardHeader>
                    <CardTitle className="text-base">
                      {character.name}
                    </CardTitle>
                    <CardDescription>
                      Level {character.level} {character.race} {character.class}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>HP</span>
                        <span>
                          {character.hp.current}/{character.hp.max}
                        </span>
                      </div>
                      <Progress
                        value={(character.hp.current / character.hp.max) * 100}
                        className="h-2"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Your latest actions and game events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center space-x-4"
                    >
                      <div className="p-2 bg-muted rounded-full">
                        <activity.icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">
                          {activity.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatTimeAgo(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
