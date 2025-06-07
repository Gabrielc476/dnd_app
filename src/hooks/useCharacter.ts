// hooks/useCharacter.ts
import { useState, useEffect, useCallback } from "react";
import { charactersAPI } from "@/lib/api";
import { useCharacterSocket } from "@/lib/socket";
import { Character, CharacterListItem } from "@/lib/types";

export interface UseCharacterProps {
  campaignId: string;
  userId: string;
  characterId?: string;
}

export interface UseCharacterReturn {
  character: Character | null;
  characters: CharacterListItem[];
  isLoading: boolean;
  error: string | null;
  fetchCharacter: (id: string) => Promise<Character | null>;
  fetchCharacters: () => Promise<CharacterListItem[]>;
  createCharacter: (characterData: any) => Promise<Character | null>;
  updateCharacter: (characterId: string, updates: any) => Promise<boolean>;
  deleteCharacter: (characterId: string) => Promise<boolean>;
  updateHP: (
    characterId: string,
    hpChange: number,
    isTemp?: boolean
  ) => Promise<boolean>;
  rollAbilityCheck: (
    characterId: string,
    ability: string,
    advantage?: boolean,
    disadvantage?: boolean
  ) => boolean;
  addCondition: (
    characterId: string,
    condition: string
  ) => Promise<Character | null>;
  removeCondition: (
    characterId: string,
    condition: string
  ) => Promise<Character | null>;
  isLocked: (characterId: string) => boolean;
  acquireLock: (characterId: string) => Promise<boolean>;
  releaseLock: (characterId: string) => void;
  whoLocked: (characterId: string) => string | null;
}

/**
 * Hook for character management with WebSocket and API integration
 */
export function useCharacter({
  campaignId,
  userId,
  characterId,
}: UseCharacterProps): UseCharacterReturn {
  const [character, setCharacter] = useState<Character | null>(null);
  const [characters, setCharacters] = useState<CharacterListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // WebSocket connection for character events
  const {
    connected,
    error: socketError,
    updateCharacter: updateCharacterSocket,
    rollAbilityCheck: rollAbilityCheckSocket,
    changeHP: changeHPSocket,
    acquireLock,
    releaseLock,
    isLocked,
    whoLocked,
  } = useCharacterSocket(campaignId, userId, characterId);

  // Load character data if characterId is provided
  useEffect(() => {
    if (characterId) {
      fetchCharacter(characterId);
    }
  }, [characterId]);

  // Handle socket error
  useEffect(() => {
    if (socketError) {
      setError(`WebSocket error: ${socketError}`);
    }
  }, [socketError]);

  /**
   * Fetch character by ID
   */
  const fetchCharacter = useCallback(
    async (id: string): Promise<Character | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await charactersAPI.getCharacter(id);
        setCharacter(data);
        setIsLoading(false);
        return data;
      } catch (err: any) {
        setError(err.message || "Failed to fetch character");
        setIsLoading(false);
        return null;
      }
    },
    []
  );

  /**
   * Fetch characters - uses different endpoints based on campaignId
   */
  const fetchCharacters = useCallback(async (): Promise<
    CharacterListItem[]
  > => {
    setIsLoading(true);
    setError(null);
    try {
      let data: CharacterListItem[];

      // If campaignId is empty or not provided, fetch all user characters
      if (!campaignId || campaignId.trim() === "") {
        console.log("📋 Fetching all user characters...");
        data = await charactersAPI.listMyCharacters();
      } else {
        console.log(`📋 Fetching characters for campaign: ${campaignId}`);
        data = await charactersAPI.listCampaignCharacters(campaignId);
      }

      setCharacters(data);
      setIsLoading(false);
      return data;
    } catch (err: any) {
      console.error("❌ Error fetching characters:", err);
      setError(err.message || "Failed to fetch characters");
      setIsLoading(false);
      return [];
    }
  }, [campaignId]);

  /**
   * Create new character
   */
  const createCharacter = useCallback(
    async (characterData: any): Promise<Character | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await charactersAPI.createCharacter({
          ...characterData,
          campaign_id: campaignId,
          owner_id: userId,
        });
        // Refresh character list
        fetchCharacters();
        setIsLoading(false);
        return data;
      } catch (err: any) {
        setError(err.message || "Failed to create character");
        setIsLoading(false);
        return null;
      }
    },
    [campaignId, userId, fetchCharacters]
  );

  /**
   * Update character - tries WebSocket first, falls back to API
   */
  const updateCharacter = useCallback(
    async (id: string, updates: any): Promise<boolean> => {
      setError(null);
      try {
        // Try WebSocket update if connected
        if (connected) {
          const success = await updateCharacterSocket(id, updates);
          if (success) {
            // Refresh character data
            fetchCharacter(id);
            return true;
          }
        }

        // Fallback to API update
        const updatedCharacter = await charactersAPI.updateCharacter(
          id,
          updates
        );
        if (updatedCharacter) {
          setCharacter(updatedCharacter);
          return true;
        }
        return false;
      } catch (err: any) {
        setError(err.message || "Failed to update character");
        return false;
      }
    },
    [connected, updateCharacterSocket, fetchCharacter]
  );

  /**
   * Delete character
   */
  const deleteCharacter = useCallback(
    async (id: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        await charactersAPI.deleteCharacter(id);
        // Refresh character list
        fetchCharacters();
        setIsLoading(false);
        return true;
      } catch (err: any) {
        setError(err.message || "Failed to delete character");
        setIsLoading(false);
        return false;
      }
    },
    [fetchCharacters]
  );

  /**
   * Update character HP - tries WebSocket first, falls back to API
   */
  const updateHP = useCallback(
    async (
      id: string,
      hpChange: number,
      isTemp: boolean = false
    ): Promise<boolean> => {
      setError(null);
      try {
        // Try WebSocket update if connected
        if (connected) {
          const success = changeHPSocket(id, hpChange, isTemp);
          if (success) {
            // Refresh character data after a short delay to allow server processing
            setTimeout(() => fetchCharacter(id), 500);
            return true;
          }
        }

        // Fallback to API update
        const updatedCharacter = await charactersAPI.updateHP(
          id,
          hpChange,
          isTemp
        );
        if (updatedCharacter) {
          setCharacter(updatedCharacter);
          return true;
        }
        return false;
      } catch (err: any) {
        setError(err.message || "Failed to update HP");
        return false;
      }
    },
    [connected, changeHPSocket, fetchCharacter]
  );

  /**
   * Roll ability check via WebSocket
   */
  const rollAbilityCheck = useCallback(
    (
      id: string,
      ability: string,
      advantage: boolean = false,
      disadvantage: boolean = false
    ): boolean => {
      if (!connected) {
        setError("WebSocket not connected");
        return false;
      }
      return rollAbilityCheckSocket(id, ability, advantage, disadvantage);
    },
    [connected, rollAbilityCheckSocket]
  );

  /**
   * Add condition to character
   */
  const addCondition = useCallback(
    async (id: string, condition: string): Promise<Character | null> => {
      setError(null);
      try {
        const updatedCharacter = await charactersAPI.addCondition(
          id,
          condition
        );
        setCharacter(updatedCharacter);
        return updatedCharacter;
      } catch (err: any) {
        setError(err.message || "Failed to add condition");
        return null;
      }
    },
    []
  );

  /**
   * Remove condition from character
   */
  const removeCondition = useCallback(
    async (id: string, condition: string): Promise<Character | null> => {
      setError(null);
      try {
        const updatedCharacter = await charactersAPI.removeCondition(
          id,
          condition
        );
        setCharacter(updatedCharacter);
        return updatedCharacter;
      } catch (err: any) {
        setError(err.message || "Failed to remove condition");
        return null;
      }
    },
    []
  );

  return {
    character,
    characters,
    isLoading,
    error,
    fetchCharacter,
    fetchCharacters,
    createCharacter,
    updateCharacter,
    deleteCharacter,
    updateHP,
    rollAbilityCheck,
    addCondition,
    removeCondition,
    isLocked: (id: string) => isLocked(id, "character"),
    acquireLock: (id: string) => acquireLock(id, "character"),
    releaseLock: (id: string) => releaseLock(id, "character"),
    whoLocked: (id: string) => whoLocked(id, "character"),
  };
}

export default useCharacter;
