# app/services/character_service.py
from datetime import datetime
from typing import List, Dict, Optional, Any, Union
from bson import ObjectId
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.character import Character, CharacterUpdate
from app.schemas.character import CharacterCreateSchema, CharacterUpdateSchema, CharacterListSchema
from app.services.dice_service import roll_dice


class CharacterService:
    """
    Serviço para gerenciar operações relacionadas a personagens.

    Responsável por:
    - Criar, atualizar, consultar e excluir personagens
    - Gerenciar atributos, HP, magias, etc.
    - Executar cálculos e rolagens específicas de personagens
    """

    def __init__(self, db: AsyncIOMotorDatabase):
        """
        Inicializa o serviço com a conexão de banco de dados.

        Args:
            db: Conexão com o banco de dados MongoDB
        """
        self.db = db

    async def create_character(self, character_data: CharacterCreateSchema) -> Dict[str, Any]:
        """
        Cria um novo personagem.

        Args:
            character_data: Dados do personagem a ser criado

        Returns:
            Personagem criado

        Raises:
            HTTPException: Se o usuário ou campanha não existir
        """
        # Verificar se o usuário existe
        user = await self.db.users.find_one({"_id": ObjectId(character_data.owner_id)})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Usuário com ID {character_data.owner_id} não encontrado"
            )

        # Verificar se a campanha existe
        campaign = await self.db.campaigns.find_one({"_id": ObjectId(character_data.campaign_id)})
        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Campanha com ID {character_data.campaign_id} não encontrada"
            )

        # Verificar se o usuário está na campanha (como jogador ou DM)
        is_player = character_data.owner_id in campaign.get("players", [])
        is_dm = campaign.get("dm_id") == character_data.owner_id

        if not (is_player or is_dm):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuário não pertence a esta campanha"
            )

        # Preparar dados do personagem
        now = datetime.utcnow()
        character_dict = character_data.dict(by_alias=True)

        # Adicionar campos adicionais
        character_dict["created_at"] = now
        character_dict["updated_at"] = now

        # Inserir no banco de dados
        result = await self.db.characters.insert_one(character_dict)

        # Recuperar o personagem criado
        created_character = await self.db.characters.find_one({"_id": result.inserted_id})

        return created_character

    async def get_character(self, character_id: str, user_id: str) -> Dict[str, Any]:
        """
        Obtém um personagem pelo ID.

        Args:
            character_id: ID do personagem
            user_id: ID do usuário que está fazendo a solicitação

        Returns:
            Dados do personagem

        Raises:
            HTTPException: Se o personagem não for encontrado ou o usuário não tiver acesso
        """
        # Verificar se o personagem existe
        character = await self.db.characters.find_one({"_id": ObjectId(character_id)})

        if not character:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Personagem com ID {character_id} não encontrado"
            )

        # Verificar se o usuário tem acesso ao personagem
        await self._check_character_access(character, user_id)

        return character

    async def update_character(
            self,
            character_id: str,
            user_id: str,
            updates: CharacterUpdateSchema
    ) -> Dict[str, Any]:
        """
        Atualiza um personagem.

        Args:
            character_id: ID do personagem
            user_id: ID do usuário que está fazendo a solicitação
            updates: Dados a serem atualizados

        Returns:
            Personagem atualizado

        Raises:
            HTTPException: Se o personagem não for encontrado ou o usuário não tiver acesso
        """
        # Verificar se o personagem existe
        character = await self.db.characters.find_one({"_id": ObjectId(character_id)})

        if not character:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Personagem com ID {character_id} não encontrado"
            )

        # Verificar se o usuário tem acesso ao personagem
        await self._check_character_access(character, user_id)

        # Preparar os dados de atualização
        update_data = updates.dict(exclude_unset=True, by_alias=True)

        # Sempre atualizar o timestamp
        update_data["updated_at"] = datetime.utcnow()

        # Atualizar o personagem
        await self.db.characters.update_one(
            {"_id": ObjectId(character_id)},
            {"$set": update_data}
        )

        # Recuperar o personagem atualizado
        updated_character = await self.db.characters.find_one({"_id": ObjectId(character_id)})

        return updated_character

    async def delete_character(self, character_id: str, user_id: str) -> bool:
        """
        Exclui um personagem.

        Args:
            character_id: ID do personagem
            user_id: ID do usuário que está fazendo a solicitação

        Returns:
            True se o personagem foi excluído com sucesso

        Raises:
            HTTPException: Se o personagem não for encontrado ou o usuário não tiver acesso
        """
        # Verificar se o personagem existe
        character = await self.db.characters.find_one({"_id": ObjectId(character_id)})

        if not character:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Personagem com ID {character_id} não encontrado"
            )

        # Verificar se o usuário tem acesso ao personagem
        # Apenas o proprietário ou o DM podem excluir
        is_owner = character.get("owner_id") == user_id

        if not is_owner:
            # Verificar se é o DM da campanha
            campaign_id = character.get("campaign_id")
            campaign = await self.db.campaigns.find_one({"_id": ObjectId(campaign_id)})
            is_dm = campaign and campaign.get("dm_id") == user_id

            if not is_dm:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Apenas o proprietário ou o DM podem excluir este personagem"
                )

        # Excluir o personagem
        result = await self.db.characters.delete_one({"_id": ObjectId(character_id)})

        return result.deleted_count > 0

    async def list_characters_for_user(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Lista todos os personagens de um usuário.

        Args:
            user_id: ID do usuário

        Returns:
            Lista de personagens
        """
        cursor = self.db.characters.find({"owner_id": user_id})
        characters = await cursor.to_list(length=100)

        return characters

    async def list_characters_for_campaign(self, campaign_id: str, user_id: str) -> List[Dict[str, Any]]:
        """
        Lista todos os personagens de uma campanha.

        Args:
            campaign_id: ID da campanha
            user_id: ID do usuário que está fazendo a solicitação

        Returns:
            Lista de personagens

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
        is_player = user_id in campaign.get("players", [])
        is_dm = campaign.get("dm_id") == user_id

        if not (is_player or is_dm):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuário não pertence a esta campanha"
            )

        # Buscar personagens da campanha
        cursor = self.db.characters.find({"campaign_id": campaign_id})
        characters = await cursor.to_list(length=100)

        return characters

    async def update_hp(
            self,
            character_id: str,
            user_id: str,
            change: int,
            is_temp: bool = False
    ) -> Dict[str, Any]:
        """
        Atualiza os pontos de vida de um personagem.

        Args:
            character_id: ID do personagem
            user_id: ID do usuário que está fazendo a solicitação
            change: Valor a ser adicionado (positivo) ou subtraído (negativo)
            is_temp: Se True, atualiza o HP temporário, caso contrário o HP atual

        Returns:
            Personagem atualizado com novos valores de HP

        Raises:
            HTTPException: Se o personagem não for encontrado ou o usuário não tiver acesso
        """
        # Verificar se o personagem existe
        character = await self.db.characters.find_one({"_id": ObjectId(character_id)})

        if not character:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Personagem com ID {character_id} não encontrado"
            )

        # Verificar se o usuário tem acesso ao personagem
        await self._check_character_access(character, user_id)

        # Atualizar HP ou HP temporário
        if is_temp:
            # HP temporário nunca pode ser negativo
            new_temp_hp = max(0, (character.get("temporary_hp", 0) + change))
            update_field = {"temporary_hp": new_temp_hp}
        else:
            # HP atual não pode ser maior que HP máximo ou menor que 0
            current_hp = character.get("hp", {}).get("current", 0)
            max_hp = character.get("hp", {}).get("max", 0)
            new_hp = min(max(0, current_hp + change), max_hp)
            update_field = {"hp.current": new_hp}

        # Atualizar o timestamp
        update_field["updated_at"] = datetime.utcnow()

        # Atualizar o personagem
        await self.db.characters.update_one(
            {"_id": ObjectId(character_id)},
            {"$set": update_field}
        )

        # Recuperar o personagem atualizado
        updated_character = await self.db.characters.find_one({"_id": ObjectId(character_id)})

        return updated_character

    async def add_condition(self, character_id: str, user_id: str, condition: str) -> Dict[str, Any]:
        """
        Adiciona uma condição a um personagem.

        Args:
            character_id: ID do personagem
            user_id: ID do usuário que está fazendo a solicitação
            condition: Condição a ser adicionada

        Returns:
            Personagem atualizado

        Raises:
            HTTPException: Se o personagem não for encontrado ou o usuário não tiver acesso
        """
        # Verificar se o personagem existe
        character = await self.db.characters.find_one({"_id": ObjectId(character_id)})

        if not character:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Personagem com ID {character_id} não encontrado"
            )

        # Verificar se o usuário tem acesso ao personagem
        await self._check_character_access(character, user_id)

        # Adicionar condição se ainda não existir
        conditions = character.get("conditions", [])
        if condition not in conditions:
            conditions.append(condition)

        # Atualizar o personagem
        await self.db.characters.update_one(
            {"_id": ObjectId(character_id)},
            {
                "$set": {
                    "conditions": conditions,
                    "updated_at": datetime.utcnow()
                }
            }
        )

        # Recuperar o personagem atualizado
        updated_character = await self.db.characters.find_one({"_id": ObjectId(character_id)})

        return updated_character

    async def remove_condition(self, character_id: str, user_id: str, condition: str) -> Dict[str, Any]:
        """
        Remove uma condição de um personagem.

        Args:
            character_id: ID do personagem
            user_id: ID do usuário que está fazendo a solicitação
            condition: Condição a ser removida

        Returns:
            Personagem atualizado

        Raises:
            HTTPException: Se o personagem não for encontrado ou o usuário não tiver acesso
        """
        # Verificar se o personagem existe
        character = await self.db.characters.find_one({"_id": ObjectId(character_id)})

        if not character:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Personagem com ID {character_id} não encontrado"
            )

        # Verificar se o usuário tem acesso ao personagem
        await self._check_character_access(character, user_id)

        # Remover condição se existir
        conditions = character.get("conditions", [])
        if condition in conditions:
            conditions.remove(condition)

        # Atualizar o personagem
        await self.db.characters.update_one(
            {"_id": ObjectId(character_id)},
            {
                "$set": {
                    "conditions": conditions,
                    "updated_at": datetime.utcnow()
                }
            }
        )

        # Recuperar o personagem atualizado
        updated_character = await self.db.characters.find_one({"_id": ObjectId(character_id)})

        return updated_character

    async def roll_ability_check(
            self,
            character_id: str,
            user_id: str,
            ability: str,
            advantage: bool = False,
            disadvantage: bool = False
    ) -> Dict[str, Any]:
        """
        Realiza uma rolagem de teste de atributo para um personagem.

        Args:
            character_id: ID do personagem
            user_id: ID do usuário que está fazendo a solicitação
            ability: Atributo a ser testado (strength, dexterity, etc.)
            advantage: Se deve rolar com vantagem
            disadvantage: Se deve rolar com desvantagem

        Returns:
            Resultado da rolagem

        Raises:
            HTTPException: Se o personagem não for encontrado ou o usuário não tiver acesso
        """
        # Verificar se o personagem existe
        character = await self.db.characters.find_one({"_id": ObjectId(character_id)})

        if not character:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Personagem com ID {character_id} não encontrado"
            )

        # Verificar se o usuário tem acesso ao personagem
        await self._check_character_access(character, user_id)

        # Verificar se o atributo existe
        if ability not in ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Atributo inválido: {ability}"
            )

        # Calcular modificador
        attr_value = character.get("attributes", {}).get(ability, 10)
        modifier = (attr_value - 10) // 2

        # Realizar rolagem
        roll1 = roll_dice("1d20")
        roll2 = roll_dice("1d20")

        if advantage and not disadvantage:
            # Com vantagem
            roll_result = max(roll1, roll2)
            used_roll = "highest"
        elif disadvantage and not advantage:
            # Com desvantagem
            roll_result = min(roll1, roll2)
            used_roll = "lowest"
        else:
            # Normal
            roll_result = roll1
            roll2 = None  # Não é necessário
            used_roll = "normal"

        total = roll_result + modifier

        return {
            "character_id": character_id,
            "character_name": character.get("name", "Unknown"),
            "ability": ability,
            "modifier": modifier,
            "advantage": advantage,
            "disadvantage": disadvantage,
            "roll1": roll1,
            "roll2": roll2,
            "used_roll": used_roll,
            "roll_result": roll_result,
            "total": total,
            "timestamp": datetime.utcnow()
        }

    async def roll_skill_check(
            self,
            character_id: str,
            user_id: str,
            skill: str,
            advantage: bool = False,
            disadvantage: bool = False
    ) -> Dict[str, Any]:
        """
        Realiza uma rolagem de teste de perícia para um personagem.

        Args:
            character_id: ID do personagem
            user_id: ID do usuário que está fazendo a solicitação
            skill: Perícia a ser testada
            advantage: Se deve rolar com vantagem
            disadvantage: Se deve rolar com desvantagem

        Returns:
            Resultado da rolagem

        Raises:
            HTTPException: Se o personagem não for encontrado ou o usuário não tiver acesso
        """
        # A implementação seria similar à roll_ability_check, mas com lógica adicional
        # para verificar proficiências e calcular o modificador adequadamente
        pass

    async def _check_character_access(self, character: Dict[str, Any], user_id: str) -> None:
        """
        Verifica se um usuário tem acesso a um personagem.

        Args:
            character: Dados do personagem
            user_id: ID do usuário

        Raises:
            HTTPException: Se o usuário não tiver acesso
        """
        # Verificar se é o proprietário
        is_owner = character.get("owner_id") == user_id

        if is_owner:
            return

        # Se não for o proprietário, verificar se é o DM da campanha
        campaign_id = character.get("campaign_id")
        campaign = await self.db.campaigns.find_one({"_id": ObjectId(campaign_id)})

        is_dm = campaign and campaign.get("dm_id") == user_id

        if not is_dm:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado a este personagem"
            )