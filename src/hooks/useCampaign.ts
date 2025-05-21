// hooks/useCampaign.ts
import { useState, useEffect, useCallback } from "react";
import { campaignsAPI } from "@/lib/api";
import { useWebSocketWithLocks } from "@/lib/socket";
import { Campaign, CampaignListItem, Encounter, Image } from "@/lib/types";

export interface UseCampaignProps {
  campaignId?: string;
  userId: string;
}

export interface UseCampaignReturn {
  campaign: Campaign | null;
  campaigns: CampaignListItem[];
  isLoading: boolean;
  error: string | null;
  connected: boolean;
  fetchCampaign: (id: string) => Promise<Campaign | null>;
  fetchCampaigns: () => Promise<CampaignListItem[]>;
  createCampaign: (campaignData: {
    name: string;
    description?: string;
  }) => Promise<Campaign | null>;
  updateCampaign: (id: string, updates: any) => Promise<Campaign | null>;
  deleteCampaign: (id: string) => Promise<boolean>;
  addPlayer: (campaignId: string, playerId: string) => Promise<Campaign | null>;
  removePlayer: (
    campaignId: string,
    playerId: string
  ) => Promise<Campaign | null>;
  createEncounter: (
    campaignId: string,
    encounterData: any
  ) => Promise<Campaign | null>;
  updateEncounter: (
    campaignId: string,
    encounterId: string,
    updates: any
  ) => Promise<Campaign | null>;
  deleteEncounter: (
    campaignId: string,
    encounterId: string
  ) => Promise<Campaign | null>;
  setActiveEncounter: (
    campaignId: string,
    encounterId: string
  ) => Promise<Campaign | null>;
  clearActiveEncounter: (campaignId: string) => Promise<Campaign | null>;
  uploadImage: (
    campaignId: string,
    imageFile: File,
    metadata: any
  ) => Promise<any>;
  listImages: (
    campaignId: string,
    params?: { tags?: string; is_map?: boolean }
  ) => Promise<Image[]>;
  deleteImage: (campaignId: string, imageId: string) => Promise<any>;
  updateImageMetadata: (
    campaignId: string,
    imageId: string,
    updates: any
  ) => Promise<any>;
  shareImage: (campaignId: string, imageId: string) => Promise<any>;
  acquireLock: (resourceId: string, resourceType: string) => Promise<boolean>;
  releaseLock: (resourceId: string, resourceType: string) => void;
  isLocked: (resourceId: string, resourceType: string) => boolean;
  whoLocked: (resourceId: string, resourceType: string) => string | null;
}

/**
 * Hook for campaign management with WebSocket and API integration
 */
export function useCampaign({
  campaignId,
  userId,
}: UseCampaignProps): UseCampaignReturn {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // WebSocket connection for campaign events
  const {
    connected,
    error: socketError,
    acquireLock,
    releaseLock,
    isLocked,
    whoLocked,
  } = useWebSocketWithLocks(campaignId || "", userId);

  // Load campaign data if campaignId is provided
  useEffect(() => {
    if (campaignId) {
      fetchCampaign(campaignId);
    }
  }, [campaignId]);

  // Handle socket error
  useEffect(() => {
    if (socketError) {
      setError(`WebSocket error: ${socketError}`);
    }
  }, [socketError]);

  /**
   * Fetch campaign by ID
   */
  const fetchCampaign = useCallback(
    async (id: string): Promise<Campaign | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await campaignsAPI.getCampaign(id);
        setCampaign(data);
        setIsLoading(false);
        return data;
      } catch (err: any) {
        setError(err.message || "Failed to fetch campaign");
        setIsLoading(false);
        return null;
      }
    },
    []
  );

  /**
   * Fetch all campaigns for the user
   */
  const fetchCampaigns = useCallback(async (): Promise<CampaignListItem[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await campaignsAPI.listCampaigns();
      setCampaigns(data);
      setIsLoading(false);
      return data;
    } catch (err: any) {
      setError(err.message || "Failed to fetch campaigns");
      setIsLoading(false);
      return [];
    }
  }, []);

  /**
   * Create new campaign
   */
  const createCampaign = useCallback(
    async (campaignData: {
      name: string;
      description?: string;
    }): Promise<Campaign | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await campaignsAPI.createCampaign({
          ...campaignData,
          dm_id: userId,
        });
        // Refresh campaign list
        fetchCampaigns();
        setIsLoading(false);
        return data;
      } catch (err: any) {
        setError(err.message || "Failed to create campaign");
        setIsLoading(false);
        return null;
      }
    },
    [userId, fetchCampaigns]
  );

  /**
   * Update campaign
   */
  const updateCampaign = useCallback(
    async (id: string, updates: any): Promise<Campaign | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await campaignsAPI.updateCampaign(id, updates);
        setCampaign(data);
        setIsLoading(false);
        return data;
      } catch (err: any) {
        setError(err.message || "Failed to update campaign");
        setIsLoading(false);
        return null;
      }
    },
    []
  );

  /**
   * Delete campaign
   */
  const deleteCampaign = useCallback(
    async (id: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        await campaignsAPI.deleteCampaign(id);
        // Refresh campaign list
        fetchCampaigns();
        setIsLoading(false);
        return true;
      } catch (err: any) {
        setError(err.message || "Failed to delete campaign");
        setIsLoading(false);
        return false;
      }
    },
    [fetchCampaigns]
  );

  /**
   * Add player to campaign
   */
  const addPlayer = useCallback(
    async (campaignId: string, playerId: string): Promise<Campaign | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await campaignsAPI.addPlayer(campaignId, playerId);
        setCampaign(data);
        setIsLoading(false);
        return data;
      } catch (err: any) {
        setError(err.message || "Failed to add player");
        setIsLoading(false);
        return null;
      }
    },
    []
  );

  /**
   * Remove player from campaign
   */
  const removePlayer = useCallback(
    async (campaignId: string, playerId: string): Promise<Campaign | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await campaignsAPI.removePlayer(campaignId, playerId);
        setCampaign(data);
        setIsLoading(false);
        return data;
      } catch (err: any) {
        setError(err.message || "Failed to remove player");
        setIsLoading(false);
        return null;
      }
    },
    []
  );

  /**
   * Create encounter
   */
  const createEncounter = useCallback(
    async (
      campaignId: string,
      encounterData: any
    ): Promise<Campaign | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await campaignsAPI.createEncounter(
          campaignId,
          encounterData
        );
        setCampaign(data);
        setIsLoading(false);
        return data;
      } catch (err: any) {
        setError(err.message || "Failed to create encounter");
        setIsLoading(false);
        return null;
      }
    },
    []
  );

  /**
   * Update encounter
   */
  const updateEncounter = useCallback(
    async (
      campaignId: string,
      encounterId: string,
      updates: any
    ): Promise<Campaign | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await campaignsAPI.updateEncounter(
          campaignId,
          encounterId,
          updates
        );
        setCampaign(data);
        setIsLoading(false);
        return data;
      } catch (err: any) {
        setError(err.message || "Failed to update encounter");
        setIsLoading(false);
        return null;
      }
    },
    []
  );

  /**
   * Delete encounter
   */
  const deleteEncounter = useCallback(
    async (
      campaignId: string,
      encounterId: string
    ): Promise<Campaign | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await campaignsAPI.deleteEncounter(
          campaignId,
          encounterId
        );
        setCampaign(data);
        setIsLoading(false);
        return data;
      } catch (err: any) {
        setError(err.message || "Failed to delete encounter");
        setIsLoading(false);
        return null;
      }
    },
    []
  );

  /**
   * Set active encounter
   */
  const setActiveEncounter = useCallback(
    async (
      campaignId: string,
      encounterId: string
    ): Promise<Campaign | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await campaignsAPI.setActiveEncounter(
          campaignId,
          encounterId
        );
        setCampaign(data);
        setIsLoading(false);
        return data;
      } catch (err: any) {
        setError(err.message || "Failed to set active encounter");
        setIsLoading(false);
        return null;
      }
    },
    []
  );

  /**
   * Clear active encounter
   */
  const clearActiveEncounter = useCallback(
    async (campaignId: string): Promise<Campaign | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await campaignsAPI.clearActiveEncounter(campaignId);
        setCampaign(data);
        setIsLoading(false);
        return data;
      } catch (err: any) {
        setError(err.message || "Failed to clear active encounter");
        setIsLoading(false);
        return null;
      }
    },
    []
  );

  /**
   * Upload image
   */
  const uploadImage = useCallback(
    async (
      campaignId: string,
      imageFile: File,
      metadata: any
    ): Promise<any> => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await campaignsAPI.uploadImage(
          campaignId,
          imageFile,
          metadata
        );
        // Refresh campaign data to include the new image
        fetchCampaign(campaignId);
        setIsLoading(false);
        return data;
      } catch (err: any) {
        setError(err.message || "Failed to upload image");
        setIsLoading(false);
        return null;
      }
    },
    [fetchCampaign]
  );

  /**
   * List images
   */
  const listImages = useCallback(
    async (
      campaignId: string,
      params?: { tags?: string; is_map?: boolean }
    ): Promise<Image[]> => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await campaignsAPI.listImages(campaignId, params);
        setIsLoading(false);
        return data;
      } catch (err: any) {
        setError(err.message || "Failed to list images");
        setIsLoading(false);
        return [];
      }
    },
    []
  );

  /**
   * Delete image
   */
  const deleteImage = useCallback(
    async (campaignId: string, imageId: string): Promise<any> => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await campaignsAPI.deleteImage(campaignId, imageId);
        // Refresh campaign data to reflect the deleted image
        fetchCampaign(campaignId);
        setIsLoading(false);
        return data;
      } catch (err: any) {
        setError(err.message || "Failed to delete image");
        setIsLoading(false);
        return null;
      }
    },
    [fetchCampaign]
  );

  /**
   * Update image metadata
   */
  const updateImageMetadata = useCallback(
    async (campaignId: string, imageId: string, updates: any): Promise<any> => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await campaignsAPI.updateImageMetadata(
          campaignId,
          imageId,
          updates
        );
        // Refresh campaign data to reflect the updated image
        fetchCampaign(campaignId);
        setIsLoading(false);
        return data;
      } catch (err: any) {
        setError(err.message || "Failed to update image metadata");
        setIsLoading(false);
        return null;
      }
    },
    [fetchCampaign]
  );

  /**
   * Share image
   */
  const shareImage = useCallback(
    async (campaignId: string, imageId: string): Promise<any> => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await campaignsAPI.shareImage(campaignId, imageId);
        setIsLoading(false);
        return data;
      } catch (err: any) {
        setError(err.message || "Failed to share image");
        setIsLoading(false);
        return null;
      }
    },
    []
  );

  return {
    campaign,
    campaigns,
    isLoading,
    error,
    connected,
    fetchCampaign,
    fetchCampaigns,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    addPlayer,
    removePlayer,
    createEncounter,
    updateEncounter,
    deleteEncounter,
    setActiveEncounter,
    clearActiveEncounter,
    uploadImage,
    listImages,
    deleteImage,
    updateImageMetadata,
    shareImage,
    acquireLock,
    releaseLock,
    isLocked,
    whoLocked,
  };
}

export default useCampaign;
