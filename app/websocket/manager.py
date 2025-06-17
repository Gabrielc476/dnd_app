# app/websocket/manager.py
"""
WebSocket Manager - COMPLETO
Gerenciador de conexões WebSocket para o sistema D&D VTT.
"""

import asyncio
import logging
import json
from datetime import datetime, timedelta
from typing import Dict, List, Set, Optional, Any
from fastapi import WebSocket, WebSocketDisconnect
from collections import defaultdict

logger = logging.getLogger(__name__)


class ConnectionInfo:
    """Informações sobre uma conexão WebSocket."""

    def __init__(self, websocket: WebSocket, user_id: str, campaign_id: str):
        self.websocket = websocket
        self.user_id = user_id
        self.campaign_id = campaign_id
        self.connected_at = datetime.utcnow()
        self.last_ping = datetime.utcnow()
        self.is_active = True

    def update_ping(self):
        """Atualiza timestamp do último ping."""
        self.last_ping = datetime.utcnow()

    def is_stale(self, timeout_seconds: int = 300) -> bool:
        """Verifica se a conexão está obsoleta."""
        return (datetime.utcnow() - self.last_ping).total_seconds() > timeout_seconds


class WebSocketManager:
    """
    Gerenciador de conexões WebSocket.
    Organiza conexões por campanha e usuário.
    """

    def __init__(self):
        # Conexões organizadas por campanha
        self.campaign_connections: Dict[str, Dict[str, ConnectionInfo]] = defaultdict(dict)

        # Índice por websocket para lookup rápido
        self.websocket_index: Dict[WebSocket, ConnectionInfo] = {}

        # Índice por usuário para lookup rápido
        self.user_connections: Dict[str, List[ConnectionInfo]] = defaultdict(list)

        # Lock para operações thread-safe
        self._lock = asyncio.Lock()

        # Task de limpeza
        self._cleanup_task: Optional[asyncio.Task] = None
        self._start_cleanup_task()

    async def connect(self, websocket: WebSocket, campaign_id: str, user_id: Optional[str] = None) -> str:
        """
        Conecta um WebSocket à campanha.

        Args:
            websocket: Instância do WebSocket
            campaign_id: ID da campanha
            user_id: ID do usuário (opcional)

        Returns:
            ID da conexão
        """
        async with self._lock:
            try:
                # Aceitar conexão
                await websocket.accept()

                # Gerar ID de conexão se user_id não fornecido
                if not user_id:
                    user_id = f"guest_{id(websocket)}"

                # Criar info da conexão
                connection_info = ConnectionInfo(websocket, user_id, campaign_id)

                # Armazenar nos índices
                self.campaign_connections[campaign_id][user_id] = connection_info
                self.websocket_index[websocket] = connection_info
                self.user_connections[user_id].append(connection_info)

                logger.info(f"WebSocket conectado: usuário {user_id} na campanha {campaign_id}")

                # Notificar outros usuários da campanha
                await self._broadcast_user_status(campaign_id, user_id, "connected")

                return user_id

            except Exception as e:
                logger.error(f"Erro ao conectar WebSocket: {e}")
                try:
                    await websocket.close()
                except:
                    pass
                raise

    async def disconnect(self, websocket: WebSocket, campaign_id: str) -> None:
        """
        Desconecta um WebSocket.

        Args:
            websocket: Instância do WebSocket
            campaign_id: ID da campanha
        """
        async with self._lock:
            try:
                # Buscar informações da conexão
                connection_info = self.websocket_index.get(websocket)

                if not connection_info:
                    logger.warning("Tentativa de desconectar WebSocket não registrado")
                    return

                user_id = connection_info.user_id

                # Remover dos índices
                self.campaign_connections[campaign_id].pop(user_id, None)
                self.websocket_index.pop(websocket, None)

                # Remover da lista de conexões do usuário
                if user_id in self.user_connections:
                    self.user_connections[user_id] = [
                        conn for conn in self.user_connections[user_id]
                        if conn.websocket != websocket
                    ]
                    if not self.user_connections[user_id]:
                        del self.user_connections[user_id]

                # Limpar campanha vazia
                if not self.campaign_connections[campaign_id]:
                    del self.campaign_connections[campaign_id]

                logger.info(f"WebSocket desconectado: usuário {user_id} da campanha {campaign_id}")

                # Notificar outros usuários
                await self._broadcast_user_status(campaign_id, user_id, "disconnected")

                # Fechar conexão se ainda estiver aberta
                try:
                    await websocket.close()
                except:
                    pass

            except Exception as e:
                logger.error(f"Erro ao desconectar WebSocket: {e}")

    async def send_to_user(self, user_id: str, campaign_id: str, message: Dict[str, Any]) -> bool:
        """
        Envia mensagem para um usuário específico.

        Args:
            user_id: ID do usuário
            campaign_id: ID da campanha
            message: Mensagem a ser enviada

        Returns:
            True se enviado com sucesso
        """
        try:
            connection_info = self.campaign_connections.get(campaign_id, {}).get(user_id)

            if not connection_info or not connection_info.is_active:
                logger.debug(f"Usuário {user_id} não conectado na campanha {campaign_id}")
                return False

            # Adicionar timestamp se não estiver presente
            if "timestamp" not in message:
                message["timestamp"] = datetime.utcnow().isoformat()

            await connection_info.websocket.send_text(json.dumps(message))
            logger.debug(f"Mensagem enviada para {user_id}: {message.get('type', 'unknown')}")

            return True

        except WebSocketDisconnect:
            logger.info(f"WebSocket desconectado durante envio para {user_id}")
            await self._handle_disconnect(user_id, campaign_id)
            return False
        except Exception as e:
            logger.error(f"Erro ao enviar mensagem para {user_id}: {e}")
            return False

    async def broadcast_to_campaign(self, campaign_id: str, message: Dict[str, Any],
                                    exclude_user: Optional[str] = None) -> int:
        """
        Envia mensagem para todos os usuários de uma campanha.

        Args:
            campaign_id: ID da campanha
            message: Mensagem a ser enviada
            exclude_user: ID do usuário a ser excluído (opcional)

        Returns:
            Número de usuários que receberam a mensagem
        """
        try:
            connections = self.campaign_connections.get(campaign_id, {})
            sent_count = 0

            # Adicionar timestamp se não estiver presente
            if "timestamp" not in message:
                message["timestamp"] = datetime.utcnow().isoformat()

            # Lista de usuários para remover (conexões falhadas)
            failed_users = []

            for user_id, connection_info in connections.items():
                if exclude_user and user_id == exclude_user:
                    continue

                try:
                    if connection_info.is_active:
                        await connection_info.websocket.send_text(json.dumps(message))
                        sent_count += 1
                except WebSocketDisconnect:
                    logger.info(f"WebSocket desconectado durante broadcast: {user_id}")
                    failed_users.append(user_id)
                except Exception as e:
                    logger.error(f"Erro ao enviar para {user_id}: {e}")
                    failed_users.append(user_id)

            # Limpar conexões falhadas
            for user_id in failed_users:
                await self._handle_disconnect(user_id, campaign_id)

            logger.debug(f"Broadcast para campanha {campaign_id}: {sent_count} usuários")
            return sent_count

        except Exception as e:
            logger.error(f"Erro no broadcast para campanha {campaign_id}: {e}")
            return 0

    async def send_to_multiple_users(self, user_ids: List[str], campaign_id: str, message: Dict[str, Any]) -> int:
        """
        Envia mensagem para múltiplos usuários específicos.

        Args:
            user_ids: Lista de IDs dos usuários
            campaign_id: ID da campanha
            message: Mensagem a ser enviada

        Returns:
            Número de usuários que receberam a mensagem
        """
        sent_count = 0

        for user_id in user_ids:
            if await self.send_to_user(user_id, campaign_id, message):
                sent_count += 1

        return sent_count

    async def get_campaign_users(self, campaign_id: str) -> List[str]:
        """
        Obtém lista de usuários conectados em uma campanha.

        Args:
            campaign_id: ID da campanha

        Returns:
            Lista de IDs dos usuários conectados
        """
        connections = self.campaign_connections.get(campaign_id, {})
        return [
            user_id for user_id, conn in connections.items()
            if conn.is_active
        ]

    async def get_user_campaigns(self, user_id: str) -> List[str]:
        """
        Obtém lista de campanhas onde o usuário está conectado.

        Args:
            user_id: ID do usuário

        Returns:
            Lista de IDs das campanhas
        """
        campaigns = []
        connections = self.user_connections.get(user_id, [])

        for connection in connections:
            if connection.is_active:
                campaigns.append(connection.campaign_id)

        return list(set(campaigns))  # Remove duplicatas

    async def ping_user(self, user_id: str, campaign_id: str) -> bool:
        """
        Envia ping para um usuário.

        Args:
            user_id: ID do usuário
            campaign_id: ID da campanha

        Returns:
            True se ping enviado com sucesso
        """
        message = {
            "type": "ping",
            "timestamp": datetime.utcnow().isoformat()
        }

        success = await self.send_to_user(user_id, campaign_id, message)

        if success:
            # Atualizar timestamp de ping
            connection_info = self.campaign_connections.get(campaign_id, {}).get(user_id)
            if connection_info:
                connection_info.update_ping()

        return success

    async def handle_pong(self, user_id: str, campaign_id: str) -> None:
        """
        Processa resposta de pong de um usuário.

        Args:
            user_id: ID do usuário
            campaign_id: ID da campanha
        """
        connection_info = self.campaign_connections.get(campaign_id, {}).get(user_id)
        if connection_info:
            connection_info.update_ping()

    async def disconnect_all(self) -> None:
        """Desconecta todas as conexões WebSocket."""
        async with self._lock:
            logger.info("Desconectando todas as conexões WebSocket...")

            # Cancelar task de limpeza
            if self._cleanup_task:
                self._cleanup_task.cancel()

            # Fechar todas as conexões
            for websocket in list(self.websocket_index.keys()):
                try:
                    await websocket.close()
                except:
                    pass

            # Limpar todos os índices
            self.campaign_connections.clear()
            self.websocket_index.clear()
            self.user_connections.clear()

            logger.info("Todas as conexões WebSocket foram desconectadas")

    def get_stats(self) -> Dict[str, Any]:
        """
        Obtém estatísticas das conexões.

        Returns:
            Dicionário com estatísticas
        """
        total_connections = len(self.websocket_index)
        total_campaigns = len(self.campaign_connections)
        total_users = len(self.user_connections)

        campaign_stats = {}
        for campaign_id, connections in self.campaign_connections.items():
            campaign_stats[campaign_id] = {
                "user_count": len(connections),
                "users": list(connections.keys())
            }

        return {
            "total_connections": total_connections,
            "total_campaigns": total_campaigns,
            "total_users": total_users,
            "campaigns": campaign_stats,
            "timestamp": datetime.utcnow().isoformat()
        }

    async def _broadcast_user_status(self, campaign_id: str, user_id: str, status: str) -> None:
        """
        Notifica mudança de status de usuário.

        Args:
            campaign_id: ID da campanha
            user_id: ID do usuário
            status: Status (connected/disconnected)
        """
        message = {
            "type": "user_status",
            "user_id": user_id,
            "status": status,
            "timestamp": datetime.utcnow().isoformat()
        }

        await self.broadcast_to_campaign(campaign_id, message, exclude_user=user_id)

    async def _handle_disconnect(self, user_id: str, campaign_id: str) -> None:
        """
        Trata desconexão inesperada.

        Args:
            user_id: ID do usuário
            campaign_id: ID da campanha
        """
        async with self._lock:
            connection_info = self.campaign_connections.get(campaign_id, {}).get(user_id)

            if connection_info:
                connection_info.is_active = False
                websocket = connection_info.websocket

                # Limpar do índice
                self.websocket_index.pop(websocket, None)
                self.campaign_connections[campaign_id].pop(user_id, None)

                # Remover das conexões do usuário
                if user_id in self.user_connections:
                    self.user_connections[user_id] = [
                        conn for conn in self.user_connections[user_id]
                        if conn.websocket != websocket
                    ]
                    if not self.user_connections[user_id]:
                        del self.user_connections[user_id]

    def _start_cleanup_task(self) -> None:
        """Inicia task de limpeza de conexões obsoletas."""

        async def cleanup_stale_connections():
            while True:
                try:
                    await asyncio.sleep(60)  # Verificar a cada minuto

                    async with self._lock:
                        stale_connections = []

                        for websocket, connection_info in self.websocket_index.items():
                            if connection_info.is_stale():
                                stale_connections.append((websocket, connection_info))

                        for websocket, connection_info in stale_connections:
                            logger.info(f"Removendo conexão obsoleta: {connection_info.user_id}")
                            await self._handle_disconnect(
                                connection_info.user_id,
                                connection_info.campaign_id
                            )

                            try:
                                await websocket.close()
                            except:
                                pass

                except asyncio.CancelledError:
                    break
                except Exception as e:
                    logger.error(f"Erro na limpeza de conexões: {e}")

        self._cleanup_task = asyncio.create_task(cleanup_stale_connections())