// store/npcStore.ts
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { NPC, NPCListItem, NPCAction, NPCStats } from "@/lib/types";
import { npcsAPI } from "@/lib/api";

// Removida a importação circular do useGameStore
// Vamos usar um sistema de notificações similar ao gameStore

interface NPCState {
  // State
  npcs: NPCListItem[];
  npc: NPC | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchNPCs: (campaignId: string) => Promise<NPCListItem[]>;
  fetchNPC: (npcId: string) => Promise<NPC | null>;
  setCurrentNPC: (npc: NPC | null) => void;
  createNPC: (npcData: any) => Promise<NPC | null>;
  updateNPC: (npcId: string, updates: Partial<NPC>) => Promise<NPC | null>;
  deleteNPC: (npcId: string) => Promise<boolean>;
  updateHP: (npcId: string, hpChange: number) => Promise<NPC | null>;
  importFromCompendium: (
    campaignId: string,
    monsterId: string,
    nameOverride?: string
  ) => Promise<NPC | null>;
  bulkImport: (campaignId: string, npcsData: any) => Promise<NPC[] | null>;

  // Helper functions
  getNPCById: (npcId: string) => NPC | NPCListItem | null;
  getModifier: (npcId: string, attribute: string) => number;

  // Reset state
  resetState: () => void;

  // Notification system (similar to gameStore)
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

export const useNPCStore = create<NPCState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        npcs: [],
        npc: null,
        isLoading: false,
        error: null,

        // Actions
        fetchNPCs: async (campaignId: string) => {
          set({ isLoading: true, error: null });
          try {
            const data = await npcsAPI.listCampaignNPCs(campaignId);
            set({ npcs: data, isLoading: false });
            return data;
          } catch (error: any) {
            set({
              error: error.message || "Failed to fetch NPCs",
              isLoading: false,
            });
            return [];
          }
        },

        fetchNPC: async (npcId: string) => {
          set({ isLoading: true, error: null });
          try {
            const data = await npcsAPI.getNPC(npcId);
            set({ npc: data, isLoading: false });
            return data;
          } catch (error: any) {
            set({
              error: error.message || "Failed to fetch NPC",
              isLoading: false,
            });
            return null;
          }
        },

        setCurrentNPC: (npc: NPC | null) => {
          set({ npc });
        },

        createNPC: async (npcData: any) => {
          set({ isLoading: true, error: null });
          try {
            const data = await npcsAPI.createNPC(npcData);

            // Add to NPC list
            set((state) => ({
              npcs: [
                ...state.npcs,
                {
                  _id: data._id,
                  name: data.name,
                  source: data.source,
                  challenge_rating: data.stats.challenge_rating,
                  type: data.stats.attributes ? "custom" : "compendium",
                },
              ],
              isLoading: false,
            }));

            // Notify success
            get().addNotification("success", `NPC "${data.name}" created`);

            return data;
          } catch (error: any) {
            set({
              error: error.message || "Failed to create NPC",
              isLoading: false,
            });

            // Notify error
            get().addNotification(
              "error",
              `Failed to create NPC: ${error.message}`
            );

            return null;
          }
        },

        updateNPC: async (npcId: string, updates: Partial<NPC>) => {
          set({ isLoading: true, error: null });
          try {
            // Verificação de lock seria feita aqui se necessário
            // Removida a dependência direta do gameStore

            const data = await npcsAPI.updateNPC(npcId, updates);

            // Update NPC if it's the current one
            if (get().npc && get().npc._id === npcId) {
              set({ npc: data });
            }

            // Update in NPC list
            set((state) => ({
              npcs: state.npcs.map((n) =>
                n._id === npcId
                  ? {
                      ...n,
                      name: updates.name || n.name,
                      challenge_rating:
                        updates.stats?.challenge_rating || n.challenge_rating,
                    }
                  : n
              ),
              isLoading: false,
            }));

            // Notify success
            get().addNotification("success", `NPC "${data.name}" updated`);

            return data;
          } catch (error: any) {
            set({
              error: error.message || "Failed to update NPC",
              isLoading: false,
            });

            // Notify error
            get().addNotification(
              "error",
              `Failed to update NPC: ${error.message}`
            );

            return null;
          }
        },

        deleteNPC: async (npcId: string) => {
          set({ isLoading: true, error: null });
          try {
            // Get NPC name before deleting
            const npcName = get().getNPCById(npcId)?.name || "NPC";

            await npcsAPI.deleteNPC(npcId);

            // Remove from NPC list
            set((state) => ({
              npcs: state.npcs.filter((n) => n._id !== npcId),
              // Clear current NPC if it's the one being deleted
              npc: state.npc?._id === npcId ? null : state.npc,
              isLoading: false,
            }));

            // Notify success
            get().addNotification("success", `NPC "${npcName}" deleted`);

            return true;
          } catch (error: any) {
            set({
              error: error.message || "Failed to delete NPC",
              isLoading: false,
            });

            // Notify error
            get().addNotification(
              "error",
              `Failed to delete NPC: ${error.message}`
            );

            return false;
          }
        },

        updateHP: async (npcId: string, hpChange: number) => {
          set({ isLoading: true, error: null });
          try {
            const data = await npcsAPI.updateHP(npcId, hpChange);

            // Update NPC if it's the current one
            if (get().npc && get().npc._id === npcId) {
              set({ npc: data });
            }

            // Notify HP change
            const hpText =
              hpChange > 0
                ? `healed ${hpChange} HP`
                : `took ${Math.abs(hpChange)} damage`;
            get().addNotification("info", `${data.name} ${hpText}`);

            set({ isLoading: false });
            return data;
          } catch (error: any) {
            set({
              error: error.message || "Failed to update HP",
              isLoading: false,
            });

            // Notify error
            get().addNotification("error", "Failed to update HP");

            return null;
          }
        },

        importFromCompendium: async (
          campaignId: string,
          monsterId: string,
          nameOverride?: string
        ) => {
          set({ isLoading: true, error: null });
          try {
            const data = await npcsAPI.importFromCompendium(
              campaignId,
              monsterId,
              nameOverride
            );

            // Add to NPC list
            set((state) => ({
              npcs: [
                ...state.npcs,
                {
                  _id: data._id,
                  name: data.name,
                  source: data.source,
                  challenge_rating: data.stats.challenge_rating,
                  type: "compendium",
                },
              ],
              isLoading: false,
            }));

            // Notify success
            get().addNotification(
              "success",
              `NPC "${data.name}" imported from compendium`
            );

            return data;
          } catch (error: any) {
            set({
              error: error.message || "Failed to import from compendium",
              isLoading: false,
            });

            // Notify error
            get().addNotification(
              "error",
              `Failed to import from compendium: ${error.message}`
            );

            return null;
          }
        },

        bulkImport: async (campaignId: string, npcsData: any) => {
          set({ isLoading: true, error: null });
          try {
            const data = await npcsAPI.bulkImport(campaignId, npcsData);

            // Add to NPC list
            const newListItems = data.map((npc) => ({
              _id: npc._id,
              name: npc.name,
              source: npc.source,
              challenge_rating: npc.stats.challenge_rating,
              type: npc.source === "custom" ? "custom" : "compendium",
            }));

            set((state) => ({
              npcs: [...state.npcs, ...newListItems],
              isLoading: false,
            }));

            // Notify success
            get().addNotification(
              "success",
              `${data.length} NPCs imported successfully`
            );

            return data;
          } catch (error: any) {
            set({
              error: error.message || "Failed to bulk import NPCs",
              isLoading: false,
            });

            // Notify error
            get().addNotification(
              "error",
              `Failed to import NPCs: ${error.message}`
            );

            return null;
          }
        },

        // Helper functions
        getNPCById: (npcId: string) => {
          if (get().npc && get().npc._id === npcId) {
            return get().npc;
          }

          const npcListItem = get().npcs.find((n) => n._id === npcId);
          if (npcListItem) {
            return npcListItem;
          }

          // If not found, try to fetch it
          if (!get().isLoading) {
            get().fetchNPC(npcId);
          }

          return null;
        },

        getModifier: (npcId: string, attribute: string) => {
          const npc = get().npc && get().npc._id === npcId ? get().npc : null;

          if (!npc || !npc.stats || !npc.stats.attributes) {
            return 0;
          }

          const attributes = npc.stats.attributes;
          if (!(attribute in attributes)) {
            return 0;
          }

          const attrValue = attributes[attribute as keyof typeof attributes];
          return Math.floor((attrValue - 10) / 2);
        },

        // Reset state
        resetState: () => {
          set({
            npcs: [],
            npc: null,
            isLoading: false,
            error: null,
          });
        },

        // Notification system
        addNotification: (
          type: "info" | "success" | "warning" | "error",
          message: string
        ) => {
          // Se há um callback configurado (do gameStore), usa ele
          if (notificationCallback) {
            notificationCallback(type, message);
          } else {
            // Fallback para console se não há callback
            console.log(`[NPC Store] ${type.toUpperCase()}: ${message}`);
          }
        },
      }),
      {
        name: "npc-store",
        partialize: (state) => ({
          // Only persist the NPCs list, not the current NPC or loading states
          npcs: state.npcs,
        }),
      }
    )
  )
);

export default useNPCStore;
