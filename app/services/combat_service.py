# app/services/combat_service.py
from datetime import datetime
from typing import List, Dict, Optional, Any, Union
from bson import ObjectId
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.schemas.combat import (
    CombatCreateSchema, CombatUpdateSchema, InitiativeEntrySchema,
    ConditionEffectSchema, CombatEventSchema, ActionSchema, RollInitiativeSchema
)
from app.services.dice_service import roll_dice


class CombatService:
    """
    Serviço para gerenciar operações relacionadas a combates.

    Responsável por:
    - Iniciar, atualizar e encerrar combates
    - Gerenciar a ordem de iniciativa
    - Controlar turnos e rodadas
    - Registrar ações e condições
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

    async def create_combat(self, combat_data: CombatCreateSchema, user_id: str) -> Dict[str, Any]:
        """
        Inicia um novo combate.

        Args:
            combat_data: Dados para iniciar o combate
            user_id: ID do usuário que está iniciando o combate (deve ser o DM)

        Returns:
            Combate criado

        Raises:
            HTTPException: Se a campanha não existir, o usuário não for o DM ou já houver um combate ativo
        """
        # Verificar se a campanha existe
        campaign = await self.db.campaigns.find_one(combat_data.campaign_id)

        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Campanha com ID {combat_data.campaign_id} não encontrada"
            )

        # Verificar se o usuário é o DM da campanha
        if str(campaign.get("dm_id")) != str(user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas o DM pode iniciar combate nesta campanha"
            )

        # Verificar se já existe um combate ativo na campanha
        existing_combat = await self.db.combats.find_one({
            "campaign_id": combat_data.campaign_id,
            "status": "active"
        })

        if existing_combat:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Já existe um combate ativo nesta campanha"
            )

        # Validar encounter_id se fornecido
        encounter_id = combat_data.encounter_id
        if encounter_id:
            encounter_found = False
            for encounter in campaign.get("encounters", []):
                if str(encounter.get("id")) == str(encounter_id):
                    encounter_found = True
                    break

            if not encounter_found:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Encontro com ID {encounter_id} não encontrado nesta campanha"
                )

            # Atualizar o encontro ativo na campanha
            await self.db.campaigns.update_one(
                combat_data.campaign_id,
                {"$set": {"active_encounter": encounter_id}}
            )

        # Preparar dados do combate
        now = datetime.utcnow()
        combat_dict = {
            "campaign_id": str(combat_data.campaign_id),
            "encounter_id": str(encounter_id) if encounter_id else None,
            "status": "active",
            "round": 1,
            "initiative_order": [],
            "current_turn": 0,
            "conditions": [],
            "events": [],
            "started_at": now,
            "updated_at": now
        }

        # Inserir no banco de dados
        result = await self.db.combats.insert_one(combat_dict)

        # Recuperar o combate criado
        created_combat = await self.db.combats.find_one(result.inserted_id)

        # Formatar ID para string antes de retornar
        return self._format_id(created_combat)

    async def get_combat(self, combat_id: str, user_id: str) -> Dict[str, Any]:
        """
        Obtém um combate pelo ID.

        Args:
            combat_id: ID do combate
            user_id: ID do usuário que está fazendo a solicitação

        Returns:
            Dados do combate

        Raises:
            HTTPException: Se o combate não for encontrado ou o usuário não tiver acesso
        """
        # Verificar se o combate existe
        combat = await self.db.combats.find_one(combat_id)

        if not combat:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Combate com ID {combat_id} não encontrado"
            )

        # Verificar se o usuário tem acesso ao combate
        await self._check_combat_access(combat, user_id)

        # Formatar ID para string antes de retornar
        return self._format_id(combat)

    async def get_active_combat(self, campaign_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Obtém o combate ativo em uma campanha.

        Args:
            campaign_id: ID da campanha
            user_id: ID do usuário que está fazendo a solicitação

        Returns:
            Dados do combate ativo ou None se não houver

        Raises:
            HTTPException: Se a campanha não for encontrada ou o usuário não tiver acesso
        """
        # Verificar se a campanha existe
        campaign = await self.db.campaigns.find_one(campaign_id)

        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Campanha com ID {campaign_id} não encontrada"
            )

        # Verificar se o usuário está na campanha
        is_dm = str(campaign.get("dm_id")) == str(user_id)
        is_player = str(user_id) in [str(p) for p in campaign.get("players", [])]

        if not (is_dm or is_player):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado a esta campanha"
            )

        # Buscar combate ativo
        active_combat = await self.db.combats.find_one({
            "campaign_id": campaign_id,
            "status": "active"
        })

        # Formatar ID para string se houver combate ativo
        return self._format_id(active_combat) if active_combat else None

    async def update_combat(
            self,
            combat_id: str,
            user_id: str,
            updates: CombatUpdateSchema
    ) -> Dict[str, Any]:
        """
        Atualiza um combate.

        Args:
            combat_id: ID do combate
            user_id: ID do usuário que está fazendo a solicitação (deve ser o DM)
            updates: Dados a serem atualizados

        Returns:
            Combate atualizado

        Raises:
            HTTPException: Se o combate não for encontrado ou o usuário não for o DM
        """
        # Verificar se o combate existe
        combat = await self.db.combats.find_one(combat_id)

        if not combat:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Combate com ID {combat_id} não encontrado"
            )

        # Verificar se o usuário é o DM da campanha
        campaign_id = combat.get("campaign_id")
        campaign = await self.db.campaigns.find_one(campaign_id)

        if not campaign or str(campaign.get("dm_id")) != str(user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas o DM pode atualizar este combate"
            )

        # Preparar os dados de atualização
        update_data = updates.dict(exclude_unset=True, by_alias=True)

        # Sempre atualizar o timestamp
        update_data["updated_at"] = datetime.utcnow()

        # Se o status estiver sendo alterado para 'completed', adicionar ended_at
        if update_data.get("status") == "completed" and combat.get("status") != "completed":
            update_data["ended_at"] = datetime.utcnow()

            # Remover o encontro ativo se este combate estava usando um encontro
            if combat.get("encounter_id"):
                await self.db.campaigns.update_one(
                    campaign_id,
                    {"$unset": {"active_encounter": ""}}
                )

        # Atualizar o combate
        await self.db.combats.update_one(
            combat_id,
            {"$set": update_data}
        )

        # Recuperar o combate atualizado
        updated_combat = await self.db.combats.find_one(combat_id)

        # Formatar ID para string antes de retornar
        return self._format_id(updated_combat)

    async def end_combat(self, combat_id: str, user_id: str) -> Dict[str, Any]:
        """
        Encerra um combate.

        Args:
            combat_id: ID do combate
            user_id: ID do usuário que está fazendo a solicitação (deve ser o DM)

        Returns:
            Combate atualizado

        Raises:
            HTTPException: Se o combate não for encontrado ou o usuário não for o DM
        """
        # Usar o método update_combat com status = "completed"
        updates = CombatUpdateSchema(status="completed")
        return await self.update_combat(combat_id, user_id, updates)

    async def roll_initiative(
            self,
            combat_id: str,
            user_id: str,
            initiative_data: RollInitiativeSchema
    ) -> Dict[str, Any]:
        """
        Rola iniciativa para um personagem ou NPC.

        Args:
            combat_id: ID do combate
            user_id: ID do usuário que está fazendo a solicitação
            initiative_data: Dados da rolagem de iniciativa

        Returns:
            Combate atualizado com a nova ordem de iniciativa

        Raises:
            HTTPException: Se o combate não for encontrado, o personagem/NPC não existir
                          ou o usuário não tiver permissão
        """
        # Verificar se o combate existe e está ativo
        combat = await self.db.combats.find_one({
            "_id": combat_id,
            "status": "active"
        })

        if not combat:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Combate ativo com ID {combat_id} não encontrado"
            )

        # Verificar se o usuário tem acesso ao combate
        await self._check_combat_access(combat, user_id)

        entity_id = initiative_data.entity_id
        entity_type = initiative_data.entity_type

        # Verificar se a entidade já está na ordem de iniciativa
        for entry in combat.get("initiative_order", []):
            if str(entry.get("id")) == str(entity_id) and entry.get("type") == entity_type:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Esta entidade já está na ordem de iniciativa"
                )

        # Verificar se a entidade existe e se o usuário tem permissão
        if entity_type == "character":
            character = await self.db.characters.find_one(entity_id)

            if not character:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Personagem com ID {entity_id} não encontrado"
                )

            # Verificar se o usuário é o dono do personagem ou o DM
            campaign = await self.db.campaigns.find_one(combat.get("campaign_id"))
            is_dm = campaign and str(campaign.get("dm_id")) == str(user_id)
            is_owner = str(character.get("owner_id")) == str(user_id)

            if not (is_dm or is_owner):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Você não tem permissão para rolar iniciativa para este personagem"
                )

            entity_name = character.get("name", "Personagem")

            # Calcular modificador de iniciativa
            initiative_mod = character.get("initiative_bonus", 0)
            dexterity = character.get("attributes", {}).get("dexterity", 10)
            dex_mod = (dexterity - 10) // 2
            # Adicionar o modificador de destreza se não estiver incluído no bônus de iniciativa
            if not character.get("initiative_bonus"):
                initiative_mod += dex_mod

        elif entity_type == "npc":
            npc = await self.db.npcs.find_one(entity_id)

            if not npc:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"NPC com ID {entity_id} não encontrado"
                )

            # Apenas o DM pode adicionar NPCs à iniciativa
            campaign = await self.db.campaigns.find_one(combat.get("campaign_id"))
            is_dm = campaign and str(campaign.get("dm_id")) == str(user_id)

            if not is_dm:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Apenas o DM pode adicionar NPCs à iniciativa"
                )

            entity_name = npc.get("name", "NPC")

            # Calcular modificador de iniciativa (baseado na destreza)
            dexterity = npc.get("stats", {}).get("attributes", {}).get("dexterity", 10)
            initiative_mod = (dexterity - 10) // 2

        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tipo de entidade inválido: {entity_type}"
            )

        # Rolar iniciativa ou usar o valor fornecido
        if initiative_data.initiative_roll is not None:
            initiative_value = initiative_data.initiative_roll
        else:
            # Rolar 1d20 + modificador
            roll_result = roll_dice("1d20")
            initiative_value = roll_result + initiative_mod

        # Criar entrada de iniciativa
        initiative_entry = {
            "id": str(entity_id),
            "type": entity_type,
            "initiative": initiative_value,
            "has_acted": False,
            "name": entity_name
        }

        # Adicionar à ordem de iniciativa
        initiative_order = combat.get("initiative_order", [])
        initiative_order.append(initiative_entry)

        # Ordenar por iniciativa (da maior para a menor)
        initiative_order.sort(key=lambda x: x["initiative"], reverse=True)

        # Atualizar o combate
        await self.db.combats.update_one(
            combat_id,
            {
                "$set": {
                    "initiative_order": initiative_order,
                    "updated_at": datetime.utcnow()
                }
            }
        )

        # Registrar evento de rolagem de iniciativa
        event = {
            "id": str(ObjectId()),
            "round": combat.get("round", 1),
            "turn": combat.get("current_turn", 0),
            "actor_id": str(entity_id),
            "actor_type": entity_type,
            "event_type": "other",
            "description": f"{entity_name} rolou iniciativa: {initiative_value}",
            "rolls": [
                {
                    "roll": "1d20",
                    "result": initiative_value - initiative_mod
                }
            ],
            "timestamp": datetime.utcnow()
        }

        await self.db.combats.update_one(
            combat_id,
            {"$push": {"events": event}}
        )

        # Recuperar o combate atualizado
        updated_combat = await self.db.combats.find_one(combat_id)

        # Formatar ID para string antes de retornar
        return self._format_id(updated_combat)

    async def next_turn(self, combat_id: str, user_id: str) -> Dict[str, Any]:
        """
        Avança para o próximo turno no combate.

        Args:
            combat_id: ID do combate
            user_id: ID do usuário que está fazendo a solicitação (deve ser o DM)

        Returns:
            Combate atualizado

        Raises:
            HTTPException: Se o combate não for encontrado, o usuário não for o DM,
                          ou não houver nenhuma entidade na ordem de iniciativa
        """
        # Verificar se o combate existe e está ativo
        combat = await self.db.combats.find_one({
            "_id": combat_id,
            "status": "active"
        })

        if not combat:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Combate ativo com ID {combat_id} não encontrado"
            )

        # Verificar se o usuário é o DM
        campaign_id = combat.get("campaign_id")
        campaign = await self.db.campaigns.find_one(campaign_id)

        if not campaign or str(campaign.get("dm_id")) != str(user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas o DM pode avançar o turno"
            )

        # Verificar se há entidades na ordem de iniciativa
        initiative_order = combat.get("initiative_order", [])
        if not initiative_order:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Não há entidades na ordem de iniciativa"
            )

        current_turn = combat.get("current_turn", 0)
        current_round = combat.get("round", 1)

        # Marcar a entidade atual como tendo agido
        if len(initiative_order) > current_turn:
            initiative_order[current_turn]["has_acted"] = True

        # Calcular próximo turno
        next_turn = (current_turn + 1) % len(initiative_order)
        new_round = current_round

        # Se completou um ciclo, incrementar a rodada
        if next_turn == 0:
            new_round += 1

            # Resetar estado 'has_acted' para todas as entidades
            for entry in initiative_order:
                entry["has_acted"] = False

        # Atualizar o combate
        await self.db.combats.update_one(
            combat_id,
            {
                "$set": {
                    "current_turn": next_turn,
                    "round": new_round,
                    "initiative_order": initiative_order,
                    "updated_at": datetime.utcnow()
                }
            }
        )

        # Recuperar o combate atualizado
        updated_combat = await self.db.combats.find_one(combat_id)

        # Verificar condições que podem expirar no novo turno
        await self._process_condition_expirations(combat_id, new_round, next_turn)

        # Registrar evento de mudança de turno
        current_entity = initiative_order[next_turn]
        entity_id = current_entity.get("id")
        entity_type = current_entity.get("type")
        entity_name = current_entity.get("name", "Entidade desconhecida")

        event = {
            "id": str(ObjectId()),
            "round": new_round,
            "turn": next_turn,
            "actor_id": "system",
            "actor_type": "dm",
            "event_type": "other",
            "description": f"Turno {next_turn + 1} (Rodada {new_round}): {entity_name}",
            "timestamp": datetime.utcnow()
        }

        await self.db.combats.update_one(
            combat_id,
            {"$push": {"events": event}}
        )

        # Formatar ID para string antes de retornar
        return self._format_id(updated_combat)

    async def add_condition(
            self,
            combat_id: str,
            user_id: str,
            condition_data: ConditionEffectSchema
    ) -> Dict[str, Any]:
        """
        Adiciona uma condição a uma entidade no combate.

        Args:
            combat_id: ID do combate
            user_id: ID do usuário que está fazendo a solicitação (deve ser o DM)
            condition_data: Dados da condição a ser adicionada

        Returns:
            Combate atualizado

        Raises:
            HTTPException: Se o combate não for encontrado, o usuário não for o DM,
                          ou a entidade não existir
        """
        # Verificar se o combate existe e está ativo
        combat = await self.db.combats.find_one({
            "_id": combat_id,
            "status": "active"
        })

        if not combat:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Combate ativo com ID {combat_id} não encontrado"
            )

        # Verificar se o usuário é o DM
        campaign_id = combat.get("campaign_id")
        campaign = await self.db.campaigns.find_one(campaign_id)

        if not campaign or str(campaign.get("dm_id")) != str(user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas o DM pode adicionar condições"
            )

        target_id = condition_data.target_id
        target_type = condition_data.target_type

        # Verificar se a entidade alvo existe
        if target_type == "character":
            entity = await self.db.characters.find_one(target_id)
            if not entity:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Personagem com ID {target_id} não encontrado"
                )

            entity_name = entity.get("name", "Personagem")

        elif target_type == "npc":
            entity = await self.db.npcs.find_one(target_id)
            if not entity:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"NPC com ID {target_id} não encontrado"
                )

            entity_name = entity.get("name", "NPC")

        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tipo de entidade inválido: {target_type}"
            )

        # Verificar se a entidade está na ordem de iniciativa
        entity_in_combat = False
        for entry in combat.get("initiative_order", []):
            if str(entry.get("id")) == str(target_id) and entry.get("type") == target_type:
                entity_in_combat = True
                break

        if not entity_in_combat:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Esta entidade não está na ordem de iniciativa"
            )

        # Preparar dados da condição
        condition_dict = condition_data.dict()
        condition_dict["target_id"] = str(target_id)

        # Se a aplicação não foi especificada, usar os valores atuais do combate
        if not condition_dict.get("applied_at"):
            condition_dict["applied_at"] = {
                "round": combat.get("round", 1),
                "turn": combat.get("current_turn", 0)
            }

        # Adicionar a condição
        conditions = combat.get("conditions", [])
        conditions.append(condition_dict)

        # Atualizar o combate
        await self.db.combats.update_one(
            combat_id,
            {
                "$set": {
                    "conditions": conditions,
                    "updated_at": datetime.utcnow()
                }
            }
        )

        # Se for um personagem, adicionar a condição ao personagem também
        if target_type == "character":
            character_conditions = entity.get("conditions", [])
            condition_name = condition_data.condition

            if condition_name not in character_conditions:
                character_conditions.append(condition_name)

                await self.db.characters.update_one(
                    target_id,
                    {
                        "$set": {
                            "conditions": character_conditions,
                            "updated_at": datetime.utcnow()
                        }
                    }
                )

        # Registrar evento de adição de condição
        event = {
            "id": str(ObjectId()),
            "round": combat.get("round", 1),
            "turn": combat.get("current_turn", 0),
            "actor_id": "system",
            "actor_type": "dm",
            "event_type": "condition",
            "target_id": str(target_id),
            "target_type": target_type,
            "description": f"{entity_name} recebeu a condição: {condition_data.condition}",
            "timestamp": datetime.utcnow()
        }

        await self.db.combats.update_one(
            combat_id,
            {"$push": {"events": event}}
        )

        # Recuperar o combate atualizado
        updated_combat = await self.db.combats.find_one(combat_id)

        # Formatar ID para string antes de retornar
        return self._format_id(updated_combat)

    async def remove_condition(
            self,
            combat_id: str,
            user_id: str,
            condition_id: str
    ) -> Dict[str, Any]:
        """
        Remove uma condição de uma entidade no combate.

        Args:
            combat_id: ID do combate
            user_id: ID do usuário que está fazendo a solicitação (deve ser o DM)
            condition_id: ID da condição a ser removida

        Returns:
            Combate atualizado

        Raises:
            HTTPException: Se o combate não for encontrado, o usuário não for o DM,
                          ou a condição não existir
        """
        # Verificar se o combate existe e está ativo
        combat = await self.db.combats.find_one({
            "_id": combat_id,
            "status": "active"
        })

        if not combat:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Combate ativo com ID {combat_id} não encontrado"
            )

        # Verificar se o usuário é o DM
        campaign_id = combat.get("campaign_id")
        campaign = await self.db.campaigns.find_one(campaign_id)

        if not campaign or str(campaign.get("dm_id")) != str(user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas o DM pode remover condições"
            )

        # Encontrar a condição
        conditions = combat.get("conditions", [])
        condition_to_remove = None
        target_id = None
        target_type = None
        condition_name = None

        for i, condition in enumerate(conditions):
            if str(condition.get("id", i)) == str(condition_id):
                condition_to_remove = i
                target_id = condition.get("target_id")
                target_type = condition.get("target_type")
                condition_name = condition.get("condition")
                break

        if condition_to_remove is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Condição com ID {condition_id} não encontrada neste combate"
            )

        # Remover a condição
        conditions.pop(condition_to_remove)

        # Atualizar o combate
        await self.db.combats.update_one(
            combat_id,
            {
                "$set": {
                    "conditions": conditions,
                    "updated_at": datetime.utcnow()
                }
            }
        )

        # Se for um personagem, verificar se ainda há outras condições do mesmo tipo
        if target_type == "character":
            # Verificar se ainda existem outras condições do mesmo tipo para este personagem
            condition_exists = False
            for condition in conditions:
                if (str(condition.get("target_id")) == str(target_id) and
                        condition.get("target_type") == "character" and
                        condition.get("condition") == condition_name):
                    condition_exists = True
                    break

            # Se não houver mais condições deste tipo, remover do personagem também
            if not condition_exists:
                character = await self.db.characters.find_one(target_id)
                if character:
                    character_conditions = character.get("conditions", [])

                    if condition_name in character_conditions:
                        character_conditions.remove(condition_name)

                        await self.db.characters.update_one(
                            target_id,
                            {
                                "$set": {
                                    "conditions": character_conditions,
                                    "updated_at": datetime.utcnow()
                                }
                            }
                        )

        # Buscar o nome da entidade para o evento
        entity_name = "Entidade desconhecida"
        if target_type == "character":
            entity = await self.db.characters.find_one(target_id)
            if entity:
                entity_name = entity.get("name", "Personagem")
        elif target_type == "npc":
            entity = await self.db.npcs.find_one(target_id)
            if entity:
                entity_name = entity.get("name", "NPC")

        # Registrar evento de remoção de condição
        event = {
            "id": str(ObjectId()),
            "round": combat.get("round", 1),
            "turn": combat.get("current_turn", 0),
            "actor_id": "system",
            "actor_type": "dm",
            "event_type": "condition",
            "target_id": str(target_id),
            "target_type": target_type,
            "description": f"{entity_name} não está mais sob a condição: {condition_name}",
            "timestamp": datetime.utcnow()
        }

        await self.db.combats.update_one(
            combat_id,
            {"$push": {"events": event}}
        )

        # Recuperar o combate atualizado
        updated_combat = await self.db.combats.find_one(combat_id)

        # Formatar ID para string antes de retornar
        return self._format_id(updated_combat)

    async def register_action(
            self,
            combat_id: str,
            user_id: str,
            action_data: ActionSchema
    ) -> Dict[str, Any]:
        """
        Registra uma ação executada durante o combate.

        Args:
            combat_id: ID do combate
            user_id: ID do usuário que está fazendo a solicitação
            action_data: Dados da ação

        Returns:
            Combate atualizado

        Raises:
            HTTPException: Se o combate não for encontrado, o usuário não tiver permissão,
                          ou a entidade não estiver no turno atual
        """
        # Verificar se o combate existe e está ativo
        combat = await self.db.combats.find_one({
            "_id": combat_id,
            "status": "active"
        })

        if not combat:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Combate ativo com ID {combat_id} não encontrado"
            )

        # Verificar se o usuário tem acesso ao combate
        await self._check_combat_access(combat, user_id)

        # Verificar se é o DM ou se é o jogador cujo personagem está no turno atual
        campaign_id = combat.get("campaign_id")
        campaign = await self.db.campaigns.find_one(campaign_id)
        is_dm = campaign and str(campaign.get("dm_id")) == str(user_id)

        current_turn = combat.get("current_turn", 0)
        initiative_order = combat.get("initiative_order", [])

        if current_turn >= len(initiative_order):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ordem de iniciativa inválida no combate"
            )

        current_entity = initiative_order[current_turn]
        current_id = current_entity.get("id")
        current_type = current_entity.get("type")

        # Se não for o DM, verificar se o personagem no turno atual pertence ao usuário
        if not is_dm:
            if current_type != "character":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Apenas o DM pode registrar ações para NPCs"
                )

            character = await self.db.characters.find_one(current_id)
            if not character or str(character.get("owner_id")) != str(user_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Não é seu turno para executar ações"
                )

        # Preparar o evento
        action_type = action_data.action_type
        description = action_data.description
        target_id = action_data.target_id
        target_type = action_data.target_type

        event = {
            "id": str(ObjectId()),
            "round": combat.get("round", 1),
            "turn": current_turn,
            "actor_id": str(current_id),
            "actor_type": current_type,
            "event_type": action_type,
            "target_id": str(target_id) if target_id else None,
            "target_type": target_type,
            "description": description,
            "timestamp": datetime.utcnow()
        }

        # Adicionar o evento ao combate
        await self.db.combats.update_one(
            combat_id,
            {
                "$push": {"events": event},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )

        # Recuperar o combate atualizado
        updated_combat = await self.db.combats.find_one(combat_id)

        # Formatar ID para string antes de retornar
        return self._format_id(updated_combat)

    async def _process_condition_expirations(
            self,
            combat_id: str,
            round: int,
            turn: int
    ) -> None:
        """
        Processa a expiração de condições no início de um novo turno.

        Args:
            combat_id: ID do combate
            round: Rodada atual
            turn: Turno atual
        """
        combat = await self.db.combats.find_one(combat_id)
        if not combat:
            return

        conditions = combat.get("conditions", [])
        expired_conditions = []

        for i, condition in enumerate(conditions):
            # Verificar se a condição expirou
            duration_type = condition.get("duration", {}).get("type")
            duration_value = condition.get("duration", {}).get("value", 0)

            applied_round = condition.get("applied_at", {}).get("round", 0)
            applied_turn = condition.get("applied_at", {}).get("turn", 0)

            if duration_type == "rounds":
                # Condição expira após um número de rodadas
                if (round - applied_round) >= duration_value:
                    expired_conditions.append(i)

            # Outros tipos de duração (minutes, hours) não são processados automaticamente
            # já que dependem do tempo real e não do tempo do jogo

        # Remover condições expiradas (em ordem reversa para não afetar os índices)
        for i in sorted(expired_conditions, reverse=True):
            condition = conditions[i]
            target_id = condition.get("target_id")
            target_type = condition.get("target_type")
            condition_name = condition.get("condition")

            # Registrar evento de expiração
            entity_name = "Entidade desconhecida"
            if target_type == "character":
                entity = await self.db.characters.find_one(target_id)
                if entity:
                    entity_name = entity.get("name", "Personagem")

                    # Remover condição do personagem se não houver outras do mesmo tipo
                    other_same_condition_exists = False
                    for j, other_condition in enumerate(conditions):
                        if (j != i and
                                str(other_condition.get("target_id")) == str(target_id) and
                                other_condition.get("target_type") == "character" and
                                other_condition.get("condition") == condition_name):
                            other_same_condition_exists = True
                            break

                    if not other_same_condition_exists:
                        character_conditions = entity.get("conditions", [])
                        if condition_name in character_conditions:
                            character_conditions.remove(condition_name)

                            await self.db.characters.update_one(
                                target_id,
                                {
                                    "$set": {
                                        "conditions": character_conditions,
                                        "updated_at": datetime.utcnow()
                                    }
                                }
                            )

            elif target_type == "npc":
                entity = await self.db.npcs.find_one(target_id)
                if entity:
                    entity_name = entity.get("name", "NPC")

            # Registrar evento de expiração de condição
            event = {
                "id": str(ObjectId()),
                "round": round,
                "turn": turn,
                "actor_id": "system",
                "actor_type": "dm",
                "event_type": "condition",
                "target_id": str(target_id),
                "target_type": target_type,
                "description": f"A condição '{condition_name}' em {entity_name} expirou",
                "timestamp": datetime.utcnow()
            }

            await self.db.combats.update_one(
                combat_id,
                {"$push": {"events": event}}
            )

        # Remover condições expiradas da lista
        if expired_conditions:
            new_conditions = [condition for i, condition in enumerate(conditions) if i not in expired_conditions]

            await self.db.combats.update_one(
                combat_id,
                {"$set": {"conditions": new_conditions}}
            )

    async def _check_combat_access(self, combat: Dict[str, Any], user_id: str) -> None:
        """
        Verifica se um usuário tem acesso a um combate.

        Args:
            combat: Dados do combate
            user_id: ID do usuário

        Raises:
            HTTPException: Se o usuário não tiver acesso
        """
        campaign_id = combat.get("campaign_id")
        campaign = await self.db.campaigns.find_one(campaign_id)

        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Campanha com ID {campaign_id} não encontrada"
            )

        # Verificar se é o DM
        is_dm = str(campaign.get("dm_id")) == str(user_id)

        # Verificar se é um jogador
        is_player = str(user_id) in [str(p) for p in campaign.get("players", [])]

        if not (is_dm or is_player):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado a este combate"
            )