# app/websocket/connection_manager.py
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List, Tuple, Any
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Gerencia conexões WebSocket para cada campanha.

    Responsável por:
    - Rastrear conexões ativas por campanha
    - Conectar e desconectar WebSockets
    - Enviar mensagens para campanhas ou usuários específicos
    """

    def __init__(self):
        # Mapeia IDs de campanhas para listas de tuplas (WebSocket, user_id)
        self.active_connections: Dict[str, List[Tuple[WebSocket, str]]] = {}
        # Mapeia user_ids para seus WebSockets ativos
        self.user_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, campaign_id: str, user_id: str) -> None:
        """
        Conecta um WebSocket a uma campanha específica.

        Args:
            websocket: O WebSocket a ser conectado
            campaign_id: ID da campanha
            user_id: ID do usuário que está se conectando
        """
        await websocket.accept()

        # Inicializar dicionários se necessário
        if campaign_id not in self.active_connections:
            self.active_connections[campaign_id] = []

        if user_id not in self.user_connections:
            self.user_connections[user_id] = []

        # Adicionar a conexão às listas
        self.active_connections[campaign_id].append((websocket, user_id))
        self.user_connections[user_id].append(websocket)

        logger.info(f"User {user_id} connected to campaign {campaign_id}")

        # Enviar mensagem de conexão bem-sucedida
        await websocket.send_json({
            "type": "system",
            "action": "connected",
            "timestamp": datetime.utcnow().isoformat(),
            "campaign_id": campaign_id,
            "message": "Conexão estabelecida com sucesso"
        })

    def disconnect(self, websocket: WebSocket, campaign_id: str, user_id: str) -> None:
        """
        Desconecta um WebSocket de uma campanha.

        Args:
            websocket: O WebSocket a ser desconectado
            campaign_id: ID da campanha
            user_id: ID do usuário que está se desconectando
        """
        # Remover da lista de conexões da campanha
        if campaign_id in self.active_connections:
            self.active_connections[campaign_id] = [
                (ws, uid) for ws, uid in self.active_connections[campaign_id]
                if ws != websocket
            ]

            # Limpar entrada da campanha se não houver mais conexões
            if not self.active_connections[campaign_id]:
                del self.active_connections[campaign_id]

        # Remover das conexões do usuário
        if user_id in self.user_connections:
            self.user_connections[user_id] = [
                ws for ws in self.user_connections[user_id]
                if ws != websocket
            ]

            # Limpar entrada do usuário se não houver mais conexões
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]

        logger.info(f"User {user_id} disconnected from campaign {campaign_id}")

    async def broadcast_to_campaign(
            self, campaign_id: str, message: Dict[str, Any]
    ) -> None:
        """
        Envia uma mensagem para todos os usuários em uma campanha.

        Args:
            campaign_id: ID da campanha para broadcast
            message: Mensagem a ser enviada (será convertida para JSON)
        """
        if campaign_id not in self.active_connections:
            logger.warning(f"Tentativa de broadcast para campanha inexistente: {campaign_id}")
            return

        # Adicionar timestamp à mensagem se não existir
        if "timestamp" not in message:
            message["timestamp"] = datetime.utcnow().isoformat()

        disconnected = []

        for connection, user_id in self.active_connections[campaign_id]:
            try:
                await connection.send_json(message)
            except WebSocketDisconnect:
                # Marcar conexão para remoção
                disconnected.append((connection, user_id))
            except Exception as e:
                logger.error(f"Erro ao enviar mensagem para usuário {user_id}: {str(e)}")
                disconnected.append((connection, user_id))

        # Remover conexões desconectadas
        for connection, user_id in disconnected:
            self.disconnect(connection, campaign_id, user_id)

    async def send_personal_message(
            self, message: Dict[str, Any], user_id: str, campaign_id: str = None
    ) -> None:
        """
        Envia uma mensagem para um usuário específico.

        Args:
            message: Mensagem a ser enviada
            user_id: ID do usuário destinatário
            campaign_id: ID da campanha (opcional, para logging)
        """
        if user_id not in self.user_connections:
            logger.warning(f"Tentativa de enviar mensagem para usuário desconectado: {user_id}")
            return

        # Adicionar timestamp à mensagem se não existir
        if "timestamp" not in message:
            message["timestamp"] = datetime.utcnow().isoformat()

        disconnected = []

        for connection in self.user_connections[user_id]:
            try:
                await connection.send_json(message)
            except WebSocketDisconnect:
                # Marcar conexão para remoção
                disconnected.append(connection)
            except Exception as e:
                logger.error(f"Erro ao enviar mensagem para usuário {user_id}: {str(e)}")
                disconnected.append(connection)

        # Remover conexões desconectadas
        for connection in disconnected:
            # Encontrar a campanha correspondente para esta conexão
            for cid, connections in self.active_connections.items():
                for ws, uid in connections:
                    if ws == connection and uid == user_id:
                        self.disconnect(connection, cid, user_id)

    def get_connected_users(self, campaign_id: str) -> List[str]:
        """
        Retorna a lista de IDs de usuários conectados a uma campanha.

        Args:
            campaign_id: ID da campanha

        Returns:
            Lista de IDs de usuário
        """
        if campaign_id not in self.active_connections:
            return []

        # Extrair user_ids únicos de todas as conexões da campanha
        return list(set(uid for _, uid in self.active_connections[campaign_id]))

    def is_user_connected(self, user_id: str, campaign_id: str = None) -> bool:
        """
        Verifica se um usuário está conectado.

        Args:
            user_id: ID do usuário
            campaign_id: ID da campanha (opcional)

        Returns:
            True se o usuário estiver conectado, False caso contrário
        """
        if campaign_id is None:
            return user_id in self.user_connections

        if campaign_id not in self.active_connections:
            return False

        return any(uid == user_id for _, uid in self.active_connections[campaign_id])