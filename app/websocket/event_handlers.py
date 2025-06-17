# app/websocket/event_handlers.py
"""
WebSocket Event Handlers - COMPLETO E CORRIGIDO
Problemas resolvidos:
1. ✅ Todas as funções incompletas implementadas
2. ✅ Import de dice_service corrigido (implementado localmente)
3. ✅ Todas as linhas cortadas completadas
4. ✅ Proper error handling implementado
5. ✅ Validação de permissões adicionada
6. ✅ Logging adequado sem exposição de dados
"""

import logging
import random
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from fastapi import WebSocket, WebSocketDisconnect
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from app.websocket.manager import WebSocketManager
from app.core.lock_manager import LockManager
from app.utils.id_handler import IdHandler
from app.schemas.websocket import (
    CharacterEventSchema, CombatEventSchema, LockEventSchema,
    ImageEventSchema, SpellEventSchema, SystemEventSchema
)

logger = logging.getLogger(__name__)


# ===============================
# DICE ROLLING FUNCTIONS (Local Implementation)
# ===============================

def roll_dice(dice_formula: str) -> Dict[str, Any]:
    """
    Rola dados baseado em fórmula D&D.

    Args:
        dice_formula: Fórmula como "1d20", "2d6+3", "1d20+5"

    Returns:
        Resultado da rolagem com detalhes
    """
    try:
        # Parse básico da fórmula (ex: "2d6+3")
        formula = dice_formula.lower().replace(" ", "")

        # Separar modificador
        modifier = 0
        if "+" in formula:
            parts = formula.split("+")
            formula = parts[0]
            modifier = int(parts[1])
        elif "-" in formula:
            parts = formula.split("-")
            formula = parts[0]
            modifier = -int(parts[1])

        # Parse dos dados (ex: "2d6")
        if "d" not in formula:
            raise ValueError("Fórmula inválida")

        dice_parts = formula.split("d")
        num_dice = int(dice_parts[0]) if dice_parts[0] else 1
        die_size = int(dice_parts[1])

        # Validações
        if num_dice < 1 or num_dice > 100:
            raise ValueError("Número de dados deve ser entre 1 e 100")
        if die_size < 2 or die_size > 100:
            raise ValueError("Tamanho do dado deve ser entre 2 e 100")

        # Rolar dados
        rolls = [random.randint(1, die_size) for _ in range(num_dice)]
        total = sum(rolls) + modifier

        return {
            "formula": dice_formula,
            "rolls": rolls,
            "modifier": modifier,
            "total": total,
            "die_size": die_size,
            "num_dice": num_dice
        }

    except Exception as e:
        logger.error(f"Erro ao rolar dados {dice_formula}: {e}")
        return {
            "formula": dice_formula,
            "error": str(e),
            "total": 0
        }


def roll_with_advantage(dice_formula: str) -> Dict[str, Any]:
    """Rola dados com vantagem (rola duas vezes, pega o maior)."""
    result1 = roll_dice(dice_formula)
    result2 = roll_dice(dice_formula)

    if "error" in result1 or "error" in result2:
        return result1 if "error" not in result1 else result2

    if result1["total"] >= result2["total"]:
        result1["advantage"] = True
        result1["discarded_roll"] = result2["total"]
        return result1
    else:
        result2["advantage"] = True
        result2["discarded_roll"] = result1["total"]
        return result2


def roll_with_disadvantage(dice_formula: str) -> Dict[str, Any]:
    """Rola dados com desvantagem (rola duas vezes, pega o menor)."""
    result1 = roll_dice(dice_formula)
    result2 = roll_dice(dice_formula)

    if "error" in result1 or "error" in result2:
        return result1 if "error" not in result1 else result2

    if result1["total"] <= result2["total"]:
        result1["disadvantage"] = True
        result1["discarded_roll"] = result2["total"]
        return result1
    else:
        result2["disadvantage"] = True
        result2["discarded_roll"] = result1["total"]
        return result2


def roll_damage(damage_formula: str) -> Dict[str, Any]:
    """Rola dados de dano."""
    result = roll_dice(damage_formula)
    result["damage_type"] = "physical"  # Padrão
    return result


# ===============================
# MAIN EVENT ROUTER
# ===============================

async def handle_websocket_events(
        event_type: str,
        event_data: Dict[str, Any],
        campaign_id: str,
        websocket_manager: WebSocketManager,
        lock_manager: LockManager,
        database: AsyncIOMotorDatabase
) -> None:
    """
    Router principal para eventos WebSocket.

    Args:
        event_type: Tipo do evento (character, combat, lock, etc.)
        event_data: Dados do evento
        campaign_id: ID da campanha
        websocket_manager: Gerenciador de WebSocket
        lock_manager: Gerenciador de locks
        database: Instância do banco
    """
    try:
        logger.info(f"Processando evento WebSocket: {event_type}")

        # Validar campaign_id
        if not IdHandler.is_valid(campaign_id):
            logger.warning(f"Campaign ID inválido: {campaign_id}")
            return

        # Roteamento baseado no tipo de evento
        if event_type == "character":
            await handle_character_event(
                event_data, campaign_id, websocket_manager, database
            )
        elif event_type == "combat":
            await handle_combat_event(
                event_data, campaign_id, websocket_manager, database
            )
        elif event_type == "roll":
            await handle_roll_event(
                event_data, campaign_id, websocket_manager, database
            )
        elif event_type == "lock":
            await handle_lock_event(
                event_data, campaign_id, websocket_manager, lock_manager, database
            )
        elif event_type == "image":
            await handle_image_event(
                event_data, campaign_id, websocket_manager, database
            )
        elif event_type == "spell":
            await handle_spell_event(
                event_data, campaign_id, websocket_manager, database
            )
        elif event_type == "system":
            await handle_system_event(
                event_data, campaign_id, websocket_manager
            )
        else:
            logger.warning(f"Tipo de evento desconhecido: {event_type}")

    except Exception as e:
        logger.error(f"Erro no processamento de evento {event_type}: {e}")


# ===============================
# CHARACTER EVENTS
# ===============================

async def handle_character_event(
        event_data: Dict[str, Any],
        campaign_id: str,
        websocket_manager: WebSocketManager,
        database: AsyncIOMotorDatabase
) -> None:
    """
    Gerencia eventos relacionados a personagens.

    Actions suportadas:
    - update: Atualiza dados do personagem
    - hp_change: Mudança de HP
    - roll: Rolagem de dados do personagem
    """
    try:
        action = event_data.get("action")
        character_id = event_data.get("character_id")

        if not character_id or not IdHandler.is_valid(character_id):
            logger.warning("Character ID inválido no evento")
            return

        # Verificar se personagem existe e pertence à campanha
        character_filter = IdHandler.create_query_filter(character_id, "_id")
        character = await database.characters.find_one(character_filter)

        if not character:
            logger.warning(f"Personagem não encontrado: {character_id}")
            return

        campaign_object_id = IdHandler.to_object_id(campaign_id)
        if character.get("campaign_id") != campaign_object_id:
            logger.warning("Personagem não pertence à campanha")
            return

        if action == "update":
            await _handle_character_update(
                character_id, event_data.get("data", {}),
                campaign_id, websocket_manager, database
            )
        elif action == "hp_change":
            await _handle_hp_change(
                character_id, event_data.get("data", {}),
                campaign_id, websocket_manager, database
            )
        elif action == "roll":
            await _handle_character_roll(
                character_id, event_data.get("data", {}),
                campaign_id, websocket_manager
            )
        else:
            logger.warning(f"Ação de personagem desconhecida: {action}")

    except Exception as e:
        logger.error(f"Erro no evento de personagem: {e}")


async def _handle_character_update(
        character_id: str,
        update_data: Dict[str, Any],
        campaign_id: str,
        websocket_manager: WebSocketManager,
        database: AsyncIOMotorDatabase
) -> None:
    """Atualiza dados do personagem e notifica outros usuários."""
    try:
        # Validar e preparar dados
        if not update_data:
            return

        character_object_id = IdHandler.to_object_id(character_id)
        update_data["updated_at"] = datetime.utcnow()

        # Atualizar no banco
        result = await database.characters.update_one(
            {"_id": character_object_id},
            {"$set": update_data}
        )

        if result.modified_count > 0:
            # Notificar outros usuários na campanha
            await websocket_manager.broadcast_to_campaign(
                campaign_id,
                {
                    "type": "character",
                    "action": "updated",
                    "character_id": character_id,
                    "data": update_data,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
            logger.info(f"Personagem atualizado: {character_id}")

    except Exception as e:
        logger.error(f"Erro na atualização do personagem {character_id}: {e}")


async def _handle_hp_change(
        character_id: str,
        hp_data: Dict[str, Any],
        campaign_id: str,
        websocket_manager: WebSocketManager,
        database: AsyncIOMotorDatabase
) -> None:
    """Gerencia mudanças de HP do personagem."""
    try:
        current_hp = hp_data.get("current")
        max_hp = hp_data.get("max")
        change = hp_data.get("change", 0)

        if current_hp is None:
            return

        # Calcular novo HP se há mudança
        if change != 0:
            current_hp = max(0, min(current_hp + change, max_hp or current_hp))

        # Atualizar no banco
        character_object_id = IdHandler.to_object_id(character_id)
        update_data = {
            "hp.current": current_hp,
            "updated_at": datetime.utcnow()
        }

        if max_hp is not None:
            update_data["hp.max"] = max_hp

        await database.characters.update_one(
            {"_id": character_object_id},
            {"$set": update_data}
        )

        # Notificar mudança de HP
        await websocket_manager.broadcast_to_campaign(
            campaign_id,
            {
                "type": "character",
                "action": "hp_changed",
                "character_id": character_id,
                "data": {
                    "hp": {"current": current_hp, "max": max_hp},
                    "change": change
                },
                "timestamp": datetime.utcnow().isoformat()
            }
        )

    except Exception as e:
        logger.error(f"Erro na mudança de HP do personagem {character_id}: {e}")


async def _handle_character_roll(
        character_id: str,
        roll_data: Dict[str, Any],
        campaign_id: str,
        websocket_manager: WebSocketManager
) -> None:
    """Processa rolagem de dados do personagem."""
    try:
        formula = roll_data.get("formula", "1d20")
        modifier = roll_data.get("modifier", 0)
        advantage = roll_data.get("advantage")
        disadvantage = roll_data.get("disadvantage")
        roll_type = roll_data.get("type", "custom")

        # Ajustar fórmula com modificador
        if modifier != 0:
            sign = "+" if modifier >= 0 else ""
            formula = f"{formula}{sign}{modifier}"

        # Executar rolagem
        if advantage:
            result = roll_with_advantage(formula)
        elif disadvantage:
            result = roll_with_disadvantage(formula)
        else:
            result = roll_dice(formula)

        # Adicionar informações do contexto
        result.update({
            "character_id": character_id,
            "roll_type": roll_type,
            "timestamp": datetime.utcnow().isoformat()
        })

        # Broadcast do resultado
        await websocket_manager.broadcast_to_campaign(
            campaign_id,
            {
                "type": "roll",
                "action": "result",
                "data": result
            }
        )

    except Exception as e:
        logger.error(f"Erro na rolagem do personagem {character_id}: {e}")


# ===============================
# COMBAT EVENTS
# ===============================

async def handle_combat_event(
        event_data: Dict[str, Any],
        campaign_id: str,
        websocket_manager: WebSocketManager,
        database: AsyncIOMotorDatabase
) -> None:
    """
    Gerencia eventos de combate.

    Actions suportadas:
    - start: Inicia combate
    - roll_initiative: Rola iniciativa
    - next_turn: Próximo turno
    - add_condition: Adiciona condição
    - remove_condition: Remove condição
    - end: Finaliza combate
    """
    try:
        action = event_data.get("action")
        combat_id = event_data.get("combat_id")

        if action == "start":
            await _handle_combat_start(
                event_data.get("data", {}), campaign_id, websocket_manager, database
            )
        elif action == "roll_initiative":
            await _handle_initiative_roll(
                combat_id, event_data.get("data", {}), campaign_id, websocket_manager, database
            )
        elif action == "next_turn":
            await _handle_next_turn(
                combat_id, campaign_id, websocket_manager, database
            )
        elif action == "add_condition":
            await _handle_add_condition(
                combat_id, event_data.get("data", {}), campaign_id, websocket_manager, database
            )
        elif action == "remove_condition":
            await _handle_remove_condition(
                combat_id, event_data.get("data", {}), campaign_id, websocket_manager, database
            )
        elif action == "end":
            await _handle_combat_end(
                combat_id, campaign_id, websocket_manager, database
            )
        else:
            logger.warning(f"Ação de combate desconhecida: {action}")

    except Exception as e:
        logger.error(f"Erro no evento de combate: {e}")


async def _handle_combat_start(
        combat_data: Dict[str, Any],
        campaign_id: str,
        websocket_manager: WebSocketManager,
        database: AsyncIOMotorDatabase
) -> None:
    """Inicia um novo combate."""
    try:
        # Finalizar combate ativo se existir
        campaign_object_id = IdHandler.to_object_id(campaign_id)
        await database.combats.update_many(
            {"campaign_id": campaign_object_id, "status": "active"},
            {"$set": {"status": "ended", "ended_at": datetime.utcnow()}}
        )

        # Criar novo combate
        combat_doc = {
            "_id": ObjectId(),
            "campaign_id": campaign_object_id,
            "status": "active",
            "round": 1,
            "current_turn": 0,
            "initiative_order": [],
            "conditions": {},
            "created_at": datetime.utcnow(),
            "started_at": datetime.utcnow()
        }

        await database.combats.insert_one(combat_doc)

        # Notificar início do combate
        await websocket_manager.broadcast_to_campaign(
            campaign_id,
            {
                "type": "combat",
                "action": "started",
                "data": {
                    "combat_id": str(combat_doc["_id"]),
                    "round": 1
                },
                "timestamp": datetime.utcnow().isoformat()
            }
        )

        logger.info(f"Combate iniciado na campanha {campaign_id}")

    except Exception as e:
        logger.error(f"Erro ao iniciar combate: {e}")


async def _handle_initiative_roll(
        combat_id: str,
        initiative_data: Dict[str, Any],
        campaign_id: str,
        websocket_manager: WebSocketManager,
        database: AsyncIOMotorDatabase
) -> None:
    """Processa rolagem de iniciativa."""
    try:
        if not combat_id or not IdHandler.is_valid(combat_id):
            return

        entity_id = initiative_data.get("entity_id")
        entity_type = initiative_data.get("entity_type", "character")
        modifier = initiative_data.get("modifier", 0)
        advantage = initiative_data.get("advantage", False)

        # Rolar iniciativa
        formula = f"1d20+{modifier}" if modifier != 0 else "1d20"
        if advantage:
            result = roll_with_advantage(formula)
        else:
            result = roll_dice(formula)

        initiative_value = result.get("total", 0)

        # Atualizar ordem de iniciativa
        combat_object_id = IdHandler.to_object_id(combat_id)

        # Remover entrada existente se houver
        await database.combats.update_one(
            {"_id": combat_object_id},
            {"$pull": {"initiative_order": {"entity_id": entity_id}}}
        )

        # Adicionar nova entrada
        initiative_entry = {
            "entity_id": entity_id,
            "entity_type": entity_type,
            "initiative": initiative_value,
            "rolled_at": datetime.utcnow()
        }

        await database.combats.update_one(
            {"_id": combat_object_id},
            {"$push": {"initiative_order": initiative_entry}}
        )

        # Notificar rolagem
        await websocket_manager.broadcast_to_campaign(
            campaign_id,
            {
                "type": "combat",
                "action": "initiative_rolled",
                "data": {
                    "combat_id": combat_id,
                    "entity_id": entity_id,
                    "entity_type": entity_type,
                    "initiative": initiative_value,
                    "roll_result": result
                },
                "timestamp": datetime.utcnow().isoformat()
            }
        )

    except Exception as e:
        logger.error(f"Erro na rolagem de iniciativa: {e}")


async def _handle_next_turn(
        combat_id: str,
        campaign_id: str,
        websocket_manager: WebSocketManager,
        database: AsyncIOMotorDatabase
) -> None:
    """Avança para o próximo turno no combate."""
    try:
        if not combat_id or not IdHandler.is_valid(combat_id):
            return

        combat_object_id = IdHandler.to_object_id(combat_id)
        combat = await database.combats.find_one({"_id": combat_object_id})

        if not combat or combat.get("status") != "active":
            return

        current_turn = combat.get("current_turn", 0)
        initiative_order = combat.get("initiative_order", [])
        current_round = combat.get("round", 1)

        # Calcular próximo turno
        next_turn = current_turn + 1
        if next_turn >= len(initiative_order):
            next_turn = 0
            current_round += 1

        # Atualizar combate
        await database.combats.update_one(
            {"_id": combat_object_id},
            {"$set": {
                "current_turn": next_turn,
                "round": current_round,
                "updated_at": datetime.utcnow()
            }}
        )

        # Notificar mudança de turno
        current_entity = None
        if initiative_order and next_turn < len(initiative_order):
            current_entity = initiative_order[next_turn]

        await websocket_manager.broadcast_to_campaign(
            campaign_id,
            {
                "type": "combat",
                "action": "turn_changed",
                "data": {
                    "combat_id": combat_id,
                    "current_turn": next_turn,
                    "current_round": current_round,
                    "current_entity": current_entity
                },
                "timestamp": datetime.utcnow().isoformat()
            }
        )

    except Exception as e:
        logger.error(f"Erro ao avançar turno: {e}")


async def _handle_add_condition(
        combat_id: str,
        condition_data: Dict[str, Any],
        campaign_id: str,
        websocket_manager: WebSocketManager,
        database: AsyncIOMotorDatabase
) -> None:
    """Adiciona condição a uma entidade no combate."""
    try:
        if not combat_id or not IdHandler.is_valid(combat_id):
            return

        entity_id = condition_data.get("entity_id")
        condition_name = condition_data.get("condition")
        duration = condition_data.get("duration", -1)  # -1 = permanente

        if not entity_id or not condition_name:
            return

        combat_object_id = IdHandler.to_object_id(combat_id)
        condition_key = f"conditions.{entity_id}.{condition_name}"

        condition_effect = {
            "name": condition_name,
            "duration": duration,
            "applied_at": datetime.utcnow(),
            "description": condition_data.get("description", "")
        }

        await database.combats.update_one(
            {"_id": combat_object_id},
            {"$set": {condition_key: condition_effect}}
        )

        # Notificar adição de condição
        await websocket_manager.broadcast_to_campaign(
            campaign_id,
            {
                "type": "combat",
                "action": "condition_added",
                "data": {
                    "combat_id": combat_id,
                    "entity_id": entity_id,
                    "condition": condition_effect
                },
                "timestamp": datetime.utcnow().isoformat()
            }
        )

    except Exception as e:
        logger.error(f"Erro ao adicionar condição: {e}")


async def _handle_remove_condition(
        combat_id: str,
        condition_data: Dict[str, Any],
        campaign_id: str,
        websocket_manager: WebSocketManager,
        database: AsyncIOMotorDatabase
) -> None:
    """Remove condição de uma entidade no combate."""
    try:
        if not combat_id or not IdHandler.is_valid(combat_id):
            return

        entity_id = condition_data.get("entity_id")
        condition_name = condition_data.get("condition")

        if not entity_id or not condition_name:
            return

        combat_object_id = IdHandler.to_object_id(combat_id)
        condition_key = f"conditions.{entity_id}.{condition_name}"

        await database.combats.update_one(
            {"_id": combat_object_id},
            {"$unset": {condition_key: ""}}
        )

        # Notificar remoção de condição
        await websocket_manager.broadcast_to_campaign(
            campaign_id,
            {
                "type": "combat",
                "action": "condition_removed",
                "data": {
                    "combat_id": combat_id,
                    "entity_id": entity_id,
                    "condition": condition_name
                },
                "timestamp": datetime.utcnow().isoformat()
            }
        )

    except Exception as e:
        logger.error(f"Erro ao remover condição: {e}")


async def _handle_combat_end(
        combat_id: str,
        campaign_id: str,
        websocket_manager: WebSocketManager,
        database: AsyncIOMotorDatabase
) -> None:
    """Finaliza o combate."""
    try:
        if not combat_id or not IdHandler.is_valid(combat_id):
            return

        combat_object_id = IdHandler.to_object_id(combat_id)

        await database.combats.update_one(
            {"_id": combat_object_id},
            {"$set": {
                "status": "ended",
                "ended_at": datetime.utcnow()
            }}
        )

        # Notificar fim do combate
        await websocket_manager.broadcast_to_campaign(
            campaign_id,
            {
                "type": "combat",
                "action": "ended",
                "data": {"combat_id": combat_id},
                "timestamp": datetime.utcnow().isoformat()
            }
        )

        logger.info(f"Combate finalizado: {combat_id}")

    except Exception as e:
        logger.error(f"Erro ao finalizar combate: {e}")


# ===============================
# LOCK EVENTS
# ===============================

async def handle_lock_event(
        event_data: Dict[str, Any],
        campaign_id: str,
        websocket_manager: WebSocketManager,
        lock_manager: LockManager,
        database: AsyncIOMotorDatabase
) -> None:
    """
    Gerencia eventos relacionados a locks de recursos.

    Actions suportadas:
    - acquire: Adquire lock
    - release: Libera lock
    - heartbeat: Mantém lock ativo
    - status: Verifica status do lock
    """
    try:
        action = event_data.get("action")
        resource_id = event_data.get("resource_id")
        resource_type = event_data.get("resource_type", "character")
        user_id = event_data.get("user_id")
        duration = event_data.get("duration", 300)  # 5 minutos padrão

        if not resource_id or not user_id:
            logger.warning("Lock event sem resource_id ou user_id")
            return

        if action == "acquire":
            success = await lock_manager.acquire_lock(
                resource_id, user_id, resource_type, duration
            )

            # Notificar resultado
            await websocket_manager.broadcast_to_campaign(
                campaign_id,
                {
                    "type": "lock",
                    "action": "acquired" if success else "failed",
                    "data": {
                        "resource_id": resource_id,
                        "resource_type": resource_type,
                        "user_id": user_id if success else None
                    },
                    "timestamp": datetime.utcnow().isoformat()
                }
            )

        elif action == "release":
            success = await lock_manager.release_lock(resource_id, user_id)

            if success:
                await websocket_manager.broadcast_to_campaign(
                    campaign_id,
                    {
                        "type": "lock",
                        "action": "released",
                        "data": {
                            "resource_id": resource_id,
                            "resource_type": resource_type
                        },
                        "timestamp": datetime.utcnow().isoformat()
                    }
                )

        elif action == "heartbeat":
            success = await lock_manager.extend_lock(resource_id, user_id, duration)

            if not success:
                # Lock expirou ou não existe
                await websocket_manager.send_to_user(
                    user_id,
                    {
                        "type": "lock",
                        "action": "expired",
                        "data": {
                            "resource_id": resource_id,
                            "resource_type": resource_type
                        },
                        "timestamp": datetime.utcnow().isoformat()
                    }
                )

        elif action == "status":
            lock_info = await lock_manager.get_lock_info(resource_id)

            await websocket_manager.send_to_user(
                user_id,
                {
                    "type": "lock",
                    "action": "status",
                    "data": {
                        "resource_id": resource_id,
                        "lock_info": lock_info
                    },
                    "timestamp": datetime.utcnow().isoformat()
                }
            )

    except Exception as e:
        logger.error(f"Erro no evento de lock: {e}")


# ===============================
# IMAGE EVENTS
# ===============================

async def handle_image_event(
        event_data: Dict[str, Any],
        campaign_id: str,
        websocket_manager: WebSocketManager,
        database: AsyncIOMotorDatabase
) -> None:
    """
    Gerencia eventos relacionados a imagens/mapas.

    Actions suportadas:
    - share: Compartilha imagem
    - hide: Esconde imagem
    - reveal: Revela área do mapa
    - move_token: Move token no mapa
    """
    try:
        action = event_data.get("action")
        image_id = event_data.get("image_id")
        data = event_data.get("data", {})

        if not image_id:
            logger.warning("Image event sem image_id")
            return

        if action == "share":
            # Compartilhar imagem com a campanha
            await websocket_manager.broadcast_to_campaign(
                campaign_id,
                {
                    "type": "image",
                    "action": "shared",
                    "data": {
                        "image_id": image_id,
                        "url": data.get("url"),
                        "name": data.get("name"),
                        "is_map": data.get("is_map", False),
                        "grid_size": data.get("grid_size"),
                        "shared_at": datetime.utcnow().isoformat()
                    }
                }
            )

        elif action == "hide":
            # Esconder imagem
            await websocket_manager.broadcast_to_campaign(
                campaign_id,
                {
                    "type": "image",
                    "action": "hidden",
                    "data": {"image_id": image_id}
                }
            )

        elif action == "reveal":
            # Revelar área do mapa (fog of war)
            await websocket_manager.broadcast_to_campaign(
                campaign_id,
                {
                    "type": "image",
                    "action": "area_revealed",
                    "data": {
                        "image_id": image_id,
                        "revealed_area": data.get("area"),
                        "coordinates": data.get("coordinates")
                    }
                }
            )

        elif action == "move_token":
            # Mover token no mapa
            await websocket_manager.broadcast_to_campaign(
                campaign_id,
                {
                    "type": "image",
                    "action": "token_moved",
                    "data": {
                        "image_id": image_id,
                        "token_id": data.get("token_id"),
                        "character_id": data.get("character_id"),
                        "position": data.get("position"),
                        "moved_at": datetime.utcnow().isoformat()
                    }
                }
            )

    except Exception as e:
        logger.error(f"Erro no evento de imagem: {e}")


# ===============================
# SPELL EVENTS
# ===============================

async def handle_spell_event(
        event_data: Dict[str, Any],
        campaign_id: str,
        websocket_manager: WebSocketManager,
        database: AsyncIOMotorDatabase
) -> None:
    """
    Gerencia eventos relacionados a magias.

    Actions suportadas:
    - prepare: Prepara magia
    - cast: Conjura magia
    - reset_slots: Reseta slots de magia
    """
    try:
        action = event_data.get("action")
        character_id = event_data.get("character_id")
        data = event_data.get("data", {})

        if not character_id or not IdHandler.is_valid(character_id):
            logger.warning("Spell event sem character_id válido")
            return

        # Verificar se personagem existe
        character_filter = IdHandler.create_query_filter(character_id, "_id")
        character = await database.characters.find_one(character_filter)

        if not character:
            logger.warning(f"Personagem não encontrado para spell event: {character_id}")
            return

        if action == "prepare":
            # Preparar magia
            spell_id = data.get("spell_id")
            spell_level = data.get("spell_level", 1)

            # Atualizar personagem com magia preparada
            await database.characters.update_one(
                character_filter,
                {
                    "$addToSet": {
                        f"spells.prepared.level_{spell_level}": spell_id
                    },
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )

            await websocket_manager.broadcast_to_campaign(
                campaign_id,
                {
                    "type": "spell",
                    "action": "prepared",
                    "data": {
                        "character_id": character_id,
                        "spell_id": spell_id,
                        "spell_level": spell_level
                    }
                }
            )

        elif action == "cast":
            # Conjurar magia
            spell_id = data.get("spell_id")
            spell_level = data.get("spell_level", 1)
            target_ids = data.get("target_ids", [])

            # Decrementar slot de magia
            await database.characters.update_one(
                character_filter,
                {
                    "$inc": {f"spells.slots.level_{spell_level}.used": 1},
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )

            await websocket_manager.broadcast_to_campaign(
                campaign_id,
                {
                    "type": "spell",
                    "action": "cast",
                    "data": {
                        "character_id": character_id,
                        "spell_id": spell_id,
                        "spell_level": spell_level,
                        "target_ids": target_ids,
                        "cast_at": datetime.utcnow().isoformat()
                    }
                }
            )

        elif action == "reset_slots":
            # Resetar slots de magia (descanso longo)
            reset_type = data.get("type", "long_rest")  # long_rest ou short_rest

            if reset_type == "long_rest":
                # Resetar todos os slots
                update_doc = {}
                for level in range(1, 10):  # Níveis 1-9
                    update_doc[f"spells.slots.level_{level}.used"] = 0

                await database.characters.update_one(
                    character_filter,
                    {
                        "$set": {
                            **update_doc,
                            "updated_at": datetime.utcnow()
                        }
                    }
                )

                await websocket_manager.broadcast_to_campaign(
                    campaign_id,
                    {
                        "type": "spell",
                        "action": "slots_reset",
                        "data": {
                            "character_id": character_id,
                            "reset_type": reset_type
                        }
                    }
                )

    except Exception as e:
        logger.error(f"Erro no evento de magia: {e}")


# ===============================
# ROLL EVENTS
# ===============================

async def handle_roll_event(
        event_data: Dict[str, Any],
        campaign_id: str,
        websocket_manager: WebSocketManager,
        database: AsyncIOMotorDatabase
) -> None:
    """
    Gerencia eventos de rolagem de dados.

    Actions suportadas:
    - ability: Teste de habilidade
    - skill: Teste de perícia
    - saving_throw: Teste de resistência
    - attack: Rolagem de ataque
    - damage: Rolagem de dano
    - initiative: Rolagem de iniciativa
    - custom: Rolagem customizada
    """
    try:
        action = event_data.get("action")
        formula = event_data.get("formula", "1d20")
        modifier = event_data.get("modifier", 0)
        advantage = event_data.get("advantage")
        disadvantage = event_data.get("disadvantage")
        character_id = event_data.get("character_id")
        npc_id = event_data.get("npc_id")

        # Ajustar fórmula com modificador
        if modifier != 0:
            sign = "+" if modifier >= 0 else ""
            formula = f"{formula}{sign}{modifier}"

        # Executar rolagem
        if advantage:
            result = roll_with_advantage(formula)
        elif disadvantage:
            result = roll_with_disadvantage(formula)
        else:
            result = roll_dice(formula)

        # Adicionar contexto
        result.update({
            "action": action,
            "character_id": character_id,
            "npc_id": npc_id,
            "timestamp": datetime.utcnow().isoformat()
        })

        # Broadcast resultado
        await websocket_manager.broadcast_to_campaign(
            campaign_id,
            {
                "type": "roll",
                "action": "result",
                "data": result
            }
        )

        logger.info(f"Rolagem processada: {action} = {result.get('total')}")

    except Exception as e:
        logger.error(f"Erro no evento de rolagem: {e}")


# ===============================
# SYSTEM EVENTS
# ===============================

async def handle_system_event(
        event_data: Dict[str, Any],
        campaign_id: str,
        websocket_manager: WebSocketManager
) -> None:
    """
    Gerencia eventos do sistema.

    Actions suportadas:
    - connected: Usuário conectado
    - disconnected: Usuário desconectado
    - error: Erro do sistema
    - notification: Notificação geral
    """
    try:
        action = event_data.get("action")
        message = event_data.get("message", "")
        details = event_data.get("details", {})

        # Broadcast evento do sistema
        await websocket_manager.broadcast_to_campaign(
            campaign_id,
            {
                "type": "system",
                "action": action,
                "message": message,
                "details": details,
                "timestamp": datetime.utcnow().isoformat()
            }
        )

    except Exception as e:
        logger.error(f"Erro no evento do sistema: {e}")