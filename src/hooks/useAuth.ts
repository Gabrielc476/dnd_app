// =====================================================
// HOOK useAuth CORRIGIDO - src/hooks/useAuth.ts
// =====================================================

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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

  // ✅ Estados centralizados
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // ✅ Ref para evitar múltiplas inicializações
  const hasInitialized = useRef(false);
  const isRefreshing = useRef(false);

  // ✅ Calcular isAuthenticated de forma mais robusta
  const isAuthenticated = Boolean(user && token);

  /**
   * ✅ INICIALIZAÇÃO ÚNICA E SEGURA
   */
  useEffect(() => {
    if (hasInitialized.current) {
      return;
    }

    const initializeAuth = async () => {
      console.log("🔄 Inicializando autenticação...");
      hasInitialized.current = true;

      try {
        const storedToken = localStorage.getItem("authToken");
        const storedUser = localStorage.getItem("user");

        if (!storedToken || !storedUser) {
          console.log("📭 Nenhum token ou usuário armazenado");
          setIsLoading(false);
          return;
        }

        console.log("📦 Dados encontrados no localStorage");

        // ✅ Parse do usuário armazenado
        let parsedUser: User;
        try {
          parsedUser = JSON.parse(storedUser);
        } catch (parseError) {
          console.error("❌ Erro ao fazer parse do usuário:", parseError);
          clearAuthData();
          setIsLoading(false);
          return;
        }

        // ✅ Definir estados iniciais
        setToken(storedToken);
        setUser(parsedUser);

        console.log("✅ Estados iniciais definidos");

        // ✅ Validar token (opcional e sem bloquear)
        try {
          console.log("🔍 Validando token...");
          const freshUserData = await authAPI.getMe();

          // ✅ Atualizar com dados frescos
          setUser(freshUserData);
          localStorage.setItem("user", JSON.stringify(freshUserData));

          console.log("✅ Token validado e dados atualizados");
        } catch (validationError) {
          console.warn("⚠️ Erro na validação do token:", validationError);
          // ✅ Manter dados locais mesmo com erro de validação
          // O usuário pode continuar usando a aplicação
        }
      } catch (error) {
        console.error("❌ Erro na inicialização:", error);
        clearAuthData();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  /**
   * ✅ FUNÇÃO PARA LIMPAR DADOS DE AUTENTICAÇÃO
   */
  const clearAuthData = useCallback(() => {
    console.log("🧹 Limpando dados de autenticação");
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    setUser(null);
    setToken(null);
  }, []);

  /**
   * ✅ LOGIN MELHORADO
   */
  const login = useCallback(
    async (username: string, password: string): Promise<boolean> => {
      console.log("🚀 Iniciando login para:", username);

      if (isLoading) {
        console.log("⏳ Sistema ainda carregando, aguarde");
        return false;
      }

      setIsLoading(true);

      try {
        // ✅ Fazer login
        console.log("📡 Enviando credenciais...");
        const authData = await authAPI.login(username, password);

        // ✅ Salvar token imediatamente
        console.log("💾 Salvando token...");
        localStorage.setItem("authToken", authData.access_token);
        setToken(authData.access_token);

        // ✅ Buscar dados do usuário
        console.log("👤 Buscando dados do usuário...");
        const userData = await authAPI.getMe();

        // ✅ Salvar dados do usuário
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));

        console.log("🎉 Login realizado com sucesso!");

        setIsLoading(false);
        return true;
      } catch (error) {
        console.error("❌ Erro no login:", error);
        clearAuthData();
        setIsLoading(false);
        return false;
      }
    },
    [isLoading, clearAuthData]
  );

  /**
   * ✅ REGISTER SIMPLIFICADO
   */
  const register = useCallback(
    async (userData: {
      username: string;
      email: string;
      password: string;
      role: string;
    }): Promise<boolean> => {
      if (isLoading) return false;

      setIsLoading(true);
      try {
        await authAPI.register(userData);
        setIsLoading(false);
        return true;
      } catch (error) {
        console.error("❌ Erro no registro:", error);
        setIsLoading(false);
        return false;
      }
    },
    [isLoading]
  );

  /**
   * ✅ LOGOUT MELHORADO
   */
  const logout = useCallback(() => {
    console.log("🚪 Fazendo logout...");
    clearAuthData();

    // ✅ Redirecionamento seguro
    setTimeout(() => {
      router.replace("/auth");
    }, 100);
  }, [clearAuthData, router]);

  /**
   * ✅ REFRESH TOKEN COM PROTEÇÃO
   */
  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (isRefreshing.current) {
      console.log("🔄 Refresh já em andamento");
      return false;
    }

    isRefreshing.current = true;

    try {
      const authData = await authAPI.refreshToken();
      localStorage.setItem("authToken", authData.access_token);
      setToken(authData.access_token);

      console.log("✅ Token atualizado com sucesso");
      return true;
    } catch (error) {
      console.error("❌ Erro ao atualizar token:", error);
      logout();
      return false;
    } finally {
      isRefreshing.current = false;
    }
  }, [logout]);

  // ✅ Debug log com throttling
  useEffect(() => {
    const logTimer = setTimeout(() => {
      console.log("📊 Estado de autenticação:", {
        hasUser: !!user,
        hasToken: !!token,
        isAuthenticated,
        isLoading,
        userName: user?.username,
        userRole: user?.role,
      });
    }, 100);

    return () => clearTimeout(logTimer);
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
