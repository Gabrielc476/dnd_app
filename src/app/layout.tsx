// src/app/layout.tsx
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

// Auth Guard Component
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  console.log("🛡️ AuthGuard - Estado:", {
    isLoading,
    isAuthenticated,
    hasUser: !!user,
    pathname,
  });

  useEffect(() => {
    // Só redirecionar após carregar e se não estiver autenticado
    if (!isLoading && !isAuthenticated) {
      const publicRoutes = ["/", "/auth"];
      const isPublicRoute = publicRoutes.some(
        (route) => pathname === route || pathname.startsWith("/auth")
      );

      if (!isPublicRoute) {
        console.log("🚫 Não autenticado, redirecionando para /auth");
        router.push("/auth");
        return;
      }
    }

    // Se estiver autenticado e na página de auth, redirecionar para dashboard
    if (!isLoading && isAuthenticated && pathname.startsWith("/auth")) {
      console.log("✅ Já autenticado, redirecionando para /dashboard");
      router.push("/dashboard");
      return;
    }
  }, [isLoading, isAuthenticated, pathname, router, user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  return <>{children}</>;
}

// Sidebar Navigation Component
function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const currentCampaign = useGameStore((state) => state.currentCampaign);

  return (
    <div className={`pb-12 ${className}`}>
      <div className="space-y-4 py-4">
        {/* Campaign Info */}
        {currentCampaign && (
          <div className="px-3 py-2">
            <div className="space-y-1">
              <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
                {currentCampaign.name}
              </h2>
              <div className="space-y-1">
                <Badge variant="secondary" className="text-xs">
                  {currentCampaign.players.length} Players
                </Badge>
                {currentCampaign.active_encounter && (
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
                asChild
              >
                <a href={item.href}>
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.title}
                </a>
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

  const unreadNotifications = notifications.filter(
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
            {wsStatus.connected ? (
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
                {notifications.length > 0 && (
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
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    No notifications
                  </div>
                ) : (
                  <div className="space-y-1">
                    {notifications.map((notification) => (
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
                <DropdownMenuItem asChild>
                  <a href="/profile">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </a>
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

// Main Layout Component
function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const currentCampaign = useGameStore((state) => state.currentCampaign);

  // Don't show sidebar and header for auth pages and landing page
  const isAuthPage = pathname.startsWith("/auth") || pathname === "/";

  if (isAuthPage) {
    return <>{children}</>;
  }

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

        {/* No Campaign Warning */}
        {!currentCampaign && user && (
          <Alert className="m-4">
            <AlertDescription>
              No active campaign selected. Please select or create a campaign to
              access all features.
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

// Root Layout Component
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  // Initialize stores on mount
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading...</span>
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
