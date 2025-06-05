// src/app/campaign/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  MapPin,
  Users,
  Calendar,
  Crown,
  Settings,
  Eye,
  Edit,
  Trash2,
  Copy,
  Play,
  Grid3X3,
  List,
} from "lucide-react";

import { Campaign, CampaignListItem } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";
import { useCampaign } from "@/hooks/useCampaign";
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type ViewMode = "grid" | "list";
type FilterMode = "all" | "owned" | "player";

export default function CampaignsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const { setCurrentCampaign } = useGameStore();

  const {
    campaigns,
    isLoading,
    error,
    fetchCampaigns,
    createCampaign,
    deleteCampaign,
  } = useCampaign({ userId: user?.id || "" });

  // Local state
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [filteredCampaigns, setFilteredCampaigns] = useState<
    CampaignListItem[]
  >([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] =
    useState<CampaignListItem | null>(null);

  // Load campaigns on mount
  useEffect(() => {
    if (user) {
      fetchCampaigns();
    }
  }, [user, fetchCampaigns]);

  // Filter campaigns based on search and filter mode
  useEffect(() => {
    let filtered = [...campaigns];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (campaign) =>
          campaign.name.toLowerCase().includes(query) ||
          (campaign.description &&
            campaign.description.toLowerCase().includes(query))
      );
    }

    // Apply ownership filter
    if (filterMode === "owned") {
      filtered = filtered.filter((campaign) => campaign.dm_id === user?.id);
    } else if (filterMode === "player") {
      filtered = filtered.filter((campaign) => campaign.dm_id !== user?.id);
    }

    setFilteredCampaigns(filtered);
  }, [campaigns, searchQuery, filterMode, user?.id]);

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

  const handleSelectCampaign = (campaign: CampaignListItem) => {
    setCurrentCampaign(campaign);
    toast({
      title: "Campaign Selected",
      description: `Now working in "${campaign.name}"`,
    });
    router.push("/dashboard");
  };

  const handleViewCampaign = (campaignId: string) => {
    router.push(`/campaign/${campaignId}`);
  };

  const handleEditCampaign = (campaignId: string) => {
    router.push(`/campaign/${campaignId}/edit`);
  };

  const handleDuplicateCampaign = async (campaign: CampaignListItem) => {
    if (!user) return;

    try {
      const duplicatedCampaign = await createCampaign({
        name: `${campaign.name} (Copy)`,
        description: campaign.description,
      });

      if (duplicatedCampaign) {
        toast({
          title: "Campaign Duplicated",
          description: `"${duplicatedCampaign.name}" has been created`,
        });
      }
    } catch (error) {
      toast({
        title: "Failed to Duplicate Campaign",
        description: "Could not duplicate campaign. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCampaign = (campaign: CampaignListItem) => {
    setCampaignToDelete(campaign);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteCampaign = async () => {
    if (!campaignToDelete) return;

    const success = await deleteCampaign(campaignToDelete._id);
    if (success) {
      toast({
        title: "Campaign Deleted",
        description: `"${campaignToDelete.name}" has been deleted`,
      });
      setDeleteDialogOpen(false);
      setCampaignToDelete(null);
    } else {
      toast({
        title: "Delete Failed",
        description: "Failed to delete campaign. Please try again.",
        variant: "destructive",
      });
    }
  };

  const isOwner = (campaign: CampaignListItem) => campaign.dm_id === user?.id;

  const CampaignCard = ({ campaign }: { campaign: CampaignListItem }) => (
    <Card className="hover:shadow-md transition-shadow group cursor-pointer">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <Avatar>
              <AvatarFallback>
                {campaign.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle className="text-lg">{campaign.name}</CardTitle>
              <CardDescription className="line-clamp-2">
                {campaign.description || "No description"}
              </CardDescription>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100"
              >
                •••
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleSelectCampaign(campaign)}>
                <Play className="h-4 w-4 mr-2" />
                Select Campaign
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleViewCampaign(campaign._id)}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              {isOwner(campaign) && (
                <>
                  <DropdownMenuItem
                    onClick={() => handleEditCampaign(campaign._id)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDuplicateCampaign(campaign)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleDeleteCampaign(campaign)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Campaign Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={campaign.active ? "default" : "secondary"}>
              {campaign.active ? "Active" : "Inactive"}
            </Badge>
            {isOwner(campaign) ? (
              <Badge variant="outline" className="flex items-center gap-1">
                <Crown className="h-3 w-3" />
                DM
              </Badge>
            ) : (
              <Badge variant="outline" className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                Player
              </Badge>
            )}
          </div>
        </div>

        {/* Campaign Info */}
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center">
            <Users className="h-4 w-4 mr-2" />
            {campaign.player_count} players
          </div>
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            Created {new Date(campaign.created_at).toLocaleDateString()}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            onClick={() => handleSelectCampaign(campaign)}
            className="flex-1"
          >
            <Play className="h-3 w-3 mr-1" />
            Select
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleViewCampaign(campaign._id)}
          >
            <Eye className="h-3 w-3 mr-1" />
            View
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const CampaignListItem = ({ campaign }: { campaign: CampaignListItem }) => (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            <Avatar className="h-10 w-10">
              <AvatarFallback>
                {campaign.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-medium">{campaign.name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {campaign.description || "No description"}
              </p>
              <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center">
                  <Users className="h-3 w-3 mr-1" />
                  {campaign.player_count} players
                </span>
                <span className="flex items-center">
                  <Calendar className="h-3 w-3 mr-1" />
                  {new Date(campaign.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Status Badges */}
            <div className="flex items-center gap-2">
              <Badge variant={campaign.active ? "default" : "secondary"}>
                {campaign.active ? "Active" : "Inactive"}
              </Badge>
              {isOwner(campaign) ? (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Crown className="h-3 w-3" />
                  DM
                </Badge>
              ) : (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Player
                </Badge>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => handleSelectCampaign(campaign)}>
                <Play className="h-3 w-3 mr-1" />
                Select
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    •••
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handleViewCampaign(campaign._id)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  {isOwner(campaign) && (
                    <>
                      <DropdownMenuItem
                        onClick={() => handleEditCampaign(campaign._id)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDuplicateCampaign(campaign)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDeleteCampaign(campaign)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Error loading campaigns: {error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground">
            Manage your D&D campaigns and adventures
          </p>
        </div>
        <Button onClick={handleCreateCampaign}>
          <Plus className="h-4 w-4 mr-2" />
          Create Campaign
        </Button>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search campaigns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <Select
                value={filterMode}
                onValueChange={(value: FilterMode) => setFilterMode(value)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campaigns</SelectItem>
                  <SelectItem value="owned">My Campaigns</SelectItem>
                  <SelectItem value="player">As Player</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setViewMode(viewMode === "grid" ? "list" : "grid")
                }
              >
                {viewMode === "grid" ? (
                  <List className="h-4 w-4" />
                ) : (
                  <Grid3X3 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Campaigns Grid/List */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 bg-muted rounded-full"></div>
                  <div>
                    <div className="h-4 bg-muted rounded w-32 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-48"></div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-6 bg-muted rounded"></div>
                  <div className="h-8 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {campaigns.length === 0
                ? "No campaigns yet"
                : "No campaigns match your search"}
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {campaigns.length === 0
                ? "Create your first campaign to begin your D&D adventure"
                : "Try adjusting your search or filters"}
            </p>
            <div className="flex gap-2">
              {campaigns.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setFilterMode("all");
                  }}
                >
                  Clear Filters
                </Button>
              )}
              <Button onClick={handleCreateCampaign}>
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3"
              : "space-y-2"
          }
        >
          {filteredCampaigns.map((campaign) =>
            viewMode === "grid" ? (
              <CampaignCard key={campaign._id} campaign={campaign} />
            ) : (
              <CampaignListItem key={campaign._id} campaign={campaign} />
            )
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Campaign</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{campaignToDelete?.name}"? This
              action cannot be undone. All characters, NPCs, and encounters
              associated with this campaign will also be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteCampaign}>
              Delete Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
