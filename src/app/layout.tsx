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

// CORREÇÃO: Sonner em vez de toaster antigo
import { Toaster } from "@/components/ui/sonner";

// CORREÇÃO: Theme provider criado
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

// ✅ AUTHGUARD CORRIGIDO
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
  if (isAuthenticated && isPublicPage) {
    router.push("/dashboard");
    return null;
  }

  return <>{children}</>;
}

// ✅ MAIN LAYOUT CORRIGIDO
function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { currentCampaign, isConnected } = useGameStore();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Não mostrar sidebar em páginas de auth
  const authPages = ["/auth/login", "/auth/register", "/auth/forgot-password"];
  const isAuthPage = authPages.includes(pathname);

  if (isAuthPage) {
    return <>{children}</>;
  }

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
                  variant={pathname === item.href ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => (window.location.href = item.href)}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  {item.title}
                </Button>
              ))}
            </div>
          </ScrollArea>

          <div className="p-4 border-t">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start">
                  <Avatar className="h-8 w-8 mr-3">
                    <AvatarImage src={user?.avatar_url} />
                    <AvatarFallback>
                      {user?.username?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{user?.username || "User"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem>
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0">
          <div className="flex flex-col h-full">
            <SheetHeader className="border-b p-4">
              <SheetTitle>D&D VTT</SheetTitle>
            </SheetHeader>
            <ScrollArea className="flex-1 px-3">
              <div className="space-y-1 py-4">
                {navigationItems.map((item) => (
                  <Button
                    key={item.href}
                    variant={pathname === item.href ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => {
                      window.location.href = item.href;
                      setSidebarOpen(false);
                    }}
                  >
                    <item.icon className="h-5 w-5 mr-3" />
                    {item.title}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b bg-card flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Connection Status */}
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnected ? (
                <>
                  <Wifi className="h-3 w-3 mr-1" /> Connected
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 mr-1" /> Disconnected
                </>
              )}
            </Badge>
          </div>

          <div className="flex items-center gap-4">
            {/* Current Campaign */}
            {currentCampaign && (
              <Badge variant="outline">
                <Map className="h-3 w-3 mr-1" />
                {currentCampaign.name}
              </Badge>
            )}

            {/* Notifications */}
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Campaign Selection Alert */}
        {!currentCampaign && pathname !== "/campaign" && (
          <Alert className="m-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No campaign selected.{" "}
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

// ✅ ROOT LAYOUT CORRIGIDO
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
            <Toaster position="top-right" />
          </StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
