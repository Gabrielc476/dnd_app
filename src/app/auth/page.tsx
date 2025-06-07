// src/app/auth/page.tsx - VERSÃO CORRIGIDA
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dice6, Eye, EyeOff, UserPlus, LogIn, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

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
  const { login, register, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // ✅ Estados do formulário
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginForm, setLoginForm] = useState({
    username: "",
    password: "",
  });
  const [registerForm, setRegisterForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "player" as "player" | "dm",
  });

  // ✅ Redirecionamento automático se já autenticado
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      console.log("✅ Usuário já autenticado, redirecionando...");
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  // ✅ LOGIN MELHORADO
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting || isLoading) {
      return;
    }

    console.log("🔐 Tentativa de login para:", loginForm.username);

    // ✅ Validação básica
    if (!loginForm.username.trim() || !loginForm.password.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha usuário e senha",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const success = await login(
        loginForm.username.trim(),
        loginForm.password
      );

      if (success) {
        toast({
          title: "Login realizado!",
          description: "Redirecionando para o dashboard...",
        });

        // ✅ Aguardar um pouco antes de redirecionar
        setTimeout(() => {
          router.replace("/dashboard");
        }, 1000);
      } else {
        toast({
          title: "Erro no login",
          description: "Usuário ou senha incorretos",
          variant: "destructive",
        });

        // ✅ Limpar apenas a senha em caso de erro
        setLoginForm((prev) => ({ ...prev, password: "" }));
      }
    } catch (error) {
      console.error("❌ Erro no login:", error);
      toast({
        title: "Erro no login",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ REGISTER MELHORADO
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting || isLoading) {
      return;
    }

    // ✅ Validação
    if (
      !registerForm.username.trim() ||
      !registerForm.email.trim() ||
      !registerForm.password.trim()
    ) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos",
        variant: "destructive",
      });
      return;
    }

    if (registerForm.password.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    // ✅ Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registerForm.email)) {
      toast({
        title: "Email inválido",
        description: "Digite um email válido",
        variant: "destructive",
      });
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
        toast({
          title: "Conta criada!",
          description: "Agora você pode fazer login",
        });

        // ✅ Mudar para aba de login e preencher o usuário
        setLoginForm({
          username: registerForm.username,
          password: "",
        });

        // ✅ Reset do formulário de registro
        setRegisterForm({
          username: "",
          email: "",
          password: "",
          role: "player",
        });
      } else {
        toast({
          title: "Erro no cadastro",
          description: "Não foi possível criar a conta. Tente novamente.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("❌ Erro no registro:", error);
      toast({
        title: "Erro no cadastro",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ Se já estiver autenticado, mostrar loading
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

  // ✅ Mostrar loading durante inicialização
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isFormDisabled = isSubmitting || isLoading;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Dice6 className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">D&D VTT</CardTitle>
          <CardDescription>
            Virtual Tabletop para suas aventuras
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" disabled={isFormDisabled}>
                <LogIn className="h-4 w-4 mr-2" />
                Entrar
              </TabsTrigger>
              <TabsTrigger value="register" disabled={isFormDisabled}>
                <UserPlus className="h-4 w-4 mr-2" />
                Cadastrar
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-username">Usuário</Label>
                  <Input
                    id="login-username"
                    type="text"
                    value={loginForm.username}
                    onChange={(e) =>
                      setLoginForm((prev) => ({
                        ...prev,
                        username: e.target.value,
                      }))
                    }
                    placeholder="Seu nome de usuário"
                    disabled={isFormDisabled}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      value={loginForm.password}
                      onChange={(e) =>
                        setLoginForm((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                      placeholder="Sua senha"
                      disabled={isFormDisabled}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isFormDisabled}
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
                  disabled={isFormDisabled}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    "Entrar"
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="space-y-4">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-username">Usuário</Label>
                  <Input
                    id="register-username"
                    type="text"
                    value={registerForm.username}
                    onChange={(e) =>
                      setRegisterForm((prev) => ({
                        ...prev,
                        username: e.target.value,
                      }))
                    }
                    placeholder="Nome de usuário"
                    disabled={isFormDisabled}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-email">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    value={registerForm.email}
                    onChange={(e) =>
                      setRegisterForm((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    placeholder="seu@email.com"
                    disabled={isFormDisabled}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="register-password"
                      type={showPassword ? "text" : "password"}
                      value={registerForm.password}
                      onChange={(e) =>
                        setRegisterForm((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                      placeholder="Mínimo 6 caracteres"
                      disabled={isFormDisabled}
                      required
                      minLength={6}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isFormDisabled}
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
                  <Label htmlFor="register-role">Função</Label>
                  <Select
                    value={registerForm.role}
                    onValueChange={(value: "player" | "dm") =>
                      setRegisterForm((prev) => ({ ...prev, role: value }))
                    }
                    disabled={isFormDisabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
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
                  disabled={isFormDisabled}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando conta...
                    </>
                  ) : (
                    "Criar conta"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {/* ✅ Dicas de uso */}
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground text-center">
              <strong>Dica:</strong> Crie uma conta como "Mestre (DM)" para
              criar campanhas, ou como "Jogador" para participar de aventuras.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
