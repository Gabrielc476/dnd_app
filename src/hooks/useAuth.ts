// =====================================================
// 1. CORREÇÃO PRINCIPAL: src/hooks/useAuth.ts
// =====================================================

"use client";

import { useState, useEffect, useCallback } from "react";
import { authAPI } from "@/lib/api";
import { User, AuthToken } from "@/lib/types";
import { useRouter } from "next/navigation";

export interface UseAuthReturn {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (userData: {
    username: string;
    email: string;
    password: string;
    role: string;
  }) => Promise<boolean>;
  refreshToken: () => Promise<boolean>;
}

export function useAuth(): UseAuthReturn {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Calcular isAuthenticated baseado nos estados atuais
  const isAuthenticated = Boolean(user && token);

  /**
   * Load user from localStorage and validate token
   */
  useEffect(() => {
    const loadUser = async () => {
      console.log("🔄 Carregando dados do usuário...");

      const storedToken = localStorage.getItem("authToken");
      const storedUser = localStorage.getItem("user");

      if (storedToken && storedUser) {
        try {
          console.log("📦 Token e usuário encontrados no localStorage");

          // Set initial state from localStorage
          setToken(storedToken);
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);

          console.log("✅ Dados iniciais carregados:", parsedUser);

          // Verify token is still valid (optional - can be skipped for faster loading)
          try {
            const userData = await authAPI.getMe();
            setUser(userData);
            localStorage.setItem("user", JSON.stringify(userData));
            console.log("✅ Token validado e dados atualizados");
          } catch (validationError) {
            console.warn(
              "⚠️ Erro na validação do token, mas mantendo dados locais:",
              validationError
            );
            // Não fazer logout imediatamente, manter os dados do localStorage
            // O usuário ainda pode usar a aplicação com os dados em cache
          }
        } catch (error) {
          console.error("❌ Erro ao carregar dados do localStorage:", error);
          logout();
        }
      } else {
        console.log("📭 Nenhum token ou usuário encontrado no localStorage");
      }

      setIsLoading(false);
    };

    loadUser();
  }, []);

  /**
   * Login user
   */
  const login = useCallback(
    async (username: string, password: string): Promise<boolean> => {
      console.log("🚀 Iniciando processo de login...");
      setIsLoading(true);

      try {
        console.log("📡 Enviando credenciais para API...");
        const authData = await authAPI.login(username, password);
        console.log("✅ Resposta da API recebida:", authData);

        // Save token immediately
        console.log("💾 Salvando token...");
        localStorage.setItem("authToken", authData.access_token);
        setToken(authData.access_token);

        // Fetch user details
        console.log("👤 Buscando dados do usuário...");
        const userData = await authAPI.getMe();
        console.log("✅ Dados do usuário recebidos:", userData);

        // Save user data
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));

        console.log("🎉 Login realizado com sucesso!");
        console.log(
          "📊 Estado final - Token:",
          !!authData.access_token,
          "User:",
          !!userData
        );

        setIsLoading(false);

        // Force a small delay to ensure state is updated
        await new Promise((resolve) => setTimeout(resolve, 100));

        return true;
      } catch (error) {
        console.error("❌ Erro no login:", error);

        // Clear any partial state
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
        setUser(null);
        setToken(null);

        setIsLoading(false);
        return false;
      }
    },
    []
  );

  /**
   * Register new user
   */
  const register = useCallback(
    async (userData: {
      username: string;
      email: string;
      password: string;
      role: string;
    }): Promise<boolean> => {
      setIsLoading(true);
      try {
        await authAPI.register(userData);
        setIsLoading(false);
        return true;
      } catch (error) {
        console.error("Registration failed:", error);
        setIsLoading(false);
        return false;
      }
    },
    []
  );

  /**
   * Logout user
   */
  const logout = useCallback(() => {
    console.log("🚪 Fazendo logout...");
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    setUser(null);
    setToken(null);
    router.push("/auth");
  }, [router]);

  /**
   * Refresh token
   */
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const authData = await authAPI.refreshToken();
      localStorage.setItem("authToken", authData.access_token);
      setToken(authData.access_token);
      return true;
    } catch (error) {
      console.error("Token refresh failed:", error);
      logout();
      return false;
    }
  }, [logout]);

  // Debug log do estado atual
  useEffect(() => {
    console.log("📊 Estado de autenticação atualizado:", {
      hasUser: !!user,
      hasToken: !!token,
      isAuthenticated,
      isLoading,
      userName: user?.username,
    });
  }, [user, token, isAuthenticated, isLoading]);

  return {
    user,
    token,
    isLoading,
    isAuthenticated,
    login,
    logout,
    register,
    refreshToken,
  };
}

export default useAuth;
