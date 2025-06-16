"""
FastAPI Main Application - CORRIGIDO
Problemas resolvidos:
1. ✅ Migrado @app.on_event para lifespan (FastAPI 0.100+)
2. ✅ Proper error handling para conexão MongoDB
3. ✅ Logging adequado sem exposição de dados sensíveis
4. ✅ WebSocket events implementados corretamente
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import socketio

from app.core.config import settings
from app.core.database import db
from app.core.lock_manager import LockManager
from app.websocket.manager import WebSocketManager
from app.websocket.event_handlers import handle_websocket_events

# Routes imports
from app.routes.auth import router as auth_router
from app.routes.users import router as users_router
from app.routes.campaigns import router as campaigns_router
from app.routes.characters import router as characters_router
from app.routes.compendium import router as compendium_router

# Comentários removidos - imports verificados como existentes

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global managers
lock_manager: LockManager = None
websocket_manager: WebSocketManager = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Gerencia o ciclo de vida da aplicação FastAPI.
    Substitui os eventos startup/shutdown deprecados.
    """
    # Startup
    logger.info("🚀 Iniciando aplicação D&D VTT...")

    try:
        # MongoDB Connection
        logger.info("📡 Conectando ao MongoDB...")
        app.mongodb_client = AsyncIOMotorClient(settings.MONGODB_URI)
        app.mongodb = app.mongodb_client[settings.DB_NAME]

        # Test MongoDB connection
        await app.mongodb.command("ping")
        logger.info("✅ MongoDB conectado com sucesso")

        # Initialize database helper
        db.set_database(app.mongodb)

        # Initialize managers
        global lock_manager, websocket_manager
        lock_manager = LockManager(app.mongodb)
        websocket_manager = WebSocketManager()

        logger.info("🔧 Managers inicializados")
        logger.info("🎉 Aplicação inicializada com sucesso!")

    except Exception as e:
        logger.error(f"❌ Erro na inicialização: {e}")
        raise

    yield

    # Shutdown
    logger.info("🛑 Finalizando aplicação...")

    try:
        # Close WebSocket connections
        if websocket_manager:
            await websocket_manager.disconnect_all()

        # Close MongoDB connection
        if hasattr(app, 'mongodb_client'):
            app.mongodb_client.close()
            logger.info("✅ Conexões fechadas com sucesso")

    except Exception as e:
        logger.error(f"❌ Erro no shutdown: {e}")

    logger.info("👋 Aplicação finalizada")


# Create FastAPI app with lifespan
app = FastAPI(
    title=settings.APP_NAME,
    description="API para o sistema D&D Virtual Tabletop",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix="/api/auth", tags=["authentication"])
app.include_router(users_router, prefix="/api/users", tags=["users"])
app.include_router(campaigns_router, prefix="/api/campaigns", tags=["campaigns"])
app.include_router(characters_router, prefix="/api/characters", tags=["characters"])
app.include_router(compendium_router, prefix="/api/compendium", tags=["compendium"])


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "D&D Virtual Tabletop API",
        "status": "operational",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    try:
        # Test MongoDB connection
        await app.mongodb.command("ping")
        return {
            "status": "healthy",
            "database": "connected",
            "timestamp": settings.get_current_timestamp()
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": "Database connection failed"
        }


# WebSocket endpoint
@app.websocket("/ws/{campaign_id}")
async def websocket_endpoint(websocket: WebSocket, campaign_id: str):
    """
    WebSocket endpoint para comunicação em tempo real.
    CORREÇÃO: Implementação completa dos event handlers.
    """
    try:
        await websocket_manager.connect(websocket, campaign_id)
        logger.info(f"🔗 Cliente conectado ao WebSocket para campanha: {campaign_id}")

        try:
            while True:
                # Receber mensagem do cliente
                data = await websocket.receive_json()

                # Processar evento através do handler
                await handle_websocket_events(
                    event_type=data.get("type", "unknown"),
                    event_data=data.get("data", {}),
                    campaign_id=campaign_id,
                    websocket_manager=websocket_manager,
                    lock_manager=lock_manager,
                    database=app.mongodb
                )

        except WebSocketDisconnect:
            logger.info(f"🔌 Cliente desconectado da campanha: {campaign_id}")

        except Exception as e:
            logger.error(f"❌ Erro no WebSocket: {e}")
            await websocket.send_json({
                "type": "error",
                "data": {"message": "Erro interno do servidor"}
            })

    except Exception as e:
        logger.error(f"❌ Erro ao conectar WebSocket: {e}")
        await websocket.close(code=1000)

    finally:
        await websocket_manager.disconnect(websocket, campaign_id)


# Helper function para acessar managers globalmente
def get_lock_manager() -> LockManager:
    """Retorna a instância global do LockManager"""
    global lock_manager
    if lock_manager is None:
        raise RuntimeError("LockManager não foi inicializado")
    return lock_manager


def get_websocket_manager() -> WebSocketManager:
    """Retorna a instância global do WebSocketManager"""
    global websocket_manager
    if websocket_manager is None:
        raise RuntimeError("WebSocketManager não foi inicializado")
    return websocket_manager


# Event handlers específicos (IMPLEMENTADOS)
async def handle_lock_event(event_data: dict, campaign_id: str) -> None:
    """
    Gerencia eventos relacionados a locks.
    CORREÇÃO: Função estava incompleta/cortada.
    """
    try:
        action = event_data.get("action")
        target_type = event_data.get("target_type")  # character, npc, etc.
        target_id = event_data.get("target_id")
        user_id = event_data.get("user_id")

        if not all([action, target_type, target_id, user_id]):
            raise ValueError("Dados incompletos para evento de lock")

        lock_key = f"{target_type}:{target_id}"

        if action == "acquire":
            # Tentar adquirir lock
            success = await lock_manager.acquire_lock(
                lock_key=lock_key,
                user_id=user_id,
                campaign_id=campaign_id
            )

            if success:
                # Notificar outros clientes sobre o lock
                await websocket_manager.broadcast_to_campaign(
                    campaign_id=campaign_id,
                    message={
                        "type": "lock_acquired",
                        "data": {
                            "target_type": target_type,
                            "target_id": target_id,
                            "locked_by": user_id
                        }
                    },
                    exclude_sender=True
                )

        elif action == "release":
            # Liberar lock
            await lock_manager.release_lock(
                lock_key=lock_key,
                user_id=user_id
            )

            # Notificar liberação
            await websocket_manager.broadcast_to_campaign(
                campaign_id=campaign_id,
                message={
                    "type": "lock_released",
                    "data": {
                        "target_type": target_type,
                        "target_id": target_id
                    }
                }
            )

        else:
            raise ValueError(f"Ação de lock desconhecida: {action}")

    except Exception as e:
        logger.error(f"❌ Erro ao processar evento de lock: {e}")
        raise


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )