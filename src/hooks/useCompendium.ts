// hooks/useCompendium.ts
import { useState, useEffect, useCallback } from "react";
import { compendiumAPI } from "@/lib/api";

export interface UseCompendiumReturn {
  isLoading: boolean;
  error: string | null;
  searchSpells: (params?: any) => Promise<any[]>;
  getSpell: (spellId: string) => Promise<any>;
  searchItems: (params?: any) => Promise<any[]>;
  getItem: (itemId: string) => Promise<any>;
  searchMonsters: (params?: any) => Promise<any[]>;
  getMonster: (monsterId: string) => Promise<any>;
  searchCompendium: (searchData: any) => Promise<any>;
  getClassSpells: (className: string, level?: number) => Promise<any[]>;
  getMonsterTypes: () => Promise<string[]>;
  getMonsterChallengeRatings: () => Promise<string[]>;
  getItemTypes: () => Promise<string[]>;
  getItemRarities: () => Promise<string[]>;
  getSpellSchools: () => Promise<string[]>;
  getSpellClasses: () => Promise<string[]>;
  metadata: {
    monsterTypes: string[];
    challengeRatings: string[];
    itemTypes: string[];
    itemRarities: string[];
    spellSchools: string[];
    spellClasses: string[];
  };
}

/**
 * Hook for accessing D&D compendium data
 */
export function useCompendium(): UseCompendiumReturn {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<{
    monsterTypes: string[];
    challengeRatings: string[];
    itemTypes: string[];
    itemRarities: string[];
    spellSchools: string[];
    spellClasses: string[];
  }>({
    monsterTypes: [],
    challengeRatings: [],
    itemTypes: [],
    itemRarities: [],
    spellSchools: [],
    spellClasses: [],
  });

  // Load metadata on mount
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [
          monsterTypes,
          challengeRatings,
          itemTypes,
          itemRarities,
          spellSchools,
          spellClasses,
        ] = await Promise.all([
          compendiumAPI.getMonsterTypes(),
          compendiumAPI.getMonsterChallengeRatings(),
          compendiumAPI.getItemTypes(),
          compendiumAPI.getItemRarities(),
          compendiumAPI.getSpellSchools(),
          compendiumAPI.getSpellClasses(),
        ]);

        setMetadata({
          monsterTypes,
          challengeRatings,
          itemTypes,
          itemRarities,
          spellSchools,
          spellClasses,
        });
      } catch (err) {
        console.error("Failed to load compendium metadata", err);
      }
    };

    loadMetadata();
  }, []);

  /**
   * Search spells with given parameters
   */
  const searchSpells = useCallback(async (params?: any): Promise<any[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await compendiumAPI.searchSpells(params);
      setIsLoading(false);
      return data;
    } catch (err: any) {
      setError(err.message || "Failed to search spells");
      setIsLoading(false);
      return [];
    }
  }, []);

  /**
   * Get spell by ID
   */
  const getSpell = useCallback(async (spellId: string): Promise<any> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await compendiumAPI.getSpell(spellId);
      setIsLoading(false);
      return data;
    } catch (err: any) {
      setError(err.message || "Failed to get spell");
      setIsLoading(false);
      return null;
    }
  }, []);

  /**
   * Search items with given parameters
   */
  const searchItems = useCallback(async (params?: any): Promise<any[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await compendiumAPI.searchItems(params);
      setIsLoading(false);
      return data;
    } catch (err: any) {
      setError(err.message || "Failed to search items");
      setIsLoading(false);
      return [];
    }
  }, []);

  /**
   * Get item by ID
   */
  const getItem = useCallback(async (itemId: string): Promise<any> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await compendiumAPI.getItem(itemId);
      setIsLoading(false);
      return data;
    } catch (err: any) {
      setError(err.message || "Failed to get item");
      setIsLoading(false);
      return null;
    }
  }, []);

  /**
   * Search monsters with given parameters
   */
  const searchMonsters = useCallback(async (params?: any): Promise<any[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await compendiumAPI.searchMonsters(params);
      setIsLoading(false);
      return data;
    } catch (err: any) {
      setError(err.message || "Failed to search monsters");
      setIsLoading(false);
      return [];
    }
  }, []);

  /**
   * Get monster by ID
   */
  const getMonster = useCallback(async (monsterId: string): Promise<any> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await compendiumAPI.getMonster(monsterId);
      setIsLoading(false);
      return data;
    } catch (err: any) {
      setError(err.message || "Failed to get monster");
      setIsLoading(false);
      return null;
    }
  }, []);

  /**
   * Search all compendium sections
   */
  const searchCompendium = useCallback(
    async (searchData: any): Promise<any> => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await compendiumAPI.searchCompendium(searchData);
        setIsLoading(false);
        return data;
      } catch (err: any) {
        setError(err.message || "Failed to search compendium");
        setIsLoading(false);
        return {};
      }
    },
    []
  );

  /**
   * Get spells for a class
   */
  const getClassSpells = useCallback(
    async (className: string, level?: number): Promise<any[]> => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await compendiumAPI.getClassSpells(className, level);
        setIsLoading(false);
        return data;
      } catch (err: any) {
        setError(err.message || "Failed to get class spells");
        setIsLoading(false);
        return [];
      }
    },
    []
  );

  /**
   * Get monster types
   */
  const getMonsterTypes = useCallback(async (): Promise<string[]> => {
    try {
      return await compendiumAPI.getMonsterTypes();
    } catch (err: any) {
      console.error("Failed to get monster types", err);
      return metadata.monsterTypes;
    }
  }, [metadata.monsterTypes]);

  /**
   * Get monster challenge ratings
   */
  const getMonsterChallengeRatings = useCallback(async (): Promise<
    string[]
  > => {
    try {
      return await compendiumAPI.getMonsterChallengeRatings();
    } catch (err: any) {
      console.error("Failed to get challenge ratings", err);
      return metadata.challengeRatings;
    }
  }, [metadata.challengeRatings]);

  /**
   * Get item types
   */
  const getItemTypes = useCallback(async (): Promise<string[]> => {
    try {
      return await compendiumAPI.getItemTypes();
    } catch (err: any) {
      console.error("Failed to get item types", err);
      return metadata.itemTypes;
    }
  }, [metadata.itemTypes]);

  /**
   * Get item rarities
   */
  const getItemRarities = useCallback(async (): Promise<string[]> => {
    try {
      return await compendiumAPI.getItemRarities();
    } catch (err: any) {
      console.error("Failed to get item rarities", err);
      return metadata.itemRarities;
    }
  }, [metadata.itemRarities]);

  /**
   * Get spell schools
   */
  const getSpellSchools = useCallback(async (): Promise<string[]> => {
    try {
      return await compendiumAPI.getSpellSchools();
    } catch (err: any) {
      console.error("Failed to get spell schools", err);
      return metadata.spellSchools;
    }
  }, [metadata.spellSchools]);

  /**
   * Get spell classes
   */
  const getSpellClasses = useCallback(async (): Promise<string[]> => {
    try {
      return await compendiumAPI.getSpellClasses();
    } catch (err: any) {
      console.error("Failed to get spell classes", err);
      return metadata.spellClasses;
    }
  }, [metadata.spellClasses]);

  return {
    isLoading,
    error,
    searchSpells,
    getSpell,
    searchItems,
    getItem,
    searchMonsters,
    getMonster,
    searchCompendium,
    getClassSpells,
    getMonsterTypes,
    getMonsterChallengeRatings,
    getItemTypes,
    getItemRarities,
    getSpellSchools,
    getSpellClasses,
    metadata,
  };
}

export default useCompendium;
