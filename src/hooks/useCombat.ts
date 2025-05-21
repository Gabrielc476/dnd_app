// hooks/useCombat.ts
import { useState, useEffect, useCallback } from "react";
import { combatAPI } from "@/lib/api";
import { useCombatSocket } from "@/lib/socket";
import { Combat, ConditionEffect } from "@/lib/types";

export interface UseCombatProps {
  campaignId: string;
  userId: string;
  combatId?: string;
}

export interface UseCombatReturn {
  combat: Combat | null;
  isLoading: boolean;
  error: string | null;
  connected: boolean;
  fetchCombat: (id: string) => Promise<Combat | null>;
  fetchActiveCombat: () => Promise<Combat | null>;
  createCombat: (encounterId?: string) => Promise<Combat | null>;
  endCombat: (id: string) => Promise<Combat | null>;
  updateCombat: (id: string, updates: any) => Promise<Combat | null>;
  rollInitiative: (
    entityId: string,
    entityType: "character" | "npc",
    initiativeValue?: number
  ) => Promise<boolean>;
  nextTurn: () => Promise<boolean>;
  addCondition: (
    targetId: string,
    targetType: "character" | "npc",
    condition: string,
    duration: { type: "rounds" | "minutes" | "hours"; value: number }
  ) => Promise<boolean>;
  removeCondition: (conditionId: string) => Promise<boolean>;
  registerAction: (actionData: any) => Promise<Combat | null>;
}

/**
 * Hook for combat management with WebSocket and API integration
 */
export function useCombat({
  campaignId,
  userId,
  combatId,
}: UseCombatProps): UseCombatReturn {
  const [combat, setCombat] = useState<Combat | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // WebSocket connection for combat events
  const {
    connected,
    error: socketError,
    startCombat: startCombatSocket,
    rollInitiative: rollInitiativeSocket,
    nextTurn: nextTurnSocket,
    endCombat: endCombatSocket,
    addCondition: addConditionSocket,
    removeCondition: removeConditionSocket,
  } = useCombatSocket(campaignId, userId, combatId);

  // Load combat data if combatId is provided
  useEffect(() => {
    if (combatId) {
      fetchCombat(combatId);
    }
  }, [combatId]);

  // Handle socket error
  useEffect(() => {
    if (socketError) {
      setError(`WebSocket error: ${socketError}`);
    }
  }, [socketError]);

  /**
   * Fetch combat by ID
   */
  const fetchCombat = useCallback(
    async (id: string): Promise<Combat | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await combatAPI.getCombat(id);
        setCombat(data);
        setIsLoading(false);
        return data;
      } catch (err: any) {
        setError(err.message || "Failed to fetch combat");
        setIsLoading(false);
        return null;
      }
    },
    []
  );

  /**
   * Fetch active combat for the campaign
   */
  const fetchActiveCombat = useCallback(async (): Promise<Combat | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await combatAPI.getActiveCombat(campaignId);
      setCombat(data);
      setIsLoading(false);
      return data;
    } catch (err: any) {
      // No active combat is not really an error
      if (err.message && err.message.includes("404")) {
        setCombat(null);
        setIsLoading(false);
        return null;
      }

      setError(err.message || "Failed to fetch active combat");
      setIsLoading(false);
      return null;
    }
  }, [campaignId]);

  /**
   * Create new combat - tries WebSocket first, falls back to API
   */
  const createCombat = useCallback(
    async (encounterId?: string): Promise<Combat | null> => {
      setIsLoading(true);
      setError(null);
      try {
        // Try WebSocket if connected
        if (connected) {
          const success = startCombatSocket(encounterId);
          if (success) {
            // Fetch the newly created combat after a delay to allow server processing
            setTimeout(async () => {
              await fetchActiveCombat();
              setIsLoading(false);
            }, 500);
            return null; // Will be updated by fetchActiveCombat
          }
        }

        // Fallback to API
        const data = await combatAPI.createCombat({
          campaign_id: campaignId,
          encounter_id: encounterId,
        });
        setCombat(data);
        setIsLoading(false);
        return data;
      } catch (err: any) {
        setError(err.message || "Failed to create combat");
        setIsLoading(false);
        return null;
      }
    },
    [campaignId, connected, startCombatSocket, fetchActiveCombat]
  );

  /**
   * End combat - tries WebSocket first, falls back to API
   */
  const endCombat = useCallback(
    async (id: string): Promise<Combat | null> => {
      setIsLoading(true);
      setError(null);
      try {
        // Try WebSocket if connected
        if (connected && id === combatId) {
          const success = endCombatSocket();
          if (success) {
            // Clear combat data after a delay
            setTimeout(() => {
              setCombat(null);
              setIsLoading(false);
            }, 500);
            return null;
          }
        }

        // Fallback to API
        const data = await combatAPI.endCombat(id);
        setCombat(null);
        setIsLoading(false);
        return data;
      } catch (err: any) {
        setError(err.message || "Failed to end combat");
        setIsLoading(false);
        return null;
      }
    },
    [connected, combatId, endCombatSocket]
  );

  /**
   * Update combat
   */
  const updateCombat = useCallback(
    async (id: string, updates: any): Promise<Combat | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await combatAPI.updateCombat(id, updates);
        setCombat(data);
        setIsLoading(false);
        return data;
      } catch (err: any) {
        setError(err.message || "Failed to update combat");
        setIsLoading(false);
        return null;
      }
    },
    []
  );

  /**
   * Roll initiative - tries WebSocket first, falls back to API
   */
  const rollInitiative = useCallback(
    async (
      entityId: string,
      entityType: "character" | "npc",
      initiativeValue?: number
    ): Promise<boolean> => {
      setError(null);
      try {
        // Try WebSocket if connected
        if (connected) {
          const success = rollInitiativeSocket(
            entityId,
            entityType,
            initiativeValue
          );
          if (success) {
            // Refresh combat data after a delay
            setTimeout(() => fetchActiveCombat(), 500);
            return true;
          }
        }

        // Fallback to API
        if (!combatId) {
          setError("No active combat");
          return false;
        }

        await combatAPI.rollInitiative(
          combatId,
          entityId,
          entityType,
          initiativeValue
        );
        // Refresh combat data
        await fetchCombat(combatId);
        return true;
      } catch (err: any) {
        setError(err.message || "Failed to roll initiative");
        return false;
      }
    },
    [connected, rollInitiativeSocket, fetchActiveCombat, combatId, fetchCombat]
  );

  /**
   * Next turn - tries WebSocket first, falls back to API
   */
  const nextTurn = useCallback(async (): Promise<boolean> => {
    setError(null);
    try {
      // Try WebSocket if connected
      if (connected) {
        const success = nextTurnSocket();
        if (success) {
          // Refresh combat data after a delay
          setTimeout(() => fetchActiveCombat(), 500);
          return true;
        }
      }

      // Fallback to API
      if (!combatId) {
        setError("No active combat");
        return false;
      }

      await combatAPI.nextTurn(combatId);
      // Refresh combat data
      await fetchCombat(combatId);
      return true;
    } catch (err: any) {
      setError(err.message || "Failed to advance turn");
      return false;
    }
  }, [connected, nextTurnSocket, fetchActiveCombat, combatId, fetchCombat]);

  /**
   * Add condition - tries WebSocket first, falls back to API
   */
  const addCondition = useCallback(
    async (
      targetId: string,
      targetType: "character" | "npc",
      condition: string,
      duration: { type: "rounds" | "minutes" | "hours"; value: number }
    ): Promise<boolean> => {
      setError(null);
      try {
        // Try WebSocket if connected
        if (connected) {
          const success = addConditionSocket(
            targetId,
            targetType,
            condition,
            duration
          );
          if (success) {
            // Refresh combat data after a delay
            setTimeout(() => fetchActiveCombat(), 500);
            return true;
          }
        }

        // Fallback to API
        if (!combatId) {
          setError("No active combat");
          return false;
        }

        const conditionData = {
          target_id: targetId,
          target_type: targetType,
          condition,
          duration,
        };

        await combatAPI.addCondition(combatId, conditionData);
        // Refresh combat data
        await fetchCombat(combatId);
        return true;
      } catch (err: any) {
        setError(err.message || "Failed to add condition");
        return false;
      }
    },
    [connected, addConditionSocket, fetchActiveCombat, combatId, fetchCombat]
  );

  /**
   * Remove condition - tries WebSocket first, falls back to API
   */
  const removeCondition = useCallback(
    async (conditionId: string): Promise<boolean> => {
      setError(null);
      try {
        // Try WebSocket if connected
        if (connected) {
          const success = removeConditionSocket(conditionId);
          if (success) {
            // Refresh combat data after a delay
            setTimeout(() => fetchActiveCombat(), 500);
            return true;
          }
        }

        // Fallback to API
        if (!combatId) {
          setError("No active combat");
          return false;
        }

        await combatAPI.removeCondition(combatId, conditionId);
        // Refresh combat data
        await fetchCombat(combatId);
        return true;
      } catch (err: any) {
        setError(err.message || "Failed to remove condition");
        return false;
      }
    },
    [connected, removeConditionSocket, fetchActiveCombat, combatId, fetchCombat]
  );

  /**
   * Register combat action
   */
  const registerAction = useCallback(
    async (actionData: any): Promise<Combat | null> => {
      setIsLoading(true);
      setError(null);
      try {
        if (!combatId) {
          setError("No active combat");
          setIsLoading(false);
          return null;
        }

        const data = await combatAPI.registerAction(combatId, actionData);
        setCombat(data);
        setIsLoading(false);
        return data;
      } catch (err: any) {
        setError(err.message || "Failed to register action");
        setIsLoading(false);
        return null;
      }
    },
    [combatId]
  );

  return {
    combat,
    isLoading,
    error,
    connected,
    fetchCombat,
    fetchActiveCombat,
    createCombat,
    endCombat,
    updateCombat,
    rollInitiative,
    nextTurn,
    addCondition,
    removeCondition,
    registerAction,
  };
}

export default useCombat;
