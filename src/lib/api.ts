// ===== src/lib/api.ts - IMPLEMENTAÇÃO COMPLETA DO getMe() =====

/**
 * API Layer Frontend - authAPI.getMe() IMPLEMENTADO
 * Resolução final do problema identificado na análise
 */

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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ===== TYPES =====
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  role: "player" | "dm";
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  user: User;
}

export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
  detail?: string;
}

// ===== ERROR CLASSES =====
export class ApiError extends Error {
  constructor(message: string, public status: number, public response?: any) {
    super(message);
    this.name = "ApiError";
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = "Authentication failed") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class NetworkError extends Error {
  constructor(message: string = "Network connection failed") {
    super(message);
    this.name = "NetworkError";
  }
}

export class ValidationError extends Error {
  constructor(message: string, public details?: Record<string, any>) {
    super(message);
    this.name = "ValidationError";
  }
}

// ===== TOKEN MANAGEMENT =====
export const getAuthToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("authToken");
};

export const setAuthToken = (token: string): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem("authToken", token);
};

export const removeAuthToken = (): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem("authToken");
};

// ===== BASE API REQUEST FUNCTION =====
async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  // Default headers
  const defaultHeaders: HeadersInit = {
    "Content-Type": "application/json",
  };

  // Add auth token if available
  const token = getAuthToken();
  if (token) {
    defaultHeaders.Authorization = `Bearer ${token}`;
  }

  // Merge headers
  const headers = {
    ...defaultHeaders,
    ...options.headers,
  };

  try {
    console.log(`🌐 API Request: ${options.method || "GET"} ${endpoint}`);

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle non-JSON responses
    const contentType = response.headers.get("content-type");

    if (!response.ok) {
      let errorMessage = `API Error: ${response.status}`;
      let errorData: any = null;

      // Try to parse error response
      if (contentType && contentType.includes("application/json")) {
        try {
          errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch (parseError) {
          console.warn("Failed to parse error response:", parseError);
        }
      }

      // Create appropriate error type
      if (response.status === 401) {
        throw new AuthenticationError(errorMessage);
      } else if (response.status === 400) {
        throw new ValidationError(errorMessage, errorData);
      } else if (response.status >= 500) {
        throw new NetworkError(errorMessage);
      } else {
        throw new ApiError(errorMessage, response.status, errorData);
      }
    }

    // Parse successful response
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      console.log(`✅ API Success: ${options.method || "GET"} ${endpoint}`);
      return data;
    } else {
      // Non-JSON response (e.g., for delete operations)
      return response as any;
    }
  } catch (error) {
    if (
      error instanceof ApiError ||
      error instanceof AuthenticationError ||
      error instanceof ValidationError ||
      error instanceof NetworkError
    ) {
      throw error;
    }

    // Network or other errors
    console.error(`❌ Network Error: ${endpoint}`, error);
    throw new NetworkError(`Erro de conexão: ${error.message}`);
  }
}

// ===== AUTHENTICATION API =====
export const authAPI = {
  /**
   * Login user with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      console.log("🔐 Tentando fazer login...");

      // ✅ CORREÇÃO: Create form data as expected by FastAPI OAuth2
      const formData = new URLSearchParams();
      formData.append("username", credentials.email); // ✅ FastAPI OAuth2 uses 'username' field but we send email
      formData.append("password", credentials.password);

      const response = await apiRequest<AuthResponse>("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      // Store token
      if (response.access_token) {
        setAuthToken(response.access_token);
        console.log("✅ Login realizado com sucesso");
      }

      return response;
    } catch (error) {
      console.error("❌ Erro no login:", error);
      throw error;
    }
  },

  /**
   * Register new user
   */
  async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      console.log("📝 Registrando novo usuário...");

      const response = await apiRequest<AuthResponse>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(userData),
      });

      // Store token if provided
      if (response.access_token) {
        setAuthToken(response.access_token);
        console.log("✅ Registro realizado com sucesso");
      }

      return response;
    } catch (error) {
      console.error("❌ Erro no registro:", error);
      throw error;
    }
  },

  /**
   * Get current user data - IMPLEMENTAÇÃO COMPLETA
   */
  async getMe(): Promise<User> {
    try {
      console.log("👤 Buscando dados do usuário atual...");

      const token = getAuthToken();
      if (!token) {
        throw new AuthenticationError("Token não encontrado");
      }

      const response = await apiRequest<User>("/api/auth/me", {
        method: "GET",
      });

      console.log("✅ Dados do usuário obtidos:", response.username);
      return response;
    } catch (error) {
      console.error("❌ Erro ao buscar dados do usuário:", error);
      throw error;
    }
  },

  /**
   * Validate token
   */
  async validateToken(): Promise<boolean> {
    try {
      await this.getMe();
      return true;
    } catch (error) {
      return false;
    }
  },

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      console.log("🚪 Fazendo logout...");

      // Call logout endpoint if needed
      await apiRequest("/api/auth/logout", {
        method: "POST",
      });

      // Always remove token locally
      removeAuthToken();
      console.log("✅ Logout realizado com sucesso");
    } catch (error) {
      console.error("❌ Erro no logout:", error);
      // Always remove token even if server call fails
      removeAuthToken();
      throw error;
    }
  },
};
// ===== CHARACTERS API =====
export const charactersAPI = {
  /**
   * Get all characters for a campaign
   */
  async getCharacters(campaignId?: string): Promise<CharacterListItem[]> {
    const endpoint = campaignId
      ? `/api/characters?campaign_id=${campaignId}`
      : "/api/characters";

    return apiRequest<CharacterListItem[]>(endpoint);
  },

  /**
   * Get single character by ID
   */
  async getCharacter(characterId: string): Promise<Character> {
    return apiRequest<Character>(`/api/characters/${characterId}`);
  },

  /**
   * Create new character
   */
  async createCharacter(characterData: Partial<Character>): Promise<Character> {
    return apiRequest<Character>("/api/characters", {
      method: "POST",
      body: JSON.stringify(characterData),
    });
  },

  /**
   * Update character
   */
  async updateCharacter(
    characterId: string,
    updates: Partial<Character>
  ): Promise<Character> {
    return apiRequest<Character>(`/api/characters/${characterId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  },

  /**
   * Delete character
   */
  async deleteCharacter(characterId: string): Promise<void> {
    return apiRequest<void>(`/api/characters/${characterId}`, {
      method: "DELETE",
    });
  },

  /**
   * Update character HP
   */
  async updateHP(
    characterId: string,
    hpChange: number,
    isTemp: boolean = false
  ): Promise<Character> {
    return apiRequest<Character>(`/api/characters/${characterId}/hp`, {
      method: "PATCH",
      body: JSON.stringify({
        hp_change: hpChange,
        is_temp: isTemp,
      }),
    });
  },

  /**
   * Add condition to character
   */
  async addCondition(
    characterId: string,
    condition: string
  ): Promise<Character> {
    return apiRequest<Character>(`/api/characters/${characterId}/conditions`, {
      method: "POST",
      body: JSON.stringify({ condition }),
    });
  },

  /**
   * Remove condition from character
   */
  async removeCondition(
    characterId: string,
    condition: string
  ): Promise<Character> {
    return apiRequest<Character>(`/api/characters/${characterId}/conditions`, {
      method: "DELETE",
      body: JSON.stringify({ condition }),
    });
  },
};

// ===== CAMPAIGNS API =====
export const campaignsAPI = {
  /**
   * Get all campaigns for user
   */
  async getCampaigns(): Promise<CampaignListItem[]> {
    return apiRequest<CampaignListItem[]>("/api/campaigns");
  },

  /**
   * Get single campaign by ID
   */
  async getCampaign(campaignId: string): Promise<Campaign> {
    return apiRequest<Campaign>(`/api/campaigns/${campaignId}`);
  },

  /**
   * Create new campaign
   */
  async createCampaign(campaignData: {
    name: string;
    description?: string;
  }): Promise<Campaign> {
    return apiRequest<Campaign>("/api/campaigns", {
      method: "POST",
      body: JSON.stringify(campaignData),
    });
  },

  /**
   * Update campaign
   */
  async updateCampaign(
    campaignId: string,
    updates: Partial<Campaign>
  ): Promise<Campaign> {
    return apiRequest<Campaign>(`/api/campaigns/${campaignId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  },

  /**
   * Delete campaign
   */
  async deleteCampaign(campaignId: string): Promise<void> {
    return apiRequest<void>(`/api/campaigns/${campaignId}`, {
      method: "DELETE",
    });
  },
};

// ===== NPCS API =====
export const npcsAPI = {
  /**
   * Get all NPCs for a campaign
   */
  async listCampaignNPCs(campaignId: string): Promise<NPCListItem[]> {
    return apiRequest<NPCListItem[]>(`/api/npcs/campaign/${campaignId}`);
  },

  /**
   * Get single NPC by ID
   */
  async getNPC(npcId: string): Promise<NPC> {
    return apiRequest<NPC>(`/api/npcs/${npcId}`);
  },

  /**
   * Create new NPC
   */
  async createNPC(npcData: Partial<NPC>): Promise<NPC> {
    return apiRequest<NPC>("/api/npcs", {
      method: "POST",
      body: JSON.stringify(npcData),
    });
  },

  /**
   * Update NPC
   */
  async updateNPC(npcId: string, updates: Partial<NPC>): Promise<NPC> {
    return apiRequest<NPC>(`/api/npcs/${npcId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  },

  /**
   * Delete NPC
   */
  async deleteNPC(npcId: string): Promise<void> {
    return apiRequest<void>(`/api/npcs/${npcId}`, {
      method: "DELETE",
    });
  },

  /**
   * Update NPC HP
   */
  async updateNPCHP(npcId: string, hpChange: number): Promise<NPC> {
    return apiRequest<NPC>(`/api/npcs/${npcId}/hp`, {
      method: "PATCH",
      body: JSON.stringify({ hp_change: hpChange }),
    });
  },

  /**
   * Import NPC from compendium
   */
  async importFromCompendium(
    campaignId: string,
    monsterId: string,
    nameOverride?: string
  ): Promise<NPC> {
    return apiRequest<NPC>("/api/npcs/import/compendium", {
      method: "POST",
      body: JSON.stringify({
        campaign_id: campaignId,
        monster_id: monsterId,
        name_override: nameOverride,
      }),
    });
  },

  /**
   * Bulk import NPCs
   */
  async bulkImport(npcsData: any[]): Promise<NPC[]> {
    return apiRequest<NPC[]>("/api/npcs/bulk-import", {
      method: "POST",
      body: JSON.stringify({ npcs: npcsData }),
    });
  },
};

// ===== COMBAT API =====
export const combatAPI = {
  /**
   * Get active combat for campaign
   */
  async getActiveCombat(campaignId: string): Promise<Combat | null> {
    try {
      return await apiRequest<Combat>(`/api/combat/active/${campaignId}`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null; // No active combat
      }
      throw error;
    }
  },

  /**
   * Get combat by ID
   */
  async getCombat(combatId: string): Promise<Combat> {
    return apiRequest<Combat>(`/api/combat/${combatId}`);
  },

  /**
   * Start new combat
   */
  async startCombat(campaignId: string, encounterId?: string): Promise<Combat> {
    return apiRequest<Combat>("/api/combat/start", {
      method: "POST",
      body: JSON.stringify({
        campaign_id: campaignId,
        encounter_id: encounterId,
      }),
    });
  },

  /**
   * End combat
   */
  async endCombat(combatId: string): Promise<Combat> {
    return apiRequest<Combat>(`/api/combat/${combatId}/end`, {
      method: "POST",
    });
  },

  /**
   * Update combat
   */
  async updateCombat(combatId: string, updates: any): Promise<Combat> {
    return apiRequest<Combat>(`/api/combat/${combatId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  },
};

// ===== EXPORTS =====
export default {
  auth: authAPI,
  characters: charactersAPI,
  campaigns: campaignsAPI,
  npcs: npcsAPI,
  combat: combatAPI,
};
