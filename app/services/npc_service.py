# app/services/npc_service.py
from datetime import datetime
from typing import List, Dict, Optional, Any, Union
from bson import ObjectId
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.schemas.npc import (
    NPCCreateSchema, NPCUpdateSchema, NPCActionSchema,
    NPCStatsSchema, NPCBulkImportSchema
)


class NPCService:
    """
    Serviço para gerenciar operações relacionadas a NPCs.

    Responsável por:
    - Criar, atualizar, consultar e excluir NPCs
    - Importar NPCs do compêndio ou criar personalizados
    - Gerenciar atributos, ações e características de NPCs
    """

    def __init__(self, db: AsyncIOMotorDatabase):
        """
        Inicializa o serviço com a conexão de banco de dados.

        Args:
            db: Conexão com o banco de dados MongoDB
        """
        self.db = db

    async def create_npc(self, npc_data: NPCCreateSchema, user_id: str) -> Dict[str, Any]:
        """
        Cria um novo NPC.

        Args:
            npc_data: Dados do NPC a ser criado
            user_id: ID do usuário que está criando o NPC (deve ser o DM)

        Returns:
            NPC criado

        Raises:
            HTTPException: Se a campanha não existir ou o usuário não for o DM
        """
        # Verificar se a campanha existe
        campaign = await self.db.campaigns.find_one({"_id": ObjectId(npc_data.campaign_id)})

        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Campanha com ID {npc_data.campaign_id} não encontrada"
            )

        # Verificar se o usuário é o DM da campanha
        if campaign.get("dm_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas o DM pode criar NPCs nesta campanha"
            )

        # Se for do compêndio, verificar se o modelo existe
        if npc_data.source == "compendium" and npc_data.compendium_id:
            monster = await self.db.monster_templates.find_one({"_id": ObjectId(npc_data.compendium_id)})

            if not monster:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Modelo de monstro com ID {npc_data.compendium_id} não encontrado no compêndio"
                )

        # Preparar dados do NPC
        now = datetime.utcnow()
        npc_dict = npc_data.dict(by_alias=True)

        # Adicionar campos adicionais
        npc_dict["created_at"] = now
        npc_dict["updated_at"] = now

        # Inserir no banco de dados
        result = await self.db.npcs.insert_one(npc_dict)

        # Recuperar o NPC criado
        created_npc = await self.db.npcs.find_one({"_id": result.inserted_id})

        return created_npc

    async def get_npc(self, npc_id: str, user_id: str) -> Dict[str, Any]:
        """
        Obtém um NPC pelo ID.

        Args:
            npc_id: ID do NPC
            user_id: ID do usuário que está fazendo a solicitação

        Returns:
            Dados do NPC

        Raises:
            HTTPException: Se o NPC não for encontrado ou o usuário não tiver acesso
        """
        # Verificar se o NPC existe
        npc = await self.db.npcs.find_one({"_id": ObjectId(npc_id)})

        if not npc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"NPC com ID {npc_id} não encontrado"
            )

        # Verificar se o usuário tem acesso ao NPC
        await self._check_npc_access(npc, user_id)

        return npc

    async def update_npc(
            self,
            npc_id: str,
            user_id: str,
            updates: NPCUpdateSchema
    ) -> Dict[str, Any]:
        """
        Atualiza um NPC.

        Args:
            npc_id: ID do NPC
            user_id: ID do usuário que está fazendo a solicitação (deve ser o DM)
            updates: Dados a serem atualizados

        Returns:
            NPC atualizado

        Raises:
            HTTPException: Se o NPC não for encontrado ou o usuário não for o DM
        """
        # Verificar se o NPC existe
        npc = await self.db.npcs.find_one({"_id": ObjectId(npc_id)})

        if not npc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"NPC com ID {npc_id} não encontrado"
            )

        # Verificar se o usuário é o DM da campanha
        campaign_id = npc.get("campaign_id")
        campaign = await self.db.campaigns.find_one({"_id": ObjectId(campaign_id)})

        if not campaign or campaign.get("dm_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas o DM pode atualizar este NPC"
            )

        # Preparar os dados de atualização
        update_data = updates.dict(exclude_unset=True, by_alias=True)

        # Sempre atualizar o timestamp
        update_data["updated_at"] = datetime.utcnow()

        # Atualizar o NPC
        await self.db.npcs.update_one(
            {"_id": ObjectId(npc_id)},
            {"$set": update_data}
        )

        # Recuperar o NPC atualizado
        updated_npc = await self.db.npcs.find_one({"_id": ObjectId(npc_id)})

        return updated_npc

    async def delete_npc(self, npc_id: str, user_id: str) -> bool:
        """
        Exclui um NPC.

        Args:
            npc_id: ID do NPC
            user_id: ID do usuário que está fazendo a solicitação (deve ser o DM)

        Returns:
            True se o NPC foi excluído com sucesso

        Raises:
            HTTPException: Se o NPC não for encontrado ou o usuário não for o DM
        """
        # Verificar se o NPC existe
        npc = await self.db.npcs.find_one({"_id": ObjectId(npc_id)})

        if not npc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"NPC com ID {npc_id} não encontrado"
            )

        # Verificar se o usuário é o DM da campanha
        campaign_id = npc.get("campaign_id")
        campaign = await self.db.campaigns.find_one({"_id": ObjectId(campaign_id)})

        if not campaign or campaign.get("dm_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas o DM pode excluir este NPC"
            )

        # Verificar se o NPC está sendo usado em algum encontro
        encounters = campaign.get("encounters", [])
        for encounter in encounters:
            npcs = encounter.get("npcs", [])
            for npc_ref in npcs:
                if npc_ref.get("npc_id") == npc_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Este NPC está sendo usado no encontro '{encounter.get('name')}' e não pode ser excluído"
                    )

        # Verificar se o NPC está em algum combate ativo
        active_combat = await self.db.combats.find_one({
            "campaign_id": campaign_id,
            "status": "active"
        })

        if active_combat:
            for entry in active_combat.get("initiative_order", []):
                if entry.get("id") == npc_id and entry.get("type") == "npc":
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Este NPC está em um combate ativo e não pode ser excluído"
                    )

        # Excluir o NPC
        result = await self.db.npcs.delete_one({"_id": ObjectId(npc_id)})

        return result.deleted_count > 0

    async def list_npcs_for_campaign(self, campaign_id: str, user_id: str) -> List[Dict[str, Any]]:
        """
        Lista todos os NPCs de uma campanha.

        Args:
            campaign_id: ID da campanha
            user_id: ID do usuário que está fazendo a solicitação

        Returns:
            Lista de NPCs

        Raises:
            HTTPException: Se a campanha não for encontrada ou o usuário não tiver acesso
        """
        # Verificar se a campanha existe
        campaign = await self.db.campaigns.find_one({"_id": ObjectId(campaign_id)})

        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Campanha com ID {campaign_id} não encontrada"
            )

        # Verificar se o usuário está na campanha (como jogador ou DM)
        is_dm = campaign.get("dm_id") == user_id
        is_player = user_id in campaign.get("players", [])

        if not (is_dm or is_player):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado a esta campanha"
            )

        # Buscar NPCs da campanha
        cursor = self.db.npcs.find({"campaign_id": campaign_id})
        npcs = await cursor.to_list(length=100)

        return npcs

    async def import_from_compendium(
            self,
            campaign_id: str,
            user_id: str,
            monster_id: str,
            name_override: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Importa um monstro do compêndio para a campanha como NPC.

        Args:
            campaign_id: ID da campanha
            user_id: ID do usuário que está fazendo a solicitação (deve ser o DM)
            monster_id: ID do monstro no compêndio
            name_override: Nome personalizado (opcional)

        Returns:
            NPC criado

        Raises:
            HTTPException: Se a campanha ou monstro não forem encontrados, ou o usuário não for o DM
        """
        # Verificar se a campanha existe
        campaign = await self.db.campaigns.find_one({"_id": ObjectId(campaign_id)})

        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Campanha com ID {campaign_id} não encontrada"
            )

        # Verificar se o usuário é o DM da campanha
        if campaign.get("dm_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas o DM pode importar NPCs do compêndio"
            )

        # Verificar se o monstro existe no compêndio
        monster = await self.db.monster_templates.find_one({"_id": ObjectId(monster_id)})

        if not monster:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Monstro com ID {monster_id} não encontrado no compêndio"
            )

        # Preparar dados do NPC baseado no monstro
        name = name_override or monster.get("name", "NPC Sem Nome")
        stats = {
            "ac": monster.get("armor_class", 10),
            "hp": {
                "current": monster.get("hit_points", 10),
                "max": monster.get("hit_points", 10)
            },
            "speed": monster.get("speed", {}).get("walk", 30),
            "attributes": {
                "strength": monster.get("strength", 10),
                "dexterity": monster.get("dexterity", 10),
                "constitution": monster.get("constitution", 10),
                "intelligence": monster.get("intelligence", 10),
                "wisdom": monster.get("wisdom", 10),
                "charisma": monster.get("charisma", 10)
            },
            "saving_throws": monster.get("saving_throws", {}),
            "skills": monster.get("skills", {}),
            "damage_vulnerabilities": monster.get("damage_vulnerabilities", []),
            "damage_resistances": monster.get("damage_resistances", []),
            "damage_immunities": monster.get("damage_immunities", []),
            "condition_immunities": monster.get("condition_immunities", []),
            "senses": monster.get("senses", ""),
            "languages": monster.get("languages", "").split(","),
            "challenge_rating": monster.get("challenge_rating", "0")
        }

        # Converter ações do monstro para o formato de NPC
        actions = []
        for action in monster.get("actions", []):
            npc_action = {
                "name": action.get("name", ""),
                "description": action.get("desc", "")
            }
            actions.append(npc_action)

        # Converter características do monstro para o formato de NPC
        features = []
        for trait in monster.get("traits", []):
            feature = {
                "name": trait.get("name", ""),
                "description": trait.get("desc", "")
            }
            features.append(feature)

        # Converter ações lendárias
        legendary_actions = []
        for action in monster.get("legendary_actions", []):
            legendary_action = {
                "name": action.get("name", ""),
                "description": action.get("desc", "")
            }
            legendary_actions.append(legendary_action)

        # Preparar o NPC
        npc_data = {
            "name": name,
            "source": "compendium",
            "compendium_id": monster_id,
            "campaign_id": campaign_id,
            "stats": stats,
            "actions": actions,
            "legendary_actions": legendary_actions,
            "reactions": [],
            "features": features,
            "description": f"Importado do compêndio: {monster.get('name')}",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        # Inserir no banco de dados
        result = await self.db.npcs.insert_one(npc_data)

        # Recuperar o NPC criado
        created_npc = await self.db.npcs.find_one({"_id": result.inserted_id})

        return created_npc

    async def bulk_import(
            self,
            campaign_id: str,
            user_id: str,
            import_data: NPCBulkImportSchema
    ) -> List[Dict[str, Any]]:
        """
        Importa vários NPCs de uma só vez.

        Args:
            campaign_id: ID da campanha
            user_id: ID do usuário que está fazendo a solicitação (deve ser o DM)
            import_data: Dados dos NPCs a serem importados

        Returns:
            Lista de NPCs criados

        Raises:
            HTTPException: Se a campanha não existir ou o usuário não for o DM
        """
        # Verificar se a campanha existe
        campaign = await self.db.campaigns.find_one({"_id": ObjectId(campaign_id)})

        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Campanha com ID {campaign_id} não encontrada"
            )

        # Verificar se o usuário é o DM da campanha
        if campaign.get("dm_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas o DM pode importar NPCs"
            )

        # Validar que todos os NPCs pertencem a esta campanha
        for npc_data in import_data.npcs:
            if npc_data.campaign_id != campaign_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Todos os NPCs devem pertencer à campanha especificada"
                )

        # Preparar os NPCs para inserção
        npcs_to_insert = []
        now = datetime.utcnow()

        for npc_data in import_data.npcs:
            npc_dict = npc_data.dict(by_alias=True)
            npc_dict["created_at"] = now
            npc_dict["updated_at"] = now
            npcs_to_insert.append(npc_dict)

        # Inserir os NPCs
        result = await self.db.npcs.insert_many(npcs_to_insert)

        # Recuperar os NPCs criados
        created_npcs = await self.db.npcs.find(
            {"_id": {"$in": result.inserted_ids}}
        ).to_list(length=len(result.inserted_ids))

        return created_npcs

    async def update_hp(
            self,
            npc_id: str,
            user_id: str,
            change: int
    ) -> Dict[str, Any]:
        """
        Atualiza os pontos de vida de um NPC.

        Args:
            npc_id: ID do NPC
            user_id: ID do usuário que está fazendo a solicitação (deve ser o DM)
            change: Valor a ser adicionado (positivo) ou subtraído (negativo)

        Returns:
            NPC atualizado

        Raises:
            HTTPException: Se o NPC não for encontrado ou o usuário não for o DM
        """
        # Verificar se o NPC existe
        npc = await self.db.npcs.find_one({"_id": ObjectId(npc_id)})

        if not npc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"NPC com ID {npc_id} não encontrado"
            )

        # Verificar se o usuário é o DM da campanha
        campaign_id = npc.get("campaign_id")
        campaign = await self.db.campaigns.find_one({"_id": ObjectId(campaign_id)})

        if not campaign or campaign.get("dm_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas o DM pode atualizar os pontos de vida deste NPC"
            )

        # Calcular novo HP
        current_hp = npc.get("stats", {}).get("hp", {}).get("current", 0)
        max_hp = npc.get("stats", {}).get("hp", {}).get("max", 0)

        # HP não pode ser maior que o máximo ou menor que 0
        new_hp = min(max(0, current_hp + change), max_hp)

        # Atualizar o NPC
        await self.db.npcs.update_one(
            {"_id": ObjectId(npc_id)},
            {
                "$set": {
                    "stats.hp.current": new_hp,
                    "updated_at": datetime.utcnow()
                }
            }
        )

        # Recuperar o NPC atualizado
        updated_npc = await self.db.npcs.find_one({"_id": ObjectId(npc_id)})

        return updated_npc

    async def _check_npc_access(self, npc: Dict[str, Any], user_id: str) -> None:
        """
        Verifica se um usuário tem acesso a um NPC.

        Args:
            npc: Dados do NPC
            user_id: ID do usuário

        Raises:
            HTTPException: Se o usuário não tiver acesso
        """
        campaign_id = npc.get("campaign_id")
        campaign = await self.db.campaigns.find_one({"_id": ObjectId(campaign_id)})

        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Campanha com ID {campaign_id} não encontrada"
            )

        # Verificar se é o DM
        is_dm = campaign.get("dm_id") == user_id

        # Verificar se é um jogador
        is_player = user_id in campaign.get("players", [])

        if not (is_dm or is_player):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado a este NPC"
            )