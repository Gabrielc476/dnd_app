# app/services/campaign_service.py - Versão corrigida

from datetime import datetime
from typing import List, Dict, Optional, Any, Union
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.schemas.campaign import (
    CampaignCreateSchema, CampaignUpdateSchema, EncounterCreateSchema,
    EncounterUpdateSchema, TrapSchema, NPCReferenceSchema, ImageSchema,
    CampaignListSchema, CampaignSchema
)


class CampaignService:
    """
    Serviço para gerenciar operações relacionadas a campanhas.

    Responsável por:
    - Criar, atualizar, consultar e excluir campanhas
    - Gerenciar jogadores, encontros e imagens
    - Dar suporte a operações específicas do DM
    """

    def __init__(self, db: AsyncIOMotorDatabase):
        """
        Inicializa o serviço com a conexão de banco de dados.

        Args:
            db: Conexão com o banco de dados MongoDB
        """
        self.db = db

    def _format_id(self, item):
        """Formata o ID de um item para string."""
        if item and "_id" in item:
            item["_id"] = str(item["_id"])
        return item

    def _format_id_list(self, items):
        """Formata os IDs de uma lista de itens para string."""
        return [self._format_id(item) for item in items] if items else []

    def _campaign_to_list_item(self, campaign: Dict[str, Any]) -> Dict[str, Any]:
        """Converte um documento de campanha do MongoDB para o formato da lista."""
        # Calcular player_count
        player_count = len(campaign.get("players", []))

        # Calcular se está ativa (tem encounter ativo ou foi atualizada recentemente)
        active = bool(campaign.get("active_encounter"))
        if not active:
            # Considera ativa se foi atualizada nos últimos 30 dias
            updated_at = campaign.get("updated_at", campaign.get("created_at"))
            if updated_at:
                from datetime import timedelta
                thirty_days_ago = datetime.utcnow() - timedelta(days=30)
                active = updated_at > thirty_days_ago

        return {
            "_id": str(campaign["_id"]),
            "name": campaign["name"],
            "description": campaign.get("description"),
            "dm_id": campaign["dm_id"],
            "player_count": player_count,
            "active": active,
            "created_at": campaign["created_at"]
        }

    async def create_campaign(self, campaign_data: CampaignCreateSchema) -> Dict[str, Any]:
        """
        Cria uma nova campanha.

        Args:
            campaign_data: Dados da campanha a ser criada

        Returns:
            Campanha criada

        Raises:
            HTTPException: Se o usuário não existir
        """
        # Verificar se o usuário existe
        user = await self.db.users.find_one(campaign_data.dm_id)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Usuário com ID {campaign_data.dm_id} não encontrado"
            )

        # Verificar se o usuário é um DM
        if user.get("role") != "dm":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas usuários com papel de DM podem criar campanhas"
            )

        # Preparar dados da campanha
        now = datetime.utcnow()
        campaign_dict = campaign_data.dict(by_alias=True)

        # Adicionar campos adicionais
        campaign_dict["players"] = []
        campaign_dict["encounters"] = []
        campaign_dict["images"] = []
        campaign_dict["created_at"] = now
        campaign_dict["updated_at"] = now

        # Inserir no banco de dados
        result = await self.db.campaigns.insert_one(campaign_dict)

        # Recuperar a campanha criada
        created_campaign = await self.db.campaigns.find_one(result.inserted_id)

        # Formatar ID para string antes de retornar
        return self._format_id(created_campaign)

    async def get_campaign(self, campaign_id: str, user_id: str) -> Dict[str, Any]:
        """
        Obtém uma campanha pelo ID.

        Args:
            campaign_id: ID da campanha
            user_id: ID do usuário que está fazendo a solicitação

        Returns:
            Dados da campanha

        Raises:
            HTTPException: Se a campanha não for encontrada ou o usuário não tiver acesso
        """
        # Usar a coleção segura para buscar a campanha
        campaign = await self.db.campaigns.find_one(campaign_id)

        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Campanha com ID {campaign_id} não encontrada"
            )

        # Verificar se o usuário tem acesso à campanha
        await self._check_campaign_access(campaign, user_id)

        # Formatar ID para string antes de retornar
        return self._format_id(campaign)

    async def update_campaign(
            self,
            campaign_id: str,
            user_id: str,
            updates: CampaignUpdateSchema
    ) -> Dict[str, Any]:
        """
        Atualiza uma campanha.

        Args:
            campaign_id: ID da campanha
            user_id: ID do usuário que está fazendo a solicitação
            updates: Dados a serem atualizados

        Returns:
            Campanha atualizada

        Raises:
            HTTPException: Se a campanha não for encontrada ou o usuário não for o DM
        """
        # Verificar se a campanha existe
        campaign = await self.db.campaigns.find_one(campaign_id)

        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Campanha com ID {campaign_id} não encontrada"
            )

        # Verificar se o usuário é o DM da campanha
        if str(campaign.get("dm_id")) != str(user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas o DM pode atualizar esta campanha"
            )

        # Preparar os dados de atualização
        update_data = updates.dict(exclude_unset=True, by_alias=True)

        # Sempre atualizar o timestamp
        update_data["updated_at"] = datetime.utcnow()

        # Atualizar a campanha
        await self.db.campaigns.update_one(
            campaign_id,
            {"$set": update_data}
        )

        # Recuperar a campanha atualizada
        updated_campaign = await self.db.campaigns.find_one(campaign_id)

        # Formatar ID para string antes de retornar
        return self._format_id(updated_campaign)

    async def delete_campaign(self, campaign_id: str, user_id: str) -> bool:
        """
        Exclui uma campanha.

        Args:
            campaign_id: ID da campanha
            user_id: ID do usuário que está fazendo a solicitação

        Returns:
            True se a campanha foi excluída com sucesso

        Raises:
            HTTPException: Se a campanha não for encontrada ou o usuário não for o DM
        """
        # Verificar se a campanha existe
        campaign = await self.db.campaigns.find_one(campaign_id)

        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Campanha com ID {campaign_id} não encontrada"
            )

        # Verificar se o usuário é o DM da campanha
        if str(campaign.get("dm_id")) != str(user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas o DM pode excluir esta campanha"
            )

        # Excluir a campanha
        result = await self.db.campaigns.delete_one(campaign_id)

        # Excluir todos os personagens associados a esta campanha
        campaign_id_str = str(campaign.get("_id"))
        await self.db.characters.delete_many({"campaign_id": campaign_id_str})

        # Excluir todos os NPCs associados a esta campanha
        await self.db.npcs.delete_many({"campaign_id": campaign_id_str})

        # Excluir todos os combates associados a esta campanha
        await self.db.combats.delete_many({"campaign_id": campaign_id_str})

        # Excluir todos os locks de sessão associados a esta campanha
        await self.db.session_locks.delete_many({"campaign_id": campaign_id_str})

        return result.deleted_count > 0

    async def list_campaigns_for_user(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Lista todas as campanhas em que um usuário está envolvido (como DM ou jogador).

        Args:
            user_id: ID do usuário

        Returns:
            Lista de campanhas no formato CampaignListSchema
        """
        # Campanhas em que o usuário é DM
        dm_query = {"dm_id": user_id}
        # Campanhas em que o usuário é jogador
        player_query = {"players": user_id}
        # Combinar as consultas
        combined_query = {"$or": [dm_query, player_query]}

        cursor = self.db.campaigns.find(combined_query)
        campaigns = await cursor.to_list(length=100)

        # Converter para o formato de lista
        campaign_list = []
        for campaign in campaigns:
            list_item = self._campaign_to_list_item(campaign)
            campaign_list.append(list_item)

        return campaign_list

    async def add_player(self, campaign_id: str, user_id: str, player_id: str) -> Dict[str, Any]:
        """
        Adiciona um jogador a uma campanha.

        Args:
            campaign_id: ID da campanha
            user_id: ID do usuário que está fazendo a solicitação (deve ser o DM)
            player_id: ID do jogador a ser adicionado

        Returns:
            Campanha atualizada

        Raises:
            HTTPException: Se a campanha não for encontrada, o usuário não for o DM ou o jogador não existir
        """
        # Verificar se a campanha existe
        campaign = await self.db.campaigns.find_one(campaign_id)

        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Campanha com ID {campaign_id} não encontrada"
            )

        # Verificar se o usuário é o DM da campanha
        if str(campaign.get("dm_id")) != str(user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas o DM pode adicionar jogadores a esta campanha"
            )

        # Verificar se o jogador existe
        player = await self.db.users.find_one(player_id)
        if not player:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Usuário com ID {player_id} não encontrado"
            )

        # Verificar se o jogador já está na campanha
        players = campaign.get("players", [])
        player_id_str = str(player_id)
        if player_id_str in [str(p) for p in players]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Este jogador já está na campanha"
            )

        # Verificar se o jogador é o próprio DM
        if player_id_str == str(campaign.get("dm_id")):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="O DM já faz parte da campanha"
            )

        # Adicionar o jogador à campanha
        players.append(player_id_str)

        # Atualizar a campanha
        await self.db.campaigns.update_one(
            campaign_id,
            {
                "$set": {
                    "players": players,
                    "updated_at": datetime.utcnow()
                }
            }
        )

        # Recuperar a campanha atualizada
        updated_campaign = await self.db.campaigns.find_one(campaign_id)

        # Formatar ID para string antes de retornar
        return self._format_id(updated_campaign)

    async def remove_player(self, campaign_id: str, user_id: str, player_id: str) -> Dict[str, Any]:
        """
        Remove um jogador de uma campanha.

        Args:
            campaign_id: ID da campanha
            user_id: ID do usuário que está fazendo a solicitação (deve ser o DM)
            player_id: ID do jogador a ser removido

        Returns:
            Campanha atualizada

        Raises:
            HTTPException: Se a campanha não for encontrada, o usuário não for o DM ou o jogador não estiver na campanha
        """
        # Verificar se a campanha existe
        campaign = await self.db.campaigns.find_one(campaign_id)

        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Campanha com ID {campaign_id} não encontrada"
            )

        # Verificar se o usuário é o DM da campanha
        if str(campaign.get("dm_id")) != str(user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas o DM pode remover jogadores desta campanha"
            )

        # Verificar se o jogador está na campanha
        players = campaign.get("players", [])
        player_id_str = str(player_id)
        if player_id_str not in [str(p) for p in players]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Este jogador não está na campanha"
            )

        # Remover o jogador da campanha
        players = [str(p) for p in players if str(p) != player_id_str]

        # Atualizar a campanha
        await self.db.campaigns.update_one(
            campaign_id,
            {
                "$set": {
                    "players": players,
                    "updated_at": datetime.utcnow()
                }
            }
        )

        # Recuperar a campanha atualizada
        updated_campaign = await self.db.campaigns.find_one(campaign_id)

        # Formatar ID para string antes de retornar
        return self._format_id(updated_campaign)

    async def _check_campaign_access(self, campaign: Dict[str, Any], user_id: str) -> None:
        """
        Verifica se um usuário tem acesso a uma campanha.

        Args:
            campaign: Dados da campanha
            user_id: ID do usuário

        Raises:
            HTTPException: Se o usuário não tiver acesso
        """
        # Verificar se é o DM (comparando strings para evitar problemas com tipos diferentes)
        is_dm = str(campaign.get("dm_id")) == str(user_id)

        # Verificar se é um jogador (convertendo para string para comparação segura)
        is_player = str(user_id) in [str(p) for p in campaign.get("players", [])]

        if not (is_dm or is_player):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado a esta campanha"
            )