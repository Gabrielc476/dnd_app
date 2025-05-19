# app/websocket/event_handlers.py
from datetime import datetime
import logging
from typing import Dict, List, Any, Optional
from fastapi import WebSocket
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.websocket.connection_manager import ConnectionManager
from app.websocket.lock_manager import LockManager
from app.services.dice_service import roll_dice

logger = logging.getLogger(__name__)


async def handle_character_event(
        data: Dict[str, Any],
        campaign_id: str,
        user_id: str,
        connection_manager: ConnectionManager,
        lock_manager: LockManager,
        db: AsyncIOMotorDatabase
) -> None:
    """
    Gerencia eventos relacionados a personagens.

    Args:
        data: Dados do evento
        campaign_id: ID da campanha
        user_id: ID do usuário
        connection_manager: Gerenciador de conexões
        lock_manager: Gerenciador de locks
        db: Conexão com o banco de dados
    """
    action = data.get("action")
    character_id = data.get("character_id")

    if not action or not character_id:
        await connection_manager.send_personal_message(
            {
                "type": "error",
                "message": "Dados incompletos para evento de personagem"
            },
            user_id,
            campaign_id
        )
        return

    # Verificar se o personagem existe e se o usuário tem acesso
    character = await db.characters.find_one({"_id": character_id})
    if not character:
        await connection_manager.send_personal_message(
            {
                "type": "error",
                "message": "Personagem não encontrado"
            },
            user_id,
            campaign_id
        )
        return

    # Verificar se é o proprietário ou o DM
    is_owner = character["owner_id"] == user_id
    campaign = await db.campaigns.find_one({"_id": campaign_id})
    is_dm = campaign and campaign["dm_id"] == user_id

    if not is_owner and not is_dm:
        await connection_manager.send_personal_message(
            {
                "type": "error",
                "message": "Você não tem permissão para modificar este personagem"
            },
            user_id,
            campaign_id
        )
        return

    # Processar ações específicas
    if action == "update":
        # Para atualizar, o usuário deve ter um lock
        if await lock_manager.is_locked_by_other(character_id, "character", user_id):
            locker_id = await lock_manager.who_locked(character_id, "character")
            await connection_manager.send_personal_message(
                {
                    "type": "error",
                    "message": f"Este personagem está sendo editado por outro usuário"
                },
                user_id,
                campaign_id
            )
            return

        updates = data.get("updates", {})
        if not updates:
            await connection_manager.send_personal_message(
                {
                    "type": "error",
                    "message": "Nenhuma atualização fornecida"
                },
                user_id,
                campaign_id
            )
            return

        # Adicionar timestamp de atualização
        updates["updated_at"] = datetime.utcnow()

        # Atualizar o personagem
        await db.characters.update_one(
            {"_id": character_id},
            {"$set": updates}
        )

        # Notificar todos sobre a atualização
        await connection_manager.broadcast_to_campaign(
            campaign_id,
            {
                "type": "character",
                "action": "updated",
                "character_id": character_id,
                "updated_by": user_id,
                "updates": updates
            }
        )

        logger.info(f"Personagem {character_id} atualizado por {user_id}")

    elif action == "roll":
        # Rolagens não requerem lock
        roll_type = data.get("roll_type")
        modifier = data.get("modifier", 0)

        if not roll_type:
            await connection_manager.send_personal_message(
                {
                    "type": "error",
                    "message": "Tipo de rolagem não especificado"
                },
                user_id,
                campaign_id
            )
            return

        # Determinar o modificador baseado no atributo
        if roll_type == "attribute":
            attribute = data.get("attribute")
            if not attribute or attribute not in character.get("attributes", {}):
                await connection_manager.send_personal_message(
                    {
                        "type": "error",
                        "message": "Atributo não encontrado"
                    },
                    user_id,
                    campaign_id
                )
                return

            attr_value = character["attributes"][attribute]
            modifier = (attr_value - 10) // 2

        # Realizar a rolagem
        dice_formula = data.get("dice", "1d20")
        result = roll_dice(dice_formula, modifier)

        # Notificar todos sobre a rolagem
        await connection_manager.broadcast_to_campaign(
            campaign_id,
            {
                "type": "character",
                "action": "roll_result",
                "character_id": character_id,
                "character_name": character.get("name", "Personagem"),
                "roll_type": roll_type,
                "dice": dice_formula,
                "modifier": modifier,
                "result": result,
                "total": result + modifier,
                "rolled_by": user_id
            }
        )

        logger.info(
            f"Rolagem de {dice_formula} ({roll_type}) para personagem {character_id} "
            f"por {user_id}: {result} + {modifier} = {result + modifier}"
        )

    elif action == "hp_change":
        # Alterações de HP podem ser feitas pelo proprietário ou pelo DM
        change = data.get("change", 0)
        if not isinstance(change, int):
            await connection_manager.send_personal_message(
                {
                    "type": "error",
                    "message": "Alteração de HP inválida"
                },
                user_id,
                campaign_id
            )
            return

        current_hp = character.get("hp", {}).get("current", 0)
        max_hp = character.get("hp", {}).get("max", 0)

        # Calcular novo HP, não permitindo ultrapassar o máximo ou cair abaixo de 0
        new_hp = min(max(current_hp + change, 0), max_hp)

        # Atualizar HP
        await db.characters.update_one(
            {"_id": character_id},
            {"$set": {"hp.current": new_hp, "updated_at": datetime.utcnow()}}
        )

        # Notificar todos sobre a mudança de HP
        await connection_manager.broadcast_to_campaign(
            campaign_id,
            {
                "type": "character",
                "action": "hp_changed",
                "character_id": character_id,
                "character_name": character.get("name", "Personagem"),
                "previous_hp": current_hp,
                "new_hp": new_hp,
                "change": change,
                "changed_by": user_id
            }
        )

        logger.info(
            f"HP do personagem {character_id} alterado por {user_id}: "
            f"{current_hp} -> {new_hp} (alteração: {change})"
        )

    # Adicionar mais handlers para outros tipos de ações de personagem


async def handle_combat_event(
        data: Dict[str, Any],
        campaign_id: str,
        user_id: str,
        connection_manager: ConnectionManager,
        lock_manager: LockManager,
        db: AsyncIOMotorDatabase
) -> None:
    """
    Gerencia eventos relacionados a combate.

    Args:
        data: Dados do evento
        campaign_id: ID da campanha
        user_id: ID do usuário
        connection_manager: Gerenciador de conexões
        lock_manager: Gerenciador de locks
        db: Conexão com o banco de dados
    """
    action = data.get("action")

    if not action:
        await connection_manager.send_personal_message(
            {
                "type": "error",
                "message": "Ação de combate não especificada"
            },
            user_id,
            campaign_id
        )
        return

    # Verificar se o usuário está na campanha
    campaign = await db.campaigns.find_one({"_id": campaign_id})
    if not campaign:
        await connection_manager.send_personal_message(
            {
                "type": "error",
                "message": "Campanha não encontrada"
            },
            user_id,
            campaign_id
        )
        return

    is_dm = campaign["dm_id"] == user_id
    is_player = user_id in campaign.get("players", [])

    if not is_dm and not is_player:
        await connection_manager.send_personal_message(
            {
                "type": "error",
                "message": "Você não é um participante desta campanha"
            },
            user_id,
            campaign_id
        )
        return

    # Encontrar combate ativo na campanha
    active_combat = await db.combats.find_one({
        "campaign_id": campaign_id,
        "status": "active"
    })

    # Processar ações específicas
    if action == "start":
        # Apenas o DM pode iniciar combate
        if not is_dm:
            await connection_manager.send_personal_message(
                {
                    "type": "error",
                    "message": "Apenas o Mestre pode iniciar combate"
                },
                user_id,
                campaign_id
            )
            return

        # Verificar se já existe um combate ativo
        if active_combat:
            await connection_manager.send_personal_message(
                {
                    "type": "error",
                    "message": "Já existe um combate ativo nesta campanha"
                },
                user_id,
                campaign_id
            )
            return

        # Adquirir lock de sessão para combate
        combat_lock = await lock_manager.create_session_lock(
            campaign_id,
            "combat_session",
            user_id,
            duration_seconds=3600  # Locks de combate duram mais (1 hora)
        )

        if not combat_lock:
            await connection_manager.send_personal_message(
                {
                    "type": "error",
                    "message": "Não foi possível iniciar o combate"
                },
                user_id,
                campaign_id
            )
            return

        # Iniciar um novo combate
        encounter_id = data.get("encounter_id")

        new_combat = {
            "campaign_id": campaign_id,
            "encounter_id": encounter_id,
            "status": "active",
            "round": 1,
            "initiative_order": [],
            "current_turn": 0,
            "conditions": [],
            "events": [],
            "started_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        result = await db.combats.insert_one(new_combat)
        combat_id = str(result.inserted_id)

        # Atualizar a campanha com o ID do combate ativo
        await db.campaigns.update_one(
            {"_id": campaign_id},
            {"$set": {"active_encounter": encounter_id} if encounter_id else {}}
        )

        # Notificar todos sobre o início do combate
        await connection_manager.broadcast_to_campaign(
            campaign_id,
            {
                "type": "combat",
                "action": "started",
                "combat_id": combat_id,
                "encounter_id": encounter_id,
                "started_by": user_id
            }
        )

        logger.info(f"Combate iniciado na campanha {campaign_id} por {user_id}")

    elif action == "roll_initiative":
        # Verificar se existe um combate ativo
        if not active_combat:
            await connection_manager.send_personal_message(
                {
                    "type": "error",
                    "message": "Não há combate ativo nesta campanha"
                },
                user_id,
                campaign_id
            )
            return

        # Jogadores só podem rolar iniciativa para seus próprios personagens
        character_id = data.get("character_id")
        if not character_id:
            await connection_manager.send_personal_message(
                {
                    "type": "error",
                    "message": "ID do personagem não especificado"
                },
                user_id,
                campaign_id
            )
            return

        # Verificar se o personagem pertence ao jogador
        character = await db.characters.find_one({"_id": character_id})
        if not character:
            await connection_manager.send_personal_message(
                {
                    "type": "error",
                    "message": "Personagem não encontrado"
                },
                user_id,
                campaign_id
            )
            return

        if not is_dm and character["owner_id"] != user_id:
            await connection_manager.send_personal_message(
                {
                    "type": "error",
                    "message": "Você não pode rolar iniciativa para este personagem"
                },
                user_id,
                campaign_id
            )
            return

        # Verificar se o personagem já está na ordem de iniciativa
        character_in_initiative = any(
            entry["id"] == character_id and entry["type"] == "character"
            for entry in active_combat.get("initiative_order", [])
        )

        if character_in_initiative:
            await connection_manager.send_personal_message(
                {
                    "type": "error",
                    "message": "Este personagem já está na ordem de iniciativa"
                },
                user_id,
                campaign_id
            )
            return

        # Calcular modificador de iniciativa
        initiative_mod = character.get("initiative_bonus", 0)
        dexterity = character.get("attributes", {}).get("dexterity", 10)
        if dexterity:
            # Adicionar modificador de destreza se não estiver incluído no bônus de iniciativa
            dex_mod = (dexterity - 10) // 2
            initiative_mod += dex_mod

        # Rolar iniciativa
        initiative_roll = roll_dice("1d20")
        initiative_total = initiative_roll + initiative_mod

        # Adicionar à ordem de iniciativa
        initiative_entry = {
            "id": character_id,
            "type": "character",
            "initiative": initiative_total,
            "has_acted": False,
            "name": character.get("name", "Personagem")
        }

        await db.combats.update_one(
            {"_id": active_combat["_id"]},
            {"$push": {"initiative_order": initiative_entry}}
        )

        # Reordenar a lista de iniciativa (do maior para o menor)
        await db.combats.update_one(
            {"_id": active_combat["_id"]},
            [
                {
                    "$set": {
                        "initiative_order": {
                            "$sortArray": {
                                "input": "$initiative_order",
                                "sortBy": {"initiative": -1}
                            }
                        }
                    }
                }
            ]
        )

        # Notificar todos sobre a nova rolagem de iniciativa
        await connection_manager.broadcast_to_campaign(
            campaign_id,
            {
                "type": "combat",
                "action": "initiative_rolled",
                "character_id": character_id,
                "character_name": character.get("name", "Personagem"),
                "initiative_roll": initiative_roll,
                "initiative_modifier": initiative_mod,
                "initiative_total": initiative_total,
                "rolled_by": user_id
            }
        )

        logger.info(
            f"Iniciativa rolada para personagem {character_id} na campanha {campaign_id}: "
            f"{initiative_roll} + {initiative_mod} = {initiative_total}"
        )

        # Enviar a ordem de iniciativa atualizada
        updated_combat = await db.combats.find_one({"_id": active_combat["_id"]})
        await connection_manager.broadcast_to_campaign(
            campaign_id,
            {
                "type": "combat",
                "action": "initiative_order_updated",
                "initiative_order": updated_combat["initiative_order"]
            }
        )

    elif action == "npc_initiative":
        # Apenas o DM pode adicionar NPCs à iniciativa
        if not is_dm:
            await connection_manager.send_personal_message(
                {
                    "type": "error",
                    "message": "Apenas o Mestre pode adicionar NPCs à iniciativa"
                },
                user_id,
                campaign_id
            )
            return

        # Verificar se existe um combate ativo
        if not active_combat:
            await connection_manager.send_personal_message(
                {
                    "type": "error",
                    "message": "Não há combate ativo nesta campanha"
                },
                user_id,
                campaign_id
            )
            return

        npc_id = data.get("npc_id")
        if not npc_id:
            await connection_manager.send_personal_message(
                {
                    "type": "error",
                    "message": "ID do NPC não especificado"
                },
                user_id,
                campaign_id
            )
            return

        # Verificar se o NPC existe
        npc = await db.npcs.find_one({"_id": npc_id})
        if not npc:
            await connection_manager.send_personal_message(
                {
                    "type": "error",
                    "message": "NPC não encontrado"
                },
                user_id,
                campaign_id
            )
            return

        # Verificar se o NPC já está na ordem de iniciativa
        npc_in_initiative = any(
            entry["id"] == npc_id and entry["type"] == "npc"
            for entry in active_combat.get("initiative_order", [])
        )

        if npc_in_initiative:
            await connection_manager.send_personal_message(
                {
                    "type": "error",
                    "message": "Este NPC já está na ordem de iniciativa"
                },
                user_id,
                campaign_id
            )
            return

        # Calcular modificador de iniciativa (baseado na destreza do NPC)
        dexterity = npc.get("stats", {}).get("attributes", {}).get("dexterity", 10)
        initiative_mod = (dexterity - 10) // 2

        # O DM pode fornecer um valor direto ou rolar
        initiative_value = data.get("initiative")
        if initiative_value is None:
            # Rolar iniciativa
            initiative_roll = roll_dice("1d20")
            initiative_total = initiative_roll + initiative_mod
        else:
            initiative_total = initiative_value

        # Adicionar à ordem de iniciativa
        initiative_entry = {
            "id": npc_id,
            "type": "npc",
            "initiative": initiative_total,
            "has_acted": False,
            "name": npc.get("name", "NPC")
        }

        await db.combats.update_one(
            {"_id": active_combat["_id"]},
            {"$push": {"initiative_order": initiative_entry}}
        )

        # Reordenar a lista de iniciativa (do maior para o menor)
        await db.combats.update_one(
            {"_id": active_combat["_id"]},
            [
                {
                    "$set": {
                        "initiative_order": {
                            "$sortArray": {
                                "input": "$initiative_order",
                                "sortBy": {"initiative": -1}
                            }
                        }
                    }
                }
            ]
        )

        # Notificar todos sobre a nova rolagem de iniciativa
        await connection_manager.broadcast_to_campaign(
            campaign_id,
            {
                "type": "combat",
                "action": "npc_initiative_added",
                "npc_id": npc_id,
                "npc_name": npc.get("name", "NPC"),
                "initiative": initiative_total,
                "added_by": user_id
            }
        )

        logger.info(
            f"Iniciativa adicionada para NPC {npc_id} na campanha {campaign_id}: {initiative_total}"
        )

        # Enviar a ordem de iniciativa atualizada
        updated_combat = await db.combats.find_one({"_id": active_combat["_id"]})
        await connection_manager.broadcast_to_campaign(
            campaign_id,
            {
                "type": "combat",
                "action": "initiative_order_updated",
                "initiative_order": updated_combat["initiative_order"]
            }
        )

    elif action == "next_turn":
        # Apenas o DM pode avançar o turno
        if not is_dm:
            await connection_manager.send_personal_message(
                {
                    "type": "error",
                    "message": "Apenas o Mestre pode avançar o turno"
                },
                user_id,
                campaign_id
            )
            return

        # Verificar se existe um combate ativo
        if not active_combat:
            await connection_manager.send_personal_message(
                {
                    "type": "error",
                    "message": "Não há combate ativo nesta campanha"
                },
                user_id,
                campaign_id
            )
            return

        initiative_order = active_combat.get("initiative_order", [])
        if not initiative_order:
            await connection_manager.send_personal_message(
                {
                    "type": "error",
                    "message": "Não há personagens na ordem de iniciativa"
                },
                user_id,
                campaign_id
            )
            return

        current_turn = active_combat.get("current_turn", 0)
        current_round = active_combat.get("round", 1)

        # Marcar o turno atual como tendo agido
        if initiative_order:
            initiative_order[current_turn]["has_acted"] = True

        # Avançar para o próximo turno
        next_turn = (current_turn + 1) % len(initiative_order)
        new_round = current_round

        # Se chegamos ao início da ordem novamente, incrementar o round
        if next_turn == 0:
            new_round += 1
            # Resetar o estado "has_acted" para todos
            for entry in initiative_order:
                entry["has_acted"] = False

        # Atualizar o combate
        await db.combats.update_one(
            {"_id": active_combat["_id"]},
            {
                "$set": {
                    "current_turn": next_turn,
                    "round": new_round,
                    "initiative_order": initiative_order,
                    "updated_at": datetime.utcnow()
                }
            }
        )

        # Determinar quem está no turno atual
        current_entity = initiative_order[next_turn]
        entity_id = current_entity["id"]
        entity_type = current_entity["type"]
        entity_name = current_entity["name"]

        # Se for um personagem de jogador, verificar o proprietário
        player_id = None
        if entity_type == "character":
            character = await db.characters.find_one({"_id": entity_id})
            if character:
                player_id = character.get("owner_id")

        # Atualizar o lock de sessão com o jogador atual
        if player_id:
            await lock_manager.update_session_turn(
                campaign_id,
                "combat_session",
                user_id,  # DM
                player_id
            )

        # Notificar todos sobre o novo turno
        await connection_manager.broadcast_to_campaign(
            campaign_id,
            {
                "type": "combat",
                "action": "new_turn",
                "round": new_round,
                "turn_index": next_turn,
                "entity_id": entity_id,
                "entity_type": entity_type,
                "entity_name": entity_name,
                "player_id": player_id,
                "advanced_by": user_id
            }
        )

        logger.info(
            f"Turno avançado na campanha {campaign_id}: "
            f"Round {new_round}, Entity {entity_name} ({entity_type})"
        )

    elif action == "end_combat":
        # Apenas o DM pode encerrar o combate
        if not is_dm:
            await connection_manager.send_personal_message(
                {
                    "type": "error",
                    "message": "Apenas o Mestre pode encerrar o combate"
                },
                user_id,
                campaign_id
            )
            return

        # Verificar se existe um combate ativo
        if not active_combat:
            await connection_manager.send_personal_message(
                {
                    "type": "error",
                    "message": "Não há combate ativo nesta campanha"
                },
                user_id,
                campaign_id
            )
            return

        # Encerrar o combate
        await db.combats.update_one(
            {"_id": active_combat["_id"]},
            {
                "$set": {
                    "status": "completed",
                    "ended_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        )

        # Atualizar a campanha
        await db.campaigns.update_one(
            {"_id": campaign_id},
            {"$unset": {"active_encounter": ""}}
        )

        # Liberar o lock de sessão
        await lock_manager.release_session_lock(
            campaign_id,
            "combat_session",
            user_id
        )

        # Notificar todos sobre o fim do combate
        await connection_manager.broadcast_to_campaign(
            campaign_id,
            {
                "type": "combat",
                "action": "ended",
                "combat_id": str(active_combat["_id"]),
                "ended_by": user_id,
                "rounds_completed": active_combat["round"]
            }
        )

        logger.info(f"Combate encerrado na campanha {campaign_id} por {user_id}")

    # Adicionar mais handlers para outros tipos de ações de combate


async def handle_image_event(
        data: Dict[str, Any],
        campaign_id: str,
        user_id: str,
        connection_manager: ConnectionManager,
        lock_manager: LockManager,
        db: AsyncIOMotorDatabase
) -> None:
    """
    Gerencia eventos relacionados a imagens.

    Args:
        data: Dados do evento
        campaign_id: ID da campanha
        user_id: ID do usuário
        connection_manager: Gerenciador de conexões
        lock_manager: Gerenciador de locks
        db: Conexão com o banco de dados
    """
    # Implementar o gerenciamento de imagens
    # - Compartilhamento de imagens
    # - Ocultação/revelação de áreas
    # - Coordenadas de tokens
    pass


async def handle_spell_event(
        data: Dict[str, Any],
        campaign_id: str,
        user_id: str,
        connection_manager: ConnectionManager,
        lock_manager: LockManager,
        db: AsyncIOMotorDatabase
) -> None:
    """
    Gerencia eventos relacionados a magias.

    Args:
        data: Dados do evento
        campaign_id: ID da campanha
        user_id: ID do usuário
        connection_manager: Gerenciador de conexões
        lock_manager: Gerenciador de locks
        db: Conexão com o banco de dados
    """
    # Implementar o gerenciamento de magias
    # - Preparação/uso de slots de magia
    # - Efeitos de magias
    pass