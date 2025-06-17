/**
 * useCombat Hook - COMPLETAMENTE REFATORADO
 * Problemas resolvidos:
 * 1. ✅ Todas as funções completadas (estavam cortadas)
 * 2. ✅ Proper integration com store
 * 3. ✅ WebSocket integration
 * 4. ✅ Error handling adequado
 * 5. ✅ Combat state management
 * 6. ✅ Initiative tracking
 */

import { useState, useEffect, useCallback } from "react";
import { combatAPI } from "@/lib/api";
import { useCombatSocket } from "@/lib/socket";
import { useCombatStore } from "@/stores/combatStore";
import { Combat, CombatParticipant, ConditionEffect } from "@/lib/types";

// ===== TYPES =====
export interface UseCombatProps {
  campaignId: string;
  userId: string;
  combatId?: string;
}

export interface UseCombatReturn {
  // Data
  combat: Combat | null;
  participants: CombatParticipant[];
  currentParticipant: CombatParticipant | null;
  round: number;
  turn: number;

  // State
  isLoading: boolean;
  error: string | null;
  connected: boolean;
  isActive: boolean;

  // Combat Management
  fetchCombat: (id: string) => Promise<Combat | null>;
  fetchActiveCombat: () => Promise<Combat | null>;
  createCombat: (encounterId?: string) => Promise<Combat | null>;
  endCombat: (id: string) => Promise<boolean>;
  updateCombat: (id: string, updates: Partial<Combat>) => Promise<boolean>;

  // Initiative Management
  rollInitiative: (
    entityId: string,
    entityType: "character" | "npc",
    initiativeValue?: number
  ) => Promise<boolean>;
  setInitiative: (
    entityId: string,
    initiativeValue: number
  ) => Promise<boolean>;
  sortInitiative: () => Promise<boolean>;

  // Turn Management
  nextTurn: () => Promise<boolean>;
  previousTurn: () => Promise<boolean>;
  goToTurn: (participantId: string) => Promise<boolean>;
  nextRound: () => Promise<boolean>;

  // Participant Management
  addParticipant: (
    entityId: string,
    entityType: "character" | "npc",
    initiativeValue?: number
  ) => Promise<boolean>;
  removeParticipant: (participantId: string) => Promise<boolean>;
  updateParticipant: (
    participantId: string,
    updates: Partial<CombatParticipant>
  ) => Promise<boolean>;

  // HP Management
  updateParticipantHP: (
    participantId: string,
    hpChange: number,
    isTemp?: boolean
  ) => Promise<boolean>;
  setParticipantHP: (
    participantId: string,
    currentHP: number,
    maxHP?: number
  ) => Promise<boolean>;

  // Condition Management
  addCondition: (
    participantId: string,
    condition: ConditionEffect
  ) => Promise<boolean>;
  removeCondition: (
    participantId: string,
    conditionId: string
  ) => Promise<boolean>;
  updateCondition: (
    participantId: string,
    conditionId: string,
    updates: Partial<ConditionEffect>
  ) => Promise<boolean>;

  // Action Management
  addAction: (
    participantId: string,
    action: string,
    description?: string
  ) => Promise<boolean>;

  // Utility
  getParticipantById: (participantId: string) => CombatParticipant | null;
  getParticipantByEntityId: (entityId: string) => CombatParticipant | null;
  isCurrentTurn: (participantId: string) => boolean;
  getTurnOrder: () => CombatParticipant[];

  // WebSocket Events
  combatEvents: any[];
  clearEvents: () => void;
}

// ===== HOOK IMPLEMENTATION =====
export function useCombat({
  campaignId,
  userId,
  combatId,
}: UseCombatProps): UseCombatReturn {
  // Local state for events
  const [combatEvents, setCombatEvents] = useState<any[]>([]);

  // Store integration
  const {
    activeCombat,
    participants,
    currentParticipant,
    round,
    turn,
    isLoading,
    error,
    fetchActiveCombat: storeFetchActiveCombat,
    createCombat: storeCreateCombat,
    endCombat: storeEndCombat,
    updateCombat: storeUpdateCombat,
    rollInitiative: storeRollInitiative,
    setInitiative: storeSetInitiative,
    sortInitiative: storeSortInitiative,
    nextTurn: storeNextTurn,
    previousTurn: storePreviousTurn,
    goToTurn: storeGoToTurn,
    nextRound: storeNextRound,
    addParticipant: storeAddParticipant,
    removeParticipant: storeRemoveParticipant,
    updateParticipant: storeUpdateParticipant,
    updateParticipantHP: storeUpdateParticipantHP,
    setParticipantHP: storeSetParticipantHP,
    addCondition: storeAddCondition,
    removeCondition: storeRemoveCondition,
    updateCondition: storeUpdateCondition,
    addAction: storeAddAction,
    getParticipantById: storeGetParticipantById,
    getParticipantByEntityId: storeGetParticipantByEntityId,
    isCurrentTurn: storeIsCurrentTurn,
    getTurnOrder: storeGetTurnOrder,
  } = useCombatStore();

  // WebSocket integration
  const {
    connected,
    combatEvents: socketEvents,
    startCombat: socketStartCombat,
    endCombat: socketEndCombat,
    rollInitiative: socketRollInitiative,
    nextTurn: socketNextTurn,
  } = useCombatSocket(campaignId, userId, combatId);

  // Merge socket events with local events
  useEffect(() => {
    if (socketEvents.length > 0) {
      setCombatEvents((prev) => [...prev, ...socketEvents]);
    }
  }, [socketEvents]);

  // ===== COMBAT MANAGEMENT =====
  const fetchCombat = useCallback(
    async (id: string): Promise<Combat | null> => {
      try {
        const combat = await combatAPI.getActiveCombat(campaignId);
        return combat;
      } catch (error) {
        console.error("Failed to fetch combat:", error);
        return null;
      }
    },
    [campaignId]
  );

  const fetchActiveCombat = useCallback(async (): Promise<Combat | null> => {
    return storeFetchActiveCombat(campaignId);
  }, [storeFetchActiveCombat, campaignId]);

  const createCombat = useCallback(
    async (encounterId?: string): Promise<Combat | null> => {
      // Try WebSocket first for real-time updates
      if (connected) {
        const success = socketStartCombat(encounterId);
        if (success) {
          // WebSocket will handle the state update
          return activeCombat;
        }
      }

      // Fallback to API
      return storeCreateCombat(campaignId, encounterId);
    },
    [connected, socketStartCombat, storeCreateCombat, campaignId, activeCombat]
  );

  const endCombat = useCallback(
    async (id: string): Promise<boolean> => {
      // Try WebSocket first for real-time updates
      if (connected) {
        const success = socketEndCombat(id);
        if (success) {
          return true;
        }
      }

      // Fallback to API
      return storeEndCombat(id);
    },
    [connected, socketEndCombat, storeEndCombat]
  );

  const updateCombat = useCallback(
    async (id: string, updates: Partial<Combat>): Promise<boolean> => {
      return storeUpdateCombat(id, updates);
    },
    [storeUpdateCombat]
  );

  // ===== INITIATIVE MANAGEMENT =====
  const rollInitiative = useCallback(
    async (
      entityId: string,
      entityType: "character" | "npc",
      initiativeValue?: number
    ): Promise<boolean> => {
      if (!activeCombat) {
        throw new Error("No active combat");
      }

      // Try WebSocket first for real-time updates
      if (connected) {
        const success = socketRollInitiative(
          activeCombat._id,
          entityId,
          entityType,
          initiativeValue
        );
        if (success) {
          return true;
        }
      }

      // Fallback to API
      return storeRollInitiative(
        activeCombat._id,
        entityId,
        entityType,
        initiativeValue
      );
    },
    [activeCombat, connected, socketRollInitiative, storeRollInitiative]
  );

  const setInitiative = useCallback(
    async (entityId: string, initiativeValue: number): Promise<boolean> => {
      if (!activeCombat) {
        throw new Error("No active combat");
      }

      return storeSetInitiative(activeCombat._id, entityId, initiativeValue);
    },
    [activeCombat, storeSetInitiative]
  );

  const sortInitiative = useCallback(async (): Promise<boolean> => {
    if (!activeCombat) {
      throw new Error("No active combat");
    }

    return storeSortInitiative(activeCombat._id);
  }, [activeCombat, storeSortInitiative]);

  // ===== TURN MANAGEMENT =====
  const nextTurn = useCallback(async (): Promise<boolean> => {
    if (!activeCombat) {
      throw new Error("No active combat");
    }

    // Try WebSocket first for real-time updates
    if (connected) {
      const success = socketNextTurn(activeCombat._id);
      if (success) {
        return true;
      }
    }

    // Fallback to API
    return storeNextTurn(activeCombat._id);
  }, [activeCombat, connected, socketNextTurn, storeNextTurn]);

  const previousTurn = useCallback(async (): Promise<boolean> => {
    if (!activeCombat) {
      throw new Error("No active combat");
    }

    return storePreviousTurn(activeCombat._id);
  }, [activeCombat, storePreviousTurn]);

  const goToTurn = useCallback(
    async (participantId: string): Promise<boolean> => {
      if (!activeCombat) {
        throw new Error("No active combat");
      }

      return storeGoToTurn(activeCombat._id, participantId);
    },
    [activeCombat, storeGoToTurn]
  );

  const nextRound = useCallback(async (): Promise<boolean> => {
    if (!activeCombat) {
      throw new Error("No active combat");
    }

    return storeNextRound(activeCombat._id);
  }, [activeCombat, storeNextRound]);

  // ===== PARTICIPANT MANAGEMENT =====
  const addParticipant = useCallback(
    async (
      entityId: string,
      entityType: "character" | "npc",
      initiativeValue?: number
    ): Promise<boolean> => {
      if (!activeCombat) {
        throw new Error("No active combat");
      }

      return storeAddParticipant(
        activeCombat._id,
        entityId,
        entityType,
        initiativeValue
      );
    },
    [activeCombat, storeAddParticipant]
  );

  const removeParticipant = useCallback(
    async (participantId: string): Promise<boolean> => {
      if (!activeCombat) {
        throw new Error("No active combat");
      }

      return storeRemoveParticipant(activeCombat._id, participantId);
    },
    [activeCombat, storeRemoveParticipant]
  );

  const updateParticipant = useCallback(
    async (
      participantId: string,
      updates: Partial<CombatParticipant>
    ): Promise<boolean> => {
      if (!activeCombat) {
        throw new Error("No active combat");
      }

      return storeUpdateParticipant(activeCombat._id, participantId, updates);
    },
    [activeCombat, storeUpdateParticipant]
  );

  // ===== HP MANAGEMENT =====
  const updateParticipantHP = useCallback(
    async (
      participantId: string,
      hpChange: number,
      isTemp?: boolean
    ): Promise<boolean> => {
      if (!activeCombat) {
        throw new Error("No active combat");
      }

      return storeUpdateParticipantHP(
        activeCombat._id,
        participantId,
        hpChange,
        isTemp
      );
    },
    [activeCombat, storeUpdateParticipantHP]
  );

  const setParticipantHP = useCallback(
    async (
      participantId: string,
      currentHP: number,
      maxHP?: number
    ): Promise<boolean> => {
      if (!activeCombat) {
        throw new Error("No active combat");
      }

      return storeSetParticipantHP(
        activeCombat._id,
        participantId,
        currentHP,
        maxHP
      );
    },
    [activeCombat, storeSetParticipantHP]
  );

  // ===== CONDITION MANAGEMENT =====
  const addCondition = useCallback(
    async (
      participantId: string,
      condition: ConditionEffect
    ): Promise<boolean> => {
      if (!activeCombat) {
        throw new Error("No active combat");
      }

      return storeAddCondition(activeCombat._id, participantId, condition);
    },
    [activeCombat, storeAddCondition]
  );

  const removeCondition = useCallback(
    async (participantId: string, conditionId: string): Promise<boolean> => {
      if (!activeCombat) {
        throw new Error("No active combat");
      }

      return storeRemoveCondition(activeCombat._id, participantId, conditionId);
    },
    [activeCombat, storeRemoveCondition]
  );

  const updateCondition = useCallback(
    async (
      participantId: string,
      conditionId: string,
      updates: Partial<ConditionEffect>
    ): Promise<boolean> => {
      if (!activeCombat) {
        throw new Error("No active combat");
      }

      return storeUpdateCondition(
        activeCombat._id,
        participantId,
        conditionId,
        updates
      );
    },
    [activeCombat, storeUpdateCondition]
  );

  // ===== ACTION MANAGEMENT =====
  const addAction = useCallback(
    async (
      participantId: string,
      action: string,
      description?: string
    ): Promise<boolean> => {
      if (!activeCombat) {
        throw new Error("No active combat");
      }

      return storeAddAction(
        activeCombat._id,
        participantId,
        action,
        description
      );
    },
    [activeCombat, storeAddAction]
  );

  // ===== UTILITY FUNCTIONS =====
  const getParticipantById = useCallback(
    (participantId: string): CombatParticipant | null => {
      return storeGetParticipantById(participantId);
    },
    [storeGetParticipantById]
  );

  const getParticipantByEntityId = useCallback(
    (entityId: string): CombatParticipant | null => {
      return storeGetParticipantByEntityId(entityId);
    },
    [storeGetParticipantByEntityId]
  );

  const isCurrentTurn = useCallback(
    (participantId: string): boolean => {
      return storeIsCurrentTurn(participantId);
    },
    [storeIsCurrentTurn]
  );

  const getTurnOrder = useCallback((): CombatParticipant[] => {
    return storeGetTurnOrder();
  }, [storeGetTurnOrder]);

  const clearEvents = useCallback(() => {
    setCombatEvents([]);
  }, []);

  // Load active combat on mount or campaign change
  useEffect(() => {
    if (campaignId) {
      fetchActiveCombat();
    }
  }, [campaignId, fetchActiveCombat]);

  // Load specific combat if provided
  useEffect(() => {
    if (combatId) {
      fetchCombat(combatId);
    }
  }, [combatId, fetchCombat]);

  return {
    // Data
    combat: activeCombat,
    participants,
    currentParticipant,
    round,
    turn,

    // State
    isLoading,
    error,
    connected,
    isActive: !!activeCombat,

    // Combat Management
    fetchCombat,
    fetchActiveCombat,
    createCombat,
    endCombat,
    updateCombat,

    // Initiative Management
    rollInitiative,
    setInitiative,
    sortInitiative,

    // Turn Management
    nextTurn,
    previousTurn,
    goToTurn,
    nextRound,

    // Participant Management
    addParticipant,
    removeParticipant,
    updateParticipant,

    // HP Management
    updateParticipantHP,
    setParticipantHP,

    // Condition Management
    addCondition,
    removeCondition,
    updateCondition,

    // Action Management
    addAction,

    // Utility
    getParticipantById,
    getParticipantByEntityId,
    isCurrentTurn,
    getTurnOrder,

    // WebSocket Events
    combatEvents,
    clearEvents,
  };
}

export default useCombat;
