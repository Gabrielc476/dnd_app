# app/main.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import logging
from typing import Dict, List, Tuple, Any

from app.config import settings
from app.db import get_database, close_mongodb_connection
from app.dependencies import get_current_user
from app.websocket.connection_manager import ConnectionManager
from app.websocket.lock_manager import LockManager
from app.websocket.event_handlers import (
    handle_character_event,
    handle_combat_event,
    handle_image_event,
    handle_spell_event
)
from app.models.user import User

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Criar aplicação FastAPI
app = FastAPI(
    title=settings.APP_NAME,
    description="API para o sistema D&D Virtual Tabletop",
    version=settings.VERSION,
    docs_url=f"{settings.API_PREFIX}/docs",
    redoc_url=f"{settings.API_PREFIX}/redoc",
    openapi_url=f"{settings.API_PREFIX}/openapi.json",
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOW_ORIGINS,
    allow_credentials=settings.ALLOW_CREDENTIALS,
    allow_methods=settings.ALLOW_METHODS,
    allow_headers=settings.ALLOW_HEADERS,
)

# Importar routers
from app.routes import auth, characters, campaigns, npcs, compendium

# Incluir routers na aplicação
app.include_router(auth.router, prefix=settings.API_PREFIX)
for router in [characters.router, campaigns.router, npcs.router, compendium.router]:
    app.include_router(router, prefix=settings.API_PREFIX, dependencies=[Depends(get_current_user)])

# Gerenciadores para WebSockets
connection_manager = ConnectionManager()
lock_manager = None


@app.on_event("startup")
async def startup_db_client():
    """Inicializa o cliente MongoDB e o gerenciador de locks na inicialização."""
    global lock_manager

    logger.info(f"Conectando ao MongoDB: {settings.MONGODB_URI}")

    # Inicializar o banco de dados
    app.mongodb_client = AsyncIOMotorClient(settings.MONGODB_URI)
    app.mongodb = app.mongodb_client[settings.DB_NAME]

    # Teste de conexão
    try:
        await app.mongodb.command("ping")
        logger.info("Conectado com sucesso ao MongoDB")
    except Exception as e:
        logger.error(f"Erro ao conectar ao MongoDB: {str(e)}")
        raise

    # Inicializar o gerenciador de locks
    lock_manager = LockManager(app.mongodb)
    logger.info("Gerenciador de locks inicializado")

    # Limpar locks expirados na inicialização
    count = await lock_manager.cleanup_expired_locks()
    logger.info(f"Limpeza inicial: {count} locks expirados removidos")


@app.on_event("shutdown")
async def shutdown_db_client():
    """Fecha a conexão com MongoDB e limpa recursos no desligamento."""
    if hasattr(app, "mongodb_client"):
        app.mongodb_client.close()
        logger.info("Conexão com MongoDB fechada")

    # Limpar outros recursos se necessário
    logger.info("Servidor sendo desligado")


@app.get("/api/health")
async def health_check():
    """Endpoint para verificação de saúde da API."""
    return {"status": "online", "version": settings.VERSION}


@app.websocket("/ws/campaign/{campaign_id}")
async def websocket_endpoint(
        websocket: WebSocket,
        campaign_id: str,
        current_user: User = Depends(get_current_user)
):
    """
    Endpoint WebSocket para conexão com uma campanha específica.

    Args:
        websocket: A conexão WebSocket
        campaign_id: ID da campanha a ser conectada
        current_user: Usuário atual (autenticado via token)
    """
    global lock_manager

    if not lock_manager:
        await websocket.close(code=1011)  # Internal Server Error
        return

    # Verificar se o usuário tem acesso à campanha
    db = await get_database()
    campaign = await db.campaigns.find_one({"_id": campaign_id})

    if not campaign:
        await websocket.close(code=1003)  # Unsupported Data
        return

    is_dm = campaign["dm_id"] == str(current_user.id)
    is_player = str(current_user.id) in campaign.get("players", [])

    if not is_dm and not is_player:
        await websocket.close(code=1008)  # Policy Violation
        return

    # Aceitar conexão e adicionar ao gerenciador
    await connection_manager.connect(websocket, campaign_id, str(current_user.id))

    try:
        while True:
            # Aguardar mensagens JSON do cliente
            data = await websocket.receive_json()

            if not isinstance(data, dict) or "type" not in data:
                logger.warning(f"Mensagem inválida recebida: {data}")
                continue

            # Processar diferentes tipos de mensagens
            message_type = data["type"]

            # Log para debug
            logger.debug(f"Mensagem recebida ({message_type}): {data}")

            if message_type == "ping":
                # Responder a ping com pong
                await websocket.send_json({"type": "pong", "timestamp": data.get("timestamp")})

            elif message_type == "lock":
                # Gerenciar eventos de lock
                await handle_lock_event(
                    data,
                    campaign_id,
                    str(current_user.id),
                    websocket,
                    connection_manager,
                    lock_manager
                )

            elif message_type == "character":
                # Gerenciar eventos de personagem
                await handle_character_event(
                    data,
                    campaign_id,
                    str(current_user.id),
                    connection_manager,
                    lock_manager,
                    db
                )

            elif message_type == "combat":
                # Gerenciar eventos de combate
                await handle_combat_event(
                    data,
                    campaign_id,
                    str(current_user.id),
                    connection_manager,
                    lock_manager,
                    db
                )

            elif message_type == "image":
                # Gerenciar eventos de imagem
                await handle_image_event(
                    data,
                    campaign_id,
                    str(current_user.id),
                    connection_manager,
                    lock_manager,
                    db
                )

            elif message_type == "spell":
                # Gerenciar eventos de magia
                await handle_spell_event(
                    data,
                    campaign_id,
                    str(current_user.id),
                    connection_manager,
                    lock_manager,
                    db
                )

            else:
                # Tipo de mensagem desconhecido
                logger.warning(f"Tipo de mensagem desconhecido: {message_type}")
                await websocket.send_json({
                    "type": "error",
                    "message": f"Tipo de mensagem não suportado: {message_type}"
                })

    except WebSocketDisconnect:
        # Cliente desconectou
        logger.info(f"Cliente desconectado: {current_user.username} ({current_user.id})")

        # Liberar todos os locks deste usuário
        await release_all_user_locks(str(current_user.id), lock_manager)

        # Remover do gerenciador de conexões
        connection_manager.disconnect(websocket, campaign_id, str(current_user.id))

        # Notificar outros usuários da desconexão
        await connection_manager.broadcast_to_campaign(
            campaign_id,
            {
                "type": "system",
                "action": "user_disconnected",
                "user_id": str(current_user.id),
                "username": current_user.username
            }
        )

    except Exception as e:
        # Erro durante processamento de mensagens
        logger.error(f"Erro no websocket: {str(e)}", exc_info=True)

        # Liberar recursos se possível
        try:
            await release_all_user_locks(str(current_user.id), lock_manager)
            connection_manager.disconnect(websocket, campaign_id, str(current_user.id))
        except Exception as cleanup_error:
            logger.error(f"Erro ao limpar recursos: {str(cleanup_error)}")


async def handle_lock_event(
        data: Dict[str, Any],
        campaign_id: str,
        user_id: str,
        websocket: WebSocket,
        connection_manager: ConnectionManager,
        lock_manager: LockManager
) -> None:
    """
    Gerencia eventos relacionados a locks.

    Args:
        data: Dados do evento
        campaign_id: ID da campanha
        user_id: ID do usuário
        websocket: Websocket do cliente
        connection_manager: Gerenciador de conexões
        lock_manager: Gerenciador de locks
    """
    action = data.get("action")

    if not action:
        await websocket.send_json({
            "type": "error",
            "message": "Ação de lock não especificada"
        })
        return

    if action == "acquire":
        resource_id = data.get("resource_id")
        resource_type = data.get("resource_type")

        if not resource_id or not resource_type:
            await websocket.send_json({
                "type": "error",
                "message": "ID ou tipo de recurso não especificado"
            })
            return

        duration = data.get("duration")  # Em segundos, opcional

        # Tenta adquirir o lock
        success = await lock_manager.acquire_lock(
            resource_id=resource_id,
            resource_type=resource_type,
            user_id=user_id,
            duration_seconds=duration
        )

        if success:
            # Notificar todos sobre o lock
            await connection_manager.broadcast_to_campaign(
                campaign_id,
                {
                    "type": "lock",
                    "action": "acquired",
                    "resource_id": resource_id,
                    "resource_type": resource_type,
                    "locked_by": user_id
                }
            )

            # Confirmar para o solicitante
            await websocket.send_json({
                "type": "lock",
                "action": "success",
                "resource_id": resource_id,
                "resource_type": resource_type
            })
        else:
            # Informar falha
            locker_id = await lock_manager.who_locked(resource_id, resource_type)
            await websocket.send_json({
                "type": "lock",
                "action": "failed",
                "resource_id": resource_id,
                "resource_type": resource_type,
                "locked_by": locker_id,
                "message": "Recurso bloqueado por outro usuário"
            })

    elif action == "release":
        resource_id = data.get("resource_id")
        resource_type = data.get("resource_type")

        if not resource_id or not resource_type:
            await websocket.send_json({
                "type": "error",
                "message": "ID ou tipo de recurso não especificado"
            })
            return

        # Tenta liberar o lock
        success = await lock_manager.release_lock(
            resource_id=resource_id,
            resource_type=resource_type,
            user_id=user_id
        )

        if success:
            # Notificar todos sobre a liberação
            await connection_manager.broadcast_to_campaign(
                campaign_id,
                {
                    "type": "lock",
                    "action": "released",
                    "resource_id": resource_id,
                    "resource_type": resource_type,
                    "released_by": user_id
                }
            )

            # Confirmar para o solicitante
            await websocket.send_json({
                "type": "lock",
                "action": "success",
                "operation": "release",
                "resource_id": resource_id,
                "resource_type": resource_type
            })
        else:
            # Informar falha
            await websocket.send_json({
                "type": "lock",
                "action": "failed",
                "operation": "release",
                "resource_id": resource_id,
                "resource_type": resource_type,
                "message": "Falha ao liberar lock"
            })

    elif action == "heartbeat":
        resource_id = data.get("resource_id")
        resource_type = data.get("resource_type")

        if not resource_id or not resource_type:
            # Erro silencioso para heartbeats
            return

        # Renovar o lock
        await lock_manager.heartbeat_lock(
            resource_id=resource_id,
            resource_type=resource_type,
            user_id=user_id
        )

    elif action == "status":
        resource_id = data.get("resource_id")
        resource_type = data.get("resource_type")

        if not resource_id or not resource_type:
            await websocket.send_json({
                "type": "error",
                "message": "ID ou tipo de recurso não especificado"
            })
            return

        # Verificar o status do lock
        is_locked = await lock_manager.is_locked_by_other(
            resource_id=resource_id,
            resource_type=resource_type,
            user_id=user_id
        )

        locked_by = None
        if is_locked:
            locked_by = await lock_manager.who_locked(resource_id, resource_type)

        # Retornar o status
        await websocket.send_json({
            "type": "lock",
            "action": "status",
            "resource_id": resource_id,
            "resource_type": resource_type,
            "is_locked": is_locked,
            "locked_by": locked_by
        })


async def release_all_user_locks(user_id: str, lock_manager: LockManager) -> None:
    """
    Libera todos os locks de um usuário, geralmente chamado ao desconectar.

    Args:
        user_id: ID do usuário
        lock_manager: Gerenciador de locks
    """
    # Obter todos os locks do usuário
    locks = await lock_manager.get_user_locks(user_id)

    # Liberar cada lock
    for lock in locks:
        await lock_manager.release_lock(
            resource_id=lock["resource_id"],
            resource_type=lock["resource_type"],
            user_id=user_id
        )

    # Liberar também locks de sessão
    # Verificar todas as campanhas onde o usuário é DM
    db = await get_database()
    campaigns = await db.campaigns.find({"dm_id": user_id}).to_list(length=100)

    for campaign in campaigns:
        session_types = ["combat_session", "initiative"]
        for resource_type in session_types:
            await lock_manager.release_session_lock(
                campaign_id=str(campaign["_id"]),
                resource_type=resource_type,
                user_id=user_id
            )


if __name__ == "__main__":
    import uvicorn

    # Iniciar o servidor usando Uvicorn quando executado diretamente
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )