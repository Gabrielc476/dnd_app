/**
 * useAuth Hook - CORRIGIDO
 * Problemas resolvidos:
 * 1. ✅ Função getMe() agora está implementada na API
 * 2. ✅ Proper error handling
 * 3. ✅ Loading states adequados
 * 4. ✅ Token validation
 * 5. ✅ Automatic logout on invalid token
 */

"use client";

import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
  ReactNode,
} from "react";
import { authAPI, AuthenticationError, NetworkError } from "@/lib/api";
import type { User, LoginCredentials, RegisterData } from "@/lib/api";

// Types
interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  validateToken: () => Promise<void>;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

// Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider Component
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    error: null,
    isAuthenticated: false,
  });

  // Helper function to update state
  const updateState = useCallback((updates: Partial<AuthState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  // Check if we have a valid token on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem("authToken");

      if (!token) {
        updateState({ isLoading: false, isAuthenticated: false });
        return;
      }

      try {
        console.log("🔍 Validando token existente...");
        const userData = await authAPI.getMe();

        updateState({
          user: userData,
          isLoading: false,
          isAuthenticated: true,
          error: null,
        });

        console.log("✅ Token válido, usuário autenticado:", userData.username);
      } catch (error) {
        console.error("❌ Token inválido:", error);

        // Remove invalid token
        localStorage.removeItem("authToken");

        updateState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          error: null, // Don't show error on initial load
        });
      }
    };

    initializeAuth();
  }, [updateState]);

  // Login function
  const login = useCallback(
    async (credentials: LoginCredentials) => {
      try {
        updateState({ isLoading: true, error: null });
        console.log("🔐 Tentando fazer login...");

        const response = await authAPI.login(credentials);

        updateState({
          user: response.user,
          isLoading: false,
          isAuthenticated: true,
          error: null,
        });

        console.log("✅ Login realizado com sucesso:", response.user.username);
      } catch (error) {
        console.error("❌ Erro no login:", error);

        let errorMessage = "Erro ao fazer login";

        if (error instanceof AuthenticationError) {
          errorMessage = "Email ou senha incorretos";
        } else if (error instanceof NetworkError) {
          errorMessage = "Erro de conexão. Verifique sua internet.";
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }

        updateState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          error: errorMessage,
        });

        throw error;
      }
    },
    [updateState]
  );

  // Register function
  const register = useCallback(
    async (userData: RegisterData) => {
      try {
        updateState({ isLoading: true, error: null });
        console.log("📝 Tentando registrar usuário...");

        const response = await authAPI.register(userData);

        updateState({
          user: response.user,
          isLoading: false,
          isAuthenticated: true,
          error: null,
        });

        console.log(
          "✅ Registro realizado com sucesso:",
          response.user.username
        );
      } catch (error) {
        console.error("❌ Erro no registro:", error);

        let errorMessage = "Erro ao criar conta";

        if (error instanceof NetworkError) {
          errorMessage = "Erro de conexão. Verifique sua internet.";
        } else if (error instanceof Error) {
          if (error.message.includes("email")) {
            errorMessage = "Este email já está em uso";
          } else if (error.message.includes("username")) {
            errorMessage = "Este nome de usuário já está em uso";
          } else {
            errorMessage = error.message;
          }
        }

        updateState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          error: errorMessage,
        });

        throw error;
      }
    },
    [updateState]
  );

  // Logout function
  const logout = useCallback(async () => {
    try {
      updateState({ isLoading: true, error: null });
      console.log("🚪 Fazendo logout...");

      await authAPI.logout();

      updateState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
      });

      console.log("✅ Logout realizado com sucesso");
    } catch (error) {
      console.error("❌ Erro no logout:", error);

      // Even if logout fails, clear local state
      updateState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
      });

      // Don't throw error for logout failures
    }
  }, [updateState]);

  // Validate token function
  const validateToken = useCallback(async () => {
    try {
      console.log("🔍 Validando token...");

      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new AuthenticationError("Token não encontrado");
      }

      const userData = await authAPI.getMe();

      updateState({
        user: userData,
        isAuthenticated: true,
        error: null,
      });

      console.log("✅ Token válido");
    } catch (error) {
      console.error("❌ Token inválido:", error);

      // Remove invalid token
      localStorage.removeItem("authToken");

      updateState({
        user: null,
        isAuthenticated: false,
        error: "Sessão expirada. Faça login novamente.",
      });

      throw error;
    }
  }, [updateState]);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    try {
      if (!state.isAuthenticated) {
        return;
      }

      console.log("🔄 Atualizando dados do usuário...");
      const userData = await authAPI.getMe();

      updateState({
        user: userData,
        error: null,
      });

      console.log("✅ Dados do usuário atualizados");
    } catch (error) {
      console.error("❌ Erro ao atualizar dados do usuário:", error);

      if (error instanceof AuthenticationError) {
        // Token became invalid, logout user
        await logout();
      }
    }
  }, [state.isAuthenticated, updateState, logout]);

  // Auto-refresh user data every 5 minutes
  useEffect(() => {
    if (!state.isAuthenticated) return;

    const interval = setInterval(() => {
      refreshUser();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [state.isAuthenticated, refreshUser]);

  // Context value
  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    validateToken,
    clearError,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

// Hook for components that only need auth state (no actions)
export function useAuthState(): AuthState {
  const { user, isLoading, error, isAuthenticated } = useAuth();
  return { user, isLoading, error, isAuthenticated };
}

// Hook to check if user has specific permissions
export function usePermissions() {
  const { user } = useAuth();

  return {
    canCreateCampaign: Boolean(user?.is_active),
    canEditCampaign: (campaignOwnerId: string) => user?.id === campaignOwnerId,
    canDeleteCampaign: (campaignOwnerId: string) =>
      user?.id === campaignOwnerId,
    canEditCharacter: (characterOwnerId: string) =>
      user?.id === characterOwnerId,
    isAdmin: false, // Implement admin role if needed
  };
}

// Export everything
export default useAuth;
export type { AuthState, AuthContextType };
