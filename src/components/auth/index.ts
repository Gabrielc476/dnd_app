// src/components/auth/index.ts

// Auth components
export { AuthGuard, useRequireAuth } from "./AuthGuard";

// Types
export interface AuthComponentProps {
  children: React.ReactNode;
}

export interface ProtectedRouteProps extends AuthComponentProps {
  requiredRole?: "player" | "dm";
  redirectTo?: string;
}
