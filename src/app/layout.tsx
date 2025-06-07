// src/app/layout.tsx - LAYOUT COMPLETO SIMPLIFICADO
"use client";

import React, { useEffect, useState, useRef } from "react";
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

// Styles
import "./globals.css";

// Hooks and stores
import { useAuth } from "@/hooks/useAuth";
import { useGameStore } from "@/stores/gameStore";
import { StoreProvider, initializeStores } from "@/stores";

// Sonner (toast) instead of Toaster
import { Toaster } from "sonner";

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

// ✅ AUTHGUARD SIMPLIFICADO - APENAS PROTEÇÃO, SEM REDIRECIONAMENTOS AUTOMÁTICOS
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const pathname = usePathname();

  // ✅ Mostrar loading enquanto carrega
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

  // ✅ Rotas que requerem autenticação
  const protectedRoutes = [
    "/dashboard",
    "/characters",
    "/campaign",
    "/npcs",
    "/combat",
    "/compendium",
    "/settings",
    "/profile",
  ];
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // ✅ Se não autenticado em rota protegida, mostrar mensagem em vez de redirecionar
  if (!isAuthenticated && isProtectedRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <Shield className="h-16 w-16 text-muted-foreground" />
              <h3 className="text-lg font-medium">Authentication Required</h3>
              <p className="text-muted-foreground text-center">
                You need to be logged in to access this page.
              </p>
              <Button onClick={() => (window.location.href = "/auth")}>
                Go to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

// Sidebar Navigation Component
function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const currentCampaign = useGameStore((state) => state.currentCampaign);

  // Safe access to campaign properties
  const campaignName = currentCampaign?.name || "No Campaign";
  const playerCount = currentCampaign?.players?.length || 0;
  const hasActiveEncounter = currentCampaign?.active_encounter;

  return (
    <div className={`pb-12 ${className}`}>
      <div className="space-y-4 py-4">
        {/* Campaign Info */}
        {currentCampaign && (
          <div className="px-3 py-2">
            <div className="space-y-1">
              <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
                {campaignName}
              </h2>
              <div className="space-y-1">
                <Badge variant="secondary" className="text-xs">
                  {playerCount} Players
                </Badge>
                {hasActiveEncounter && (
                  <Badge variant="default" className="text-xs ml-2">
                    Active Encounter
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* Navigation */}
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            Navigation
          </h2>
          <div className="space-y-1">
            {navigationItems.map((item) => (
              <Button
                key={item.href}
                variant={pathname === item.href ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => (window.location.href = item.href)}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.title}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Header Component
function Header() {
  const { user, logout } = useAuth();
  const notifications = useGameStore((state) => state.notifications);
  const wsStatus = useGameStore((state) => state.wsStatus);
  const clearAllNotifications = useGameStore(
    (state) => state.clearAllNotifications
  );
  const clearNotification = useGameStore((state) => state.clearNotification);

  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Safe access to notifications
  const unreadNotifications = (notifications || []).filter(
    (n) => n.type === "error" || n.type === "warning"
  ).length;

  return (
    <header className="border-b">
      <div className="flex h-16 items-center px-4">
        {/* Mobile Menu Button */}
        <Sheet open={showMobileMenu} onOpenChange={setShowMobileMenu}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] sm:w-[400px]">
            <SheetHeader>
              <SheetTitle>D&D VTT</SheetTitle>
              <SheetDescription>Virtual Tabletop Navigation</SheetDescription>
            </SheetHeader>
            <Sidebar className="mt-4" />
          </SheetContent>
        </Sheet>

        {/* Logo/Title */}
        <div className="flex items-center space-x-2">
          <Shield className="h-6 w-6" />
          <h1 className="text-xl font-bold">D&D VTT</h1>
        </div>

        <div className="ml-auto flex items-center space-x-4">
          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            {wsStatus?.connected ? (
              <div className="flex items-center text-green-600">
                <Wifi className="h-4 w-4 mr-1" />
                <span className="text-xs hidden sm:inline">Connected</span>
              </div>
            ) : (
              <div className="flex items-center text-red-600">
                <WifiOff className="h-4 w-4 mr-1" />
                <span className="text-xs hidden sm:inline">Disconnected</span>
              </div>
            )}
          </div>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-4 w-4" />
                {unreadNotifications > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                  >
                    {unreadNotifications}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="flex items-center justify-between p-2">
                <h4 className="font-semibold">Notifications</h4>
                {(notifications || []).length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearAllNotifications()}
                  >
                    Clear All
                  </Button>
                )}
              </div>
              <Separator />
              <ScrollArea className="h-[300px]">
                {(notifications || []).length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    No notifications
                  </div>
                ) : (
                  <div className="space-y-1">
                    {(notifications || []).map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-3 border-l-2 ${
                          notification.type === "error"
                            ? "border-red-500 bg-red-50"
                            : notification.type === "warning"
                            ? "border-yellow-500 bg-yellow-50"
                            : notification.type === "success"
                            ? "border-green-500 bg-green-50"
                            : "border-blue-500 bg-blue-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">
                            {notification.message}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => clearNotification(notification.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(
                            notification.timestamp
                          ).toLocaleTimeString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" alt={user?.username} />
                    <AvatarFallback>
                      {user?.username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium">{user?.username}</p>
                    <p className="w-[200px] truncate text-sm text-muted-foreground">
                      {user?.email}
                    </p>
                    <Badge variant="outline" className="w-fit text-xs">
                      {user?.role === "dm" ? "Dungeon Master" : "Player"}
                    </Badge>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => (window.location.href = "/profile")}
                >
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => (window.location.href = "/settings")}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}

// ✅ MAIN LAYOUT SIMPLIFICADO
function MainLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();
  const currentCampaign = useGameStore((state) => state.currentCampaign);

  // ✅ Páginas que devem usar layout mínimo (sem sidebar/header)
  const minimalLayoutRoutes = ["/", "/auth", "/unauthorized"];
  const useMinimalLayout = minimalLayoutRoutes.some(
    (route) => pathname === route || pathname.startsWith("/auth")
  );

  // ✅ Se for página pública/auth, usar layout mínimo
  if (useMinimalLayout) {
    return <>{children}</>;
  }

  // ✅ Se não for autenticado em página protegida, AuthGuard vai lidar
  const protectedRoutes = [
    "/dashboard",
    "/characters",
    "/campaign",
    "/npcs",
    "/combat",
    "/compendium",
    "/settings",
    "/profile",
  ];
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (!isAuthenticated && isProtectedRoute) {
    return <>{children}</>;
  }

  // ✅ Renderizar layout completo para usuários autenticados em páginas protegidas
  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <div className="flex flex-col flex-grow pt-5 overflow-y-auto bg-background border-r">
          <Sidebar />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />

        {/* No Campaign Warning - apenas para páginas que precisam de campanha */}
        {!currentCampaign &&
          pathname !== "/campaign" &&
          pathname !== "/dashboard" && (
            <Alert className="m-4">
              <AlertDescription>
                No active campaign selected.{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto"
                  onClick={() => (window.location.href = "/campaign")}
                >
                  Select or create a campaign
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

// ✅ ROOT LAYOUT SIMPLIFICADO
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  // ✅ Initialize stores on mount
  useEffect(() => {
    initializeStores();
    setMounted(true);
  }, []);

  // ✅ Prevent hydration mismatch
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
    <html lang="en">
      <body className={inter.className}>
        <StoreProvider>
          <AuthGuard>
            <MainLayout>{children}</MainLayout>
          </AuthGuard>
          {/* Sonner Toaster */}
          <Toaster position="top-right" />
        </StoreProvider>
      </body>
    </html>
  );
}
