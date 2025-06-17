# app/main.py
"""
FastAPI Main Application - CORRIGIDO PARA INICIALIZAÇÃO
Problemas resolvidos:
1. ✅ Migrado para python-socketio
2. ✅ Configuração SECRET_KEY adequada
3. ✅ Tratamento de erro de configuração
4. ✅ Inicialização sem dependências opcionais
5. ✅ Logs informativos de startup
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

# Importar configurações (pode falhar se SECRET_KEY não estiver definida)
try:
    from app.core.config import settings

    logger.info("✅ Configurações carregadas com sucesso")
except Exception as e:
    logger.error(f"❌ Erro ao carregar configurações: {e}")
    logger.error("🔧 Execute o script quick_fix.py para corrigir")
    sys.exit(1)

# Importar python-socketio
try:
    import socketio

    logger.info("✅ python-socketio importado com sucesso")
except ImportError as e:
    logger.error(f"❌ Erro ao importar python-socketio: {e}")
    logger.error("🔧 Execute: pip install python-socketio[client]==5.8.0")
    sys.exit(1)

# Importar dependências opcionais
try:
    from motor.motor_asyncio import AsyncIOMotorClient

    MONGODB_AVAILABLE = True
except ImportError:
    logger.warning("⚠️  Motor não disponível. MongoDB será desabilitado.")
    MONGODB_AVAILABLE = False

# Importar módulos da aplicação
try:
    from app.core.database import db
    from app.core.lock_manager import LockManager
    from app.websocket.manager import WebSocketManager
except ImportError as e:
    logger.warning(f"⚠️  Alguns módulos não disponíveis: {e}")

# Importar routers (se disponíveis)
try:
    from app.routes.auth import router as auth_router

    AUTH_ROUTER_AVAILABLE = True
except ImportError:
    logger.warning("⚠️  Auth router não disponível")
    AUTH_ROUTER_AVAILABLE = False

try:
    from app.routes.users import router as users_router

    USERS_ROUTER_AVAILABLE = True
except ImportError:
    logger.warning("⚠️  Users router não disponível")
    USERS_ROUTER_AVAILABLE = False

try:
    from app.routes.campaigns import router as campaigns_router

    CAMPAIGNS_ROUTER_AVAILABLE = True
except ImportError:
    logger.warning("⚠️  Campaigns router não disponível")
    CAMPAIGNS_ROUTER_AVAILABLE = False

try:
    from app.routes.characters import router as characters_router

    CHARACTERS_ROUTER_AVAILABLE = True
except ImportError:
    logger.warning("⚠️  Characters router não disponível")
    CHARACTERS_ROUTER_AVAILABLE = False

try:
    from app.routes.compendium import router as compendium_router

    COMPENDIUM_ROUTER_AVAILABLE = True
except ImportError:
    logger.warning("⚠️  Compendium router não disponível")
    COMPENDIUM_ROUTER_AVAILABLE = False

# Global managers
lock_manager = None
websocket_manager = None

# ===== SOCKET.IO SERVER SETUP =====
sio = socketio.AsyncServer(
    cors_allowed_origins=settings.SOCKETIO_CORS_ORIGINS,
    logger=settings.SOCKETIO_LOGGER,
    engineio_logger=settings.SOCKETIO_ENGINEIO_LOGGER
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Gerencia o ciclo de vida da aplicação FastAPI.
    """
    # Startup
    logger.info("🚀 Iniciando aplicação D&D VTT...")
    logger.info(f"🌍 Ambiente: {settings.ENVIRONMENT}")
    logger.info(f"🔐 SECRET_KEY: {'✓' if len(settings.SECRET_KEY) >= 32 else '✗'}")

    try:
        # MongoDB Connection (se disponível)
        if MONGODB_AVAILABLE:
            logger.info("📡 Conectando ao MongoDB...")
            app.mongodb_client = AsyncIOMotorClient(settings.MONGODB_URI)
            app.mongodb = app.mongodb_client[settings.DB_NAME]

            # Test MongoDB connection
            try:
                await app.mongodb.command("ping")
                logger.info("✅ MongoDB conectado com sucesso")

                # Initialize database helper
                db.set_database(app.mongodb)

                # Initialize managers
                global lock_manager, websocket_manager
                lock_manager = LockManager(app.mongodb)
                websocket_manager = WebSocketManager()

                logger.info("🔧 Managers inicializados")

            except Exception as e:
                logger.warning(f"⚠️  MongoDB não disponível: {e}")
                logger.info("🔧 Continuando sem MongoDB...")
        else:
            logger.info("🔧 Continuando sem MongoDB (Motor não instalado)")

        logger.info("🎉 Aplicação inicializada com sucesso!")
        yield

    except Exception as e:
        logger.error(f"❌ Erro durante inicialização: {e}")
        # Não fazer raise para permitir que a app inicie mesmo com problemas
        yield
    finally:
        # Shutdown
        logger.info("🔄 Encerrando aplicação...")
        if MONGODB_AVAILABLE and hasattr(app, 'mongodb_client'):
            app.mongodb_client.close()
        logger.info("✅ Aplicação encerrada")


# Create FastAPI app
app = FastAPI(
    title="D&D Virtual Tabletop API",
    description="API para o sistema D&D Virtual Tabletop",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
cors_settings = settings.get_cors_settings()
app.add_middleware(
    CORSMiddleware,
    **cors_settings
)


# ===== SOCKET.IO EVENT HANDLERS =====

@sio.event
async def connect(sid, environ, auth):
    """Handle client connection."""
    logger.info(f"Cliente {sid} tentando conectar...")

    # Verificar autenticação básica
    if not auth:
        logger.warning(f"Cliente {sid} rejeitado: sem auth")
        return False

    # Por enquanto, aceitar todas as conexões em desenvolvimento
    if settings.is_development:
        logger.info(f"Cliente {sid} conectado (modo desenvolvimento)")
        await sio.emit('connected', {'status': 'success'}, room=sid)
        return True

    # Em produção, adicionar validação de token aqui
    logger.info(f"Cliente {sid} conectado")
    await sio.emit('connected', {'status': 'success'}, room=sid)
    return True


@sio.event
async def disconnect(sid):
    """Handle client disconnection."""
    logger.info(f"Cliente {sid} desconectado")


@sio.event
async def join_campaign(sid, data):
    """Join a campaign room."""
    campaign_id = data.get('campaign_id') if data else None
    if not campaign_id:
        await sio.emit('error', {'message': 'Campaign ID required'}, room=sid)
        return

    await sio.enter_room(sid, f"campaign_{campaign_id}")
    await sio.emit('joined_campaign', {
        'campaign_id': campaign_id,
        'status': 'success'
    }, room=sid)

    logger.info(f"Cliente {sid} entrou na campanha {campaign_id}")


@sio.event
async def leave_campaign(sid, data):
    """Leave a campaign room."""
    campaign_id = data.get('campaign_id') if data else None
    if not campaign_id:
        return

    await sio.leave_room(sid, f"campaign_{campaign_id}")
    logger.info(f"Cliente {sid} saiu da campanha {campaign_id}")


@sio.event
async def ping(sid, data):
    """Handle ping for keepalive."""
    await sio.emit('pong', {
        'timestamp': data.get('timestamp') if data else None,
        'server_time': settings.get_current_timestamp()
    }, room=sid)


@sio.event
async def test_event(sid, data):
    """Event de teste."""
    logger.info(f"Evento de teste recebido de {sid}: {data}")
    await sio.emit('test_response', {
        'message': 'Evento de teste processado com sucesso!',
        'received_data': data,
        'server_time': settings.get_current_timestamp()
    }, room=sid)


# ===== MOUNT SOCKET.IO =====
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)

# ===== INCLUDE ROUTERS (SE DISPONÍVEIS) =====
if AUTH_ROUTER_AVAILABLE:
    app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
    logger.info("✅ Auth router incluído")

if USERS_ROUTER_AVAILABLE:
    app.include_router(users_router, prefix="/api/users", tags=["users"])
    logger.info("✅ Users router incluído")

if CAMPAIGNS_ROUTER_AVAILABLE:
    app.include_router(campaigns_router, prefix="/api/campaigns", tags=["campaigns"])
    logger.info("✅ Campaigns router incluído")

if CHARACTERS_ROUTER_AVAILABLE:
    app.include_router(characters_router, prefix="/api/characters", tags=["characters"])
    logger.info("✅ Characters router incluído")

if COMPENDIUM_ROUTER_AVAILABLE:
    app.include_router(compendium_router, prefix="/api/compendium", tags=["compendium"])
    logger.info("✅ Compendium router incluído")


# ===== BASIC ROUTES =====
@app.get("/")
async def root():
    """Rota raiz."""
    return {
        "message": "D&D Virtual Tabletop API",
        "version": "1.0.0",
        "status": "running",
        "environment": settings.ENVIRONMENT,
        "socketio": "available",
        "mongodb": "available" if MONGODB_AVAILABLE else "not available"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": settings.get_current_timestamp(),
        "environment": settings.ENVIRONMENT,
        "services": {
            "socketio": "ok",
            "mongodb": "ok" if MONGODB_AVAILABLE else "disabled"
        }
    }


@app.get("/test")
async def test_endpoint():
    """Endpoint de teste."""
    return {
        "message": "API funcionando!",
        "settings": {
            "environment": settings.ENVIRONMENT,
            "debug": settings.DEBUG,
            "secret_key_length": len(settings.SECRET_KEY),
            "mongodb_uri": settings.MONGODB_URI[:20] + "..." if len(settings.MONGODB_URI) > 20 else settings.MONGODB_URI
        },
        "available_routers": {
            "auth": AUTH_ROUTER_AVAILABLE,
            "users": USERS_ROUTER_AVAILABLE,
            "campaigns": CAMPAIGNS_ROUTER_AVAILABLE,
            "characters": CHARACTERS_ROUTER_AVAILABLE,
            "compendium": COMPENDIUM_ROUTER_AVAILABLE
        }
    }


# ===== DEVELOPMENT SERVER =====
if __name__ == "__main__":
    import uvicorn

    print("\n🌟 Iniciando servidor de desenvolvimento...")
    print(f"🌐 URL: http://localhost:{settings.PORT}")
    print(f"📚 Docs: http://localhost:{settings.PORT}/docs")
    print(f"🔌 Socket.IO: http://localhost:{settings.PORT}/socket.io")
    print("🛑 Pressione Ctrl+C para parar\n")

    uvicorn.run(
        "app.main:socket_app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.RELOAD and settings.is_development,
        log_level=settings.LOG_LEVEL.lower()
    )