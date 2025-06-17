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

// ===== IMPORTS CORRIGIDOS =====
import "./globals.css";

// Hooks and stores
import { useAuth } from "@/hooks/useAuth";
import { useGameStore } from "@/stores/gameStore";
import { StoreProvider, initializeStores } from "@/stores";

// CORREÇÃO: Error Boundary
import { ErrorBoundary } from "@/components/ErrorBoundary";

// CORREÇÃO: Sonner em vez de toaster antigo
import { Toaster } from "sonner";

// CORREÇÃO: Theme provider corrigido
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

// ✅ AUTHGUARD CORRIGIDO E COMPLETO
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Páginas públicas que não precisam de autenticação
  const publicPages = [
    "/",
    "/auth/login",
    "/auth/register",
    "/auth/forgot-password",
  ];
  const isPublicPage = publicPages.includes(pathname);

  // Mostrar loading enquanto carrega
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  // Se não está autenticado e não é página pública, redirecionar
  if (!isAuthenticated && !isPublicPage) {
    router.push("/auth/login");
    return null;
  }

  // Se está autenticado e está em página pública, redirecionar para dashboard
  if (isAuthenticated && isPublicPage && pathname !== "/") {
    router.push("/dashboard");
    return null;
  }

  return <>{children}</>;
}

// ✅ MAIN LAYOUT CORRIGIDO E COMPLETO
function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { currentCampaign, isConnected } = useGameStore();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Não mostrar sidebar em páginas de auth e landing
  const authPages = [
    "/auth/login",
    "/auth/register",
    "/auth/forgot-password",
    "/",
  ];
  const isAuthPage = authPages.includes(pathname);

  if (isAuthPage) {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar Desktop */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <div className="flex flex-col flex-grow border-r bg-card">
          <div className="flex items-center h-16 px-4 border-b">
            <h1 className="text-xl font-bold">D&D VTT</h1>
          </div>

          <ScrollArea className="flex-1 px-3">
            <div className="space-y-1 py-4">
              {navigationItems.map((item) => (
                <Button
                  key={item.href}
                  variant={pathname === item.href ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => (window.location.href = item.href)}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.title}
                </Button>
              ))}
            </div>
          </ScrollArea>

          {/* User section */}
          <div className="border-t p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start">
                  <Avatar className="mr-2 h-6 w-6">
                    <AvatarImage
                      src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.username}`}
                    />
                    <AvatarFallback>
                      {user?.username?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{user?.username || "User"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="md:hidden fixed top-4 left-4 z-50"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle>D&D VTT</SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1 px-3">
            <div className="space-y-1 py-4">
              {navigationItems.map((item) => (
                <Button
                  key={item.href}
                  variant={pathname === item.href ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => {
                    window.location.href = item.href;
                    setSidebarOpen(false);
                  }}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.title}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top Bar */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-16 items-center px-6">
            <div className="ml-auto flex items-center space-x-4">
              {/* Connection Status */}
              <div className="flex items-center space-x-2">
                {isConnected ? (
                  <Badge variant="default" className="gap-1">
                    <Wifi className="h-3 w-3" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <WifiOff className="h-3 w-3" />
                    Disconnected
                  </Badge>
                )}
              </div>

              {/* Current Campaign */}
              {currentCampaign && (
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="gap-1">
                    <CheckCircle className="h-3 w-3" />
                    {currentCampaign.name}
                  </Badge>
                </div>
              )}

              {/* Notifications */}
              <Button variant="ghost" size="icon">
                <Bell className="h-4 w-4" />
              </Button>

              {/* User Avatar */}
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.username}`}
                />
                <AvatarFallback>
                  {user?.username?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Campaign Selection Alert */}
        {!currentCampaign && (
          <Alert className="m-6 mb-0">
            <AlertDescription>
              Please{" "}
              <Button
                variant="link"
                className="p-0 h-auto"
                onClick={() => (window.location.href = "/campaign")}
              >
                select or create a campaign
              </Button>{" "}
              to access all features.
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background">
          <div className="container mx-auto px-6 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

// ✅ ROOT LAYOUT CORRIGIDO E COMPLETO
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
              <AuthGuard>
                <MainLayout>{children}</MainLayout>
              </AuthGuard>
              {/* CORREÇÃO: Sonner Toaster */}
              <Toaster position="top-right" richColors />
            </StoreProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
