// ===== src/hooks/useAuth.ts - HOOK ATUALIZADO PARA USAR getMe() =====

/**
 * useAuth Hook - ATUALIZADO COM getMe() FUNCIONANDO
 * Integração completa com a API implementada
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
import { useRouter } from "next/navigation";
import {
  authAPI,
  AuthenticationError,
  NetworkError,
  type User,
  type LoginCredentials,
  type RegisterData,
} from "@/lib/api";

// ===== TYPES =====
interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
  logout: () => Promise<void>;
  validateToken: () => Promise<void>;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

export interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
  logout: () => Promise<void>;
  validateToken: () => Promise<void>;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

// ===== CONTEXT =====
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ===== PROVIDER COMPONENT =====
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
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

  // Refresh user data using getMe()
  const refreshUser = useCallback(async () => {
    try {
      console.log("🔄 Atualizando dados do usuário...");

      // ✅ USANDO A FUNÇÃO getMe() IMPLEMENTADA
      const userData = await authAPI.getMe();

      updateState({
        user: userData,
        isAuthenticated: true,
        error: null,
      });

      console.log("✅ Dados do usuário atualizados:", userData.username);
    } catch (error) {
      console.error("❌ Erro ao atualizar dados do usuário:", error);

      if (error instanceof AuthenticationError) {
        updateState({
          user: null,
          isAuthenticated: false,
          error: null, // Don't show error for token expiration
        });
      } else {
        updateState({
          error: error instanceof Error ? error.message : "Erro desconhecido",
        });
      }
    }
  }, [updateState]);

  // Validate token using getMe()
  const validateToken = useCallback(async () => {
    try {
      updateState({ isLoading: true });

      // ✅ USANDO validateToken QUE USA getMe() INTERNAMENTE
      const isValid = await authAPI.validateToken();

      if (isValid) {
        await refreshUser();
      } else {
        updateState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      }
    } catch (error) {
      console.error("❌ Erro na validação do token:", error);
      updateState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  }, [updateState, refreshUser]);

  // Initialize auth on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem("authToken");

      if (!token) {
        updateState({
          isLoading: false,
          isAuthenticated: false,
          user: null,
          error: null,
        });
        return;
      }

      try {
        console.log("🔍 Validando token existente...");

        // ✅ USANDO getMe() PARA VALIDAR E OBTER DADOS DO USUÁRIO
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
    async (credentials: LoginCredentials): Promise<boolean> => {
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
        return true;
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

        return false;
      }
    },
    [updateState]
  );

  // Register function
  const register = useCallback(
    async (userData: RegisterData): Promise<boolean> => {
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
        return true;
      } catch (error) {
        console.error("❌ Erro no registro:", error);

        let errorMessage = "Erro ao criar conta";

        if (error instanceof NetworkError) {
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

        return false;
      }
    },
    [updateState]
  );

  // Logout function
  const logout = useCallback(async () => {
    try {
      updateState({ isLoading: true });
      console.log("🚪 Fazendo logout...");

      await authAPI.logout();

      updateState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
      });

      console.log("✅ Logout realizado com sucesso");

      // Redirect to home page
      router.push("/");
    } catch (error) {
      console.error("❌ Erro no logout:", error);

      // Always logout locally even if server call fails
      updateState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
      });

      router.push("/");
    }
  }, [updateState, router]);

  const contextValue: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    validateToken,
    clearError,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

// ===== HOOK =====
export function useAuth(): UseAuthReturn {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

// ===== STANDALONE HOOK (for backward compatibility) =====
export function useAuthStandalone(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    error: null,
    isAuthenticated: false,
  });

  const router = useRouter();

  // Helper function to update state
  const updateState = useCallback((updates: Partial<AuthState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  // Refresh user data using getMe()
  const refreshUser = useCallback(async () => {
    try {
      // ✅ USANDO A FUNÇÃO getMe() IMPLEMENTADA
      const userData = await authAPI.getMe();
      updateState({
        user: userData,
        isAuthenticated: true,
        error: null,
      });
    } catch (error) {
      console.error("❌ Erro ao atualizar dados do usuário:", error);

      if (error instanceof AuthenticationError) {
        updateState({
          user: null,
          isAuthenticated: false,
          error: null,
        });
      }
    }
  }, [updateState]);

  // Validate token using getMe()
  const validateToken = useCallback(async () => {
    try {
      updateState({ isLoading: true });

      // ✅ USANDO validateToken QUE USA getMe() INTERNAMENTE
      const isValid = await authAPI.validateToken();

      if (isValid) {
        await refreshUser();
      } else {
        updateState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      }
    } catch (error) {
      console.error("❌ Erro na validação do token:", error);
      updateState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  }, [updateState, refreshUser]);

  // Initialize auth on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem("authToken");

      if (!token) {
        updateState({
          isLoading: false,
          isAuthenticated: false,
          user: null,
          error: null,
        });
        return;
      }

      try {
        console.log("🔍 Validando token existente...");

        // ✅ USANDO getMe() PARA VALIDAR E OBTER DADOS DO USUÁRIO
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
          error: null,
        });
      }
    };

    initializeAuth();
  }, [updateState, refreshUser]);

  // Login function
  const login = useCallback(
    async (credentials: LoginCredentials): Promise<boolean> => {
      try {
        updateState({ isLoading: true, error: null });
        const response = await authAPI.login(credentials);

        updateState({
          user: response.user,
          isLoading: false,
          isAuthenticated: true,
          error: null,
        });

        return true;
      } catch (error) {
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

        return false;
      }
    },
    [updateState]
  );

  // Register function
  const register = useCallback(
    async (userData: RegisterData): Promise<boolean> => {
      try {
        updateState({ isLoading: true, error: null });
        const response = await authAPI.register(userData);

        updateState({
          user: response.user,
          isLoading: false,
          isAuthenticated: true,
          error: null,
        });

        return true;
      } catch (error) {
        let errorMessage = "Erro ao criar conta";

        if (error instanceof NetworkError) {
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

        return false;
      }
    },
    [updateState]
  );

  // Logout function
  const logout = useCallback(async () => {
    try {
      updateState({ isLoading: true });
      await authAPI.logout();

      updateState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
      });

      router.push("/");
    } catch (error) {
      updateState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
      });

      router.push("/");
    }
  }, [updateState, router]);

  return {
    ...state,
    login,
    register,
    logout,
    validateToken,
    clearError,
    refreshUser,
  };
}

export default useAuth;
