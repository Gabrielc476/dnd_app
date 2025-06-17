// src/app/layout.tsx - FIXED VERSION

"use client";

import React, { useEffect, useState } from "react";
import { Inter } from "next/font/google";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  BookOpen,
  Home,
  Map,
  Settings,
  Shield,
  Swords,
  Users,
  Menu,
  X,
  LogOut,
  User,
  Wifi,
  WifiOff,
  CheckCircle,
} from "lucide-react";

import "./globals.css";

// ===== IMPORTS =====
import { AuthProvider, useAuth } from "@/hooks/useAuth"; // ✅ Import AuthProvider
import { useGameStore } from "@/stores/gameStore";
import { StoreProvider, initializeStores } from "@/stores";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";

// UI Components
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";

const inter = Inter({ subsets: ["latin"] });

// Navigation items
const navigationItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Home,
    description: "Campaign overview and quick access",
  },
  {
    title: "Characters",
    href: "/characters",
    icon: Users,
    description: "Manage player characters",
  },
  {
    title: "Combat",
    href: "/combat",
    icon: Swords,
    description: "Combat tracker and initiative",
  },
  {
    title: "NPCs",
    href: "/npcs",
    icon: Shield,
    description: "Non-player character management",
  },
  {
    title: "Campaign",
    href: "/campaign",
    icon: Map,
    description: "Campaign builder and encounters",
  },
  {
    title: "Compendium",
    href: "/compendium",
    icon: BookOpen,
    description: "Spells, items, and monsters",
  },
];

// ✅ AUTHGUARD COMPONENT - CORRIGIDO PARA ESTRUTURA REAL
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // ✅ Páginas públicas reais (landing + auth unificado)
  const publicPages = [
    "/", // Landing page
    "/auth", // Auth unificada (login + register)
  ];
  const isPublicPage = publicPages.includes(pathname);

  // ✅ Handle redirects in useEffect to avoid render-time state updates
  useEffect(() => {
    if (!isLoading) {
      // Se não está autenticado e não está em página pública → ir para /auth
      if (!isAuthenticated && !isPublicPage) {
        router.push("/auth");
      }
      // Se está autenticado e está em página pública → ir para dashboard
      else if (isAuthenticated && isPublicPage) {
        router.push("/dashboard");
      }
    }
  }, [isLoading, isAuthenticated, isPublicPage, router, pathname]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="text-muted-foreground">Carregando...</span>
        </div>
      </div>
    );
  }

  // Se não está autenticado e não é página pública → mostrar loading enquanto redireciona
  if (!isAuthenticated && !isPublicPage) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="text-muted-foreground">
            Redirecionando para login...
          </span>
        </div>
      </div>
    );
  }

  // Se está autenticado e em página pública → mostrar loading enquanto redireciona
  if (isAuthenticated && isPublicPage) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="text-muted-foreground">
            Redirecionando para dashboard...
          </span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// ✅ MAIN LAYOUT COMPONENT
function MainLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const { isConnected, error: connectionError } = useGameStore();

  // ✅ Não mostrar sidebar apenas nas páginas públicas reais
  const isPublicPage = pathname === "/" || pathname === "/auth";

  if (isPublicPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-1 min-h-0 bg-card border-r">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between h-16 px-6 border-b">
            <h1 className="text-xl font-bold">D&D VTT</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigationItems.map((item) => (
              <Button
                key={item.href}
                variant={pathname === item.href ? "default" : "ghost"}
                className="w-full justify-start"
                asChild
              >
                <a href={item.href}>
                  <item.icon className="mr-3 h-4 w-4" />
                  {item.title}
                </a>
              </Button>
            ))}
          </nav>

          {/* User info */}
          <div className="p-4 border-t">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start">
                  <Avatar className="mr-3 h-8 w-8">
                    <AvatarFallback>
                      {user?.username?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{user?.username || "User"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex flex-col h-full">
            <SheetHeader className="p-6 border-b">
              <SheetTitle>D&D VTT</SheetTitle>
              <SheetDescription>Virtual Tabletop</SheetDescription>
            </SheetHeader>
            <nav className="flex-1 px-4 py-6 space-y-2">
              {navigationItems.map((item) => (
                <Button
                  key={item.href}
                  variant={pathname === item.href ? "default" : "ghost"}
                  className="w-full justify-start"
                  asChild
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <a href={item.href}>
                    <item.icon className="mr-3 h-4 w-4" />
                    {item.title}
                  </a>
                </Button>
              ))}
            </nav>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between h-16 px-6 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h2 className="text-lg font-semibold capitalize">
              {pathname.slice(1) || "Dashboard"}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Connection status */}
            <div className="flex items-center gap-2">
              {isConnected ? (
                <div className="flex items-center gap-2 text-green-600">
                  <Wifi className="h-4 w-4" />
                  <span className="text-sm">Online</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-600">
                  <WifiOff className="h-4 w-4" />
                  <span className="text-sm">Offline</span>
                </div>
              )}
            </div>

            <Button variant="ghost" size="sm">
              <Bell className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Connection error alert */}
        {connectionError && (
          <Alert className="m-4 border-destructive">
            <AlertDescription>
              Connection error: {connectionError}
            </AlertDescription>
          </Alert>
        )}

        {/* Main content area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background">
          <div className="container mx-auto px-6 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

// ✅ ROOT LAYOUT - PROPERLY STRUCTURED
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    initializeStores();
    setMounted(true);
  }, []);

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <html lang="en">
        <body className={inter.className}>
          <div className="flex items-center justify-center min-h-screen">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="text-muted-foreground">Initializing...</span>
            </div>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ErrorBoundary>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <StoreProvider>
              {/* ✅ CORRECT ORDER: AuthProvider wraps AuthGuard */}
              <AuthProvider>
                <AuthGuard>
                  <MainLayout>{children}</MainLayout>
                </AuthGuard>
              </AuthProvider>
              <Toaster position="top-right" richColors />
            </StoreProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
