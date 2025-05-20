# app/websocket/lock_manager.py
from datetime import datetime, timedelta
import logging
from typing import Optional, List, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.config import settings

logger = logging.getLogger(__name__)


class LockManager:
    """
    Gerencia locks distribuídos para recursos do sistema.

    Responsável por:
    - Adquirir locks para recursos
    - Liberar locks
    - Estender locks com heartbeats
    - Gerenciar a expiração automática de locks
    """

    def __init__(self, db: AsyncIOMotorDatabase):
        """
        Inicializa o gerenciador de locks.

        Args:
            db: Conexão com o banco de dados MongoDB
        """
        self.db = db
        self.locks_collection = db.locks

    def _format_id(self, item):
        """Formata o ID de um item para string."""
        if item and "_id" in item:
            item["_id"] = str(item["_id"])
        return item

    def _format_id_list(self, items):
        """Formata os IDs de uma lista de itens para string."""
        return [self._format_id(item) for item in items] if items else []

    async def acquire_lock(
            self,
            resource_id: str,
            resource_type: str,
            user_id: str,
            duration_seconds: int = None
    ) -> bool:
        """
        Tenta adquirir um lock para um recurso específico.

        Args:
            resource_id: ID do recurso a ser bloqueado
            resource_type: Tipo do recurso ('character', 'combat', etc.)
            user_id: ID do usuário que está adquirindo o lock
            duration_seconds: Duração do lock em segundos (opcional)

        Returns:
            True se o lock foi adquirido com sucesso, False caso contrário
        """
        # Usar duração padrão se não especificada
        if duration_seconds is None:
            duration_seconds = settings.LOCK_DEFAULT_TIMEOUT

        # Limitar duração máxima
        duration_seconds = min(duration_seconds, settings.LOCK_MAX_TIMEOUT)

        now = datetime.utcnow()
        expires_at = now + timedelta(seconds=duration_seconds)

        # Primeiro, limpar locks expirados
        await self.cleanup_expired_locks()

        # Verificar se o recurso já está bloqueado
        existing_lock = await self.locks_collection.find_one({
            "resource_id": resource_id,
            "resource_type": resource_type,
            "expires_at": {"$gt": now}
        })

        if existing_lock:
            # Se o lock atual pertence ao usuário, estender
            if str(existing_lock.get("locked_by")) == str(user_id):
                await self.locks_collection.update_one(
                    existing_lock["_id"],
                    {"$set": {"expires_at": expires_at}}
                )
                logger.debug(f"Lock estendido: {resource_type}:{resource_id} por {user_id}")
                return True

            # Recurso bloqueado por outro usuário
            logger.debug(
                f"Lock falhou - já bloqueado: {resource_type}:{resource_id} "
                f"por {existing_lock['locked_by']}, solicitado por {user_id}"
            )
            return False

        # Criar um novo lock
        await self.locks_collection.insert_one({
            "resource_id": str(resource_id),
            "resource_type": resource_type,
            "locked_by": str(user_id),
            "timestamp": now,
            "expires_at": expires_at
        })

        logger.debug(f"Lock adquirido: {resource_type}:{resource_id} por {user_id}")
        return True

    async def release_lock(
            self,
            resource_id: str,
            resource_type: str,
            user_id: str
    ) -> bool:
        """
        Libera um lock específico.

        Args:
            resource_id: ID do recurso
            resource_type: Tipo do recurso
            user_id: ID do usuário que possui o lock

        Returns:
            True se o lock foi liberado, False caso contrário
        """
        result = await self.locks_collection.delete_one({
            "resource_id": str(resource_id),
            "resource_type": resource_type,
            "locked_by": str(user_id)
        })

        success = result.deleted_count > 0
        if success:
            logger.debug(f"Lock liberado: {resource_type}:{resource_id} por {user_id}")
        else:
            logger.debug(f"Falha ao liberar lock: {resource_type}:{resource_id} por {user_id}")

        return success

    async def heartbeat_lock(
            self,
            resource_id: str,
            resource_type: str,
            user_id: str,
            duration_seconds: int = None
    ) -> bool:
        """
        Renova um lock existente.

        Args:
            resource_id: ID do recurso
            resource_type: Tipo do recurso
            user_id: ID do usuário que possui o lock
            duration_seconds: Nova duração em segundos (opcional)

        Returns:
            True se o lock foi renovado, False caso contrário
        """
        # Usar duração padrão se não especificada
        if duration_seconds is None:
            duration_seconds = settings.LOCK_DEFAULT_TIMEOUT

        # Limitar duração máxima
        duration_seconds = min(duration_seconds, settings.LOCK_MAX_TIMEOUT)

        expires_at = datetime.utcnow() + timedelta(seconds=duration_seconds)

        result = await self.locks_collection.update_one(
            {
                "resource_id": str(resource_id),
                "resource_type": resource_type,
                "locked_by": str(user_id)
            },
            {"$set": {"expires_at": expires_at}}
        )

        success = result.modified_count > 0
        if success:
            logger.debug(f"Lock renovado: {resource_type}:{resource_id} por {user_id}")
        else:
            logger.debug(f"Falha ao renovar lock: {resource_type}:{resource_id} por {user_id}")

        return success

    async def cleanup_expired_locks(self) -> int:
        """
        Remove todos os locks expirados do banco de dados.

        Returns:
            Número de locks expirados removidos
        """
        now = datetime.utcnow()
        result = await self.locks_collection.delete_many({
            "expires_at": {"$lt": now}
        })

        if result.deleted_count > 0:
            logger.debug(f"Removidos {result.deleted_count} locks expirados")

        return result.deleted_count

    async def get_active_locks(
            self,
            resource_type: str = None,
            user_id: str = None
    ) -> List[Dict[str, Any]]:
        """
        Retorna todos os locks ativos, opcionalmente filtrados por tipo ou usuário.

        Args:
            resource_type: Filtrar por tipo de recurso (opcional)
            user_id: Filtrar por ID de usuário (opcional)

        Returns:
            Lista de locks ativos
        """
        now = datetime.utcnow()
        query = {"expires_at": {"$gt": now}}

        if resource_type:
            query["resource_type"] = resource_type

        if user_id:
            query["locked_by"] = str(user_id)

        cursor = self.locks_collection.find(query)
        locks = await cursor.to_list(length=100)  # Limitar a 100 locks por consulta

        # Formatar IDs para string antes de retornar
        return self._format_id_list(locks)

    async def get_user_locks(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Retorna todos os locks ativos de um usuário específico.

        Args:
            user_id: ID do usuário

        Returns:
            Lista de locks ativos do usuário
        """
        return await self.get_active_locks(user_id=user_id)

    async def is_locked_by_other(
            self,
            resource_id: str,
            resource_type: str,
            user_id: str
    ) -> bool:
        """
        Verifica se um recurso está bloqueado por outro usuário.

        Args:
            resource_id: ID do recurso
            resource_type: Tipo do recurso
            user_id: ID do usuário atual

        Returns:
            True se o recurso estiver bloqueado por outro usuário, False caso contrário
        """
        now = datetime.utcnow()
        lock = await self.locks_collection.find_one({
            "resource_id": str(resource_id),
            "resource_type": resource_type,
            "expires_at": {"$gt": now},
            "locked_by": {"$ne": str(user_id)}
        })

        return lock is not None

    async def who_locked(
            self,
            resource_id: str,
            resource_type: str
    ) -> Optional[str]:
        """
        Retorna o ID do usuário que possui o lock para um recurso.

        Args:
            resource_id: ID do recurso
            resource_type: Tipo do recurso

        Returns:
            ID do usuário ou None se o recurso não estiver bloqueado
        """
        now = datetime.utcnow()
        lock = await self.locks_collection.find_one({
            "resource_id": str(resource_id),
            "resource_type": resource_type,
            "expires_at": {"$gt": now}
        })

        return str(lock.get("locked_by")) if lock else None

    async def create_session_lock(
            self,
            campaign_id: str,
            resource_type: str,
            user_id: str,
            player_turn: str = None,
            duration_seconds: int = None
    ) -> bool:
        """
        Cria um lock de sessão (por exemplo, para combate).

        Args:
            campaign_id: ID da campanha
            resource_type: Tipo do recurso ('combat', 'initiative', etc.)
            user_id: ID do usuário (geralmente o DM)
            player_turn: ID do jogador atual (opcional)
            duration_seconds: Duração em segundos (opcional)

        Returns:
            True se o lock foi criado com sucesso, False caso contrário
        """
        # Usar duração padrão se não especificada
        if duration_seconds is None:
            duration_seconds = settings.LOCK_DEFAULT_TIMEOUT

        # Locks de sessão podem durar mais tempo
        duration_seconds = min(duration_seconds, settings.LOCK_MAX_TIMEOUT)

        now = datetime.utcnow()
        expires_at = now + timedelta(seconds=duration_seconds)

        # Verificar se já existe um lock de sessão
        existing_lock = await self.db.session_locks.find_one({
            "campaign_id": str(campaign_id),
            "resource_type": resource_type,
            "expires_at": {"$gt": now}
        })

        if existing_lock:
            # Se o lock atual pertence ao usuário, estender
            if str(existing_lock.get("locked_by")) == str(user_id):
                update_data = {"expires_at": expires_at}

                # Atualizar player_turn se fornecido
                if player_turn is not None:
                    update_data["player_turn"] = str(player_turn)

                await self.db.session_locks.update_one(
                    existing_lock["_id"],
                    {"$set": update_data}
                )

                logger.debug(f"Lock de sessão estendido: {resource_type} na campanha {campaign_id}")
                return True

            # Sessão bloqueada por outro usuário
            logger.debug(
                f"Lock de sessão falhou - já bloqueado: {resource_type} "
                f"na campanha {campaign_id} por {existing_lock['locked_by']}"
            )
            return False

        # Criar um novo lock de sessão
        session_lock = {
            "campaign_id": str(campaign_id),
            "resource_type": resource_type,
            "locked_by": str(user_id),
            "timestamp": now,
            "expires_at": expires_at
        }

        if player_turn is not None:
            session_lock["player_turn"] = str(player_turn)

        await self.db.session_locks.insert_one(session_lock)

        logger.debug(f"Lock de sessão criado: {resource_type} na campanha {campaign_id}")
        return True

    async def release_session_lock(
            self,
            campaign_id: str,
            resource_type: str,
            user_id: str
    ) -> bool:
        """
        Libera um lock de sessão.

        Args:
            campaign_id: ID da campanha
            resource_type: Tipo do recurso
            user_id: ID do usuário que possui o lock

        Returns:
            True se o lock foi liberado, False caso contrário
        """
        result = await self.db.session_locks.delete_one({
            "campaign_id": str(campaign_id),
            "resource_type": resource_type,
            "locked_by": str(user_id)
        })

        success = result.deleted_count > 0
        if success:
            logger.debug(f"Lock de sessão liberado: {resource_type} na campanha {campaign_id}")
        else:
            logger.debug(f"Falha ao liberar lock de sessão: {resource_type} na campanha {campaign_id}")

        return success

    async def update_session_turn(
            self,
            campaign_id: str,
            resource_type: str,
            user_id: str,
            player_turn: str
    ) -> bool:
        """
        Atualiza o turno do jogador em um lock de sessão.

        Args:
            campaign_id: ID da campanha
            resource_type: Tipo do recurso
            user_id: ID do usuário que possui o lock
            player_turn: ID do jogador atual

        Returns:
            True se o lock foi atualizado, False caso contrário
        """
        result = await self.db.session_locks.update_one(
            {
                "campaign_id": str(campaign_id),
                "resource_type": resource_type,
                "locked_by": str(user_id)
            },
            {"$set": {"player_turn": str(player_turn)}}
        )

        success = result.modified_count > 0
        if success:
            logger.debug(
                f"Turno atualizado no lock de sessão: {resource_type} "
                f"na campanha {campaign_id}, turno: {player_turn}"
            )
        else:
            logger.debug(
                f"Falha ao atualizar turno no lock de sessão: {resource_type} "
                f"na campanha {campaign_id}"
            )

        return success

    async def get_current_player_turn(
            self,
            campaign_id: str,
            resource_type: str
    ) -> Optional[str]:
        """
        Obtém o ID do jogador atual em um lock de sessão.

        Args:
            campaign_id: ID da campanha
            resource_type: Tipo do recurso

        Returns:
            ID do jogador atual ou None se não houver lock ativo
        """
        now = datetime.utcnow()
        lock = await self.db.session_locks.find_one({
            "campaign_id": str(campaign_id),
            "resource_type": resource_type,
            "expires_at": {"$gt": now}
        })

        return str(lock.get("player_turn")) if lock and lock.get("player_turn") else None