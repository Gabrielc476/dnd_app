// store/gameStore.ts
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import {
  Campaign,
  CampaignListItem,
  Encounter,
  Image,
  Character,
  NPC,
  User,
} from "@/lib/types";
import { campaignsAPI } from "@/lib/api";
import { useCharacterStore } from "./characterStore";
import { useCombatStore } from "./combatStore";

interface WebSocketConnectionStatus {
  connected: boolean;
  lastConnected: string | null;
  error: string | null;
}

interface LockStatus {
  resourceType: string;
  resourceId: string;
  lockedBy: string;
  timestamp: string;
}

interface GameState {
  // User and auth context
  currentUser: User | null;
  isUserDM: boolean;

  // Campaign data
  campaigns: CampaignListItem[];
  currentCampaign: Campaign | null;
  activePlayers: string[]; // User IDs of players currently connected

  // Images and maps
  campaignImages: Image[];
  activeMap: Image | null;

  // WebSocket status
  wsStatus: WebSocketConnectionStatus;
  resourceLocks: LockStatus[];

  // UI state
  sidebarOpen: boolean;
  selectedTab: "characters" | "npcs" | "combat" | "encounters" | "maps";
  notifications: Array<{
    id: string;
    type: string;
    message: string;
    timestamp: string;
  }>;

  // Loading and error states
  isLoading: boolean;
  error: string | null;

  // Actions
  // Campaign actions
  fetchCampaigns: () => Promise<CampaignListItem[]>;
  fetchCampaign: (campaignId: string) => Promise<Campaign | null>;
  setCurrentCampaign: (campaign: Campaign | null) => void;
  createCampaign: (data: {
    name: string;
    description?: string;
  }) => Promise<Campaign | null>;
  updateCampaign: (
    campaignId: string,
    updates: Partial<Campaign>
  ) => Promise<Campaign | null>;
  deleteCampaign: (campaignId: string) => Promise<boolean>;

  // Player management
  addPlayer: (campaignId: string, playerId: string) => Promise<boolean>;
  removePlayer: (campaignId: string, playerId: string) => Promise<boolean>;
  setActivePlayers: (playerIds: string[]) => void;

  // Encounter management
  createEncounter: (
    campaignId: string,
    encounterData: Partial<Encounter>
  ) => Promise<boolean>;
  updateEncounter: (
    campaignId: string,
    encounterId: string,
    updates: Partial<Encounter>
  ) => Promise<boolean>;
  deleteEncounter: (
    campaignId: string,
    encounterId: string
  ) => Promise<boolean>;
  setActiveEncounter: (
    campaignId: string,
    encounterId: string
  ) => Promise<boolean>;
  clearActiveEncounter: (campaignId: string) => Promise<boolean>;

  // Image and map management
  fetchImages: (
    campaignId: string,
    params?: { tags?: string; is_map?: boolean }
  ) => Promise<Image[]>;
  uploadImage: (
    campaignId: string,
    imageFile: File,
    metadata: any
  ) => Promise<any>;
  deleteImage: (campaignId: string, imageId: string) => Promise<boolean>;
  updateImageMetadata: (
    campaignId: string,
    imageId: string,
    updates: any
  ) => Promise<any>;
  setActiveMap: (image: Image | null) => void;
  shareImage: (campaignId: string, imageId: string) => Promise<boolean>;

  // WebSocket and locks
  updateWebSocketStatus: (status: Partial<WebSocketConnectionStatus>) => void;
  setResourceLock: (lock: LockStatus) => void;
  removeResourceLock: (resourceType: string, resourceId: string) => void;
  isResourceLocked: (
    resourceType: string,
    resourceId: string,
    userId: string
  ) => boolean;

  // UI actions
  toggleSidebar: () => void;
  setSelectedTab: (
    tab: "characters" | "npcs" | "combat" | "encounters" | "maps"
  ) => void;
  addNotification: (type: string, message: string) => void;
  clearNotification: (id: string) => void;
  clearAllNotifications: () => void;

  // System actions
  setCurrentUser: (user: User | null) => void;
  resetState: () => void;
}

export const useGameStore = create<GameState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        currentUser: null,
        isUserDM: false,
        campaigns: [],
        currentCampaign: null,
        activePlayers: [],
        campaignImages: [],
        activeMap: null,
        wsStatus: {
          connected: false,
          lastConnected: null,
          error: null,
        },
        resourceLocks: [],
        sidebarOpen: true,
        selectedTab: "characters",
        notifications: [],
        isLoading: false,
        error: null,

        // Actions
        fetchCampaigns: async () => {
          set({ isLoading: true, error: null });
          try {
            const campaigns = await campaignsAPI.listCampaigns();
            set({ campaigns, isLoading: false });
            return campaigns;
          } catch (error: any) {
            set({
              error: error.message || "Failed to fetch campaigns",
              isLoading: false,
            });
            return [];
          }
        },

        fetchCampaign: async (campaignId: string) => {
          set({ isLoading: true, error: null });
          try {
            const campaign = await campaignsAPI.getCampaign(campaignId);

            // Update current campaign if the ID matches
            if (get().currentCampaign?._id === campaignId) {
              set({ currentCampaign: campaign });
            }

            set({ isLoading: false });
            return campaign;
          } catch (error: any) {
            set({
              error: error.message || "Failed to fetch campaign",
              isLoading: false,
            });
            return null;
          }
        },

        setCurrentCampaign: (campaign: Campaign | null) => {
          set({ currentCampaign: campaign });

          // Check if user is the DM
          if (campaign && get().currentUser) {
            const isDM = campaign.dm_id === get().currentUser.id;
            set({ isUserDM: isDM });
          } else {
            set({ isUserDM: false });
          }

          // Reset active map when changing campaigns
          set({ activeMap: null });
        },

        createCampaign: async (data: {
          name: string;
          description?: string;
        }) => {
          set({ isLoading: true, error: null });

          if (!get().currentUser) {
            set({ error: "User not authenticated", isLoading: false });
            return null;
          }

          try {
            const campaignData = {
              ...data,
              dm_id: get().currentUser.id,
            };

            const campaign = await campaignsAPI.createCampaign(campaignData);

            // Add to campaigns list
            set((state) => ({
              campaigns: [
                ...state.campaigns,
                {
                  _id: campaign._id,
                  name: campaign.name,
                  description: campaign.description,
                  dm_id: campaign.dm_id,
                  player_count: campaign.players.length,
                  active: true,
                  created_at: campaign.created_at,
                },
              ],
              isLoading: false,
            }));

            return campaign;
          } catch (error: any) {
            set({
              error: error.message || "Failed to create campaign",
              isLoading: false,
            });
            return null;
          }
        },

        updateCampaign: async (
          campaignId: string,
          updates: Partial<Campaign>
        ) => {
          set({ isLoading: true, error: null });
          try {
            const campaign = await campaignsAPI.updateCampaign(
              campaignId,
              updates
            );

            // Update in campaigns list
            set((state) => ({
              campaigns: state.campaigns.map((c) =>
                c._id === campaignId
                  ? {
                      ...c,
                      name: updates.name || c.name,
                      description:
                        updates.description !== undefined
                          ? updates.description
                          : c.description,
                    }
                  : c
              ),
              isLoading: false,
            }));

            // Update current campaign if it's the one being updated
            if (get().currentCampaign?._id === campaignId) {
              set({ currentCampaign: campaign });
            }

            return campaign;
          } catch (error: any) {
            set({
              error: error.message || "Failed to update campaign",
              isLoading: false,
            });
            return null;
          }
        },

        deleteCampaign: async (campaignId: string) => {
          set({ isLoading: true, error: null });
          try {
            await campaignsAPI.deleteCampaign(campaignId);

            // Remove from campaigns list
            set((state) => ({
              campaigns: state.campaigns.filter((c) => c._id !== campaignId),
              // If current campaign is being deleted, clear it
              currentCampaign:
                state.currentCampaign?._id === campaignId
                  ? null
                  : state.currentCampaign,
              isLoading: false,
            }));

            return true;
          } catch (error: any) {
            set({
              error: error.message || "Failed to delete campaign",
              isLoading: false,
            });
            return false;
          }
        },

        addPlayer: async (campaignId: string, playerId: string) => {
          set({ isLoading: true, error: null });
          try {
            const campaign = await campaignsAPI.addPlayer(campaignId, playerId);

            // Update current campaign if it's the one being modified
            if (get().currentCampaign?._id === campaignId) {
              set({ currentCampaign: campaign });
            }

            // Update player count in campaigns list
            set((state) => ({
              campaigns: state.campaigns.map((c) =>
                c._id === campaignId
                  ? { ...c, player_count: campaign.players.length }
                  : c
              ),
              isLoading: false,
            }));

            return true;
          } catch (error: any) {
            set({
              error: error.message || "Failed to add player",
              isLoading: false,
            });
            return false;
          }
        },

        removePlayer: async (campaignId: string, playerId: string) => {
          set({ isLoading: true, error: null });
          try {
            const campaign = await campaignsAPI.removePlayer(
              campaignId,
              playerId
            );

            // Update current campaign if it's the one being modified
            if (get().currentCampaign?._id === campaignId) {
              set({ currentCampaign: campaign });
            }

            // Update player count in campaigns list
            set((state) => ({
              campaigns: state.campaigns.map((c) =>
                c._id === campaignId
                  ? { ...c, player_count: campaign.players.length }
                  : c
              ),
              // Remove from active players if they're active
              activePlayers: state.activePlayers.filter(
                (id) => id !== playerId
              ),
              isLoading: false,
            }));

            return true;
          } catch (error: any) {
            set({
              error: error.message || "Failed to remove player",
              isLoading: false,
            });
            return false;
          }
        },

        setActivePlayers: (playerIds: string[]) => {
          set({ activePlayers: playerIds });
        },

        createEncounter: async (
          campaignId: string,
          encounterData: Partial<Encounter>
        ) => {
          set({ isLoading: true, error: null });
          try {
            const campaign = await campaignsAPI.createEncounter(
              campaignId,
              encounterData
            );

            // Update current campaign if it's the one being modified
            if (get().currentCampaign?._id === campaignId) {
              set({ currentCampaign: campaign });
            }

            set({ isLoading: false });
            return true;
          } catch (error: any) {
            set({
              error: error.message || "Failed to create encounter",
              isLoading: false,
            });
            return false;
          }
        },

        updateEncounter: async (
          campaignId: string,
          encounterId: string,
          updates: Partial<Encounter>
        ) => {
          set({ isLoading: true, error: null });
          try {
            const campaign = await campaignsAPI.updateEncounter(
              campaignId,
              encounterId,
              updates
            );

            // Update current campaign if it's the one being modified
            if (get().currentCampaign?._id === campaignId) {
              set({ currentCampaign: campaign });
            }

            set({ isLoading: false });
            return true;
          } catch (error: any) {
            set({
              error: error.message || "Failed to update encounter",
              isLoading: false,
            });
            return false;
          }
        },

        deleteEncounter: async (campaignId: string, encounterId: string) => {
          set({ isLoading: true, error: null });
          try {
            const campaign = await campaignsAPI.deleteEncounter(
              campaignId,
              encounterId
            );

            // Update current campaign if it's the one being modified
            if (get().currentCampaign?._id === campaignId) {
              set({ currentCampaign: campaign });
            }

            set({ isLoading: false });
            return true;
          } catch (error: any) {
            set({
              error: error.message || "Failed to delete encounter",
              isLoading: false,
            });
            return false;
          }
        },

        setActiveEncounter: async (campaignId: string, encounterId: string) => {
          set({ isLoading: true, error: null });
          try {
            const campaign = await campaignsAPI.setActiveEncounter(
              campaignId,
              encounterId
            );

            // Update current campaign if it's the one being modified
            if (get().currentCampaign?._id === campaignId) {
              set({ currentCampaign: campaign });
            }

            set({ isLoading: false });
            return true;
          } catch (error: any) {
            set({
              error: error.message || "Failed to set active encounter",
              isLoading: false,
            });
            return false;
          }
        },

        clearActiveEncounter: async (campaignId: string) => {
          set({ isLoading: true, error: null });
          try {
            const campaign = await campaignsAPI.clearActiveEncounter(
              campaignId
            );

            // Update current campaign if it's the one being modified
            if (get().currentCampaign?._id === campaignId) {
              set({ currentCampaign: campaign });
            }

            set({ isLoading: false });
            return true;
          } catch (error: any) {
            set({
              error: error.message || "Failed to clear active encounter",
              isLoading: false,
            });
            return false;
          }
        },

        fetchImages: async (
          campaignId: string,
          params?: { tags?: string; is_map?: boolean }
        ) => {
          set({ isLoading: true, error: null });
          try {
            const images = await campaignsAPI.listImages(campaignId, params);
            set({ campaignImages: images, isLoading: false });
            return images;
          } catch (error: any) {
            set({
              error: error.message || "Failed to fetch images",
              isLoading: false,
            });
            return [];
          }
        },

        uploadImage: async (
          campaignId: string,
          imageFile: File,
          metadata: any
        ) => {
          set({ isLoading: true, error: null });
          try {
            const result = await campaignsAPI.uploadImage(
              campaignId,
              imageFile,
              metadata
            );

            // Refresh images
            await get().fetchImages(campaignId);

            set({ isLoading: false });
            return result;
          } catch (error: any) {
            set({
              error: error.message || "Failed to upload image",
              isLoading: false,
            });
            return null;
          }
        },

        deleteImage: async (campaignId: string, imageId: string) => {
          set({ isLoading: true, error: null });
          try {
            await campaignsAPI.deleteImage(campaignId, imageId);

            // Update images list
            set((state) => ({
              campaignImages: state.campaignImages.filter(
                (img) => img.id !== imageId
              ),
              // Clear active map if it's being deleted
              activeMap:
                state.activeMap?.id === imageId ? null : state.activeMap,
              isLoading: false,
            }));

            return true;
          } catch (error: any) {
            set({
              error: error.message || "Failed to delete image",
              isLoading: false,
            });
            return false;
          }
        },

        updateImageMetadata: async (
          campaignId: string,
          imageId: string,
          updates: any
        ) => {
          set({ isLoading: true, error: null });
          try {
            const result = await campaignsAPI.updateImageMetadata(
              campaignId,
              imageId,
              updates
            );

            // Update in images list
            set((state) => ({
              campaignImages: state.campaignImages.map((img) =>
                img.id === imageId ? { ...img, ...updates } : img
              ),
              // Update active map if it's being modified
              activeMap:
                state.activeMap?.id === imageId
                  ? { ...state.activeMap, ...updates }
                  : state.activeMap,
              isLoading: false,
            }));

            return result;
          } catch (error: any) {
            set({
              error: error.message || "Failed to update image metadata",
              isLoading: false,
            });
            return null;
          }
        },

        setActiveMap: (image: Image | null) => {
          set({ activeMap: image });
        },

        shareImage: async (campaignId: string, imageId: string) => {
          set({ isLoading: true, error: null });
          try {
            await campaignsAPI.shareImage(campaignId, imageId);

            // Add notification
            get().addNotification("info", "Image shared with players");

            set({ isLoading: false });
            return true;
          } catch (error: any) {
            set({
              error: error.message || "Failed to share image",
              isLoading: false,
            });
            return false;
          }
        },

        updateWebSocketStatus: (status: Partial<WebSocketConnectionStatus>) => {
          set((state) => ({
            wsStatus: {
              ...state.wsStatus,
              ...status,
              lastConnected: status.connected
                ? new Date().toISOString()
                : state.wsStatus.lastConnected,
            },
          }));

          // Add notification on connection changes
          if (status.connected !== undefined) {
            const message = status.connected
              ? "Connected to game server"
              : "Disconnected from game server";

            get().addNotification(
              status.connected ? "success" : "error",
              message
            );
          }

          // Add notification on errors
          if (status.error && status.error !== get().wsStatus.error) {
            get().addNotification("error", `WebSocket error: ${status.error}`);
          }
        },

        setResourceLock: (lock: LockStatus) => {
          set((state) => {
            // Remove any existing lock for this resource
            const filteredLocks = state.resourceLocks.filter(
              (l) =>
                !(
                  l.resourceType === lock.resourceType &&
                  l.resourceId === lock.resourceId
                )
            );

            // Add the new lock
            return {
              resourceLocks: [...filteredLocks, lock],
            };
          });

          // Add notification if someone else locked a resource
          if (lock.lockedBy !== get().currentUser?.id) {
            get().addNotification(
              "info",
              `${lock.resourceType} is being edited by another user`
            );
          }
        },

        removeResourceLock: (resourceType: string, resourceId: string) => {
          set((state) => ({
            resourceLocks: state.resourceLocks.filter(
              (lock) =>
                !(
                  lock.resourceType === resourceType &&
                  lock.resourceId === resourceId
                )
            ),
          }));
        },

        isResourceLocked: (
          resourceType: string,
          resourceId: string,
          userId: string
        ) => {
          const lock = get().resourceLocks.find(
            (l) =>
              l.resourceType === resourceType && l.resourceId === resourceId
          );

          if (!lock) return false;

          return lock.lockedBy !== userId;
        },

        toggleSidebar: () => {
          set((state) => ({ sidebarOpen: !state.sidebarOpen }));
        },

        setSelectedTab: (
          tab: "characters" | "npcs" | "combat" | "encounters" | "maps"
        ) => {
          set({ selectedTab: tab });
        },

        addNotification: (type: string, message: string) => {
          const id = Date.now().toString();
          set((state) => ({
            notifications: [
              ...state.notifications,
              {
                id,
                type,
                message,
                timestamp: new Date().toISOString(),
              },
            ].slice(-5), // Keep only the most recent 5 notifications
          }));

          // Auto-remove notifications after 5 seconds
          setTimeout(() => {
            get().clearNotification(id);
          }, 5000);
        },

        clearNotification: (id: string) => {
          set((state) => ({
            notifications: state.notifications.filter((n) => n.id !== id),
          }));
        },

        clearAllNotifications: () => {
          set({ notifications: [] });
        },

        setCurrentUser: (user: User | null) => {
          set({ currentUser: user });

          // Update isDM status if in a campaign
          if (user && get().currentCampaign) {
            const isDM = get().currentCampaign.dm_id === user.id;
            set({ isUserDM: isDM });
          } else {
            set({ isUserDM: false });
          }
        },

        resetState: () => {
          set({
            // Don't reset user or campaign list
            currentCampaign: null,
            activePlayers: [],
            campaignImages: [],
            activeMap: null,
            wsStatus: {
              connected: false,
              lastConnected: null,
              error: null,
            },
            resourceLocks: [],
            sidebarOpen: true,
            selectedTab: "characters",
            notifications: [],
            isLoading: false,
            error: null,
          });
        },
      }),
      {
        name: "game-store",
        partialize: (state) => ({
          // Only persist these values
          campaigns: state.campaigns,
          currentCampaign: state.currentCampaign,
          sidebarOpen: state.sidebarOpen,
          selectedTab: state.selectedTab,
        }),
      }
    )
  )
);

// Setup store connections
// This connects the game store to the character and combat stores
// to keep them in sync with campaign changes
const setupStoreConnections = () => {
  // Subscribe to campaign changes
  useGameStore.subscribe(
    (state) => state.currentCampaign,
    (campaign) => {
      if (campaign) {
        // Update character store with campaign characters
        // Simplified example - in a real app, you might do more
        const characterStore = useCharacterStore.getState();
        characterStore.fetchCharacters(campaign._id);

        // Update combat store with active combat if any
        const combatStore = useCombatStore.getState();
        combatStore.fetchActiveCombat(campaign._id);
      }
    }
  );
};

// Setup connections when this module is imported
setupStoreConnections();

export default useGameStore;
