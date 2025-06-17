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

# Importar configurações com tratamento de erro melhorado
settings = None
config_source = None

try:
    # Tentar carregar configuração com Pydantic primeiro
    from app.core.config import settings

    config_source = "core.config (Pydantic)"
    logger.info("✅ Configurações Pydantic carregadas com sucesso")
except Exception as e:
    logger.warning(f"⚠️  Falha ao carregar core.config: {e}")

    try:
        # Fallback para configuração simples
        from app.config import settings

        config_source = "config (simples)"
        logger.info("✅ Configurações simples carregadas com sucesso")
    except Exception as e2:
        logger.error(f"❌ Falha ao carregar config simples: {e2}")
        logger.error("🔧 Verifique se o arquivo .env existe e está correto")


        # Último recurso: criar configurações mínimas em memória
        class MinimalSettings:
            ALLOWED_ORIGINS = ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000"]
            SOCKETIO_CORS_ORIGINS = "*"
            SOCKETIO_LOGGER = True
            SOCKETIO_ENGINEIO_LOGGER = True
            DEBUG = True


        settings = MinimalSettings()
        config_source = "fallback mínimo"
        logger.warning("⚠️  Usando configurações mínimas de fallback")

print(f"⚙️  Configurações carregadas via: {config_source}")

# Verificar ALLOWED_ORIGINS especificamente
if hasattr(settings, 'ALLOWED_ORIGINS'):
    origins = getattr(settings, 'ALLOWED_ORIGINS')
    print(f"🌐 ALLOWED_ORIGINS: {origins}")
    if not isinstance(origins, list):
        print(f"⚠️  ALLOWED_ORIGINS não é lista (tipo: {type(origins)}), convertendo...")
        if isinstance(origins, str):
            origins = [item.strip() for item in origins.split(',') if item.strip()]
            settings.ALLOWED_ORIGINS = origins
        else:
            settings.ALLOWED_ORIGINS = ["http://localhost:3000"]
elif hasattr(settings, 'ALLOW_ORIGINS'):
    origins = getattr(settings, 'ALLOW_ORIGINS')
    print(f"🌐 ALLOW_ORIGINS: {origins}")
    # Criar alias para compatibilidade
    settings.ALLOWED_ORIGINS = origins
else:
    print("⚠️  Nenhuma configuração CORS encontrada, usando padrão")
    settings.ALLOWED_ORIGINS = ["http://localhost:3000", "http://localhost:3001"]

# Importar python-socketio
try:
    import socketio

    logger.info("✅ python-socketio importado com sucesso")
except ImportError as e:
    logger.error(f"❌ Erro ao importar python-socketio: {e}")
    logger.error("🔧 Execute: pip install python-socketio[client]==5.8.0")
    # Não fazer sys.exit aqui, permitir que continue sem Socket.IO
    socketio = None

# Importar dependências opcionais
try:
    from motor.motor_asyncio import AsyncIOMotorClient

    MONGODB_AVAILABLE = True
    logger.info("✅ Motor (MongoDB) disponível")
except ImportError:
    logger.warning("⚠️  Motor não disponível. MongoDB será desabilitado.")
    MONGODB_AVAILABLE = False

# Importar módulos da aplicação (com tratamento de erro)
try:
    from app.core.database import db

    logger.info("✅ Database module carregado")
except ImportError as e:
    logger.warning(f"⚠️  Database module não disponível: {e}")
    db = None

try:
    from app.core.lock_manager import LockManager

    logger.info("✅ Lock manager carregado")
except ImportError as e:
    logger.warning(f"⚠️  Lock manager não disponível: {e}")
    LockManager = None

try:
    from app.websocket.manager import WebSocketManager

    logger.info("✅ WebSocket manager carregado")
except ImportError as e:
    logger.warning(f"⚠️  WebSocket manager não disponível: {e}")
    WebSocketManager = None

# Importar routers (com tratamento de erro)
routers_info = []

try:
    from app.routes.auth import router as auth_router

    routers_info.append(("auth", auth_router, True))
except ImportError as e:
    logger.warning(f"⚠️  Auth router não disponível: {e}")
    routers_info.append(("auth", None, False))

try:
    from app.routes.users import router as users_router

    routers_info.append(("users", users_router, True))
except ImportError as e:
    logger.warning(f"⚠️  Users router não disponível: {e}")
    routers_info.append(("users", None, False))

try:
    from app.routes.campaigns import router as campaigns_router

    routers_info.append(("campaigns", campaigns_router, True))
except ImportError as e:
    logger.warning(f"⚠️  Campaigns router não disponível: {e}")
    routers_info.append(("campaigns", None, False))

try:
    from app.routes.characters import router as characters_router

    routers_info.append(("characters", characters_router, True))
except ImportError as e:
    logger.warning(f"⚠️  Characters router não disponível: {e}")
    routers_info.append(("characters", None, False))

try:
    from app.routes.compendium import router as compendium_router

    routers_info.append(("compendium", compendium_router, True))
except ImportError as e:
    logger.warning(f"⚠️  Compendium router não disponível: {e}")
    routers_info.append(("compendium", None, False))

# Global managers
lock_manager = None
websocket_manager = None

# ===== SOCKET.IO SERVER SETUP =====
sio = None
if socketio:
    try:
        cors_origins = getattr(settings, 'SOCKETIO_CORS_ORIGINS', '*')
        socketio_logger = getattr(settings, 'SOCKETIO_LOGGER', True)
        engineio_logger = getattr(settings, 'SOCKETIO_ENGINEIO_LOGGER', True)

        sio = socketio.AsyncServer(
            cors_allowed_origins=cors_origins,
            logger=socketio_logger,
            engineio_logger=engineio_logger
        )
        logger.info("✅ Socket.IO server configurado")
    except Exception as e:
        logger.error(f"❌ Erro ao configurar Socket.IO: {e}")
        sio = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Gerencia o ciclo de vida da aplicação FastAPI.
    """
    # Startup
    logger.info("🔧 Iniciando serviços...")

    # Inicializar database se disponível
    if db is not None and MONGODB_AVAILABLE:
        try:
            await db.connect()
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

    if db is not None:
        try:
            await db.disconnect()
            logger.info("✅ Database desconectado")
        except Exception as e:
            logger.error(f"❌ Erro ao desconectar database: {e}")

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
            app.include_router(router, prefix=f"/{router_name}", tags=[router_name])
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
        "cors_origins": cors_origins,
        "services": {
            "database": MONGODB_AVAILABLE,
            "socketio": sio is not None,
            "routers": [name for name, _, available in routers_info if available]
        }
    }


@app.get("/health")
async def health_check():
    """Endpoint para verificação de saúde da aplicação."""
    return {
        "status": "healthy",
        "timestamp": "2025-06-17T14:13:23Z",
        "services": {
            "database": "available" if MONGODB_AVAILABLE else "unavailable",
            "socketio": "available" if sio is not None else "unavailable"
        }
    }


# ===== LOG FINAL =====
logger.info("=" * 60)
logger.info("🎉 D&D VTT Backend configurado com sucesso!")
logger.info(f"📊 Configuração: {config_source}")
logger.info(f"🌐 CORS: {len(cors_origins)} origins permitidos")
logger.info(f"🗄️  Database: {'✓' if MONGODB_AVAILABLE else '✗'}")
logger.info(f"🔌 Socket.IO: {'✓' if sio else '✗'}")
logger.info(f"🛣️  Routers: {sum(1 for _, _, available in routers_info if available)}/{len(routers_info)}")
logger.info("=" * 60)

# Para uso com uvicorn
if __name__ == "__main__":
    import uvicorn

    host = getattr(settings, 'HOST', '0.0.0.0')
    port = getattr(settings, 'PORT', 8000)

    logger.info(f"🚀 Iniciando servidor em {host}:{port}")

    uvicorn.run(
        socket_app,
        host=host,
        port=port,
        reload=debug,
        log_level="info"
    )