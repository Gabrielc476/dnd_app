// hooks/useAuth.ts
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

/**
 * Hook for authentication management
 */
export function useAuth(): UseAuthReturn {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  /**
   * Load user from localStorage and validate token
   */
  useEffect(() => {
    const loadUser = async () => {
      const storedToken = localStorage.getItem("authToken");
      const storedUser = localStorage.getItem("user");

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));

        try {
          // Verify token is still valid by fetching user details
          const userData = await authAPI.getMe();
          setUser(userData);
          localStorage.setItem("user", JSON.stringify(userData));
        } catch (error) {
          console.error("Token validation failed:", error);
          // Token is invalid, clear storage
          logout();
        }
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
      setIsLoading(true);
      try {
        const authData = await authAPI.login(username, password);

        // Save token and user data
        localStorage.setItem("authToken", authData.access_token);

        // Fetch user details
        const userData = await authAPI.getMe();
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));

        setToken(authData.access_token);
        setIsLoading(false);
        return true;
      } catch (error) {
        console.error("Login failed:", error);
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
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    setUser(null);
    setToken(null);
    router.push("/login");
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

  return {
    user,
    token,
    isLoading,
    isAuthenticated: !!user && !!token,
    login,
    logout,
    register,
    refreshToken,
  };
}

export default useAuth;
