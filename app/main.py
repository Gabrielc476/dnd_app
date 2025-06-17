# app/main.py
"""
FastAPI Main Application - CORRIGIDO PARA INICIALIZAÇÃO
Problemas resolvidos:
1. ✅ Migrado para python-socketio
2. ✅ Configuração SECRET_KEY adequada
3. ✅ Tratamento de erro de configuração MELHORADO
4. ✅ Inicialização sem dependências opcionais
5. ✅ Logs informativos de startup
6. ✅ Fallback para configuração simples
7. ✅ Correção do problema de validators duplicados
"""

import logging
import sys
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Configurar logging básico antes de importar qualquer coisa
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

print("🚀 Iniciando D&D VTT Backend...")
print(f"📁 Diretório de trabalho: {os.getcwd()}")
print(f"🐍 Python: {sys.version}")

# NOVA ESTRATÉGIA: Tentar configuração simples PRIMEIRO para evitar problemas Pydantic
settings = None
config_source = None

# Tentativa 1: Configuração simples (mais confiável)
try:
    from app.config import settings

    config_source = "config (simples)"
    logger.info("✅ Configurações simples carregadas com sucesso")
except Exception as e:
    logger.warning(f"⚠️  Falha ao carregar config simples: {e}")

    # Tentativa 2: Configuração Pydantic (se a simples falhar)
    try:
        from app.core.config import settings

        config_source = "core.config (Pydantic)"
        logger.info("✅ Configurações Pydantic carregadas com sucesso")
    except Exception as e2:
        logger.error(f"❌ Falha ao carregar core.config: {e2}")
        logger.error("🔧 Criando configurações mínimas de emergência...")


        # Último recurso: criar configurações mínimas em memória
        class MinimalSettings:
            APP_NAME = "D&D VTT API"
            DEBUG = True
            ALLOWED_ORIGINS = ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000"]
            SOCKETIO_CORS_ORIGINS = "*"
            SOCKETIO_LOGGER = True
            SOCKETIO_ENGINEIO_LOGGER = True
            SECRET_KEY = "emergency_key_please_change_in_production_" + "x" * 32
            ALGORITHM = "HS256"
            ACCESS_TOKEN_EXPIRE_MINUTES = 60
            REFRESH_TOKEN_EXPIRE_DAYS = 30
            MONGODB_URI = "mongodb://localhost:27017"
            DB_NAME = "dnd_vtt"


        settings = MinimalSettings()
        config_source = "fallback mínimo"
        logger.warning("⚠️  Usando configurações mínimas de fallback")

print(f"⚙️  Configurações carregadas via: {config_source}")

# Verificar e normalizar ALLOWED_ORIGINS
if hasattr(settings, 'ALLOWED_ORIGINS'):
    origins = getattr(settings, 'ALLOWED_ORIGINS')
    print(f"🌐 ALLOWED_ORIGINS: {origins}")

    if not isinstance(origins, list):
        print(f"⚠️  ALLOWED_ORIGINS não é lista (tipo: {type(origins)}), convertendo...")
        if isinstance(origins, str):
            # Converter string separada por vírgula em lista
            origins = [item.strip() for item in origins.split(',') if item.strip()]
            settings.ALLOWED_ORIGINS = origins
        else:
            settings.ALLOWED_ORIGINS = ["http://localhost:3000", "http://localhost:3001"]
elif hasattr(settings, 'ALLOW_ORIGINS'):
    origins = getattr(settings, 'ALLOW_ORIGINS')
    print(f"🌐 ALLOW_ORIGINS: {origins}")
    # Criar alias para compatibilidade
    settings.ALLOWED_ORIGINS = origins
else:
    print("⚠️  Nenhuma configuração CORS encontrada, usando padrão")
    settings.ALLOWED_ORIGINS = ["http://localhost:3000", "http://localhost:3001"]

# Verificar SECRET_KEY
if not hasattr(settings, 'SECRET_KEY') or not settings.SECRET_KEY or len(settings.SECRET_KEY) < 32:
    import secrets

    new_key = secrets.token_urlsafe(32)
    print(f"⚠️  SECRET_KEY ausente ou inadequada. Gerando automaticamente...")
    print(f"🔐 Adicione esta linha ao seu arquivo .env:")
    print(f"SECRET_KEY={new_key}")
    settings.SECRET_KEY = new_key

# Importar python-socketio
try:
    import socketio

    logger.info("✅ python-socketio importado com sucesso")
except ImportError as e:
    logger.error(f"❌ Erro ao importar python-socketio: {e}")
    logger.error("🔧 Execute: pip install python-socketio[client]==5.8.0")
    socketio = None

# Importar dependências opcionais
try:
    from motor.motor_asyncio import AsyncIOMotorClient

    MONGODB_AVAILABLE = True
    logger.info("✅ Motor (MongoDB) disponível")
except ImportError:
    logger.warning("⚠️  Motor não disponível. MongoDB será desabilitado.")
    MONGODB_AVAILABLE = False

# Tentar importar core.database com fallback
db = None
try:
    from app.core.database import get_database

    logger.info("✅ Database module carregado")
    db = get_database
except ImportError as e:
    logger.warning(f"⚠️  Database module não disponível: {e}")

# Importar lock manager
LockManager = None
try:
    from app.core.locks import LockManager

    logger.info("✅ Lock manager carregado")
except ImportError as e:
    logger.warning(f"⚠️  Lock manager não disponível: {e}")

# Importar websocket manager
WebSocketManager = None
try:
    from app.websocket.manager import WebSocketManager

    logger.info("✅ WebSocket manager carregado")
except ImportError as e:
    logger.warning(f"⚠️  WebSocket manager não disponível: {e}")

# ===== CONFIGURAR SOCKET.IO =====
sio = None
if socketio is not None:
    try:
        sio = socketio.AsyncServer(
            cors_allowed_origins=getattr(settings, 'SOCKETIO_CORS_ORIGINS', "*"),
            logger=getattr(settings, 'SOCKETIO_LOGGER', True),
            engineio_logger=getattr(settings, 'SOCKETIO_ENGINEIO_LOGGER', True)
        )
        logger.info("✅ Socket.IO server criado")

        # Importar event handlers se disponíveis
        try:
            from app.websocket.event_handlers import register_handlers

            register_handlers(sio)
            logger.info("✅ Socket.IO event handlers registrados")
        except ImportError as e:
            logger.warning(f"⚠️  Socket.IO handlers não disponíveis: {e}")

    except Exception as e:
        logger.error(f"❌ Erro ao configurar Socket.IO: {e}")
        sio = None
else:
    logger.warning("⚠️  Socket.IO não será usado")

# ===== IMPORTAR ROUTERS COM FALLBACK =====
routers_info = []

# Lista de routers para tentar importar
router_modules = [
    ("auth", "app.routes.auth", "auth_router"),
    ("characters", "app.routes.characters", "characters_router"),
    ("campaigns", "app.routes.campaigns", "campaigns_router"),
    ("npcs", "app.routes.npcs", "npcs_router"),
    ("compendium", "app.routes.compendium", "compendium_router"),
    ("combat", "app.routes.combat", "combat_router"),
]

for router_name, module_path, router_attr in router_modules:
    try:
        module = __import__(module_path, fromlist=[router_attr])
        router = getattr(module, router_attr, None)
        if router is None:
            # Tentar 'router' como fallback
            router = getattr(module, 'router', None)

        if router is not None:
            routers_info.append((router_name, router, True))
            logger.info(f"✅ Router {router_name} carregado")
        else:
            routers_info.append((router_name, None, False))
            logger.warning(f"⚠️  Router {router_name} não encontrado no módulo")
    except ImportError as e:
        routers_info.append((router_name, None, False))
        logger.warning(f"⚠️  Router {router_name} não pôde ser importado: {e}")


# ===== LIFECYCLE EVENTS =====
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🔧 Iniciando serviços...")

    # Inicializar database se disponível
    if db is not None and MONGODB_AVAILABLE:
        try:
            # Se db é uma função, chamá-la para obter a instância
            if callable(db):
                db_instance = await db()
            else:
                db_instance = db
            logger.info("✅ Database conectado")
        except Exception as e:
            logger.error(f"❌ Erro ao conectar database: {e}")

    # Inicializar managers se disponíveis
    global lock_manager, websocket_manager

    if LockManager:
        try:
            lock_manager = LockManager()
            logger.info("✅ Lock manager iniciado")
        except Exception as e:
            logger.error(f"❌ Erro ao iniciar lock manager: {e}")

    if WebSocketManager:
        try:
            websocket_manager = WebSocketManager()
            logger.info("✅ WebSocket manager iniciado")
        except Exception as e:
            logger.error(f"❌ Erro ao iniciar WebSocket manager: {e}")

    logger.info("🚀 Aplicação iniciada com sucesso!")

    yield

    # Shutdown
    logger.info("🔄 Encerrando serviços...")
    logger.info("👋 Aplicação encerrada")


# ===== CRIAR APLICAÇÃO FASTAPI =====
app_title = getattr(settings, 'APP_NAME', 'D&D VTT Backend')
debug = getattr(settings, 'DEBUG', True)

app = FastAPI(
    title=app_title,
    description="Backend para Virtual Tabletop de D&D",
    version="1.0.0",
    debug=debug,
    lifespan=lifespan
)

# ===== MIDDLEWARE DE CORS =====
cors_origins = getattr(settings, 'ALLOWED_ORIGINS', ["http://localhost:3000"])
logger.info(f"🌐 Configurando CORS para: {cors_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===== ADICIONAR ROUTERS =====
for router_name, router, available in routers_info:
    if available and router is not None:
        try:
            app.include_router(router, prefix=f"/api/{router_name}", tags=[router_name])
            logger.info(f"✅ Router {router_name} adicionado")
        except Exception as e:
            logger.error(f"❌ Erro ao adicionar router {router_name}: {e}")
    else:
        logger.info(f"⏭️  Router {router_name} pulado (não disponível)")

# ===== INTEGRAÇÃO SOCKET.IO =====
if sio is not None:
    try:
        import socketio.asgi

        socket_app = socketio.ASGIApp(sio, app)
        logger.info("✅ Socket.IO integrado com FastAPI")
    except Exception as e:
        logger.error(f"❌ Erro na integração Socket.IO: {e}")
        socket_app = app
else:
    socket_app = app


# ===== ENDPOINTS BÁSICOS =====
@app.get("/")
async def root():
    """Endpoint raiz para verificar se a API está funcionando."""
    return {
        "message": "D&D VTT Backend está funcionando!",
        "version": "1.0.0",
        "config_source": config_source,
        "status": "healthy"
    }


@app.get("/health")
async def health_check():
    """Endpoint de health check."""
    return {
        "status": "healthy",
        "config_loaded": config_source,
        "mongodb_available": MONGODB_AVAILABLE,
        "socketio_available": sio is not None,
        "routers_loaded": [name for name, _, available in routers_info if available]
    }


# ===== HANDLER DE SAÚDE DO SOCKET.IO =====
if sio is not None:
    @sio.event
    async def connect(sid, environ):
        """Evento de conexão Socket.IO."""
        logger.info(f"Cliente conectado: {sid}")


    @sio.event
    async def disconnect(sid):
        """Evento de desconexão Socket.IO."""
        logger.info(f"Cliente desconectado: {sid}")


    @sio.event
    async def ping(sid, data):
        """Responde ao ping do cliente."""
        await sio.emit('pong', {'timestamp': data.get('timestamp')}, room=sid)

# ===== EXPORTAR APLICAÇÃO =====
# Para uso com servidores ASGI
application = socket_app

# Para compatibilidade
if __name__ == "__main__":
    import uvicorn

    port = getattr(settings, 'PORT', 8000)
    host = getattr(settings, 'HOST', '0.0.0.0')
    reload = getattr(settings, 'RELOAD', True) and getattr(settings, 'DEBUG', True)

    logger.info(f"🚀 Iniciando servidor em {host}:{port}")
    uvicorn.run(
        "app.main:socket_app",
        host=host,
        port=port,
        reload=reload,
        log_level="info"
    )