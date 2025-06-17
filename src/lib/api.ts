/**
 * API Layer Frontend - COMPLETAMENTE REFATORADO
 * Problemas resolvidos:
 * 1. ✅ Função login() completada (estava cortada)
 * 2. ✅ Função getMe() implementada (estava ausente)
 * 3. ✅ Proper error handling em todas as requests
 * 4. ✅ Token management adequado
 * 5. ✅ TypeScript types consistentes
 * 6. ✅ Todas as APIs necessárias implementadas
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
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
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
          console.warn("Could not parse error response as JSON");
        }
      } else {
        errorMessage = response.statusText || errorMessage;
      }

      // Handle specific HTTP status codes
      if (response.status === 401) {
        removeAuthToken();
        throw new AuthenticationError(errorMessage);
      }

      if (response.status === 403) {
        throw new ApiError("Acesso negado", response.status, errorData);
      }

      if (response.status === 404) {
        throw new ApiError(
          "Recurso não encontrado",
          response.status,
          errorData
        );
      }

      if (response.status === 422) {
        throw new ValidationError(errorMessage, errorData);
      }

      if (response.status >= 500) {
        throw new ApiError(
          "Erro interno do servidor",
          response.status,
          errorData
        );
      }

      throw new ApiError(errorMessage, response.status, errorData);
    }

    // Handle empty responses
    if (!contentType || !contentType.includes("application/json")) {
      return {} as T;
    }

    const data = await response.json();
    console.log(`✅ API Response: ${endpoint}`, data);

    return data;
  } catch (error) {
    // Network or parsing errors
    if (error instanceof TypeError || error.message.includes("fetch")) {
      console.error(`❌ Network Error: ${endpoint}`, error);
      throw new NetworkError();
    }

    // Re-throw known errors
    if (
      error instanceof ApiError ||
      error instanceof AuthenticationError ||
      error instanceof ValidationError
    ) {
      console.error(`❌ API Error: ${endpoint}`, error);
      throw error;
    }

    // Unknown errors
    console.error(`❌ Unknown Error: ${endpoint}`, error);
    throw new Error(`Erro inesperado: ${error.message}`);
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

      // Create form data as expected by FastAPI OAuth2
      const formData = new URLSearchParams();
      formData.append("username", credentials.email); // FastAPI OAuth2 uses 'username' field
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
   * Get current user data
   */
  async getMe(): Promise<User> {
    try {
      console.log("👤 Buscando dados do usuário atual...");

      const token = getAuthToken();
      if (!token) {
        throw new AuthenticationError("Token não encontrado");
      }

      const response = await apiRequest<User>("/api/auth/me");
      console.log("✅ Dados do usuário obtidos com sucesso");

      return response;
    } catch (error) {
      console.error("❌ Erro ao buscar dados do usuário:", error);
      throw error;
    }
  },

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      console.log("🚪 Fazendo logout...");

      // Call logout endpoint if it exists
      try {
        await apiRequest("/api/auth/logout", {
          method: "POST",
        });
      } catch (error) {
        // Ignore server errors on logout
        console.warn("Logout endpoint error (ignoring):", error);
      }

      // Always remove token locally
      removeAuthToken();
      console.log("✅ Logout realizado com sucesso");
    } catch (error) {
      // Always remove token even if server call fails
      removeAuthToken();
      console.error("❌ Erro no logout:", error);
    }
  },

  /**
   * Validate current token
   */
  async validateToken(): Promise<boolean> {
    try {
      await this.getMe();
      return true;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        removeAuthToken();
      }
      return false;
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
    isTemp?: boolean
  ): Promise<void> {
    return apiRequest<void>(`/api/characters/${characterId}/hp`, {
      method: "PATCH",
      body: JSON.stringify({
        hp_change: hpChange,
        is_temp: isTemp || false,
      }),
    });
  },
};

// ===== CAMPAIGNS API =====
export const campaignsAPI = {
  /**
   * Get all campaigns for current user
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
  async createCampaign(campaignData: Partial<Campaign>): Promise<Campaign> {
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
   * Create new combat
   */
  async createCombat(
    campaignId: string,
    encounterId?: string
  ): Promise<Combat> {
    return apiRequest<Combat>("/api/combat", {
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
  async endCombat(combatId: string): Promise<void> {
    return apiRequest<void>(`/api/combat/${combatId}/end`, {
      method: "POST",
    });
  },

  /**
   * Roll initiative
   */
  async rollInitiative(
    combatId: string,
    entityId: string,
    entityType: "character" | "npc",
    initiativeValue?: number
  ): Promise<void> {
    return apiRequest<void>(`/api/combat/${combatId}/initiative`, {
      method: "POST",
      body: JSON.stringify({
        entity_id: entityId,
        entity_type: entityType,
        initiative_value: initiativeValue,
      }),
    });
  },
};

// ===== NPCs API =====
export const npcsAPI = {
  /**
   * Get all NPCs for a campaign
   */
  async getNPCs(campaignId: string): Promise<NPCListItem[]> {
    return apiRequest<NPCListItem[]>(`/api/npcs?campaign_id=${campaignId}`);
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
};

// ===== COMPENDIUM API =====
export const compendiumAPI = {
  /**
   * Search spells
   */
  async searchSpells(query?: string, level?: number): Promise<any[]> {
    const params = new URLSearchParams();
    if (query) params.append("q", query);
    if (level !== undefined) params.append("level", level.toString());

    const endpoint = `/api/compendium/spells?${params.toString()}`;
    return apiRequest<any[]>(endpoint);
  },

  /**
   * Search items
   */
  async searchItems(query?: string, category?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (query) params.append("q", query);
    if (category) params.append("category", category);

    const endpoint = `/api/compendium/items?${params.toString()}`;
    return apiRequest<any[]>(endpoint);
  },

  /**
   * Search monsters
   */
  async searchMonsters(query?: string, cr?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (query) params.append("q", query);
    if (cr) params.append("cr", cr);

    const endpoint = `/api/compendium/monsters?${params.toString()}`;
    return apiRequest<any[]>(endpoint);
  },
};

// Export all APIs
export {
  authAPI as default,
  charactersAPI,
  campaignsAPI,
  combatAPI,
  npcsAPI,
  compendiumAPI,
};

// Export types
export type { User, AuthResponse, LoginCredentials, RegisterData };
