"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Sword,
  Shield,
  Users,
  Dices,
  Scroll,
  Crown,
  MapPin,
  Zap,
  ArrowRight,
  Github,
  Mail,
  Menu,
  X,
} from "lucide-react";

// shadcn/ui components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const LandingPage = () => {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // Função helper para navegação e fechamento do menu mobile
  const navigateAndCloseMenu = (path: string) => {
    router.push(path);
    setMobileMenuOpen(false);
  };

  // Features array
  const features = [
    {
      icon: <Users className="h-8 w-8" />,
      title: "Sessões Multiplayer",
      description:
        "Conecte-se com amigos e jogue em tempo real usando tecnologia WebSocket",
    },
    {
      icon: <Scroll className="h-8 w-8" />,
      title: "Gerenciamento de Personagens",
      description:
        "Crie e edite fichas detalhadas com cálculos automáticos e sincronização em tempo real",
    },
    {
      icon: <Sword className="h-8 w-8" />,
      title: "Rastreador de Combate",
      description:
        "Gerencie iniciativa, HP, condições e ações em encontros organizados de combate",
    },
    {
      icon: <Dices className="h-8 w-8" />,
      title: "Sistema de Dados",
      description:
        "Role dados com vantagem/desvantagem, modificadores e cálculo automático de resultados",
    },
    {
      icon: <MapPin className="h-8 w-8" />,
      title: "Construtor de Campanhas",
      description:
        "Projete encontros, gerencie NPCs e compartilhe mapas e imagens com seus jogadores",
    },
    {
      icon: <Crown className="h-8 w-8" />,
      title: "Ferramentas para Mestres",
      description:
        "Ferramentas poderosas para Mestres incluindo gestão de NPCs e planejamento de encontros",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">D&D VTT</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <a
                href="#features"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Funcionalidades
              </a>
              <a
                href="#about"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Sobre
              </a>
              <Button variant="outline" onClick={() => router.push("/auth")}>
                Entrar
              </Button>
              <Button onClick={() => router.push("/auth")}>Começar</Button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle mobile menu"
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden pb-4">
              <div className="flex flex-col space-y-4">
                <a
                  href="#features"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Funcionalidades
                </a>
                <a
                  href="#about"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sobre
                </a>
                <div className="flex flex-col space-y-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => navigateAndCloseMenu("/auth")}
                  >
                    Entrar
                  </Button>
                  <Button onClick={() => navigateAndCloseMenu("/auth")}>
                    Começar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="text-center space-y-8">
            <Badge variant="secondary" className="text-sm">
              <Zap className="h-4 w-4 mr-1" />
              Mesa Virtual em Tempo Real
            </Badge>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight">
              Aventuras Épicas
              <span className="block text-primary">Aguardam Online</span>
            </h1>

            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Experimente D&D como nunca antes com nossa Mesa Virtual moderna.
              Crie personagens, gerencie campanhas e embarque em aventuras
              lendárias com amigos de qualquer lugar do mundo.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                size="lg"
                className="text-lg px-8"
                onClick={() => router.push("/dashboard")}
              >
                Acessar Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-lg px-8"
                onClick={() => router.push("/auth")}
              >
                Criar Conta
              </Button>
            </div>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="h-96 w-96 rounded-full bg-primary/10 blur-3xl"></div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <Badge variant="outline" className="text-sm">
              Funcionalidades
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold">
              Tudo Que Você Precisa para Campanhas Épicas
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Nossa plataforma VTT abrangente fornece todas as ferramentas
              necessárias para criar experiências inesquecíveis de D&D.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="hover:shadow-lg transition-shadow duration-300"
              >
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                      {feature.icon}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <Badge variant="outline" className="text-sm">
              Sobre o D&D VTT
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold">
              Construído por Jogadores, para Jogadores
            </h2>
            <p className="text-lg text-muted-foreground">
              Nossa Mesa Virtual foi criada a partir de uma paixão por D&D e do
              desejo de tornar o jogo online tão envolvente quanto sentar em
              volta de uma mesa física. Com sincronização em tempo real,
              gerenciamento abrangente de personagens e ferramentas intuitivas
              para mestres, construímos a plataforma que sempre quisemos usar.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
              <div className="space-y-4">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg font-semibold text-center">
                  Tempo Real
                </CardTitle>
                <CardDescription className="text-center">
                  Sincronização WebSocket em tempo real para experiência fluida
                </CardDescription>
              </div>
              <div className="space-y-4">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg font-semibold text-center">
                  Segurança
                </CardTitle>
                <CardDescription className="text-center">
                  Proteção de dados segura e privacidade garantida
                </CardDescription>
              </div>
              <div className="space-y-4">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg font-semibold text-center">
                  Para Grupos
                </CardTitle>
                <CardDescription className="text-center">
                  Construído para grupos de todos os tamanhos
                </CardDescription>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="space-y-6">
            <h2 className="text-3xl sm:text-4xl font-bold">
              Pronto para Começar Sua Aventura?
            </h2>
            <p className="text-xl opacity-90 max-w-2xl mx-auto">
              Descubra uma nova forma de jogar D&D online com ferramentas
              modernas e interface intuitiva. Crie sua conta hoje e comece sua
              jornada lendária.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                size="lg"
                variant="secondary"
                className="text-lg px-8"
                onClick={() => router.push("/auth")}
              >
                Criar Conta Gratuita
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary"
                onClick={() => router.push("/dashboard")}
              >
                Ver Dashboard
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-background py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Shield className="h-6 w-6 text-primary" />
                <span className="text-lg font-bold">D&D VTT</span>
              </div>
              <p className="text-sm text-muted-foreground">
                A Mesa Virtual definitiva para campanhas de D&D 5e. Construído
                com amor para a comunidade.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Plataforma</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div>
                  <a
                    href="#features"
                    className="hover:text-foreground transition-colors"
                  >
                    Funcionalidades
                  </a>
                </div>
                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push("/dashboard")}
                    className="h-auto p-0 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Dashboard
                  </Button>
                </div>
                <div>
                  <a
                    href="#"
                    className="hover:text-foreground transition-colors"
                  >
                    Documentação
                  </a>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Suporte</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div>
                  <a
                    href="#"
                    className="hover:text-foreground transition-colors"
                  >
                    Central de Ajuda
                  </a>
                </div>
                <div>
                  <a
                    href="#"
                    className="hover:text-foreground transition-colors"
                  >
                    Comunidade
                  </a>
                </div>
                <div>
                  <a
                    href="#"
                    className="hover:text-foreground transition-colors"
                  >
                    Contato
                  </a>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Conecte-se</h3>
              <div className="flex space-x-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10"
                  aria-label="GitHub"
                >
                  <Github className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10"
                  aria-label="Email"
                >
                  <Mail className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>
              &copy; 2024 D&D VTT. Todos os direitos reservados. Feito com ⚔️
              para a comunidade D&D.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
