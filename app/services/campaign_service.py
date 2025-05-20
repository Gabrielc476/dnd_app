# app/services/campaign_service.py
from datetime import datetime
from typing import List, Dict, Optional, Any, Union
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.schemas.campaign import (
    CampaignCreateSchema, CampaignUpdateSchema, EncounterCreateSchema,
    EncounterUpdateSchema, TrapSchema, NPCReferenceSchema, ImageSchema
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
            Lista de campanhas
        """
        # Campanhas em que o usuário é DM
        dm_query = {"dm_id": user_id}
        # Campanhas em que o usuário é jogador
        player_query = {"players": user_id}
        # Combinar as consultas
        combined_query = {"$or": [dm_query, player_query]}

        cursor = self.db.campaigns.find(combined_query)
        campaigns = await cursor.to_list(length=100)

        # Formatar IDs para string antes de retornar
        return self._format_id_list(campaigns)

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

    async def create_encounter(
            self,
            campaign_id: str,
            user_id: str,
            encounter_data: EncounterCreateSchema
    ) -> Dict[str, Any]:
        """
        Cria um novo encontro em uma campanha.

        Args:
            campaign_id: ID da campanha
            user_id: ID do usuário que está fazendo a solicitação (deve ser o DM)
            encounter_data: Dados do encontro a ser criado

        Returns:
            Campanha atualizada com o novo encontro

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
                detail="Apenas o DM pode criar encontros nesta campanha"
            )

        # Preparar dados do encontro
        encounter_dict = encounter_data.dict()
        campaign_id_str = str(campaign.get("_id"))

        # Gerar ID único para o encontro
        encounter_id = str(ObjectId())
        encounter_dict["id"] = encounter_id

        # Verificar referências a NPCs
        for npc_ref in encounter_dict.get("npcs", []):
            npc_id = npc_ref.get("npc_id")
            npc = await self.db.npcs.find_one(npc_id)

            if not npc:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"NPC com ID {npc_id} não encontrado"
                )

            # Verificar se o NPC pertence a esta campanha
            if str(npc.get("campaign_id")) != campaign_id_str:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"NPC com ID {npc_id} não pertence a esta campanha"
                )

        # Verificar referência a imagem de mapa
        map_image_id = encounter_dict.get("map_image_id")
        if map_image_id:
            # Verificar se a imagem existe na campanha
            image_exists = False
            for image in campaign.get("images", []):
                if str(image.get("id")) == str(map_image_id):
                    image_exists = True
                    break

            if not image_exists:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Imagem com ID {map_image_id} não encontrada nesta campanha"
                )

        # Adicionar o encontro à lista de encontros da campanha
        encounters = campaign.get("encounters", [])
        encounters.append(encounter_dict)

        # Atualizar a campanha
        await self.db.campaigns.update_one(
            campaign_id,
            {
                "$set": {
                    "encounters": encounters,
                    "updated_at": datetime.utcnow()
                }
            }
        )

        # Recuperar a campanha atualizada
        updated_campaign = await self.db.campaigns.find_one(campaign_id)

        # Formatar ID para string antes de retornar
        return self._format_id(updated_campaign)

    async def update_encounter(
            self,
            campaign_id: str,
            encounter_id: str,
            user_id: str,
            updates: EncounterUpdateSchema
    ) -> Dict[str, Any]:
        """
        Atualiza um encontro em uma campanha.

        Args:
            campaign_id: ID da campanha
            encounter_id: ID do encontro
            user_id: ID do usuário que está fazendo a solicitação (deve ser o DM)
            updates: Dados a serem atualizados

        Returns:
            Campanha atualizada

        Raises:
            HTTPException: Se a campanha ou encontro não forem encontrados ou o usuário não for o DM
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
                detail="Apenas o DM pode atualizar encontros nesta campanha"
            )

        # Encontrar o encontro
        encounters = campaign.get("encounters", [])
        encounter_index = None

        for i, encounter in enumerate(encounters):
            if str(encounter.get("id")) == str(encounter_id):
                encounter_index = i
                break

        if encounter_index is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Encontro com ID {encounter_id} não encontrado nesta campanha"
            )

        # Preparar os dados de atualização
        update_data = updates.dict(exclude_unset=True)

        # Atualizar o encontro
        encounter = encounters[encounter_index]
        for key, value in update_data.items():
            if value is not None:
                encounter[key] = value

        # Atualizar a campanha
        await self.db.campaigns.update_one(
            campaign_id,
            {
                "$set": {
                    "encounters": encounters,
                    "updated_at": datetime.utcnow()
                }
            }
        )

        # Recuperar a campanha atualizada
        updated_campaign = await self.db.campaigns.find_one(campaign_id)

        # Formatar ID para string antes de retornar
        return self._format_id(updated_campaign)

    # Adicione outros métodos da classe aqui com o mesmo tratamento de IDs...

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