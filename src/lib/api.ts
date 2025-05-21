// lib/api.ts
import {
  AuthToken,
  Campaign,
  CampaignListItem,
  Character,
  CharacterListItem,
  Combat,
  NPC,
  NPCListItem,
  User,
} from "./types";

// API base URL from environment variable
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Default fetch options
 */
const defaultOptions: RequestInit = {
  headers: {
    "Content-Type": "application/json",
  },
};

/**
 * Add authorization header to request options
 */
const withAuth = (options: RequestInit = {}): RequestInit => {
  const token = localStorage.getItem("authToken");
  if (!token) return options;

  return {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  };
};

/**
 * Handle API response
 */
const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    // Try to parse error response
    try {
      const error = await response.json();
      throw new Error(error.detail || `API Error: ${response.status}`);
    } catch (e) {
      throw new Error(`API Error: ${response.status}`);
    }
  }

  // For 204 No Content responses
  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
};

/**
 * Authentication API functions
 */
export const authAPI = {
  /**
   * Register a new user
   */
  register: async (userData: {
    username: string;
    email: string;
    password: string;
    role: string;
  }): Promise<User> => {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      ...defaultOptions,
      method: "POST",
      body: JSON.stringify(userData),
    });

    return handleResponse<User>(response);
  },

  /**
   * Login user and get token
   */
  login: async (username: string, password: string): Promise<AuthToken> => {
    const formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("password", password);

    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    });

    return handleResponse<AuthToken>(response);
  },

  /**
   * Refresh token
   */
  refreshToken: async (): Promise<AuthToken> => {
    const response = await fetch(`${API_URL}/api/auth/refresh-token`, {
      ...defaultOptions,
      method: "POST",
      ...withAuth(),
    });

    return handleResponse<AuthToken>(response);
  },

  /**
   * Get current user
   */
  getMe: async (): Promise<User> => {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      ...defaultOptions,
      ...withAuth(),
    });

    return handleResponse<User>(response);
  },
};

/**
 * Characters API functions
 */
export const charactersAPI = {
  /**
   * Get all characters for current user
   */
  listMyCharacters: async (): Promise<CharacterListItem[]> => {
    const response = await fetch(`${API_URL}/api/characters/user/me`, {
      ...defaultOptions,
      ...withAuth(),
    });

    return handleResponse<CharacterListItem[]>(response);
  },

  /**
   * Get all characters for a campaign
   */
  listCampaignCharacters: async (
    campaignId: string
  ): Promise<CharacterListItem[]> => {
    const response = await fetch(
      `${API_URL}/api/characters/campaign/${campaignId}`,
      {
        ...defaultOptions,
        ...withAuth(),
      }
    );

    return handleResponse<CharacterListItem[]>(response);
  },

  /**
   * Get a specific character
   */
  getCharacter: async (characterId: string): Promise<Character> => {
    const response = await fetch(`${API_URL}/api/characters/${characterId}`, {
      ...defaultOptions,
      ...withAuth(),
    });

    return handleResponse<Character>(response);
  },

  /**
   * Create a new character
   */
  createCharacter: async (characterData: any): Promise<Character> => {
    const response = await fetch(`${API_URL}/api/characters/`, {
      ...defaultOptions,
      method: "POST",
      body: JSON.stringify(characterData),
      ...withAuth(),
    });

    return handleResponse<Character>(response);
  },

  /**
   * Update a character
   */
  updateCharacter: async (
    characterId: string,
    updates: any
  ): Promise<Character> => {
    const response = await fetch(`${API_URL}/api/characters/${characterId}`, {
      ...defaultOptions,
      method: "PUT",
      body: JSON.stringify(updates),
      ...withAuth(),
    });

    return handleResponse<Character>(response);
  },

  /**
   * Delete a character
   */
  deleteCharacter: async (characterId: string): Promise<void> => {
    const response = await fetch(`${API_URL}/api/characters/${characterId}`, {
      ...defaultOptions,
      method: "DELETE",
      ...withAuth(),
    });

    return handleResponse<void>(response);
  },

  /**
   * Update character HP
   */
  updateHP: async (
    characterId: string,
    hpChange: number,
    isTemp: boolean = false
  ): Promise<Character> => {
    const response = await fetch(
      `${API_URL}/api/characters/${characterId}/hp`,
      {
        ...defaultOptions,
        method: "PATCH",
        body: JSON.stringify({ hp_change: hpChange, is_temp: isTemp }),
        ...withAuth(),
      }
    );

    return handleResponse<Character>(response);
  },

  /**
   * Add condition to character
   */
  addCondition: async (
    characterId: string,
    condition: string
  ): Promise<Character> => {
    const response = await fetch(
      `${API_URL}/api/characters/${characterId}/conditions/${condition}`,
      {
        ...defaultOptions,
        method: "POST",
        ...withAuth(),
      }
    );

    return handleResponse<Character>(response);
  },

  /**
   * Remove condition from character
   */
  removeCondition: async (
    characterId: string,
    condition: string
  ): Promise<Character> => {
    const response = await fetch(
      `${API_URL}/api/characters/${characterId}/conditions/${condition}`,
      {
        ...defaultOptions,
        method: "DELETE",
        ...withAuth(),
      }
    );

    return handleResponse<Character>(response);
  },

  /**
   * Roll ability check
   */
  rollAbilityCheck: async (
    characterId: string,
    ability: string,
    advantage: boolean = false,
    disadvantage: boolean = false
  ): Promise<any> => {
    const response = await fetch(
      `${API_URL}/api/characters/${characterId}/roll/${ability}?advantage=${advantage}&disadvantage=${disadvantage}`,
      {
        ...defaultOptions,
        method: "POST",
        ...withAuth(),
      }
    );

    return handleResponse<any>(response);
  },
};

/**
 * Campaigns API functions
 */
export const campaignsAPI = {
  /**
   * List all campaigns for the current user
   */
  listCampaigns: async (): Promise<CampaignListItem[]> => {
    const response = await fetch(`${API_URL}/api/campaigns/`, {
      ...defaultOptions,
      ...withAuth(),
    });

    return handleResponse<CampaignListItem[]>(response);
  },

  /**
   * Get a specific campaign
   */
  getCampaign: async (campaignId: string): Promise<Campaign> => {
    const response = await fetch(`${API_URL}/api/campaigns/${campaignId}`, {
      ...defaultOptions,
      ...withAuth(),
    });

    return handleResponse<Campaign>(response);
  },

  /**
   * Create a new campaign
   */
  createCampaign: async (campaignData: {
    name: string;
    description?: string;
    dm_id: string;
  }): Promise<Campaign> => {
    const response = await fetch(`${API_URL}/api/campaigns/`, {
      ...defaultOptions,
      method: "POST",
      body: JSON.stringify(campaignData),
      ...withAuth(),
    });

    return handleResponse<Campaign>(response);
  },

  /**
   * Update a campaign
   */
  updateCampaign: async (
    campaignId: string,
    updates: any
  ): Promise<Campaign> => {
    const response = await fetch(`${API_URL}/api/campaigns/${campaignId}`, {
      ...defaultOptions,
      method: "PUT",
      body: JSON.stringify(updates),
      ...withAuth(),
    });

    return handleResponse<Campaign>(response);
  },

  /**
   * Delete a campaign
   */
  deleteCampaign: async (campaignId: string): Promise<void> => {
    const response = await fetch(`${API_URL}/api/campaigns/${campaignId}`, {
      ...defaultOptions,
      method: "DELETE",
      ...withAuth(),
    });

    return handleResponse<void>(response);
  },

  /**
   * Add player to campaign
   */
  addPlayer: async (
    campaignId: string,
    playerId: string
  ): Promise<Campaign> => {
    const response = await fetch(
      `${API_URL}/api/campaigns/${campaignId}/players`,
      {
        ...defaultOptions,
        method: "POST",
        body: JSON.stringify({ player_id: playerId }),
        ...withAuth(),
      }
    );

    return handleResponse<Campaign>(response);
  },

  /**
   * Remove player from campaign
   */
  removePlayer: async (
    campaignId: string,
    playerId: string
  ): Promise<Campaign> => {
    const response = await fetch(
      `${API_URL}/api/campaigns/${campaignId}/players`,
      {
        ...defaultOptions,
        method: "DELETE",
        body: JSON.stringify({ player_id: playerId }),
        ...withAuth(),
      }
    );

    return handleResponse<Campaign>(response);
  },

  /**
   * Create an encounter
   */
  createEncounter: async (
    campaignId: string,
    encounterData: any
  ): Promise<Campaign> => {
    const response = await fetch(
      `${API_URL}/api/campaigns/${campaignId}/encounters`,
      {
        ...defaultOptions,
        method: "POST",
        body: JSON.stringify(encounterData),
        ...withAuth(),
      }
    );

    return handleResponse<Campaign>(response);
  },

  /**
   * Update an encounter
   */
  updateEncounter: async (
    campaignId: string,
    encounterId: string,
    updates: any
  ): Promise<Campaign> => {
    const response = await fetch(
      `${API_URL}/api/campaigns/${campaignId}/encounters/${encounterId}`,
      {
        ...defaultOptions,
        method: "PUT",
        body: JSON.stringify(updates),
        ...withAuth(),
      }
    );

    return handleResponse<Campaign>(response);
  },

  /**
   * Delete an encounter
   */
  deleteEncounter: async (
    campaignId: string,
    encounterId: string
  ): Promise<Campaign> => {
    const response = await fetch(
      `${API_URL}/api/campaigns/${campaignId}/encounters/${encounterId}`,
      {
        ...defaultOptions,
        method: "DELETE",
        ...withAuth(),
      }
    );

    return handleResponse<Campaign>(response);
  },

  /**
   * Set active encounter
   */
  setActiveEncounter: async (
    campaignId: string,
    encounterId: string
  ): Promise<Campaign> => {
    const response = await fetch(
      `${API_URL}/api/campaigns/${campaignId}/active-encounter/${encounterId}`,
      {
        ...defaultOptions,
        method: "POST",
        ...withAuth(),
      }
    );

    return handleResponse<Campaign>(response);
  },

  /**
   * Clear active encounter
   */
  clearActiveEncounter: async (campaignId: string): Promise<Campaign> => {
    const response = await fetch(
      `${API_URL}/api/campaigns/${campaignId}/active-encounter`,
      {
        ...defaultOptions,
        method: "DELETE",
        ...withAuth(),
      }
    );

    return handleResponse<Campaign>(response);
  },

  /**
   * Upload image
   */
  uploadImage: async (
    campaignId: string,
    imageFile: File,
    metadata: any
  ): Promise<any> => {
    const formData = new FormData();
    formData.append("file", imageFile);

    // Add metadata fields to form
    Object.keys(metadata).forEach((key) => {
      formData.append(key, metadata[key]);
    });

    const response = await fetch(
      `${API_URL}/api/campaigns/${campaignId}/images`,
      {
        method: "POST",
        body: formData,
        headers: {
          // Don't set Content-Type for FormData, browser will set it with boundary
          ...withAuth().headers,
        },
      }
    );

    return handleResponse<any>(response);
  },

  /**
   * List images
   */
  listImages: async (
    campaignId: string,
    params?: { tags?: string; is_map?: boolean }
  ): Promise<any[]> => {
    let url = `${API_URL}/api/campaigns/${campaignId}/images`;

    if (params) {
      const queryParams = new URLSearchParams();
      if (params.tags) queryParams.append("tags", params.tags);
      if (params.is_map !== undefined)
        queryParams.append("is_map", params.is_map.toString());

      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }
    }

    const response = await fetch(url, {
      ...defaultOptions,
      ...withAuth(),
    });

    return handleResponse<any[]>(response);
  },

  /**
   * Delete image
   */
  deleteImage: async (campaignId: string, imageId: string): Promise<any> => {
    const response = await fetch(
      `${API_URL}/api/campaigns/${campaignId}/images/${imageId}`,
      {
        ...defaultOptions,
        method: "DELETE",
        ...withAuth(),
      }
    );

    return handleResponse<any>(response);
  },

  /**
   * Update image metadata
   */
  updateImageMetadata: async (
    campaignId: string,
    imageId: string,
    updates: any
  ): Promise<any> => {
    const response = await fetch(
      `${API_URL}/api/campaigns/${campaignId}/images/${imageId}`,
      {
        ...defaultOptions,
        method: "PUT",
        body: JSON.stringify(updates),
        ...withAuth(),
      }
    );

    return handleResponse<any>(response);
  },

  /**
   * Share image
   */
  shareImage: async (campaignId: string, imageId: string): Promise<any> => {
    const response = await fetch(
      `${API_URL}/api/campaigns/${campaignId}/images/${imageId}/share`,
      {
        ...defaultOptions,
        method: "POST",
        ...withAuth(),
      }
    );

    return handleResponse<any>(response);
  },
};

/**
 * NPCs API functions
 */
export const npcsAPI = {
  /**
   * Create a new NPC
   */
  createNPC: async (npcData: any): Promise<NPC> => {
    const response = await fetch(`${API_URL}/api/npcs/`, {
      ...defaultOptions,
      method: "POST",
      body: JSON.stringify(npcData),
      ...withAuth(),
    });

    return handleResponse<NPC>(response);
  },

  /**
   * Get a specific NPC
   */
  getNPC: async (npcId: string): Promise<NPC> => {
    const response = await fetch(`${API_URL}/api/npcs/${npcId}`, {
      ...defaultOptions,
      ...withAuth(),
    });

    return handleResponse<NPC>(response);
  },

  /**
   * Update an NPC
   */
  updateNPC: async (npcId: string, updates: any): Promise<NPC> => {
    const response = await fetch(`${API_URL}/api/npcs/${npcId}`, {
      ...defaultOptions,
      method: "PUT",
      body: JSON.stringify(updates),
      ...withAuth(),
    });

    return handleResponse<NPC>(response);
  },

  /**
   * Delete an NPC
   */
  deleteNPC: async (npcId: string): Promise<void> => {
    const response = await fetch(`${API_URL}/api/npcs/${npcId}`, {
      ...defaultOptions,
      method: "DELETE",
      ...withAuth(),
    });

    return handleResponse<void>(response);
  },

  /**
   * List all NPCs for a campaign
   */
  listCampaignNPCs: async (campaignId: string): Promise<NPCListItem[]> => {
    const response = await fetch(`${API_URL}/api/npcs/campaign/${campaignId}`, {
      ...defaultOptions,
      ...withAuth(),
    });

    return handleResponse<NPCListItem[]>(response);
  },

  /**
   * Update NPC HP
   */
  updateHP: async (npcId: string, hpChange: number): Promise<NPC> => {
    const response = await fetch(`${API_URL}/api/npcs/${npcId}/hp`, {
      ...defaultOptions,
      method: "PATCH",
      body: JSON.stringify({ hp_change: hpChange }),
      ...withAuth(),
    });

    return handleResponse<NPC>(response);
  },

  /**
   * Import NPC from compendium
   */
  importFromCompendium: async (
    campaignId: string,
    monsterId: string,
    nameOverride?: string
  ): Promise<NPC> => {
    let url = `${API_URL}/api/npcs/import/${campaignId}/${monsterId}`;

    if (nameOverride) {
      url += `?name_override=${encodeURIComponent(nameOverride)}`;
    }

    const response = await fetch(url, {
      ...defaultOptions,
      method: "POST",
      ...withAuth(),
    });

    return handleResponse<NPC>(response);
  },

  /**
   * Bulk import NPCs
   */
  bulkImport: async (campaignId: string, npcsData: any): Promise<NPC[]> => {
    const response = await fetch(
      `${API_URL}/api/npcs/bulk-import/${campaignId}`,
      {
        ...defaultOptions,
        method: "POST",
        body: JSON.stringify(npcsData),
        ...withAuth(),
      }
    );

    return handleResponse<NPC[]>(response);
  },
};

/**
 * Combat API functions
 */
export const combatAPI = {
  /**
   * Create a new combat
   */
  createCombat: async (combatData: {
    campaign_id: string;
    encounter_id?: string;
  }): Promise<Combat> => {
    const response = await fetch(`${API_URL}/api/combat/`, {
      ...defaultOptions,
      method: "POST",
      body: JSON.stringify(combatData),
      ...withAuth(),
    });

    return handleResponse<Combat>(response);
  },

  /**
   * Get a specific combat
   */
  getCombat: async (combatId: string): Promise<Combat> => {
    const response = await fetch(`${API_URL}/api/combat/${combatId}`, {
      ...defaultOptions,
      ...withAuth(),
    });

    return handleResponse<Combat>(response);
  },

  /**
   * Get active combat for a campaign
   */
  getActiveCombat: async (campaignId: string): Promise<Combat> => {
    const response = await fetch(
      `${API_URL}/api/combat/campaign/${campaignId}/active`,
      {
        ...defaultOptions,
        ...withAuth(),
      }
    );

    return handleResponse<Combat>(response);
  },

  /**
   * Update a combat
   */
  updateCombat: async (combatId: string, updates: any): Promise<Combat> => {
    const response = await fetch(`${API_URL}/api/combat/${combatId}`, {
      ...defaultOptions,
      method: "PUT",
      body: JSON.stringify(updates),
      ...withAuth(),
    });

    return handleResponse<Combat>(response);
  },

  /**
   * End a combat
   */
  endCombat: async (combatId: string): Promise<Combat> => {
    const response = await fetch(`${API_URL}/api/combat/${combatId}/end`, {
      ...defaultOptions,
      method: "POST",
      ...withAuth(),
    });

    return handleResponse<Combat>(response);
  },

  /**
   * Roll initiative
   */
  rollInitiative: async (
    combatId: string,
    entityId: string,
    entityType: "character" | "npc",
    initiativeRoll?: number
  ): Promise<Combat> => {
    const data = {
      entity_id: entityId,
      entity_type: entityType,
      initiative_roll: initiativeRoll,
    };

    const response = await fetch(
      `${API_URL}/api/combat/${combatId}/initiative`,
      {
        ...defaultOptions,
        method: "POST",
        body: JSON.stringify(data),
        ...withAuth(),
      }
    );

    return handleResponse<Combat>(response);
  },

  /**
   * Next turn
   */
  nextTurn: async (combatId: string): Promise<Combat> => {
    const response = await fetch(
      `${API_URL}/api/combat/${combatId}/next-turn`,
      {
        ...defaultOptions,
        method: "POST",
        ...withAuth(),
      }
    );

    return handleResponse<Combat>(response);
  },

  /**
   * Add condition
   */
  addCondition: async (
    combatId: string,
    conditionData: any
  ): Promise<Combat> => {
    const response = await fetch(
      `${API_URL}/api/combat/${combatId}/conditions`,
      {
        ...defaultOptions,
        method: "POST",
        body: JSON.stringify(conditionData),
        ...withAuth(),
      }
    );

    return handleResponse<Combat>(response);
  },

  /**
   * Remove condition
   */
  removeCondition: async (
    combatId: string,
    conditionId: string
  ): Promise<Combat> => {
    const response = await fetch(
      `${API_URL}/api/combat/${combatId}/conditions/${conditionId}`,
      {
        ...defaultOptions,
        method: "DELETE",
        ...withAuth(),
      }
    );

    return handleResponse<Combat>(response);
  },

  /**
   * Register action
   */
  registerAction: async (
    combatId: string,
    actionData: any
  ): Promise<Combat> => {
    const response = await fetch(`${API_URL}/api/combat/${combatId}/actions`, {
      ...defaultOptions,
      method: "POST",
      body: JSON.stringify(actionData),
      ...withAuth(),
    });

    return handleResponse<Combat>(response);
  },
};

/**
 * Compendium API functions
 */
export const compendiumAPI = {
  /**
   * Search spells
   */
  searchSpells: async (params?: any): Promise<any[]> => {
    let url = `${API_URL}/api/compendium/spells`;

    if (params) {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value as string);
        }
      });

      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }
    }

    const response = await fetch(url, {
      ...defaultOptions,
      ...withAuth(),
    });

    return handleResponse<any[]>(response);
  },

  /**
   * Get spell by ID
   */
  getSpell: async (spellId: string): Promise<any> => {
    const response = await fetch(
      `${API_URL}/api/compendium/spells/${spellId}`,
      {
        ...defaultOptions,
        ...withAuth(),
      }
    );

    return handleResponse<any>(response);
  },

  /**
   * Search items
   */
  searchItems: async (params?: any): Promise<any[]> => {
    let url = `${API_URL}/api/compendium/items`;

    if (params) {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value as string);
        }
      });

      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }
    }

    const response = await fetch(url, {
      ...defaultOptions,
      ...withAuth(),
    });

    return handleResponse<any[]>(response);
  },

  /**
   * Get item by ID
   */
  getItem: async (itemId: string): Promise<any> => {
    const response = await fetch(`${API_URL}/api/compendium/items/${itemId}`, {
      ...defaultOptions,
      ...withAuth(),
    });

    return handleResponse<any>(response);
  },

  /**
   * Search monsters
   */
  searchMonsters: async (params?: any): Promise<any[]> => {
    let url = `${API_URL}/api/compendium/monsters`;

    if (params) {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value as string);
        }
      });

      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }
    }

    const response = await fetch(url, {
      ...defaultOptions,
      ...withAuth(),
    });

    return handleResponse<any[]>(response);
  },

  /**
   * Get monster by ID
   */
  getMonster: async (monsterId: string): Promise<any> => {
    const response = await fetch(
      `${API_URL}/api/compendium/monsters/${monsterId}`,
      {
        ...defaultOptions,
        ...withAuth(),
      }
    );

    return handleResponse<any>(response);
  },

  /**
   * Search compendium (all types)
   */
  searchCompendium: async (searchData: any): Promise<any> => {
    const response = await fetch(`${API_URL}/api/compendium/search`, {
      ...defaultOptions,
      method: "POST",
      body: JSON.stringify(searchData),
      ...withAuth(),
    });

    return handleResponse<any>(response);
  },

  /**
   * Get spells for a class
   */
  getClassSpells: async (className: string, level?: number): Promise<any[]> => {
    let url = `${API_URL}/api/compendium/class-spells/${className}`;

    if (level !== undefined) {
      url += `?level=${level}`;
    }

    const response = await fetch(url, {
      ...defaultOptions,
      ...withAuth(),
    });

    return handleResponse<any[]>(response);
  },

  /**
   * Get monster types
   */
  getMonsterTypes: async (): Promise<string[]> => {
    const response = await fetch(
      `${API_URL}/api/compendium/metadata/monster-types`,
      {
        ...defaultOptions,
        ...withAuth(),
      }
    );

    return handleResponse<string[]>(response);
  },

  /**
   * Get challenge ratings
   */
  getMonsterChallengeRatings: async (): Promise<string[]> => {
    const response = await fetch(
      `${API_URL}/api/compendium/metadata/challenge-ratings`,
      {
        ...defaultOptions,
        ...withAuth(),
      }
    );

    return handleResponse<string[]>(response);
  },

  /**
   * Get item types
   */
  getItemTypes: async (): Promise<string[]> => {
    const response = await fetch(
      `${API_URL}/api/compendium/metadata/item-types`,
      {
        ...defaultOptions,
        ...withAuth(),
      }
    );

    return handleResponse<string[]>(response);
  },

  /**
   * Get item rarities
   */
  getItemRarities: async (): Promise<string[]> => {
    const response = await fetch(
      `${API_URL}/api/compendium/metadata/item-rarities`,
      {
        ...defaultOptions,
        ...withAuth(),
      }
    );

    return handleResponse<string[]>(response);
  },

  /**
   * Get spell schools
   */
  getSpellSchools: async (): Promise<string[]> => {
    const response = await fetch(
      `${API_URL}/api/compendium/metadata/spell-schools`,
      {
        ...defaultOptions,
        ...withAuth(),
      }
    );

    return handleResponse<string[]>(response);
  },

  /**
   * Get spell classes
   */
  getSpellClasses: async (): Promise<string[]> => {
    const response = await fetch(
      `${API_URL}/api/compendium/metadata/spell-classes`,
      {
        ...defaultOptions,
        ...withAuth(),
      }
    );

    return handleResponse<string[]>(response);
  },
};
