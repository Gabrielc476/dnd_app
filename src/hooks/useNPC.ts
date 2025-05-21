// hooks/useNPC.ts
import { useState, useEffect, useCallback } from "react";
import { npcsAPI } from "@/lib/api";
import { useWebSocketWithLocks } from "@/lib/socket";
import { NPC, NPCListItem } from "@/lib/types";

export interface UseNPCProps {
  campaignId: string;
  userId: string;
  npcId?: string;
}

export interface UseNPCReturn {
  npc: NPC | null;
  npcs: NPCListItem[];
  isLoading: boolean;
  error: string | null;
  connected: boolean;
  fetchNPC: (id: string) => Promise<NPC | null>;
  fetchNPCs: () => Promise<NPCListItem[]>;
  createNPC: (npcData: any) => Promise<NPC | null>;
  updateNPC: (id: string, updates: any) => Promise<NPC | null>;
  deleteNPC: (id: string) => Promise<boolean>;
  updateHP: (id: string, hpChange: number) => Promise<NPC | null>;
  importFromCompendium: (
    monsterId: string,
    nameOverride?: string
  ) => Promise<NPC | null>;
  bulkImport: (npcsData: any) => Promise<NPC[] | null>;
  isLocked: (npcId: string) => boolean;
  acquireLock: (npcId: string) => Promise<boolean>;
  releaseLock: (npcId: string) => void;
  whoLocked: (npcId: string) => string | null;
}

/**
 * Hook for NPC management with WebSocket and API integration
 */
export function useNPC({
  campaignId,
  userId,
  npcId,
}: UseNPCProps): UseNPCReturn {
  const [npc, setNPC] = useState<NPC | null>(null);
  const [npcs, setNPCs] = useState<NPCListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // WebSocket connection for NPC updates
  const {
    connected,
    error: socketError,
    sendMessage,
    acquireLock,
    releaseLock,
    isLocked,
    whoLocked,
  } = useWebSocketWithLocks(campaignId, userId);

  // Load NPC data if npcId is provided
  useEffect(() => {
    if (npcId) {
      fetchNPC(npcId);
    }
  }, [npcId]);

  // Handle socket error
  useEffect(() => {
    if (socketError) {
      setError(`WebSocket error: ${socketError}`);
    }
  }, [socketError]);

  /**
   * Fetch NPC by ID
   */
  const fetchNPC = useCallback(async (id: string): Promise<NPC | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await npcsAPI.getNPC(id);
      setNPC(data);
      setIsLoading(false);
      return data;
    } catch (err: any) {
      setError(err.message || "Failed to fetch NPC");
      setIsLoading(false);
      return null;
    }
  }, []);

  /**
   * Fetch all NPCs for the campaign
   */
  const fetchNPCs = useCallback(async (): Promise<NPCListItem[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await npcsAPI.listCampaignNPCs(campaignId);
      setNPCs(data);
      setIsLoading(false);
      return data;
    } catch (err: any) {
      setError(err.message || "Failed to fetch NPCs");
      setIsLoading(false);
      return [];
    }
  }, [campaignId]);

  /**
   * Create new NPC
   */
  const createNPC = useCallback(
    async (npcData: any): Promise<NPC | null> => {
      setIsLoading(true);
      setError(null);
      try {
        // Ensure campaign_id is set
        const data = await npcsAPI.createNPC({
          ...npcData,
          campaign_id: campaignId,
        });

        // Refresh NPC list
        fetchNPCs();
        setIsLoading(false);
        return data;
      } catch (err: any) {
        setError(err.message || "Failed to create NPC");
        setIsLoading(false);
        return null;
      }
    },
    [campaignId, fetchNPCs]
  );

  /**
   * Update NPC - tries WebSocket first if available, falls back to API
   */
  const updateNPC = useCallback(
    async (id: string, updates: any): Promise<NPC | null> => {
      setIsLoading(true);
      setError(null);
      try {
        // Try to acquire lock for WebSocket update
        if (connected) {
          const lockAcquired = await acquireLock(id, "npc");

          if (lockAcquired) {
            // Send update via WebSocket
            const success = sendMessage("npc", {
              type: "npc",
              action: "update",
              npc_id: id,
              data: updates,
            });

            // Release lock
            releaseLock(id, "npc");

            if (success) {
              // Refresh NPC data after a short delay to allow server processing
              setTimeout(() => fetchNPC(id), 500);
              setIsLoading(false);
              return npc; // Updated data will come from fetchNPC
            }
          }
        }

        // Fallback to API update
        const data = await npcsAPI.updateNPC(id, updates);
        setNPC(data);
        setIsLoading(false);
        return data;
      } catch (err: any) {
        setError(err.message || "Failed to update NPC");
        setIsLoading(false);
        return null;
      }
    },
    [connected, acquireLock, releaseLock, sendMessage, fetchNPC, npc]
  );

  /**
   * Delete NPC
   */
  const deleteNPC = useCallback(
    async (id: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        await npcsAPI.deleteNPC(id);
        // Refresh NPC list
        fetchNPCs();
        setIsLoading(false);
        return true;
      } catch (err: any) {
        setError(err.message || "Failed to delete NPC");
        setIsLoading(false);
        return false;
      }
    },
    [fetchNPCs]
  );

  /**
   * Update NPC HP - tries WebSocket first if available, falls back to API
   */
  const updateHP = useCallback(
    async (id: string, hpChange: number): Promise<NPC | null> => {
      setError(null);
      try {
        // Try WebSocket update if connected
        if (connected) {
          const success = sendMessage("npc", {
            type: "npc",
            action: "hp_change",
            npc_id: id,
            data: { change: hpChange },
          });

          if (success) {
            // Refresh NPC data after a short delay to allow server processing
            setTimeout(() => fetchNPC(id), 500);
            return npc; // Updated data will come from fetchNPC
          }
        }

        // Fallback to API update
        const data = await npcsAPI.updateHP(id, hpChange);
        setNPC(data);
        return data;
      } catch (err: any) {
        setError(err.message || "Failed to update HP");
        return null;
      }
    },
    [connected, sendMessage, fetchNPC, npc]
  );

  /**
   * Import NPC from compendium
   */
  const importFromCompendium = useCallback(
    async (monsterId: string, nameOverride?: string): Promise<NPC | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await npcsAPI.importFromCompendium(
          campaignId,
          monsterId,
          nameOverride
        );
        // Refresh NPC list
        fetchNPCs();
        setIsLoading(false);
        return data;
      } catch (err: any) {
        setError(err.message || "Failed to import from compendium");
        setIsLoading(false);
        return null;
      }
    },
    [campaignId, fetchNPCs]
  );

  /**
   * Bulk import NPCs
   */
  const bulkImport = useCallback(
    async (npcsData: any): Promise<NPC[] | null> => {
      setIsLoading(true);
      setError(null);
      try {
        // Ensure all NPCs have campaign_id set
        const data = await npcsAPI.bulkImport(campaignId, npcsData);
        // Refresh NPC list
        fetchNPCs();
        setIsLoading(false);
        return data;
      } catch (err: any) {
        setError(err.message || "Failed to bulk import NPCs");
        setIsLoading(false);
        return null;
      }
    },
    [campaignId, fetchNPCs]
  );

  return {
    npc,
    npcs,
    isLoading,
    error,
    connected,
    fetchNPC,
    fetchNPCs,
    createNPC,
    updateNPC,
    deleteNPC,
    updateHP,
    importFromCompendium,
    bulkImport,
    isLocked: (id: string) => isLocked(id, "npc"),
    acquireLock: (id: string) => acquireLock(id, "npc"),
    releaseLock: (id: string) => releaseLock(id, "npc"),
    whoLocked: (id: string) => whoLocked(id, "npc"),
  };
}

export default useNPC;
