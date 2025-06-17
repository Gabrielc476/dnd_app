# app/core/lock_manager.py
"""
Lock Manager - COMPLETO
Sistema de locks para prevenir edição simultânea de recursos.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, Optional, Any, List
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from app.utils.id_handler import IdHandler

logger = logging.getLogger(__name__)


class LockInfo:
    """Informações sobre um lock."""

    def __init__(
            self,
            resource_id: str,
            resource_type: str,
            user_id: str,
            expires_at: datetime,
            metadata: Optional[Dict[str, Any]] = None
    ):
        self.resource_id = resource_id
        self.resource_type = resource_type
        self.user_id = user_id
        self.created_at = datetime.utcnow()
        self.expires_at = expires_at
        self.last_heartbeat = datetime.utcnow()
        self.metadata = metadata or {}

    def is_expired(self) -> bool:
        """Verifica se o lock expirou."""
        return datetime.utcnow() > self.expires_at

    def is_owned_by(self, user_id: str) -> bool:
        """Verifica se o lock pertence ao usuário."""
        return self.user_id == user_id

    def extend(self, seconds: int) -> None:
        """Estende a duração do lock."""
        self.expires_at = datetime.utcnow() + timedelta(seconds=seconds)
        self.last_heartbeat = datetime.utcnow()

    def to_dict(self) -> Dict[str, Any]:
        """Converte para dicionário."""
        return {
            "resource_id": self.resource_id,
            "resource_type": self.resource_type,
            "user_id": self.user_id,
            "created_at": self.created_at,
            "expires_at": self.expires_at,
            "last_heartbeat": self.last_heartbeat,
            "metadata": self.metadata
        }


class LockManager:
    """
    Gerenciador de locks para recursos do sistema.
    Previne edição simultânea de personagens, encontros, etc.
    """

    def __init__(self, db: AsyncIOMotorDatabase):
        """
        Inicializa o gerenciador de locks.

        Args:
            db: Conexão com o banco de dados
        """
        self.db = db
        self.locks: Dict[str, LockInfo] = {}
        self._cleanup_task: Optional[asyncio.Task] = None
        self._lock = asyncio.Lock()

        # Iniciar limpeza automática
        self._start_cleanup_task()

    def _get_lock_key(self, resource_id: str, resource_type: str) -> str:
        """Gera chave única para o lock."""
        return f"{resource_type}:{resource_id}"

    async def acquire_lock(
            self,
            resource_id: str,
            resource_type: str,
            user_id: str,
            duration: int = 300,
            metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Tenta adquirir um lock para um recurso.

        Args:
            resource_id: ID do recurso
            resource_type: Tipo do recurso (character, encounter, etc.)
            user_id: ID do usuário solicitante
            duration: Duração do lock em segundos
            metadata: Metadados adicionais do lock

        Returns:
            True se lock foi adquirido com sucesso
        """
        async with self._lock:
            try:
                lock_key = self._get_lock_key(resource_id, resource_type)

                # Verificar se já existe lock
                existing_lock = self.locks.get(lock_key)

                if existing_lock:
                    # Se lock expirou, remover
                    if existing_lock.is_expired():
                        await self._remove_lock(lock_key)
                        existing_lock = None
                    # Se é do mesmo usuário, renovar
                    elif existing_lock.is_owned_by(user_id):
                        existing_lock.extend(duration)
                        await self._persist_lock(existing_lock)
                        logger.info(f"Lock renovado: {lock_key} por {user_id}")
                        return True
                    # Lock ativo de outro usuário
                    else:
                        logger.debug(f"Lock negado: {lock_key} já está bloqueado por {existing_lock.user_id}")
                        return False

                # Criar novo lock
                expires_at = datetime.utcnow() + timedelta(seconds=duration)
                lock_info = LockInfo(resource_id, resource_type, user_id, expires_at, metadata)

                # Armazenar em memória e banco
                self.locks[lock_key] = lock_info
                await self._persist_lock(lock_info)

                logger.info(f"Lock adquirido: {lock_key} por {user_id} por {duration}s")
                return True

            except Exception as e:
                logger.error(f"Erro ao adquirir lock {resource_type}:{resource_id}: {e}")
                return False

    async def release_lock(self, resource_id: str, resource_type: str, user_id: str) -> bool:
        """
        Libera um lock de um recurso.

        Args:
            resource_id: ID do recurso
            resource_type: Tipo do recurso
            user_id: ID do usuário solicitante

        Returns:
            True se lock foi liberado com sucesso
        """
        async with self._lock:
            try:
                lock_key = self._get_lock_key(resource_id, resource_type)
                lock_info = self.locks.get(lock_key)

                if not lock_info:
                    logger.debug(f"Tentativa de liberar lock inexistente: {lock_key}")
                    return True  # Já está liberado

                # Verificar se é o dono do lock
                if not lock_info.is_owned_by(user_id):
                    logger.warning(f"Usuário {user_id} tentou liberar lock de {lock_info.user_id}: {lock_key}")
                    return False

                # Remover lock
                await self._remove_lock(lock_key)
                logger.info(f"Lock liberado: {lock_key} por {user_id}")
                return True

            except Exception as e:
                logger.error(f"Erro ao liberar lock {resource_type}:{resource_id}: {e}")
                return False

    async def renew_lock(self, resource_id: str, resource_type: str, user_id: str, duration: int = 300) -> bool:
        """
        Renova um lock existente.

        Args:
            resource_id: ID do recurso
            resource_type: Tipo do recurso
            user_id: ID do usuário
            duration: Nova duração em segundos

        Returns:
            True se lock foi renovado com sucesso
        """
        async with self._lock:
            try:
                lock_key = self._get_lock_key(resource_id, resource_type)
                lock_info = self.locks.get(lock_key)

                if not lock_info:
                    logger.debug(f"Tentativa de renovar lock inexistente: {lock_key}")
                    return False

                if not lock_info.is_owned_by(user_id):
                    logger.warning(f"Usuário {user_id} tentou renovar lock de {lock_info.user_id}: {lock_key}")
                    return False

                # Renovar lock
                lock_info.extend(duration)
                await self._persist_lock(lock_info)

                logger.debug(f"Lock renovado: {lock_key} por {user_id}")
                return True

            except Exception as e:
                logger.error(f"Erro ao renovar lock {resource_type}:{resource_id}: {e}")
                return False

    async def get_lock(self, resource_id: str, resource_type: str) -> Optional[Dict[str, Any]]:
        """
        Obtém informações sobre um lock.

        Args:
            resource_id: ID do recurso
            resource_type: Tipo do recurso

        Returns:
            Informações do lock ou None se não existe
        """
        try:
            lock_key = self._get_lock_key(resource_id, resource_type)
            lock_info = self.locks.get(lock_key)

            if not lock_info:
                return None

            # Verificar se expirou
            if lock_info.is_expired():
                await self._remove_lock(lock_key)
                return None

            return lock_info.to_dict()

        except Exception as e:
            logger.error(f"Erro ao obter lock {resource_type}:{resource_id}: {e}")
            return None

    async def get_user_locks(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Obtém todos os locks de um usuário.

        Args:
            user_id: ID do usuário

        Returns:
            Lista de locks do usuário
        """
        try:
            user_locks = []

            for lock_key, lock_info in list(self.locks.items()):
                if lock_info.is_expired():
                    await self._remove_lock(lock_key)
                    continue

                if lock_info.is_owned_by(user_id):
                    user_locks.append(lock_info.to_dict())

            return user_locks

        except Exception as e:
            logger.error(f"Erro ao obter locks do usuário {user_id}: {e}")
            return []

    async def force_release_lock(self, resource_id: str, resource_type: str) -> bool:
        """
        Força a liberação de um lock (admin).

        Args:
            resource_id: ID do recurso
            resource_type: Tipo do recurso

        Returns:
            True se lock foi liberado
        """
        async with self._lock:
            try:
                lock_key = self._get_lock_key(resource_id, resource_type)

                if lock_key in self.locks:
                    await self._remove_lock(lock_key)
                    logger.info(f"Lock forçadamente liberado: {lock_key}")
                    return True

                return True  # Já estava liberado

            except Exception as e:
                logger.error(f"Erro ao forçar liberação do lock {resource_type}:{resource_id}: {e}")
                return False

    async def release_user_locks(self, user_id: str) -> int:
        """
        Libera todos os locks de um usuário.

        Args:
            user_id: ID do usuário

        Returns:
            Número de locks liberados
        """
        async with self._lock:
            try:
                released_count = 0
                locks_to_remove = []

                for lock_key, lock_info in self.locks.items():
                    if lock_info.is_owned_by(user_id):
                        locks_to_remove.append(lock_key)

                for lock_key in locks_to_remove:
                    await self._remove_lock(lock_key)
                    released_count += 1

                if released_count > 0:
                    logger.info(f"Liberados {released_count} locks do usuário {user_id}")

                return released_count

            except Exception as e:
                logger.error(f"Erro ao liberar locks do usuário {user_id}: {e}")
                return 0

    async def cleanup_expired_locks(self) -> int:
        """
        Remove locks expirados.

        Returns:
            Número de locks removidos
        """
        async with self._lock:
            try:
                expired_locks = []

                for lock_key, lock_info in self.locks.items():
                    if lock_info.is_expired():
                        expired_locks.append(lock_key)

                for lock_key in expired_locks:
                    await self._remove_lock(lock_key)

                if expired_locks:
                    logger.info(f"Removidos {len(expired_locks)} locks expirados")

                return len(expired_locks)

            except Exception as e:
                logger.error(f"Erro na limpeza de locks: {e}")
                return 0

    async def get_stats(self) -> Dict[str, Any]:
        """
        Obtém estatísticas dos locks.

        Returns:
            Estatísticas dos locks
        """
        try:
            total_locks = len(self.locks)
            locks_by_type = {}
            locks_by_user = {}
            expired_count = 0

            for lock_info in self.locks.values():
                # Por tipo
                resource_type = lock_info.resource_type
                locks_by_type[resource_type] = locks_by_type.get(resource_type, 0) + 1

                # Por usuário
                user_id = lock_info.user_id
                locks_by_user[user_id] = locks_by_user.get(user_id, 0) + 1

                # Expirados
                if lock_info.is_expired():
                    expired_count += 1

            return {
                "total_locks": total_locks,
                "expired_locks": expired_count,
                "active_locks": total_locks - expired_count,
                "locks_by_type": locks_by_type,
                "locks_by_user": locks_by_user,
                "timestamp": datetime.utcnow().isoformat()
            }

        except Exception as e:
            logger.error(f"Erro ao obter estatísticas: {e}")
            return {"error": str(e)}

    async def _persist_lock(self, lock_info: LockInfo) -> None:
        """Persiste lock no banco de dados."""
        try:
            lock_data = {
                "resource_id": lock_info.resource_id,
                "resource_type": lock_info.resource_type,
                "user_id": IdHandler.to_object_id(lock_info.user_id),
                "created_at": lock_info.created_at,
                "expires_at": lock_info.expires_at,
                "last_heartbeat": lock_info.last_heartbeat,
                "metadata": lock_info.metadata
            }

            await self.db.locks.update_one(
                {
                    "resource_id": lock_info.resource_id,
                    "resource_type": lock_info.resource_type
                },
                {"$set": lock_data},
                upsert=True
            )

        except Exception as e:
            logger.error(f"Erro ao persistir lock: {e}")

    async def _remove_lock(self, lock_key: str) -> None:
        """Remove lock da memória e banco."""
        try:
            lock_info = self.locks.pop(lock_key, None)

            if lock_info:
                await self.db.locks.delete_one({
                    "resource_id": lock_info.resource_id,
                    "resource_type": lock_info.resource_type
                })

        except Exception as e:
            logger.error(f"Erro ao remover lock {lock_key}: {e}")

    async def _load_locks_from_db(self) -> None:
        """Carrega locks do banco de dados na inicialização."""
        try:
            cursor = self.db.locks.find({})

            async for lock_doc in cursor:
                lock_info = LockInfo(
                    resource_id=lock_doc["resource_id"],
                    resource_type=lock_doc["resource_type"],
                    user_id=str(lock_doc["user_id"]),
                    expires_at=lock_doc["expires_at"],
                    metadata=lock_doc.get("metadata", {})
                )

                # Só carregar se não expirou
                if not lock_info.is_expired():
                    lock_key = self._get_lock_key(lock_info.resource_id, lock_info.resource_type)
                    self.locks[lock_key] = lock_info
                else:
                    # Remover lock expirado do banco
                    await self.db.locks.delete_one({"_id": lock_doc["_id"]})

            logger.info(f"Carregados {len(self.locks)} locks ativos do banco de dados")

        except Exception as e:
            logger.error(f"Erro ao carregar locks do banco: {e}")

    def _start_cleanup_task(self) -> None:
        """Inicia task de limpeza automática."""

        async def cleanup_task():
            # Carregar locks do banco na inicialização
            await self._load_locks_from_db()

            while True:
                try:
                    await asyncio.sleep(60)  # Limpar a cada minuto
                    await self.cleanup_expired_locks()
                except asyncio.CancelledError:
                    break
                except Exception as e:
                    logger.error(f"Erro na task de limpeza: {e}")

        self._cleanup_task = asyncio.create_task(cleanup_task())

    async def shutdown(self) -> None:
        """Finaliza o gerenciador de locks."""
        logger.info("Finalizando Lock Manager...")

        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass

        # Limpar locks em memória
        async with self._lock:
            self.locks.clear()

        logger.info("Lock Manager finalizado")