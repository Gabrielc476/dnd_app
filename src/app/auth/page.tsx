// src/app/auth/page.tsx - CORRIGIDO

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dice6, Eye, EyeOff, UserPlus, LogIn, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AuthPage() {
  const router = useRouter();
  const { login, register, isLoading, isAuthenticated, error } = useAuth();

  // Estados do formulário
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginForm, setLoginForm] = useState({
    email: "", // ✅ Usando email como esperado pelo backend
    password: "",
  });
  const [registerForm, setRegisterForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "player" as "player" | "dm",
  });

  // Redirecionamento automático se já autenticado
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      console.log("✅ Usuário já autenticado, redirecionando...");
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  // ✅ LOGIN CORRIGIDO - Agora usa objeto LoginCredentials
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting || isLoading) {
      return;
    }

    // Validação básica
    if (!loginForm.email.trim() || !loginForm.password.trim()) {
      toast.error("Preencha email e senha");
      return;
    }

    setIsSubmitting(true);

    try {
      // ✅ FORMATO CORRETO: Passar objeto LoginCredentials
      const success = await login({
        email: loginForm.email.trim(),
        password: loginForm.password,
      });

      if (success) {
        toast.success("Login realizado com sucesso!");
        // O redirecionamento será feito automaticamente pelo useEffect acima
      } else {
        toast.error("Erro ao fazer login");
      }
    } catch (error) {
      console.error("❌ Erro no login:", error);
      toast.error("Erro ao fazer login. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ REGISTRO CORRIGIDO
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting || isLoading) {
      return;
    }

    // Validação básica
    if (
      !registerForm.username.trim() ||
      !registerForm.email.trim() ||
      !registerForm.password.trim()
    ) {
      toast.error("Preencha todos os campos");
      return;
    }

    if (registerForm.password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setIsSubmitting(true);

    try {
      const success = await register({
        username: registerForm.username.trim(),
        email: registerForm.email.trim(),
        password: registerForm.password,
        role: registerForm.role,
      });

      if (success) {
        toast.success("Conta criada com sucesso!");
        // O redirecionamento será feito automaticamente pelo useEffect acima
      } else {
        toast.error("Erro ao criar conta");
      }
    } catch (error) {
      console.error("❌ Erro no registro:", error);
      toast.error("Erro ao criar conta. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Se já estiver autenticado, mostrar loading
  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">
                Você já está logado. Redirecionando...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Dice6 className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            D&D Virtual Tabletop
          </CardTitle>
          <CardDescription>
            Entre ou crie sua conta para começar suas aventuras
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Exibir erro se houver */}
          {error && (
            <Alert className="mb-4 border-destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">
                <LogIn className="h-4 w-4 mr-2" />
                Entrar
              </TabsTrigger>
              <TabsTrigger value="register">
                <UserPlus className="h-4 w-4 mr-2" />
                Criar Conta
              </TabsTrigger>
            </TabsList>

            {/* LOGIN TAB */}
            <TabsContent value="login" className="space-y-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={loginForm.email}
                    onChange={(e) =>
                      setLoginForm({ ...loginForm, email: e.target.value })
                    }
                    disabled={isSubmitting || isLoading}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Sua senha"
                      value={loginForm.password}
                      onChange={(e) =>
                        setLoginForm({ ...loginForm, password: e.target.value })
                      }
                      disabled={isSubmitting || isLoading}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isSubmitting || isLoading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting || isLoading}
                >
                  {isSubmitting || isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" />
                      Entrar
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* REGISTER TAB */}
            <TabsContent value="register" className="space-y-4">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-username">Nome de Usuário</Label>
                  <Input
                    id="reg-username"
                    type="text"
                    placeholder="SeuNomeAqui"
                    value={registerForm.username}
                    onChange={(e) =>
                      setRegisterForm({
                        ...registerForm,
                        username: e.target.value,
                      })
                    }
                    disabled={isSubmitting || isLoading}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={registerForm.email}
                    onChange={(e) =>
                      setRegisterForm({
                        ...registerForm,
                        email: e.target.value,
                      })
                    }
                    disabled={isSubmitting || isLoading}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="reg-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Mínimo 6 caracteres"
                      value={registerForm.password}
                      onChange={(e) =>
                        setRegisterForm({
                          ...registerForm,
                          password: e.target.value,
                        })
                      }
                      disabled={isSubmitting || isLoading}
                      required
                      minLength={6}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isSubmitting || isLoading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Tipo de Conta</Label>
                  <Select
                    value={registerForm.role}
                    onValueChange={(value: "player" | "dm") =>
                      setRegisterForm({ ...registerForm, role: value })
                    }
                    disabled={isSubmitting || isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="player">Jogador</SelectItem>
                      <SelectItem value="dm">Mestre (DM)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting || isLoading}
                >
                  {isSubmitting || isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando conta...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Criar Conta
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
