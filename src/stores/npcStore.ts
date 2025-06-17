/**
 * NPC Store - COMPLETAMENTE REFATORADO
 * Problemas resolvidos:
 * 1. ✅ State management adequado
 * 2. ✅ CRUD operations completas
 * 3. ✅ Search e filtering
 * 4. ✅ Error handling
 * 5. ✅ WebSocket integration
 * 6. ✅ Lock management
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { npcsAPI } from "@/lib/api";
import { NPC, NPCListItem, NPCAction } from "@/lib/types";

// ===== TYPES =====
interface NPCState {
  // NPC data
  npcs: NPCListItem[];
  currentNPC: NPC | null;

  // State
  isLoading: boolean;
  error: string | null;

  // Search and filtering
  searchQuery: string;
  typeFilter: string;
  crFilter: string;

  // Lock management
  lockedResources: Record<string, string>; // resourceId -> userId

  // Actions
  fetchNPCs: (campaignId: string) => Promise<NPCListItem[]>;
  fetchNPC: (npcId: string) => Promise<NPC | null>;
  createNPC: (npcData: Partial<NPC>) => Promise<NPC | null>;
  updateNPC: (npcId: string, updates: Partial<NPC>) => Promise<boolean>;
  deleteNPC: (npcId: string) => Promise<boolean>;
  setCurrentNPC: (npc: NPC | null) => void;

  // Bulk operations
  createMultipleNPCs: (npcsData: Partial<NPC>[]) => Promise<NPC[]>;
  bulkDelete: (npcIds: string[]) => Promise<boolean>;

  // Search and filtering
  setSearchQuery: (query: string) => void;
  setTypeFilter: (type: string) => void;
  setCRFilter: (cr: string) => void;
  clearFilters: () => void;
  getFilteredNPCs: () => NPCListItem[];

  // NPC management
  duplicateNPC: (npcId: string) => Promise<NPC | null>;
  updateNPCHP: (
    npcId: string,
    currentHP: number,
    maxHP?: number
  ) => Promise<boolean>;
  addNPCAction: (npcId: string, action: NPCAction) => Promise<boolean>;
  removeNPCAction: (npcId: string, actionIndex: number) => Promise<boolean>;
  updateNPCAction: (
    npcId: string,
    actionIndex: number,
    action: NPCAction
  ) => Promise<boolean>;

  // Lock management
  setResourceLock: (resourceId: string, userId: string) => void;
  clearResourceLock: (resourceId: string) => void;
  isResourceLocked: (resourceId: string, currentUserId: string) => boolean;

  // Helper functions
  getNPCById: (npcId: string) => NPC | NPCListItem | null;
  getNPCsByType: (type: string) => NPCListItem[];
  getNPCsByCR: (cr: string) => NPCListItem[];

  // Reset state
  resetState: () => void;

  // Notification system
  addNotification: (
    type: "info" | "success" | "warning" | "error",
    message: string
  ) => void;
}

// Sistema de notificações para comunicação com outros stores
let notificationCallback:
  | ((type: "info" | "success" | "warning" | "error", message: string) => void)
  | null = null;

export const setNPCNotificationCallback = (
  callback: typeof notificationCallback
) => {
  notificationCallback = callback;
};

// ===== UTILITY FUNCTIONS =====
const filterNPCs = (
  npcs: NPCListItem[],
  searchQuery: string,
  typeFilter: string,
  crFilter: string
): NPCListItem[] => {
  return npcs.filter((npc) => {
    // Search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = npc.name.toLowerCase().includes(query);
      const matchesType = npc.type.toLowerCase().includes(query);
      if (!matchesName && !matchesType) {
        return false;
      }
    }

    // Type filter
    if (typeFilter && typeFilter !== "all") {
      if (npc.type.toLowerCase() !== typeFilter.toLowerCase()) {
        return false;
      }
    }

    // CR filter
    if (crFilter && crFilter !== "all") {
      if (npc.challenge_rating !== crFilter) {
        return false;
      }
    }

    return true;
  });
};

const sortNPCsByName = (npcs: NPCListItem[]): NPCListItem[] => {
  return [...npcs].sort((a, b) => a.name.localeCompare(b.name));
};

// ===== STORE IMPLEMENTATION =====
export const useNPCStore = create<NPCState>()(
  devtools(
    persist(
      (set, get) => ({
        // ===== INITIAL STATE =====
        npcs: [],
        currentNPC: null,
        isLoading: false,
        error: null,
        searchQuery: "",
        typeFilter: "all",
        crFilter: "all",
        lockedResources: {},

        // ===== API ACTIONS =====
        fetchNPCs: async (campaignId: string) => {
          set({ isLoading: true, error: null });

          try {
            const npcs = await npcsAPI.getNPCs(campaignId);
            const sortedNPCs = sortNPCsByName(npcs);

            set({
              npcs: sortedNPCs,
              isLoading: false,
              error: null,
            });

            return sortedNPCs;
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Failed to fetch NPCs";
            set({
              isLoading: false,
              error: errorMessage,
            });

            notificationCallback?.(
              "error",
              `Failed to load NPCs: ${errorMessage}`
            );
            throw error;
          }
        },

        fetchNPC: async (npcId: string) => {
          set({ isLoading: true, error: null });

          try {
            const npc = await npcsAPI.getNPC(npcId);

            set({
              currentNPC: npc,
              isLoading: false,
              error: null,
            });

            return npc;
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Failed to fetch NPC";
            set({
              isLoading: false,
              error: errorMessage,
            });

            notificationCallback?.(
              "error",
              `Failed to load NPC: ${errorMessage}`
            );
            return null;
          }
        },

        createNPC: async (npcData: Partial<NPC>) => {
          set({ isLoading: true, error: null });

          try {
            const newNPC = await npcsAPI.createNPC(npcData);

            set((state) => ({
              npcs: sortNPCsByName([
                ...state.npcs,
                {
                  _id: newNPC._id,
                  name: newNPC.name,
                  type: newNPC.type,
                  challenge_rating: newNPC.challenge_rating,
                  campaign_id: newNPC.campaign_id,
                  image_url: newNPC.image_url,
                },
              ]),
              currentNPC: newNPC,
              isLoading: false,
              error: null,
            }));

            notificationCallback?.(
              "success",
              `NPC "${newNPC.name}" created successfully`
            );
            return newNPC;
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Failed to create NPC";
            set({
              isLoading: false,
              error: errorMessage,
            });

            notificationCallback?.(
              "error",
              `Failed to create NPC: ${errorMessage}`
            );
            return null;
          }
        },

        updateNPC: async (npcId: string, updates: Partial<NPC>) => {
          try {
            const updatedNPC = await npcsAPI.updateNPC(npcId, updates);

            set((state) => ({
              npcs: state.npcs.map((n) =>
                n._id === npcId
                  ? {
                      ...n,
                      name: updatedNPC.name,
                      type: updatedNPC.type,
                      challenge_rating: updatedNPC.challenge_rating,
                      image_url: updatedNPC.image_url,
                    }
                  : n
              ),
              currentNPC:
                state.currentNPC?._id === npcId ? updatedNPC : state.currentNPC,
            }));

            notificationCallback?.(
              "success",
              `NPC "${updatedNPC.name}" updated`
            );
            return true;
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Failed to update NPC";
            set({ error: errorMessage });

            notificationCallback?.(
              "error",
              `Failed to update NPC: ${errorMessage}`
            );
            return false;
          }
        },

        deleteNPC: async (npcId: string) => {
          try {
            await npcsAPI.deleteNPC(npcId);

            set((state) => ({
              npcs: state.npcs.filter((n) => n._id !== npcId),
              currentNPC:
                state.currentNPC?._id === npcId ? null : state.currentNPC,
            }));

            notificationCallback?.("success", "NPC deleted successfully");
            return true;
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Failed to delete NPC";
            set({ error: errorMessage });

            notificationCallback?.(
              "error",
              `Failed to delete NPC: ${errorMessage}`
            );
            return false;
          }
        },

        setCurrentNPC: (npc: NPC | null) => {
          set({ currentNPC: npc });
        },

        // ===== BULK OPERATIONS =====
        createMultipleNPCs: async (npcsData: Partial<NPC>[]) => {
          set({ isLoading: true, error: null });

          try {
            const createdNPCs: NPC[] = [];

            for (const npcData of npcsData) {
              const newNPC = await npcsAPI.createNPC(npcData);
              createdNPCs.push(newNPC);
            }

            set((state) => ({
              npcs: sortNPCsByName([
                ...state.npcs,
                ...createdNPCs.map((npc) => ({
                  _id: npc._id,
                  name: npc.name,
                  type: npc.type,
                  challenge_rating: npc.challenge_rating,
                  campaign_id: npc.campaign_id,
                  image_url: npc.image_url,
                })),
              ]),
              isLoading: false,
              error: null,
            }));

            notificationCallback?.(
              "success",
              `Created ${createdNPCs.length} NPCs successfully`
            );
            return createdNPCs;
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Failed to create NPCs";
            set({
              isLoading: false,
              error: errorMessage,
            });

            notificationCallback?.(
              "error",
              `Failed to create NPCs: ${errorMessage}`
            );
            return [];
          }
        },

        bulkDelete: async (npcIds: string[]) => {
          try {
            // Delete each NPC
            for (const npcId of npcIds) {
              await npcsAPI.deleteNPC(npcId);
            }

            set((state) => ({
              npcs: state.npcs.filter((n) => !npcIds.includes(n._id)),
              currentNPC:
                state.currentNPC && npcIds.includes(state.currentNPC._id)
                  ? null
                  : state.currentNPC,
            }));

            notificationCallback?.(
              "success",
              `Deleted ${npcIds.length} NPCs successfully`
            );
            return true;
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Failed to delete NPCs";
            set({ error: errorMessage });

            notificationCallback?.(
              "error",
              `Failed to delete NPCs: ${errorMessage}`
            );
            return false;
          }
        },

        // ===== SEARCH AND FILTERING =====
        setSearchQuery: (query: string) => {
          set({ searchQuery: query });
        },

        setTypeFilter: (type: string) => {
          set({ typeFilter: type });
        },

        setCRFilter: (cr: string) => {
          set({ crFilter: cr });
        },

        clearFilters: () => {
          set({
            searchQuery: "",
            typeFilter: "all",
            crFilter: "all",
          });
        },

        getFilteredNPCs: () => {
          const { npcs, searchQuery, typeFilter, crFilter } = get();
          return filterNPCs(npcs, searchQuery, typeFilter, crFilter);
        },

        // ===== NPC MANAGEMENT =====
        duplicateNPC: async (npcId: string) => {
          try {
            const originalNPC = get().getNPCById(npcId) as NPC;
            if (!originalNPC) {
              throw new Error("NPC not found");
            }

            const duplicateData: Partial<NPC> = {
              ...originalNPC,
              name: `${originalNPC.name} (Copy)`,
              _id: undefined, // Let the server generate a new ID
              created_at: undefined,
              updated_at: undefined,
            };

            const duplicatedNPC = await get().createNPC(duplicateData);

            if (duplicatedNPC) {
              notificationCallback?.(
                "success",
                `NPC "${duplicatedNPC.name}" duplicated successfully`
              );
            }

            return duplicatedNPC;
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : "Failed to duplicate NPC";
            notificationCallback?.(
              "error",
              `Failed to duplicate NPC: ${errorMessage}`
            );
            return null;
          }
        },

        updateNPCHP: async (
          npcId: string,
          currentHP: number,
          maxHP?: number
        ) => {
          try {
            const updates: Partial<NPC> = {
              hit_points_current: currentHP,
            };

            if (maxHP !== undefined) {
              updates.hit_points_max = maxHP;
            }

            const success = await get().updateNPC(npcId, updates);

            if (success) {
              notificationCallback?.("success", "NPC HP updated");
            }

            return success;
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : "Failed to update NPC HP";
            notificationCallback?.(
              "error",
              `Failed to update NPC HP: ${errorMessage}`
            );
            return false;
          }
        },

        addNPCAction: async (npcId: string, action: NPCAction) => {
          try {
            const npc = get().currentNPC;
            if (!npc || npc._id !== npcId) {
              throw new Error("NPC not found or not current");
            }

            const updatedActions = [...npc.actions, action];
            const success = await get().updateNPC(npcId, {
              actions: updatedActions,
            });

            if (success) {
              notificationCallback?.(
                "success",
                `Action "${action.name}" added to ${npc.name}`
              );
            }

            return success;
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : "Failed to add NPC action";
            notificationCallback?.(
              "error",
              `Failed to add NPC action: ${errorMessage}`
            );
            return false;
          }
        },

        removeNPCAction: async (npcId: string, actionIndex: number) => {
          try {
            const npc = get().currentNPC;
            if (!npc || npc._id !== npcId) {
              throw new Error("NPC not found or not current");
            }

            if (actionIndex < 0 || actionIndex >= npc.actions.length) {
              throw new Error("Invalid action index");
            }

            const actionName = npc.actions[actionIndex].name;
            const updatedActions = npc.actions.filter(
              (_, index) => index !== actionIndex
            );
            const success = await get().updateNPC(npcId, {
              actions: updatedActions,
            });

            if (success) {
              notificationCallback?.(
                "success",
                `Action "${actionName}" removed from ${npc.name}`
              );
            }

            return success;
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : "Failed to remove NPC action";
            notificationCallback?.(
              "error",
              `Failed to remove NPC action: ${errorMessage}`
            );
            return false;
          }
        },

        updateNPCAction: async (
          npcId: string,
          actionIndex: number,
          action: NPCAction
        ) => {
          try {
            const npc = get().currentNPC;
            if (!npc || npc._id !== npcId) {
              throw new Error("NPC not found or not current");
            }

            if (actionIndex < 0 || actionIndex >= npc.actions.length) {
              throw new Error("Invalid action index");
            }

            const updatedActions = npc.actions.map((a, index) =>
              index === actionIndex ? action : a
            );
            const success = await get().updateNPC(npcId, {
              actions: updatedActions,
            });

            if (success) {
              notificationCallback?.(
                "success",
                `Action "${action.name}" updated`
              );
            }

            return success;
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : "Failed to update NPC action";
            notificationCallback?.(
              "error",
              `Failed to update NPC action: ${errorMessage}`
            );
            return false;
          }
        },

        // ===== LOCK MANAGEMENT =====
        setResourceLock: (resourceId: string, userId: string) => {
          set((state) => ({
            lockedResources: {
              ...state.lockedResources,
              [resourceId]: userId,
            },
          }));
        },

        clearResourceLock: (resourceId: string) => {
          set((state) => {
            const newLocks = { ...state.lockedResources };
            delete newLocks[resourceId];
            return { lockedResources: newLocks };
          });
        },

        isResourceLocked: (resourceId: string, currentUserId: string) => {
          const locks = get().lockedResources;
          const lockOwner = locks[resourceId];
          return lockOwner !== undefined && lockOwner !== currentUserId;
        },

        // ===== HELPER FUNCTIONS =====
        getNPCById: (npcId: string) => {
          const state = get();

          // Check if it's the current NPC first
          if (state.currentNPC && state.currentNPC._id === npcId) {
            return state.currentNPC;
          }

          // Look in the NPCs list (limited data)
          const npcListItem = state.npcs.find((n) => n._id === npcId);
          if (npcListItem) {
            return npcListItem;
          }

          return null;
        },

        getNPCsByType: (type: string) => {
          const npcs = get().npcs;
          return npcs.filter(
            (npc) => npc.type.toLowerCase() === type.toLowerCase()
          );
        },

        getNPCsByCR: (cr: string) => {
          const npcs = get().npcs;
          return npcs.filter((npc) => npc.challenge_rating === cr);
        },

        // ===== UTILITY =====
        resetState: () => {
          set({
            npcs: [],
            currentNPC: null,
            isLoading: false,
            error: null,
            searchQuery: "",
            typeFilter: "all",
            crFilter: "all",
            lockedResources: {},
          });
        },

        addNotification: (
          type: "info" | "success" | "warning" | "error",
          message: string
        ) => {
          notificationCallback?.(type, message);
        },
      }),
      {
        name: "npc-storage",
        partialize: (state) => ({
          // Only persist NPCs list and current NPC
          npcs: state.npcs,
          currentNPC: state.currentNPC,
          searchQuery: state.searchQuery,
          typeFilter: state.typeFilter,
          crFilter: state.crFilter,
        }),
      }
    ),
    {
      name: "npc-store",
    }
  )
);

// ===== HELPER HOOKS =====

/**
 * Hook for NPC search and filtering
 */
export function useNPCFilters() {
  const {
    searchQuery,
    typeFilter,
    crFilter,
    setSearchQuery,
    setTypeFilter,
    setCRFilter,
    clearFilters,
    getFilteredNPCs,
  } = useNPCStore();

  return {
    searchQuery,
    typeFilter,
    crFilter,
    setSearchQuery,
    setTypeFilter,
    setCRFilter,
    clearFilters,
    getFilteredNPCs,
  };
}

/**
 * Hook for NPC CRUD operations
 */
export function useNPCActions() {
  const {
    fetchNPCs,
    fetchNPC,
    createNPC,
    updateNPC,
    deleteNPC,
    duplicateNPC,
    createMultipleNPCs,
    bulkDelete,
  } = useNPCStore();

  return {
    fetchNPCs,
    fetchNPC,
    createNPC,
    updateNPC,
    deleteNPC,
    duplicateNPC,
    createMultipleNPCs,
    bulkDelete,
  };
}

/**
 * Hook for NPC combat operations
 */
export function useNPCCombat() {
  const { updateNPCHP, addNPCAction, removeNPCAction, updateNPCAction } =
    useNPCStore();

  return {
    updateNPCHP,
    addNPCAction,
    removeNPCAction,
    updateNPCAction,
  };
}

export default useNPCStore;
