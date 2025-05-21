// store/combatStore.ts
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import {
  Combat,
  InitiativeEntry,
  ConditionEffect,
  CombatEvent,
  Character,
  NPC,
} from "@/lib/types";
import { combatAPI } from "@/lib/api";
import { useCharacterStore } from "./characterStore";

interface CombatState {
  // State
  activeCombat: Combat | null;
  combatHistory: Combat[];
  pendingInitiative: Record<string, number>; // entityId -> initiative value
  isLoading: boolean;
  error: string | null;
  turnTimer: number | null; // seconds remaining for current turn
  turnTimerActive: boolean;

  // Actions
  fetchActiveCombat: (campaignId: string) => Promise<Combat | null>;
  fetchCombat: (combatId: string) => Promise<Combat | null>;
  startCombat: (
    campaignId: string,
    encounterId?: string
  ) => Promise<Combat | null>;
  endCombat: (combatId: string) => Promise<boolean>;
  rollInitiative: (
    combatId: string,
    entityId: string,
    entityType: "character" | "npc",
    advantage?: boolean,
    disadvantage?: boolean
  ) => Promise<boolean>;
  updateInitiativePending: (entityId: string, initiative: number) => void;
  submitAllPendingInitiatives: (combatId: string) => Promise<boolean>;
  nextTurn: (combatId: string) => Promise<boolean>;
  addCondition: (
    combatId: string,
    targetId: string,
    targetType: "character" | "npc",
    condition: string,
    duration: { type: "rounds" | "minutes" | "hours"; value: number },
    notes?: string
  ) => Promise<boolean>;
  removeCondition: (combatId: string, conditionId: string) => Promise<boolean>;
  registerAction: (
    combatId: string,
    actionType:
      | "attack"
      | "cast"
      | "dash"
      | "disengage"
      | "dodge"
      | "help"
      | "hide"
      | "ready"
      | "use"
      | "other",
    description: string,
    targetId?: string,
    targetType?: "character" | "npc"
  ) => Promise<boolean>;

  // Turn timer functions
  startTurnTimer: (seconds: number) => void;
  pauseTurnTimer: () => void;
  resetTurnTimer: () => void;

  // Helper functions
  getCurrentEntity: () => { id: string; type: "character" | "npc" } | null;
  getEntityById: (
    entityId: string,
    entityType: "character" | "npc"
  ) => Character | NPC | null;
  isPlayerTurn: (userId: string) => boolean;
  canControl: (
    entityId: string,
    entityType: "character" | "npc",
    userId: string,
    isDM: boolean
  ) => boolean;

  // Reset state
  resetState: () => void;
}

export const useCombatStore = create<CombatState>()(
  devtools((set, get) => ({
    // Initial state
    activeCombat: null,
    combatHistory: [],
    pendingInitiative: {},
    isLoading: false,
    error: null,
    turnTimer: null,
    turnTimerActive: false,

    // Actions
    fetchActiveCombat: async (campaignId: string) => {
      set({ isLoading: true, error: null });
      try {
        const combat = await combatAPI.getActiveCombat(campaignId);
        set({ activeCombat: combat, isLoading: false });

        // Start turn timer if combat is active
        if (combat && combat.status === "active") {
          get().startTurnTimer(60); // Default 60 seconds per turn
        }

        return combat;
      } catch (error: any) {
        // If 404, it means there's no active combat, which is fine
        if (error.message && error.message.includes("404")) {
          set({ activeCombat: null, isLoading: false });
          return null;
        }

        set({
          error: error.message || "Failed to fetch active combat",
          isLoading: false,
        });
        return null;
      }
    },

    fetchCombat: async (combatId: string) => {
      set({ isLoading: true, error: null });
      try {
        const combat = await combatAPI.getCombat(combatId);

        // If this is the active combat, update that reference
        if (get().activeCombat && get().activeCombat._id === combatId) {
          set({ activeCombat: combat });
        }

        set({ isLoading: false });
        return combat;
      } catch (error: any) {
        set({
          error: error.message || "Failed to fetch combat",
          isLoading: false,
        });
        return null;
      }
    },

    startCombat: async (campaignId: string, encounterId?: string) => {
      set({ isLoading: true, error: null });
      try {
        const combat = await combatAPI.createCombat({
          campaign_id: campaignId,
          encounter_id: encounterId,
        });

        set({
          activeCombat: combat,
          pendingInitiative: {}, // Reset pending initiatives
          isLoading: false,
        });

        // Start turn timer
        get().startTurnTimer(60); // Default 60 seconds per turn

        return combat;
      } catch (error: any) {
        set({
          error: error.message || "Failed to start combat",
          isLoading: false,
        });
        return null;
      }
    },

    endCombat: async (combatId: string) => {
      set({ isLoading: true, error: null });
      try {
        await combatAPI.endCombat(combatId);

        // Add to combat history if this was the active combat
        if (get().activeCombat && get().activeCombat._id === combatId) {
          set((state) => ({
            combatHistory: [
              ...(state.activeCombat ? [state.activeCombat] : []),
              ...state.combatHistory,
            ].slice(0, 10), // Keep only the last 10 combats
            activeCombat: null,
          }));
        }

        // Stop turn timer
        get().resetTurnTimer();

        set({ isLoading: false });
        return true;
      } catch (error: any) {
        set({
          error: error.message || "Failed to end combat",
          isLoading: false,
        });
        return false;
      }
    },

    rollInitiative: async (
      combatId: string,
      entityId: string,
      entityType: "character" | "npc",
      advantage: boolean = false,
      disadvantage: boolean = false
    ) => {
      set({ isLoading: true, error: null });
      try {
        // If there's a pending initiative for this entity, use that
        const pendingValue = get().pendingInitiative[entityId];

        const success = await combatAPI.rollInitiative(
          combatId,
          entityId,
          entityType,
          pendingValue
        );

        if (success) {
          // Remove from pending initiatives
          set((state) => {
            const newPending = { ...state.pendingInitiative };
            delete newPending[entityId];
            return { pendingInitiative: newPending };
          });

          // Refresh combat data
          await get().fetchCombat(combatId);
        }

        set({ isLoading: false });
        return success;
      } catch (error: any) {
        set({
          error: error.message || "Failed to roll initiative",
          isLoading: false,
        });
        return false;
      }
    },

    updateInitiativePending: (entityId: string, initiative: number) => {
      set((state) => ({
        pendingInitiative: {
          ...state.pendingInitiative,
          [entityId]: initiative,
        },
      }));
    },

    submitAllPendingInitiatives: async (combatId: string) => {
      const { pendingInitiative } = get();
      let allSuccess = true;

      set({ isLoading: true, error: null });

      for (const [entityId, initiative] of Object.entries(pendingInitiative)) {
        try {
          // Determine entity type - in a real app, you'd have a more reliable way to do this
          // Assuming character IDs and NPC IDs have different formats or you have a lookup
          const entityType = entityId.startsWith("character-")
            ? "character"
            : "npc";

          const success = await combatAPI.rollInitiative(
            combatId,
            entityId,
            entityType as "character" | "npc",
            initiative
          );

          if (!success) {
            allSuccess = false;
          }
        } catch (error) {
          allSuccess = false;
        }
      }

      // Clear all pending initiatives
      set({ pendingInitiative: {}, isLoading: false });

      // Refresh combat data
      await get().fetchCombat(combatId);

      return allSuccess;
    },

    nextTurn: async (combatId: string) => {
      set({ isLoading: true, error: null });
      try {
        const success = await combatAPI.nextTurn(combatId);

        if (success) {
          // Refresh combat data
          await get().fetchCombat(combatId);

          // Reset turn timer
          get().resetTurnTimer();
          get().startTurnTimer(60); // Default 60 seconds per turn
        }

        set({ isLoading: false });
        return success;
      } catch (error: any) {
        set({
          error: error.message || "Failed to advance turn",
          isLoading: false,
        });
        return false;
      }
    },

    addCondition: async (
      combatId: string,
      targetId: string,
      targetType: "character" | "npc",
      condition: string,
      duration: { type: "rounds" | "minutes" | "hours"; value: number },
      notes?: string
    ) => {
      set({ isLoading: true, error: null });
      try {
        const conditionData = {
          target_id: targetId,
          target_type: targetType,
          condition,
          duration,
          notes,
        };

        const success = await combatAPI.addCondition(combatId, conditionData);

        if (success) {
          // Refresh combat data
          await get().fetchCombat(combatId);
        }

        set({ isLoading: false });
        return success;
      } catch (error: any) {
        set({
          error: error.message || "Failed to add condition",
          isLoading: false,
        });
        return false;
      }
    },

    removeCondition: async (combatId: string, conditionId: string) => {
      set({ isLoading: true, error: null });
      try {
        const success = await combatAPI.removeCondition(combatId, conditionId);

        if (success) {
          // Refresh combat data
          await get().fetchCombat(combatId);
        }

        set({ isLoading: false });
        return success;
      } catch (error: any) {
        set({
          error: error.message || "Failed to remove condition",
          isLoading: false,
        });
        return false;
      }
    },

    registerAction: async (
      combatId: string,
      actionType:
        | "attack"
        | "cast"
        | "dash"
        | "disengage"
        | "dodge"
        | "help"
        | "hide"
        | "ready"
        | "use"
        | "other",
      description: string,
      targetId?: string,
      targetType?: "character" | "npc"
    ) => {
      set({ isLoading: true, error: null });
      try {
        const actionData = {
          action_type: actionType,
          description,
          target_id: targetId,
          target_type: targetType,
        };

        const success = await combatAPI.registerAction(combatId, actionData);

        if (success) {
          // Refresh combat data
          await get().fetchCombat(combatId);
        }

        set({ isLoading: false });
        return true;
      } catch (error: any) {
        set({
          error: error.message || "Failed to register action",
          isLoading: false,
        });
        return false;
      }
    },

    // Turn timer functions
    startTurnTimer: (seconds: number) => {
      // Clear any existing timer
      get().resetTurnTimer();

      // Set initial timer value
      set({ turnTimer: seconds, turnTimerActive: true });

      // Start countdown interval
      const intervalId = setInterval(() => {
        const current = get().turnTimer;

        if (current === null || !get().turnTimerActive) {
          clearInterval(intervalId);
          return;
        }

        if (current <= 1) {
          set({ turnTimer: 0 });
          clearInterval(intervalId);
          // Optionally add a notification or auto-advance the turn here
        } else {
          set({ turnTimer: current - 1 });
        }
      }, 1000);

      // Store interval ID on window for cleanup
      // @ts-ignore
      window.__combatTimerId = intervalId;
    },

    pauseTurnTimer: () => {
      set({ turnTimerActive: false });
    },

    resetTurnTimer: () => {
      set({ turnTimer: null, turnTimerActive: false });

      // Clear interval if it exists
      // @ts-ignore
      if (window.__combatTimerId) {
        // @ts-ignore
        clearInterval(window.__combatTimerId);
        // @ts-ignore
        delete window.__combatTimerId;
      }
    },

    // Helper functions
    getCurrentEntity: () => {
      const { activeCombat } = get();

      if (!activeCombat || activeCombat.initiative_order.length === 0) {
        return null;
      }

      const currentTurn = activeCombat.current_turn;
      const entity = activeCombat.initiative_order[currentTurn];

      return {
        id: entity.id,
        type: entity.type,
      };
    },

    getEntityById: (entityId: string, entityType: "character" | "npc") => {
      // Retrieve entity data - could connect to characterStore and npcStore
      // This is a simplified implementation
      return null;
    },

    isPlayerTurn: (userId: string) => {
      const { activeCombat } = get();
      if (!activeCombat) return false;

      const currentTurn = activeCombat.current_turn;
      if (currentTurn >= activeCombat.initiative_order.length) return false;

      const currentEntity = activeCombat.initiative_order[currentTurn];
      if (currentEntity.type !== "character") return false;

      // In a real app, you'd have access to full character data
      // and would check if currentEntity.id matches a character owned by userId
      return false;
    },

    canControl: (
      entityId: string,
      entityType: "character" | "npc",
      userId: string,
      isDM: boolean
    ) => {
      // DMs can control anything
      if (isDM) return true;

      // Players can only control their own characters
      if (entityType === "character") {
        // In a real app, you'd check if the character belongs to this user
        // Hard-coded example return for demo purposes
        return true;
      }

      // Players cannot control NPCs
      return false;
    },

    // Reset state
    resetState: () => {
      // Reset state except for combatHistory
      get().resetTurnTimer();
      set({
        activeCombat: null,
        pendingInitiative: {},
        isLoading: false,
        error: null,
      });
    },
  }))
);

export default useCombatStore;
