# app/services/npc_service.py
"""
NPC Service - COMPLETO
Serviço para gerenciamento de NPCs.
"""

import logging
from datetime import datetime
from typing import List, Dict, Optional, Any
from bson import ObjectId
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.schemas.npc import NPCCreateSchema, NPCUpdateSchema
from app.utils.id_handler import IdHandler

logger = logging.getLogger(__name__)


class NPCService:
    """
    Serviço para gerenciar operações relacionadas a NPCs.
    """

    def __init__(self, db: AsyncIOMotorDatabase):
        """
        Inicializa o serviço com a conexão de banco de dados.

        Args:
            db: Conexão com o banco de dados MongoDB
        """
        self.db = db

    def _format_id(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """Formata o ID de um item para string."""
        if item and "_id" in item:
            item["_id"] = str(item["_id"])
        return item

    def _format_id_list(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Formata os IDs de uma lista de itens para string."""
        return [self._format_id(item) for item in items] if items else []

    async def create_npc(self, npc_data: NPCCreateSchema, creator_id: str) -> Dict[str, Any]:
        """
        Cria um novo NPC.

        Args:
            npc_data: Dados do NPC
            creator_id: ID do criador (deve ser DM da campanha)

        Returns:
            NPC criado
        """
        try:
            # Converter IDs
            creator_object_id = IdHandler.to_object_id(creator_id)
            campaign_object_id = IdHandler.to_object_id(npc_data.campaign_id)

            if not creator_object_id or not campaign_object_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="IDs inválidos fornecidos"
                )

            # Verificar se a campanha existe e se o usuário é DM
            campaign = await self.db.campaigns.find_one({"_id": campaign_object_id})
            if not campaign:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Campanha não encontrada"
                )

            if str(campaign.get("dm_id")) != str(creator_object_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Apenas o DM pode criar NPCs na campanha"
                )

            # Preparar dados do NPC
            now = datetime.utcnow()
            npc_dict = npc_data.dict(by_alias=True, exclude_unset=True)

            # Converter campo campaign_id
            npc_dict["campaign_id"] = campaign_object_id
            npc_dict["created_by"] = creator_object_id
            npc_dict["created_at"] = now
            npc_dict["updated_at"] = now

            # Calcular valores derivados
            npc_dict = self._calculate_derived_stats(npc_dict)

            # Inserir no banco
            result = await self.db.npcs.insert_one(npc_dict)

            # Recuperar NPC criado
            created_npc = await self.db.npcs.find_one({"_id": result.inserted_id})

            formatted_npc = self._format_id(created_npc)
            logger.info(f"NPC criado: {formatted_npc['name']} por {creator_id}")

            return formatted_npc

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Erro ao criar NPC: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno ao criar NPC"
            )

    async def get_npc(self, npc_id: str, user_id: str) -> Dict[str, Any]:
        """
        Obtém um NPC pelo ID.

        Args:
            npc_id: ID do NPC
            user_id: ID do usuário solicitante

        Returns:
            Dados do NPC
        """
        try:
            npc_object_id = IdHandler.to_object_id(npc_id)
            if not npc_object_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="ID de NPC inválido"
                )

            # Buscar NPC
            npc = await self.db.npcs.find_one({"_id": npc_object_id})

            if not npc:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="NPC não encontrado"
                )

            # Verificar acesso à campanha
            await self._verify_campaign_access(npc, user_id)

            formatted_npc = self._format_id(npc)
            return formatted_npc

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Erro ao obter NPC: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno ao obter NPC"
            )

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
            user_id: ID do usuário (deve ser DM)
            updates: Dados de atualização

        Returns:
            NPC atualizado
        """
        try:
            npc_object_id = IdHandler.to_object_id(npc_id)
            if not npc_object_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="ID de NPC inválido"
                )

            # Buscar NPC
            npc = await self.db.npcs.find_one({"_id": npc_object_id})
            if not npc:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="NPC não encontrado"
                )

            # Verificar se é DM da campanha
            await self._verify_dm_access(npc, user_id)

            # Preparar dados de atualização
            update_data = updates.dict(exclude_unset=True)

            if update_data:
                update_data["updated_at"] = datetime.utcnow()

                # Recalcular estatísticas derivadas se necessário
                if self._affects_derived_stats(update_data):
                    merged_data = {**npc, **update_data}
                    calculated_stats = self._calculate_derived_stats(merged_data)
                    update_data.update(calculated_stats)

                # Atualizar no banco
                await self.db.npcs.update_one(
                    {"_id": npc_object_id},
                    {"$set": update_data}
                )

            # Recuperar NPC atualizado
            updated_npc = await self.db.npcs.find_one({"_id": npc_object_id})

            formatted_npc = self._format_id(updated_npc)
            logger.info(f"NPC atualizado: {npc_id} por {user_id}")

            return formatted_npc

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Erro ao atualizar NPC: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno ao atualizar NPC"
            )

    async def delete_npc(self, npc_id: str, user_id: str) -> bool:
        """
        Exclui um NPC.

        Args:
            npc_id: ID do NPC
            user_id: ID do usuário (deve ser DM)

        Returns:
            True se excluído com sucesso
        """
        try:
            npc_object_id = IdHandler.to_object_id(npc_id)
            if not npc_object_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="ID de NPC inválido"
                )

            # Buscar NPC
            npc = await self.db.npcs.find_one({"_id": npc_object_id})
            if not npc:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="NPC não encontrado"
                )

            # Verificar se é DM da campanha
            await self._verify_dm_access(npc, user_id)

            # Verificar se não está em combate ativo
            active_combat = await self.db.combats.find_one({
                "participants.npc_id": npc_id,
                "status": "active"
            })

            if active_combat:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Não é possível excluir NPC em combate ativo"
                )

            # Excluir NPC
            result = await self.db.npcs.delete_one({"_id": npc_object_id})

            if result.deleted_count == 1:
                logger.info(f"NPC {npc['name']} excluído por usuário {user_id}")
                return True
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Falha ao excluir NPC"
                )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Erro ao excluir NPC: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno ao excluir NPC"
            )

    async def list_npcs_for_campaign(
            self,
            campaign_id: str,
            user_id: str,
            skip: int = 0,
            limit: int = 50,
            filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Lista NPCs de uma campanha.

        Args:
            campaign_id: ID da campanha
            user_id: ID do usuário solicitante
            skip: Número de registros para pular
            limit: Limite de registros
            filters: Filtros adicionais

        Returns:
            Lista de NPCs
        """
        try:
            campaign_object_id = IdHandler.to_object_id(campaign_id)
            user_object_id = IdHandler.to_object_id(user_id)

            if not campaign_object_id or not user_object_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="IDs inválidos fornecidos"
                )

            # Verificar acesso à campanha
            campaign = await self.db.campaigns.find_one({"_id": campaign_object_id})
            if not campaign:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Campanha não encontrada"
                )

            # Verificar se usuário tem acesso
            is_dm = str(campaign.get("dm_id")) == str(user_object_id)
            is_player = user_object_id in campaign.get("players", [])

            if not (is_dm or is_player):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Usuário não tem acesso a esta campanha"
                )

            # Construir query
            query = {"campaign_id": campaign_object_id}

            # Aplicar filtros
            if filters:
                if "type" in filters:
                    query["type"] = filters["type"]
                if "cr_min" in filters and "cr_max" in filters:
                    query["challenge_rating"] = {
                        "$gte": filters["cr_min"],
                        "$lte": filters["cr_max"]
                    }
                if "search" in filters:
                    search_term = filters["search"]
                    query["$or"] = [
                        {"name": {"$regex": search_term, "$options": "i"}},
                        {"description": {"$regex": search_term, "$options": "i"}}
                    ]

            # Buscar NPCs
            cursor = self.db.npcs.find(query).skip(skip).limit(limit).sort("name", 1)
            npcs = await cursor.to_list(length=limit)

            formatted_npcs = self._format_id_list(npcs)
            return formatted_npcs

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Erro ao listar NPCs: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno ao listar NPCs"
            )

    async def duplicate_npc(self, npc_id: str, user_id: str, new_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Duplica um NPC.

        Args:
            npc_id: ID do NPC original
            user_id: ID do usuário (deve ser DM)
            new_name: Novo nome (opcional)

        Returns:
            NPC duplicado
        """
        try:
            # Buscar NPC original
            original_npc = await self.get_npc(npc_id, user_id)

            # Verificar se é DM
            await self._verify_dm_access(original_npc, user_id)

            # Preparar dados do duplicado
            duplicate_data = original_npc.copy()
            duplicate_data.pop("_id", None)  # Remove ID original
            duplicate_data.pop("created_at", None)
            duplicate_data.pop("updated_at", None)

            # Alterar nome se fornecido
            if new_name:
                duplicate_data["name"] = new_name
            else:
                duplicate_data["name"] = f"{original_npc['name']} (Cópia)"

            # Converter de volta para schema e criar
            from app.schemas.npc import NPCCreateSchema
            create_schema = NPCCreateSchema(**duplicate_data)

            duplicated_npc = await self.create_npc(create_schema, user_id)

            logger.info(f"NPC duplicado: {original_npc['name']} -> {duplicated_npc['name']}")
            return duplicated_npc

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Erro ao duplicar NPC: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno ao duplicar NPC"
            )

    async def get_npc_stats(self, campaign_id: str, user_id: str) -> Dict[str, Any]:
        """
        Obtém estatísticas de NPCs da campanha.

        Args:
            campaign_id: ID da campanha
            user_id: ID do usuário

        Returns:
            Estatísticas dos NPCs
        """
        try:
            campaign_object_id = IdHandler.to_object_id(campaign_id)

            # Verificar acesso
            campaign = await self.db.campaigns.find_one({"_id": campaign_object_id})
            if not campaign:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Campanha não encontrada"
                )

            # Buscar NPCs da campanha
            npcs = await self.db.npcs.find({"campaign_id": campaign_object_id}).to_list(length=1000)

            # Calcular estatísticas
            total_npcs = len(npcs)

            # Contar por tipo
            types_count = {}
            for npc in npcs:
                npc_type = npc.get("type", "Unknown")
                types_count[npc_type] = types_count.get(npc_type, 0) + 1

            # Contar por CR
            cr_distribution = {}
            for npc in npcs:
                cr = npc.get("challenge_rating", "0")
                cr_distribution[cr] = cr_distribution.get(cr, 0) + 1

            stats = {
                "campaign_id": campaign_id,
                "total_npcs": total_npcs,
                "types_distribution": types_count,
                "challenge_rating_distribution": cr_distribution,
                "average_hp": sum(npc.get("hit_points", 0) for npc in npcs) / max(total_npcs, 1),
                "average_ac": sum(npc.get("armor_class", 10) for npc in npcs) / max(total_npcs, 1),
                "timestamp": datetime.utcnow().isoformat()
            }

            return stats

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Erro ao obter estatísticas de NPCs: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno ao obter estatísticas"
            )

    # ===== HELPER METHODS =====

    def _calculate_derived_stats(self, npc_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calcula estatísticas derivadas do NPC."""
        try:
            # Calcular modificadores de atributo
            abilities = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]

            for ability in abilities:
                if ability in npc_data:
                    modifier = (npc_data[ability] - 10) // 2
                    npc_data[f"{ability}_modifier"] = modifier

            # Calcular bônus de proficiência baseado no CR
            cr = npc_data.get("challenge_rating", "0")
            proficiency_bonus = self._calculate_proficiency_bonus(cr)
            npc_data["proficiency_bonus"] = proficiency_bonus

            # Calcular HP médio baseado no hit_dice se não especificado
            if "hit_points" not in npc_data and "hit_dice" in npc_data:
                hit_dice = npc_data["hit_dice"]
                con_mod = npc_data.get("constitution_modifier", 0)
                npc_data["hit_points"] = self._calculate_average_hp(hit_dice, con_mod)

            return npc_data

        except Exception as e:
            logger.warning(f"Erro ao calcular stats derivadas: {e}")
            return npc_data

    def _calculate_proficiency_bonus(self, challenge_rating: str) -> int:
        """Calcula bônus de proficiência baseado no CR."""
        try:
            # Converter CR para número
            if challenge_rating in ["0", "1/8", "1/4", "1/2"]:
                cr_num = 0.5 if challenge_rating in ["1/8", "1/4", "1/2"] else 0
            else:
                cr_num = int(challenge_rating)

            # Calcular bônus de proficiência
            if cr_num <= 4:
                return 2
            elif cr_num <= 8:
                return 3
            elif cr_num <= 12:
                return 4
            elif cr_num <= 16:
                return 5
            elif cr_num <= 20:
                return 6
            elif cr_num <= 24:
                return 7
            elif cr_num <= 28:
                return 8
            else:
                return 9

        except:
            return 2  # Valor padrão

    def _calculate_average_hp(self, hit_dice: str, con_modifier: int) -> int:
        """Calcula HP médio baseado no hit dice."""
        try:
            import re

            # Parse hit dice (ex: "8d8+16")
            match = re.match(r'(\d+)d(\d+)(?:\+(\d+))?', hit_dice)
            if not match:
                return 1

            num_dice = int(match.group(1))
            die_size = int(match.group(2))
            bonus = int(match.group(3)) if match.group(3) else 0

            # Calcular HP médio
            average_per_die = (die_size + 1) / 2
            base_hp = int(num_dice * average_per_die)
            con_bonus = num_dice * con_modifier

            return max(1, base_hp + con_bonus + bonus)

        except:
            return 1  # Valor padrão

    def _affects_derived_stats(self, update_data: Dict[str, Any]) -> bool:
        """Verifica se a atualização afeta estatísticas derivadas."""
        affecting_fields = [
            "strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma",
            "challenge_rating", "hit_dice"
        ]

        return any(field in update_data for field in affecting_fields)

    async def _verify_campaign_access(self, npc: Dict[str, Any], user_id: str) -> None:
        """Verifica acesso à campanha do NPC."""
        campaign_id = npc.get("campaign_id")
        user_object_id = IdHandler.to_object_id(user_id)

        campaign = await self.db.campaigns.find_one({"_id": campaign_id})
        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Campanha não encontrada"
            )

        is_dm = str(campaign.get("dm_id")) == str(user_object_id)
        is_player = user_object_id in campaign.get("players", [])

        if not (is_dm or is_player):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuário não tem acesso a esta campanha"
            )

    async def _verify_dm_access(self, npc: Dict[str, Any], user_id: str) -> None:
        """Verifica se o usuário é DM da campanha."""
        campaign_id = npc.get("campaign_id")
        user_object_id = IdHandler.to_object_id(user_id)

        campaign = await self.db.campaigns.find_one({"_id": campaign_id})
        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Campanha não encontrada"
            )

        if str(campaign.get("dm_id")) != str(user_object_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas o DM pode realizar esta operação"
            )