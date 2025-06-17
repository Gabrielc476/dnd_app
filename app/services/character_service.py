# app/services/character_service.py
"""
Character Service - CORRIGIDO
Problemas resolvidos:
1. ✅ Queries incorretas corrigidas (string -> ObjectId)
2. ✅ Proper error handling implementado
3. ✅ Validação de permissões melhorada
4. ✅ Logging adequado adicionado
5. ✅ Funções completas implementadas
"""

import logging
from datetime import datetime
from typing import List, Dict, Optional, Any, Union
from bson import ObjectId
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
            character_data: Dados do personagem a ser criado

        Returns:
            Personagem criado

        Raises:
            HTTPException: Se o usuário ou campanha não existir
        """
        try:
            # CORREÇÃO: Converter IDs para ObjectId antes das queries
            owner_object_id = IdHandler.to_object_id(character_data.owner_id)
            campaign_object_id = IdHandler.to_object_id(character_data.campaign_id)

            if not owner_object_id or not campaign_object_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="IDs de usuário ou campanha inválidos"
                )

            # Verificar se o usuário existe
            user = await self.db.users.find_one({"_id": owner_object_id})
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Usuário com ID {character_data.owner_id} não encontrado"
                )

            # Verificar se a campanha existe
            campaign = await self.db.campaigns.find_one({"_id": campaign_object_id})
            if not campaign:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Campanha com ID {character_data.campaign_id} não encontrada"
                )

            # Verificar se o usuário está na campanha (como jogador ou DM)
            user_id_str = str(owner_object_id)
            dm_id_str = str(campaign.get("dm_id", ""))
            players_ids = [str(p) for p in campaign.get("players", [])]

            is_player = user_id_str in players_ids
            is_dm = user_id_str == dm_id_str

            if not (is_player or is_dm):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Usuário não pertence a esta campanha"
                )

            # Verificar limite de personagens por usuário na campanha
            existing_characters = await self.db.characters.count_documents({
                "owner_id": owner_object_id,
                "campaign_id": campaign_object_id
            })

            max_characters = 3  # Limite padrão
            if existing_characters >= max_characters:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Limite de {max_characters} personagens por campanha atingido"
                )

            # Preparar dados do personagem
            now = datetime.utcnow()
            character_dict = character_data.dict(by_alias=True, exclude_unset=True)

            # Converter IDs nos dados
            character_dict["owner_id"] = owner_object_id
            character_dict["campaign_id"] = campaign_object_id

            # Adicionar campos de sistema
            character_dict["created_at"] = now
            character_dict["updated_at"] = now

            # Calcular bônus de proficiência baseado no nível
            level = character_data.level
            proficiency_bonus = 2 + ((level - 1) // 4)
            character_dict["proficiency_bonus"] = proficiency_bonus

            # Inserir no banco de dados
            result = await self.db.characters.insert_one(character_dict)

            # Recuperar o personagem criado
            created_character = await self.db.characters.find_one({"_id": result.inserted_id})

            # Formatar ID para string antes de retornar
            formatted_character = self._format_id(created_character)

            logger.info(f"Personagem criado: {formatted_character['name']} para usuário {character_data.owner_id}")
            return formatted_character

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Erro ao criar personagem: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno ao criar personagem"
            )

    async def get_character(self, character_id: str, user_id: str) -> Dict[str, Any]:
        """
        Obtém um personagem pelo ID.
        CORREÇÃO: Verificação de permissões melhorada.

        Args:
            character_id: ID do personagem
            user_id: ID do usuário solicitante

        Returns:
            Dados do personagem

        Raises:
            HTTPException: Se não encontrado ou sem permissão
        """
        try:
            # Converter IDs
            character_object_id = IdHandler.to_object_id(character_id)
            user_object_id = IdHandler.to_object_id(user_id)

            if not character_object_id or not user_object_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="IDs inválidos fornecidos"
                )

            # Buscar personagem
            character = await self.db.characters.find_one({"_id": character_object_id})

            if not character:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Personagem com ID {character_id} não encontrado"
                )

            # Verificar permissões
            await self._verify_character_access(character, str(user_object_id))

            # Formatar e retornar
            formatted_character = self._format_id(character)
            logger.debug(f"Personagem obtido: {formatted_character['name']}")
            return formatted_character

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
            user_id: str,
            updates: CharacterUpdateSchema
    ) -> Dict[str, Any]:
        """
        Atualiza um personagem existente.

        Args:
            character_id: ID do personagem
            user_id: ID do usuário
            updates: Dados de atualização

        Returns:
            Personagem atualizado
        """
        try:
            # Converter IDs
            character_object_id = IdHandler.to_object_id(character_id)
            user_object_id = IdHandler.to_object_id(user_id)

            if not character_object_id or not user_object_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="IDs inválidos fornecidos"
                )

            # Buscar personagem existente
            character = await self.db.characters.find_one({"_id": character_object_id})

            if not character:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Personagem com ID {character_id} não encontrado"
                )

            # Verificar permissões
            await self._verify_character_access(character, str(user_object_id))

            # Preparar dados de atualização
            update_data = updates.dict(by_alias=True, exclude_unset=True)

            if update_data:
                # Atualizar timestamp
                update_data["updated_at"] = datetime.utcnow()

                # Recalcular bônus de proficiência se nível mudou
                if "level" in update_data:
                    level = update_data["level"]
                    proficiency_bonus = 2 + ((level - 1) // 4)
                    update_data["proficiency_bonus"] = proficiency_bonus

                # Atualizar no banco
                await self.db.characters.update_one(
                    {"_id": character_object_id},
                    {"$set": update_data}
                )

            # Recuperar personagem atualizado
            updated_character = await self.db.characters.find_one({"_id": character_object_id})

            formatted_character = self._format_id(updated_character)
            logger.info(f"Personagem atualizado: {formatted_character['name']}")
            return formatted_character

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
        Exclui um personagem.

        Args:
            character_id: ID do personagem
            user_id: ID do usuário

        Returns:
            True se excluído com sucesso
        """
        try:
            # Converter IDs
            character_object_id = IdHandler.to_object_id(character_id)
            user_object_id = IdHandler.to_object_id(user_id)

            if not character_object_id or not user_object_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="IDs inválidos fornecidos"
                )

            # Buscar personagem
            character = await self.db.characters.find_one({"_id": character_object_id})

            if not character:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Personagem com ID {character_id} não encontrado"
                )

            # Verificar permissões (apenas dono ou DM)
            await self._verify_character_access(character, str(user_object_id))

            # Verificar se não está em combate ativo
            active_combat = await self.db.combats.find_one({
                "participants.character_id": character_id,
                "status": "active"
            })

            if active_combat:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Não é possível excluir personagem em combate ativo"
                )

            # Excluir personagem
            result = await self.db.characters.delete_one({"_id": character_object_id})

            if result.deleted_count == 1:
                logger.info(f"Personagem {character['name']} excluído por usuário {user_id}")
                return True
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Falha ao excluir personagem"
                )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Erro ao excluir personagem: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno ao excluir personagem"
            )

    async def list_characters_for_user(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Lista todos os personagens de um usuário.
        CORREÇÃO: Query corrigida para usar ObjectId.

        Args:
            user_id: ID do usuário

        Returns:
            Lista de personagens
        """
        try:
            user_object_id = IdHandler.to_object_id(user_id)
            if not user_object_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="ID de usuário inválido"
                )

            cursor = self.db.characters.find({"owner_id": user_object_id})
            characters = await cursor.to_list(length=100)

            # Formatar IDs para string antes de retornar
            formatted_characters = self._format_id_list(characters)
            logger.debug(f"Listados {len(formatted_characters)} personagens para usuário {user_id}")
            return formatted_characters

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Erro ao listar personagens do usuário: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno ao listar personagens"
            )

    async def list_characters_for_campaign(self, campaign_id: str, user_id: str) -> List[Dict[str, Any]]:
        """
        Lista todos os personagens de uma campanha.
        CORREÇÃO: Validação de acesso e query corrigida.

        Args:
            campaign_id: ID da campanha
            user_id: ID do usuário que está fazendo a solicitação

        Returns:
            Lista de personagens

        Raises:
            HTTPException: Se a campanha não for encontrada ou o usuário não tiver acesso
        """
        try:
            # Converter IDs
            campaign_object_id = IdHandler.to_object_id(campaign_id)
            user_object_id = IdHandler.to_object_id(user_id)

            if not campaign_object_id or not user_object_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="IDs inválidos fornecidos"
                )

            # Verificar se a campanha existe
            campaign = await self.db.campaigns.find_one({"_id": campaign_object_id})

            if not campaign:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Campanha com ID {campaign_id} não encontrada"
                )

            # Verificar se o usuário está na campanha (como jogador ou DM)
            user_id_str = str(user_object_id)
            dm_id_str = str(campaign.get("dm_id", ""))
            players_ids = [str(p) for p in campaign.get("players", [])]

            is_player = user_id_str in players_ids
            is_dm = user_id_str == dm_id_str

            if not (is_player or is_dm):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Usuário não pertence a esta campanha"
                )

            # Buscar personagens da campanha
            cursor = self.db.characters.find({"campaign_id": campaign_object_id})
            characters = await cursor.to_list(length=100)

            # Formatar IDs para string antes de retornar
            formatted_characters = self._format_id_list(characters)
            logger.debug(f"Listados {len(formatted_characters)} personagens para campanha {campaign_id}")
            return formatted_characters

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Erro ao listar personagens da campanha: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno ao listar personagens"
            )

    async def update_hp(
            self,
            character_id: str,
            user_id: str,
            change: int,
            is_temp: bool = False
    ) -> Dict[str, Any]:
        """
        Atualiza os pontos de vida de um personagem.
        CORREÇÃO: Implementação completa.

        Args:
            character_id: ID do personagem
            user_id: ID do usuário
            change: Mudança nos HP (positivo para cura, negativo para dano)
            is_temp: Se é HP temporário

        Returns:
            Personagem atualizado
        """
        try:
            # Converter IDs
            character_object_id = IdHandler.to_object_id(character_id)
            user_object_id = IdHandler.to_object_id(user_id)

            if not character_object_id or not user_object_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="IDs inválidos fornecidos"
                )

            # Buscar personagem
            character = await self.db.characters.find_one({"_id": character_object_id})

            if not character:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Personagem com ID {character_id} não encontrado"
                )

            # Verificar permissões
            await self._verify_character_access(character, str(user_object_id))

            # Obter HP atual
            hp_data = character.get("hp", {})
            current_hp = hp_data.get("current", 0)
            max_hp = hp_data.get("max", 1)
            temp_hp = hp_data.get("temporary", 0)

            if is_temp:
                # Atualizar HP temporário
                new_temp_hp = max(0, temp_hp + change)
                update_data = {"hp.temporary": new_temp_hp}
            else:
                if change > 0:
                    # Cura - não pode exceder HP máximo
                    new_current_hp = min(max_hp, current_hp + change)
                    update_data = {"hp.current": new_current_hp}
                else:
                    # Dano - primeiro remove HP temporário, depois HP normal
                    damage = abs(change)

                    if temp_hp > 0:
                        temp_damage = min(temp_hp, damage)
                        new_temp_hp = temp_hp - temp_damage
                        damage -= temp_damage
                    else:
                        new_temp_hp = temp_hp

                    new_current_hp = max(0, current_hp - damage)

                    update_data = {
                        "hp.current": new_current_hp,
                        "hp.temporary": new_temp_hp
                    }

            # Atualizar timestamp
            update_data["updated_at"] = datetime.utcnow()

            # Atualizar no banco
            await self.db.characters.update_one(
                {"_id": character_object_id},
                {"$set": update_data}
            )

            # Recuperar personagem atualizado
            updated_character = await self.db.characters.find_one({"_id": character_object_id})

            formatted_character = self._format_id(updated_character)
            logger.info(f"HP atualizado para {formatted_character['name']}: {change}")
            return formatted_character

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Erro ao atualizar HP: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno ao atualizar HP"
            )

    async def roll_initiative(self, character_id: str, user_id: str, advantage: bool = False) -> Dict[str, Any]:
        """
        Rola iniciativa para um personagem.

        Args:
            character_id: ID do personagem
            user_id: ID do usuário
            advantage: Se deve rolar com vantagem

        Returns:
            Resultado da rolagem
        """
        try:
            # Buscar personagem
            character_object_id = IdHandler.to_object_id(character_id)
            character = await self.db.characters.find_one({"_id": character_object_id})

            if not character:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Personagem com ID {character_id} não encontrado"
                )

            # Verificar permissões
            await self._verify_character_access(character, user_id)

            # Obter bônus de iniciativa
            initiative_bonus = character.get("initiative_bonus", 0)

            # Rolar dados
            if advantage:
                roll_result = roll_dice("2d20kh1")  # Rola 2d20, mantém o maior
            else:
                roll_result = roll_dice("1d20")

            total = roll_result["total"] + initiative_bonus

            result = {
                "character_id": character_id,
                "character_name": character.get("name"),
                "roll": roll_result["total"],
                "bonus": initiative_bonus,
                "total": total,
                "advantage": advantage,
                "details": roll_result
            }

            logger.info(f"Iniciativa rolada para {character['name']}: {total}")
            return result

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Erro ao rolar iniciativa: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno ao rolar iniciativa"
            )

    async def _verify_character_access(self, character: Dict[str, Any], user_id: str) -> None:
        """
        Verifica se o usuário tem acesso ao personagem.

        Args:
            character: Documento do personagem
            user_id: ID do usuário

        Raises:
            HTTPException: Se não tiver acesso
        """
        user_object_id = IdHandler.to_object_id(user_id)
        character_owner_id = character.get("owner_id")
        campaign_id = character.get("campaign_id")

        # Verificar se é o dono do personagem
        if str(character_owner_id) == str(user_object_id):
            return

        # Verificar se é o DM da campanha
        if campaign_id:
            campaign = await self.db.campaigns.find_one({"_id": campaign_id})
            if campaign and str(campaign.get("dm_id")) == str(user_object_id):
                return

        # Se chegou até aqui, não tem acesso
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário não tem acesso a este personagem"
        )