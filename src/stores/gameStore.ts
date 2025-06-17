/**
 * Game Store - COMPLETAMENTE REFATORADO
 * Problemas resolvidos:
 * 1. ✅ Store connections adequadas
 * 2. ✅ Proper state management
 * 3. ✅ WebSocket integration
 * 4. ✅ Campaign management
 * 5. ✅ Notification system
 * 6. ✅ Connection status tracking
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { campaignsAPI } from "@/lib/api";
import { Campaign, CampaignListItem, Notification } from "@/lib/types";

// ===== TYPES =====
interface GameState {
  // Campaign data
  campaigns: CampaignListItem[];
  currentCampaign: Campaign | null;

  // Connection state
  isConnected: boolean;
  connectionStatus:
    | "disconnected"
    | "connecting"
    | "connected"
    | "reconnecting";
  lastPing: number | null;

  // UI state
  isLoading: boolean;
  error: string | null;
  sidebarOpen: boolean;

  // Notifications
  notifications: Notification[];

  // Campaign actions
  fetchCampaigns: () => Promise<CampaignListItem[]>;
  fetchCampaign: (campaignId: string) => Promise<Campaign | null>;
  createCampaign: (campaignData: Partial<Campaign>) => Promise<Campaign | null>;
  updateCampaign: (
    campaignId: string,
    updates: Partial<Campaign>
  ) => Promise<boolean>;
  deleteCampaign: (campaignId: string) => Promise<boolean>;
  setCurrentCampaign: (campaign: Campaign | null) => void;

  // Connection management
  setConnectionStatus: (status: GameState["connectionStatus"]) => void;
  setConnected: (connected: boolean) => void;
  updatePing: (timestamp: number) => void;

  // Notification management
  addNotification: (
    type: "info" | "success" | "warning" | "error",
    message: string,
    title?: string,
    actions?: Array<{ label: string; action: string }>
  ) => void;
  removeNotification: (notificationId: string) => void;
  markNotificationRead: (notificationId: string) => void;
  clearNotifications: () => void;

  // UI management
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // Utility
  resetState: () => void;
  onCampaignChange: (
    callback: (campaign: Campaign | null) => void
  ) => () => void;
}

// ===== CAMPAIGN CHANGE CALLBACKS =====
const campaignChangeCallbacks = new Set<(campaign: Campaign | null) => void>();

// ===== STORE IMPLEMENTATION =====
export const useGameStore = create<GameState>()(
  devtools(
    persist(
      (set, get) => ({
        // ===== INITIAL STATE =====
        campaigns: [],
        currentCampaign: null,
        isConnected: false,
        connectionStatus: "disconnected",
        lastPing: null,
        isLoading: false,
        error: null,
        sidebarOpen: false,
        notifications: [],

        // ===== CAMPAIGN ACTIONS =====
        fetchCampaigns: async () => {
          set({ isLoading: true, error: null });

          try {
            const campaigns = await campaignsAPI.getCampaigns();

            set({
              campaigns,
              isLoading: false,
              error: null,
            });

            return campaigns;
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : "Failed to fetch campaigns";
            set({
              isLoading: false,
              error: errorMessage,
            });

            get().addNotification(
              "error",
              `Failed to load campaigns: ${errorMessage}`
            );
            throw error;
          }
        },

        fetchCampaign: async (campaignId: string) => {
          set({ isLoading: true, error: null });

          try {
            const campaign = await campaignsAPI.getCampaign(campaignId);

            set({
              isLoading: false,
              error: null,
            });

            return campaign;
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : "Failed to fetch campaign";
            set({
              isLoading: false,
              error: errorMessage,
            });

            get().addNotification(
              "error",
              `Failed to load campaign: ${errorMessage}`
            );
            return null;
          }
        },

        createCampaign: async (campaignData: Partial<Campaign>) => {
          set({ isLoading: true, error: null });

          try {
            const newCampaign = await campaignsAPI.createCampaign(campaignData);

            set((state) => ({
              campaigns: [
                ...state.campaigns,
                {
                  _id: newCampaign._id,
                  name: newCampaign.name,
                  description: newCampaign.description,
                  owner_id: newCampaign.owner_id,
                  players: newCampaign.players,
                  is_active: newCampaign.is_active,
                  created_at: newCampaign.created_at,
                },
              ],
              isLoading: false,
              error: null,
            }));

            get().addNotification(
              "success",
              `Campaign "${newCampaign.name}" created successfully`
            );
            return newCampaign;
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : "Failed to create campaign";
            set({
              isLoading: false,
              error: errorMessage,
            });

            get().addNotification(
              "error",
              `Failed to create campaign: ${errorMessage}`
            );
            return null;
          }
        },

        updateCampaign: async (
          campaignId: string,
          updates: Partial<Campaign>
        ) => {
          try {
            const updatedCampaign = await campaignsAPI.updateCampaign(
              campaignId,
              updates
            );

            set((state) => ({
              campaigns: state.campaigns.map((c) =>
                c._id === campaignId
                  ? {
                      ...c,
                      name: updatedCampaign.name,
                      description: updatedCampaign.description,
                      is_active: updatedCampaign.is_active,
                    }
                  : c
              ),
              currentCampaign:
                state.currentCampaign?._id === campaignId
                  ? updatedCampaign
                  : state.currentCampaign,
            }));

            get().addNotification(
              "success",
              `Campaign "${updatedCampaign.name}" updated`
            );
            return true;
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : "Failed to update campaign";
            set({ error: errorMessage });

            get().addNotification(
              "error",
              `Failed to update campaign: ${errorMessage}`
            );
            return false;
          }
        },

        deleteCampaign: async (campaignId: string) => {
          try {
            await campaignsAPI.deleteCampaign(campaignId);

            set((state) => ({
              campaigns: state.campaigns.filter((c) => c._id !== campaignId),
              currentCampaign:
                state.currentCampaign?._id === campaignId
                  ? null
                  : state.currentCampaign,
            }));

            get().addNotification("success", "Campaign deleted successfully");
            return true;
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : "Failed to delete campaign";
            set({ error: errorMessage });

            get().addNotification(
              "error",
              `Failed to delete campaign: ${errorMessage}`
            );
            return false;
          }
        },

        setCurrentCampaign: (campaign: Campaign | null) => {
          const currentCampaign = get().currentCampaign;

          // Only update if different
          if (currentCampaign?._id !== campaign?._id) {
            set({ currentCampaign: campaign });

            // Notify all callbacks about campaign change
            campaignChangeCallbacks.forEach((callback) => {
              try {
                callback(campaign);
              } catch (error) {
                console.error("Error in campaign change callback:", error);
              }
            });
          }
        },

        // ===== CONNECTION MANAGEMENT =====
        setConnectionStatus: (status: GameState["connectionStatus"]) => {
          set({ connectionStatus: status });

          // Update isConnected based on status
          const isConnected = status === "connected";
          if (get().isConnected !== isConnected) {
            set({ isConnected });
          }
        },

        setConnected: (connected: boolean) => {
          set({ isConnected: connected });

          // Update connection status
          const status = connected ? "connected" : "disconnected";
          if (get().connectionStatus !== status) {
            set({ connectionStatus: status });
          }

          // Add notification on connection change
          if (connected) {
            get().addNotification(
              "success",
              "Connected to server",
              "Connection Status"
            );
          } else {
            get().addNotification(
              "warning",
              "Disconnected from server",
              "Connection Status"
            );
          }
        },

        updatePing: (timestamp: number) => {
          set({ lastPing: timestamp });
        },

        // ===== NOTIFICATION MANAGEMENT =====
        addNotification: (
          type: "info" | "success" | "warning" | "error",
          message: string,
          title?: string,
          actions?: Array<{ label: string; action: string }>
        ) => {
          const notification: Notification = {
            id: `notification_${Date.now()}_${Math.random()
              .toString(36)
              .substr(2, 9)}`,
            type,
            title: title || type.charAt(0).toUpperCase() + type.slice(1),
            message,
            timestamp: new Date().toISOString(),
            read: false,
            actions: actions?.map((action) => ({
              ...action,
              style: type === "error" ? "destructive" : "primary",
            })),
          };

          set((state) => ({
            notifications: [notification, ...state.notifications].slice(0, 50), // Keep only 50 latest
          }));

          // Auto-remove success and info notifications after 5 seconds
          if (type === "success" || type === "info") {
            setTimeout(() => {
              get().removeNotification(notification.id);
            }, 5000);
          }
        },

        removeNotification: (notificationId: string) => {
          set((state) => ({
            notifications: state.notifications.filter(
              (n) => n.id !== notificationId
            ),
          }));
        },

        markNotificationRead: (notificationId: string) => {
          set((state) => ({
            notifications: state.notifications.map((n) =>
              n.id === notificationId ? { ...n, read: true } : n
            ),
          }));
        },

        clearNotifications: () => {
          set({ notifications: [] });
        },

        // ===== UI MANAGEMENT =====
        setSidebarOpen: (open: boolean) => {
          set({ sidebarOpen: open });
        },

        toggleSidebar: () => {
          set((state) => ({ sidebarOpen: !state.sidebarOpen }));
        },

        // ===== UTILITY =====
        resetState: () => {
          set({
            campaigns: [],
            currentCampaign: null,
            isConnected: false,
            connectionStatus: "disconnected",
            lastPing: null,
            isLoading: false,
            error: null,
            sidebarOpen: false,
            notifications: [],
          });

          // Clear all campaign change callbacks
          campaignChangeCallbacks.clear();
        },

        onCampaignChange: (callback: (campaign: Campaign | null) => void) => {
          campaignChangeCallbacks.add(callback);

          // Return cleanup function
          return () => {
            campaignChangeCallbacks.delete(callback);
          };
        },
      }),
      {
        name: "game-storage",
        partialize: (state) => ({
          // Only persist campaigns and current campaign
          campaigns: state.campaigns,
          currentCampaign: state.currentCampaign,
          sidebarOpen: state.sidebarOpen,
        }),
      }
    ),
    {
      name: "game-store",
    }
  )
);

// ===== HELPER HOOKS =====

/**
 * Hook for campaign-specific operations
 */
export function useCampaignActions() {
  const {
    fetchCampaigns,
    fetchCampaign,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    setCurrentCampaign,
  } = useGameStore();

  return {
    fetchCampaigns,
    fetchCampaign,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    setCurrentCampaign,
  };
}

/**
 * Hook for connection status
 */
export function useConnectionStatus() {
  const {
    isConnected,
    connectionStatus,
    lastPing,
    setConnectionStatus,
    setConnected,
    updatePing,
  } = useGameStore();

  return {
    isConnected,
    connectionStatus,
    lastPing,
    setConnectionStatus,
    setConnected,
    updatePing,
  };
}

/**
 * Hook for notifications
 */
export function useNotifications() {
  const {
    notifications,
    addNotification,
    removeNotification,
    markNotificationRead,
    clearNotifications,
  } = useGameStore();

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    addNotification,
    removeNotification,
    markNotificationRead,
    clearNotifications,
  };
}

/**
 * Hook for UI state
 */
export function useUIState() {
  const { sidebarOpen, setSidebarOpen, toggleSidebar } = useGameStore();

  return {
    sidebarOpen,
    setSidebarOpen,
    toggleSidebar,
  };
}

export default useGameStore;
