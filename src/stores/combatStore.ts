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
import { formatModifier } from "@/lib/utils";
import { useGameStore } from "./gameStore";
import { useCharacterStore } from "./characterStore";
import { useNPCStore } from "./npcStore";

interface CombatState {
  // State
  activeCombat: Combat | null;
  combatHistory: Combat[];
  pendingInitiative: Record<string, number>; // entityId -> initiative value
  isLoading: boolean;
  error: string | null;
  turnTimer: number | null; // seconds remaining for current turn
  turnTimerActive: boolean;
  timerIntervalId: number | null;

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
  resumeTurnTimer: () => void;
  resetTurnTimer: () => void;

  // Helper functions
  getCurrentEntity: () => {
    id: string;
    type: "character" | "npc";
    name: string;
  } | null;
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
  getActiveConditions: (
    entityId: string,
    entityType: "character" | "npc"
  ) => ConditionEffect[];
  getInitiativeModifier: (
    entityId: string,
    entityType: "character" | "npc"
  ) => number;

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
    timerIntervalId: null,

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
      } catch (err: any) {
        // If 404, it means there's no active combat
        if (err.message && err.message.includes("404")) {
          set({ activeCombat: null, isLoading: false });
          return null;
        }

        set({
          error: err.message || "Failed to fetch active combat",
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
        const currentActiveCombat = get().activeCombat;
        if (currentActiveCombat && currentActiveCombat._id === combatId) {
          set({ activeCombat: combat });
        }

        set({ isLoading: false });
        return combat;
      } catch (err: any) {
        set({
          error: err.message || "Failed to fetch combat",
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

        // Notify via Game Store
        const gameStore = useGameStore.getState();
        gameStore.addNotification("success", "Combat started");

        return combat;
      } catch (err: any) {
        set({
          error: err.message || "Failed to start combat",
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
        const currentActiveCombat = get().activeCombat;
        if (currentActiveCombat && currentActiveCombat._id === combatId) {
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

        // Notify via Game Store
        const gameStore = useGameStore.getState();
        gameStore.addNotification("info", "Combat ended");

        set({ isLoading: false });
        return true;
      } catch (err: any) {
        set({
          error: err.message || "Failed to end combat",
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

        // If no pending value, calculate initiative based on entity stats
        let initiativeValue = pendingValue;
        if (initiativeValue === undefined) {
          const modifier = get().getInitiativeModifier(entityId, entityType);

          // Roll initiative with appropriate advantage/disadvantage
          const roll1 = Math.floor(Math.random() * 20) + 1;
          const roll2 = Math.floor(Math.random() * 20) + 1;

          if (advantage && !disadvantage) {
            initiativeValue = Math.max(roll1, roll2) + modifier;
          } else if (disadvantage && !advantage) {
            initiativeValue = Math.min(roll1, roll2) + modifier;
          } else {
            initiativeValue = roll1 + modifier;
          }
        }

        const success = await combatAPI.rollInitiative(
          combatId,
          entityId,
          entityType,
          initiativeValue
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

          // Notify via Game Store
          const gameStore = useGameStore.getState();
          const entityName =
            get().getEntityById(entityId, entityType)?.name || entityId;
          gameStore.addNotification(
            "info",
            `Initiative rolled for ${entityName}: ${initiativeValue}`
          );
        }

        set({ isLoading: false });
        return success;
      } catch (err: any) {
        set({
          error: err.message || "Failed to roll initiative",
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

      // Create array of promises to execute in parallel
      const promises = Object.entries(pendingInitiative).map(
        async ([entityId, initiative]) => {
          try {
            // Determine entity type from the store or via API call
            const characterStore = useCharacterStore.getState();
            const characters = characterStore.characters;
            const character = characters.find((c) => c._id === entityId);

            const entityType = character ? "character" : "npc";

            return await combatAPI.rollInitiative(
              combatId,
              entityId,
              entityType as "character" | "npc",
              initiative
            );
          } catch (_) {
            return false;
          }
        }
      );

      // Execute all initiative submissions in parallel
      const results = await Promise.all(promises);
      allSuccess = results.every((result) => result === true);

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

          // Get current entity for notification
          const currentEntity = get().getCurrentEntity();

          // Notify via Game Store
          const gameStore = useGameStore.getState();
          if (currentEntity) {
            gameStore.addNotification(
              "info",
              `New turn: ${currentEntity.name}`
            );
          } else {
            gameStore.addNotification("info", "Next turn");
          }
        }

        set({ isLoading: false });
        return success;
      } catch (err: any) {
        set({
          error: err.message || "Failed to advance turn",
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

          // Get entity name for notification
          const entity = get().getEntityById(targetId, targetType);
          const entityName = entity?.name || targetId;

          // Notify via Game Store
          const gameStore = useGameStore.getState();
          gameStore.addNotification(
            "info",
            `Condition ${condition} applied to ${entityName}`
          );
        }

        set({ isLoading: false });
        return success;
      } catch (err: any) {
        set({
          error: err.message || "Failed to add condition",
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

          // Notify via Game Store
          const gameStore = useGameStore.getState();
          gameStore.addNotification("info", "Condition removed");
        }

        set({ isLoading: false });
        return success;
      } catch (err: any) {
        set({
          error: err.message || "Failed to remove condition",
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

        const combat = await combatAPI.registerAction(combatId, actionData);

        if (combat) {
          // Update combat data directly
          set({ activeCombat: combat, isLoading: false });

          // Get current entity for notification
          const currentEntity = get().getCurrentEntity();

          // Notify via Game Store
          const gameStore = useGameStore.getState();
          if (currentEntity) {
            gameStore.addNotification(
              "info",
              `${currentEntity.name} ${actionType}s`
            );
          }

          return true;
        }

        set({ isLoading: false });
        return false;
      } catch (err: any) {
        set({
          error: err.message || "Failed to register action",
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
      const intervalId = window.setInterval(() => {
        const current = get().turnTimer;

        if (current === null || !get().turnTimerActive) {
          window.clearInterval(intervalId);
          return;
        }

        if (current <= 1) {
          set({ turnTimer: 0, turnTimerActive: false });
          window.clearInterval(intervalId);

          // Notify about timer expiration
          const gameStore = useGameStore.getState();
          gameStore.addNotification("warning", "Turn timer expired!");

          // Optionally auto-advance turn here
          // const { activeCombat } = get();
          // if (activeCombat) {
          //   get().nextTurn(activeCombat._id);
          // }
        } else {
          set({ turnTimer: current - 1 });
        }
      }, 1000);

      // Store interval ID
      set({ timerIntervalId: intervalId });
    },

    pauseTurnTimer: () => {
      set({ turnTimerActive: false });
    },

    resumeTurnTimer: () => {
      set({ turnTimerActive: true });
    },

    resetTurnTimer: () => {
      set((state) => {
        if (state.timerIntervalId !== null) {
          window.clearInterval(state.timerIntervalId);
        }
        return {
          turnTimer: null,
          turnTimerActive: false,
          timerIntervalId: null,
        };
      });
    },

    // Helper functions
    getCurrentEntity: () => {
      const { activeCombat } = get();

      if (!activeCombat || activeCombat.initiative_order.length === 0) {
        return null;
      }

      const currentTurn = activeCombat.current_turn;
      if (currentTurn >= activeCombat.initiative_order.length) {
        return null;
      }

      const entity = activeCombat.initiative_order[currentTurn];

      return {
        id: entity.id,
        type: entity.type,
        name:
          entity.name ||
          get().getEntityById(entity.id, entity.type)?.name ||
          entity.id,
      };
    },

    getEntityById: (entityId: string, entityType: "character" | "npc") => {
      if (entityType === "character") {
        // Get character from character store
        const characterStore = useCharacterStore.getState();
        const character =
          characterStore.currentCharacter &&
          characterStore.currentCharacter._id === entityId
            ? characterStore.currentCharacter
            : characterStore.characters.find((c) => c._id === entityId);

        if (!character && !characterStore.isLoading) {
          // Try to fetch the character if not in store
          characterStore.fetchCharacter(entityId);
        }

        return character || null;
      } else {
        // Get NPC from NPC store
        const npcStore = useNPCStore.getState();
        const npc =
          npcStore.npc && npcStore.npc._id === entityId
            ? npcStore.npc
            : npcStore.npcs.find((n) => n._id === entityId);

        if (!npc && !npcStore.isLoading) {
          // Try to fetch the NPC if not in store
          npcStore.fetchNPC(entityId);
        }

        return npc || null;
      }
    },

    isPlayerTurn: (userId: string) => {
      const { activeCombat } = get();
      if (!activeCombat || !activeCombat.initiative_order.length) return false;

      const currentTurn = activeCombat.current_turn;
      if (currentTurn >= activeCombat.initiative_order.length) return false;

      const currentEntity = activeCombat.initiative_order[currentTurn];
      if (currentEntity.type !== "character") return false;

      // Get character from character store
      const characterStore = useCharacterStore.getState();
      const characters = characterStore.characters;
      const character = characters.find((c) => c._id === currentEntity.id);

      // Check if the character belongs to this user
      return character ? character.owner_id === userId : false;
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
        const characterStore = useCharacterStore.getState();
        const characters = characterStore.characters;
        const character = characters.find((c) => c._id === entityId);

        // Check if character belongs to user
        return character ? character.owner_id === userId : false;
      }

      // Players cannot control NPCs
      return false;
    },

    getActiveConditions: (
      entityId: string,
      entityType: "character" | "npc"
    ) => {
      const { activeCombat } = get();
      if (!activeCombat || !activeCombat.conditions) return [];

      return activeCombat.conditions.filter(
        (condition) =>
          condition.target_id === entityId &&
          condition.target_type === entityType
      );
    },

    getInitiativeModifier: (
      entityId: string,
      entityType: "character" | "npc"
    ) => {
      // Get entity from store
      const entity = get().getEntityById(entityId, entityType);
      if (!entity) return 0;

      if (entityType === "character") {
        const character = entity as Character;
        // Use initiative bonus if defined, otherwise use Dexterity modifier
        const dexMod = character.attributes
          ? Math.floor((character.attributes.dexterity - 10) / 2)
          : 0;
        return character.initiative_bonus || dexMod;
      } else {
        const npc = entity as NPC;
        // NPCs use Dexterity modifier for initiative
        const dexMod = npc.stats?.attributes
          ? Math.floor((npc.stats.attributes.dexterity - 10) / 2)
          : 0;
        return dexMod;
      }
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
