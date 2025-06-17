# app/services/character_service.py
"""
Character Service - CORRIGIDO
Problemas resolvidos:
1. ✅ Queries incorretas corrigidas (string -> ObjectId)
2. ✅ Proper error handling implementado
3. ✅ Validação de permissões melhorada
4. ✅ Logging adequado adicionado
5. ✅ Funções completas implementadas
6. ✅ Removido import de ValidationError (não existe no pymongo moderno)
"""

import logging
from datetime import datetime
from typing import List, Dict, Optional, Any, Union
from bson import ObjectId
from bson.errors import InvalidId
from pymongo.errors import DuplicateKeyError, WriteError, OperationFailure
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.schemas.character import (
    CharacterCreateSchema, CharacterUpdateSchema, CharacterSchema,
    CharacterListSchema, CharacterSummarySchema
)
from app.utils.id_handler import IdHandler
from app.services import roll_dice

logger = logging.getLogger(__name__)


class CharacterService:
    """
    Serviço para gerenciar operações relacionadas a personagens.
    CORREÇÃO: Implementação completa com queries corrigidas.
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

    async def create_character(self, character_data: CharacterCreateSchema) -> Dict[str, Any]:
        """
        Cria um novo personagem.
        CORREÇÃO: Queries corrigidas para usar ObjectId.

        Args:
            character_data: Dados do personagem

        Returns:
            Dados do personagem criado

        Raises:
            HTTPException: Se houver erro de validação ou criação
        """
        try:
            # Converter IDs para ObjectId - CORREÇÃO APLICADA
            owner_id_obj = IdHandler.to_object_id(character_data.owner_id)
            campaign_id_obj = IdHandler.to_object_id(character_data.campaign_id)

            if not owner_id_obj:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="ID de proprietário inválido"
                )

            if not campaign_id_obj:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="ID de campanha inválido"
                )

            # Verificar se o proprietário existe - CORREÇÃO: usando ObjectId
            user = await self.db.users.find_one({"_id": owner_id_obj})
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Usuário proprietário não encontrado"
                )

            # Verificar se a campanha existe - CORREÇÃO: usando ObjectId
            campaign = await self.db.campaigns.find_one({"_id": campaign_id_obj})
            if not campaign:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Campanha não encontrada"
                )

            # Verificar se já existe um personagem com o mesmo nome na campanha
            existing_character = await self.db.characters.find_one({
                "name": character_data.name,
                "campaign_id": campaign_id_obj
            })

            if existing_character:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Já existe um personagem chamado '{character_data.name}' nesta campanha"
                )

            # Preparar dados do personagem
            character_dict = character_data.dict()
            character_dict.update({
                "owner_id": owner_id_obj,
                "campaign_id": campaign_id_obj,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            })

            # Inserir no banco
            result = await self.db.characters.insert_one(character_dict)
            character_id = result.inserted_id

            # Buscar o personagem criado
            character = await self.db.characters.find_one({"_id": character_id})

            if not character:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Erro ao criar personagem"
                )

            logger.info(f"Personagem criado: {character['name']} (ID: {character_id})")
            return self._format_id(character)

        except HTTPException:
            raise
        except DuplicateKeyError:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Já existe um personagem com estes dados"
            )
        except Exception as e:
            logger.error(f"Erro ao criar personagem: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno ao criar personagem"
            )

    async def get_character(self, character_id: str, user_id: str) -> Dict[str, Any]:
        """
        Obtém um personagem específico.

        Args:
            character_id: ID do personagem
            user_id: ID do usuário fazendo a requisição

        Returns:
            Dados do personagem

        Raises:
            HTTPException: Se não encontrado ou sem permissão
        """
        try:
            character_id_obj = IdHandler.to_object_id(character_id)
            if not character_id_obj:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="ID de personagem inválido"
                )

            character = await self.db.characters.find_one({"_id": character_id_obj})

            if not character:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Personagem não encontrado"
                )

            # Verificar permissões
            if str(character.get("owner_id")) != user_id:
                # Verificar se é DM da campanha
                campaign = await self.db.campaigns.find_one({"_id": character.get("campaign_id")})
                if not campaign or str(campaign.get("dm_id")) != user_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Sem permissão para acessar este personagem"
                    )

            return self._format_id(character)

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Erro ao obter personagem: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno ao obter personagem"
            )

    async def update_character(
            self,
            character_id: str,
            updates: CharacterUpdateSchema,
            user_id: str
    ) -> Dict[str, Any]:
        """
        Atualiza um personagem.

        Args:
            character_id: ID do personagem
            updates: Dados a serem atualizados
            user_id: ID do usuário fazendo a requisição

        Returns:
            Dados do personagem atualizado

        Raises:
            HTTPException: Se não encontrado ou sem permissão
        """
        try:
            character_id_obj = IdHandler.to_object_id(character_id)
            if not character_id_obj:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="ID de personagem inválido"
                )

            # Verificar se o personagem existe
            character = await self.db.characters.find_one({"_id": character_id_obj})
            if not character:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Personagem não encontrado"
                )

            # Verificar permissões
            if str(character.get("owner_id")) != user_id:
                # Verificar se é DM da campanha
                campaign = await self.db.campaigns.find_one({"_id": character.get("campaign_id")})
                if not campaign or str(campaign.get("dm_id")) != user_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Sem permissão para editar este personagem"
                    )

            # Preparar dados de atualização
            update_data = updates.dict(exclude_unset=True)
            if update_data:
                update_data["updated_at"] = datetime.utcnow()

                # Atualizar no banco
                result = await self.db.characters.update_one(
                    {"_id": character_id_obj},
                    {"$set": update_data}
                )

                if result.modified_count == 0:
                    logger.warning(f"Nenhuma modificação feita no personagem {character_id}")

            # Buscar o personagem atualizado
            updated_character = await self.db.characters.find_one({"_id": character_id_obj})

            return self._format_id(updated_character)

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Erro ao atualizar personagem: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno ao atualizar personagem"
            )

    async def delete_character(self, character_id: str, user_id: str) -> bool:
        """
        Remove um personagem.

        Args:
            character_id: ID do personagem
            user_id: ID do usuário fazendo a requisição

        Returns:
            True se removido com sucesso

        Raises:
            HTTPException: Se não encontrado ou sem permissão
        """
        try:
            character_id_obj = IdHandler.to_object_id(character_id)
            if not character_id_obj:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="ID de personagem inválido"
                )

            # Verificar se o personagem existe
            character = await self.db.characters.find_one({"_id": character_id_obj})
            if not character:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Personagem não encontrado"
                )

            # Verificar permissões
            if str(character.get("owner_id")) != user_id:
                # Verificar se é DM da campanha
                campaign = await self.db.campaigns.find_one({"_id": character.get("campaign_id")})
                if not campaign or str(campaign.get("dm_id")) != user_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Sem permissão para remover este personagem"
                    )

            # Remover do banco
            result = await self.db.characters.delete_one({"_id": character_id_obj})

            if result.deleted_count == 0:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Falha ao remover personagem"
                )

            logger.info(f"Personagem removido: {character['name']} (ID: {character_id})")
            return True

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Erro ao remover personagem: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno ao remover personagem"
            )

    async def list_characters(
            self,
            user_id: str,
            campaign_id: Optional[str] = None,
            owner_id: Optional[str] = None,
            skip: int = 0,
            limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Lista personagens com filtros.

        Args:
            user_id: ID do usuário fazendo a requisição
            campaign_id: Filtrar por campanha (opcional)
            owner_id: Filtrar por proprietário (opcional)
            skip: Número de itens a pular
            limit: Limite máximo de itens

        Returns:
            Lista de personagens

        Raises:
            HTTPException: Se houver erro na consulta
        """
        try:
            filter_query = {}

            # Filtro base: usuário deve ter acesso
            user_id_obj = IdHandler.to_object_id(user_id)

            # Se especificou campaign_id, filtrar por campanha
            if campaign_id:
                campaign_id_obj = IdHandler.to_object_id(campaign_id)
                if campaign_id_obj:
                    # Verificar se tem acesso à campanha
                    campaign = await self.db.campaigns.find_one({"_id": campaign_id_obj})
                    if campaign:
                        is_dm = str(campaign.get("dm_id")) == user_id
                        is_player = user_id_obj in campaign.get("players", [])

                        if is_dm or is_player:
                            filter_query["campaign_id"] = campaign_id_obj
                        else:
                            return []  # Sem acesso à campanha
                    else:
                        return []  # Campanha não existe

            # Se especificou owner_id, filtrar por proprietário
            if owner_id:
                owner_id_obj = IdHandler.to_object_id(owner_id)
                if owner_id_obj:
                    filter_query["owner_id"] = owner_id_obj

            # Se não especificou filtros, mostrar apenas personagens do usuário
            if not filter_query:
                filter_query["owner_id"] = user_id_obj

            # Buscar personagens
            cursor = self.db.characters.find(filter_query).skip(skip).limit(limit)
            characters = await cursor.to_list(length=limit)

            return self._format_id_list(characters)

        except Exception as e:
            logger.error(f"Erro ao listar personagens: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno ao listar personagens"
            )

    async def get_character_stats(self, character_id: str) -> Dict[str, Any]:
        """
        Calcula estatísticas do personagem.

        Args:
            character_id: ID do personagem

        Returns:
            Estatísticas calculadas

        Raises:
            HTTPException: Se personagem não encontrado
        """
        try:
            character_id_obj = IdHandler.to_object_id(character_id)
            if not character_id_obj:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="ID de personagem inválido"
                )

            character = await self.db.characters.find_one({"_id": character_id_obj})
            if not character:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Personagem não encontrado"
                )

            # Calcular modificadores de atributos
            attributes = character.get("attributes", {})
            modifiers = {}

            for attr, value in attributes.items():
                if isinstance(value, int):
                    modifiers[f"{attr}_modifier"] = (value - 10) // 2

            # Calcular CA (Classe de Armadura)
            base_ac = 10
            dex_modifier = modifiers.get("dexterity_modifier", 0)
            armor_ac = character.get("equipment", {}).get("armor", {}).get("ac_bonus", 0)
            shield_ac = character.get("equipment", {}).get("shield", {}).get("ac_bonus", 0)

            armor_class = base_ac + dex_modifier + armor_ac + shield_ac

            # Calcular pontos de vida máximos
            constitution_modifier = modifiers.get("constitution_modifier", 0)
            level = character.get("level", 1)
            hit_die = character.get("class_details", {}).get("hit_die", 8)

            # HP = hit_die no nível 1 + (level-1) * (hit_die/2 + 1) + (con_mod * level)
            max_hp = hit_die + (level - 1) * ((hit_die // 2) + 1) + (constitution_modifier * level)

            return {
                "modifiers": modifiers,
                "armor_class": armor_class,
                "max_hit_points": max_hp,
                "current_hit_points": character.get("current_hit_points", max_hp),
                "proficiency_bonus": 2 + ((level - 1) // 4),
                "level": level,
                "experience_points": character.get("experience_points", 0)
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Erro ao calcular estatísticas: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno ao calcular estatísticas"
            )

    async def level_up_character(self, character_id: str, hp_increase: int) -> Dict[str, Any]:
        """
        Aumenta o nível do personagem.

        Args:
            character_id: ID do personagem
            hp_increase: Aumento de HP

        Returns:
            Dados do personagem atualizado

        Raises:
            HTTPException: Se personagem não encontrado
        """
        try:
            character_id_obj = IdHandler.to_object_id(character_id)
            if not character_id_obj:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="ID de personagem inválido"
                )

            character = await self.db.characters.find_one({"_id": character_id_obj})
            if not character:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Personagem não encontrado"
                )

            current_level = character.get("level", 1)
            new_level = current_level + 1

            current_max_hp = character.get("max_hit_points", 8)
            new_max_hp = current_max_hp + hp_increase

            current_hp = character.get("current_hit_points", current_max_hp)
            new_current_hp = current_hp + hp_increase

            # Atualizar no banco
            update_data = {
                "level": new_level,
                "max_hit_points": new_max_hp,
                "current_hit_points": new_current_hp,
                "updated_at": datetime.utcnow()
            }

            await self.db.characters.update_one(
                {"_id": character_id_obj},
                {"$set": update_data}
            )

            # Buscar personagem atualizado
            updated_character = await self.db.characters.find_one({"_id": character_id_obj})

            logger.info(f"Personagem subiu de nível: {character['name']} (nível {new_level})")
            return self._format_id(updated_character)

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Erro ao subir nível do personagem: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno ao subir nível"
            )

    async def rest_character(self, character_id: str, rest_type: str) -> Dict[str, Any]:
        """
        Faz o personagem descansar.

        Args:
            character_id: ID do personagem
            rest_type: Tipo de descanso ("short" ou "long")

        Returns:
            Dados do personagem atualizado

        Raises:
            HTTPException: Se personagem não encontrado
        """
        try:
            character_id_obj = IdHandler.to_object_id(character_id)
            if not character_id_obj:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="ID de personagem inválido"
                )

            character = await self.db.characters.find_one({"_id": character_id_obj})
            if not character:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Personagem não encontrado"
                )

            update_data = {"updated_at": datetime.utcnow()}

            if rest_type == "long":
                # Descanso longo: recuperar todos os HP e spell slots
                max_hp = character.get("max_hit_points", 8)
                update_data["current_hit_points"] = max_hp

                # Resetar spell slots (se houver)
                if "spell_slots" in character:
                    update_data["spell_slots"] = character.get("spell_slots_max", {})

            elif rest_type == "short":
                # Descanso curto: recuperar alguns HP (dados de vida)
                current_hp = character.get("current_hit_points", 0)
                max_hp = character.get("max_hit_points", 8)
                level = character.get("level", 1)
                constitution_modifier = ((character.get("attributes", {}).get("constitution", 10) - 10) // 2)

                # Recuperar HP baseado em Hit Die
                hit_die = character.get("class_details", {}).get("hit_die", 8)
                hp_recovery = roll_dice(hit_die, 1, constitution_modifier)["total"]

                new_hp = min(current_hp + hp_recovery, max_hp)
                update_data["current_hit_points"] = new_hp

            # Atualizar no banco
            await self.db.characters.update_one(
                {"_id": character_id_obj},
                {"$set": update_data}
            )

            # Buscar personagem atualizado
            updated_character = await self.db.characters.find_one({"_id": character_id_obj})

            logger.info(f"Personagem descansou ({rest_type}): {character['name']}")
            return self._format_id(updated_character)

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Erro ao fazer personagem descansar: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno no descanso"
            )