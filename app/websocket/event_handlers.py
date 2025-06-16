# ===== 1. CORREÇÃO DO EVENT_HANDLERS.PY =====

# app/websocket/event_handlers.py
"""
Event handlers para WebSocket - CORRIGIDO
Problemas resolvidos:
1. ✅ Import de dice_service corrigido
2. ✅ Linha cortada completada
3. ✅ Funções incompletas implementadas
"""

from datetime import datetime
import logging
import random
import re
from typing import Dict, List, Any, Optional
from fastapi import WebSocket
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from app.websocket.connection_manager import ConnectionManager
from app.websocket.lock_manager import LockManager
# CORREÇÃO: Import corrigido - dice_service está em services.__init__.py como função
from app.services import roll_dice, roll_with_advantage, roll_with_disadvantage, roll_damage
from app.utils.id_handler import IdHandler

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
    CORREÇÃO: Função completamente implementada.
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

    try:
        # Converter IDs para ObjectId
        character_object_id = IdHandler.to_object_id(character_id)
        campaign_object_id = IdHandler.to_object_id(campaign_id)
        user_object_id = IdHandler.to_object_id(user_id)
        
        # Verificar se o personagem existe e se o usuário tem acesso
        character = await db.characters.find_one({"_id": character_object_id})
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
        is_owner = str(character["owner_id"]) == str(user_object_id)
        campaign = await db.campaigns.find_one({"_id": campaign_object_id})
        is_dm = campaign and str(campaign.get("owner_id")) == str(user_object_id)

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
            # Para atualizar, verificar se não está bloqueado por outro usuário
            if await lock_manager.is_locked_by_other(character_id, "character", user_id):
                # CORREÇÃO: Linha que estava cortada agora está completa
                locker_id = await lock_manager.get_lock_owner(character_id, "character")
                await connection_manager.send_personal_message(
                    {
                        "type": "error",
                        "message": f"Personagem está sendo editado por outro usuário: {locker_id}"
                    },
                    user_id,
                    campaign_id
                )
                return

            # Processar atualizações
            updates = data.get("updates", {})
            if updates:
                # Atualizar no banco
                await db.characters.update_one(
                    {"_id": character_object_id},
                    {"$set": {**updates, "updated_at": datetime.utcnow()}}
                )

                # Notificar outros usuários
                await connection_manager.broadcast_to_campaign(
                    campaign_id,
                    {
                        "type": "character_updated",
                        "data": {
                            "character_id": character_id,
                            "updates": updates,
                            "updated_by": user_id
                        }
                    },
                    exclude_user=user_id
                )

        elif action == "get_status":
            # Retornar status do personagem
            await connection_manager.send_personal_message(
                {
                    "type": "character_status",
                    "data": {
                        "character_id": character_id,
                        "hit_points": character.get("hit_points", {}),
                        "conditions": character.get("conditions", []),
                        "initiative": character.get("initiative")
                    }
                },
                user_id,
                campaign_id
            )

        logger.info(f"Character event processed: {action} for {character_id} by {user_id}")

    except Exception as e:
        logger.error(f"Error handling character event: {e}")
        await connection_manager.send_personal_message(
            {
                "type": "error",
                "message": "Erro interno ao processar evento de personagem"
            },
            user_id,
            campaign_id
        )


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
    CORREÇÃO: Função completamente implementada.
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

    try:
        campaign_object_id = IdHandler.to_object_id(campaign_id)
        user_object_id = IdHandler.to_object_id(user_id)

        # Verificar se o usuário é DM
        campaign = await db.campaigns.find_one({"_id": campaign_object_id})
        is_dm = campaign and str(campaign.get("owner_id")) == str(user_object_id)

        if action == "start_combat":
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

            # Criar novo combate
            combat_data = {
                "campaign_id": campaign_object_id,
                "status": "active",
                "round": 1,
                "turn": 0,
                "participants": data.get("participants", []),
                "started_at": datetime.utcnow(),
                "started_by": user_object_id
            }

            result = await db.combats.insert_one(combat_data)
            combat_id = str(result.inserted_id)

            # Atualizar campanha
            await db.campaigns.update_one(
                {"_id": campaign_object_id},
                {"$set": {"active_combat": result.inserted_id}}
            )

            # Notificar todos
            await connection_manager.broadcast_to_campaign(
                campaign_id,
                {
                    "type": "combat_started",
                    "data": {
                        "combat_id": combat_id,
                        "participants": combat_data["participants"],
                        "started_by": user_id
                    }
                }
            )

        elif action == "end_combat":
            if not is_dm:
                await connection_manager.send_personal_message(
                    {
                        "type": "error",
                        "message": "Apenas o Mestre pode encerrar combate"
                    },
                    user_id,
                    campaign_id
                )
                return

            # Buscar combate ativo
            active_combat = await db.combats.find_one({
                "campaign_id": campaign_object_id,
                "status": "active"
            })

            if not active_combat:
                await connection_manager.send_personal_message(
                    {
                        "type": "error",
                        "message": "Não há combate ativo"
                    },
                    user_id,
                    campaign_id
                )
                return

            # Encerrar combate
            await db.combats.update_one(
                {"_id": active_combat["_id"]},
                {
                    "$set": {
                        "status": "completed",
                        "ended_at": datetime.utcnow(),
                        "ended_by": user_object_id
                    }
                }
            )

            # Remover da campanha
            await db.campaigns.update_one(
                {"_id": campaign_object_id},
                {"$unset": {"active_combat": ""}}
            )

            # Notificar todos
            await connection_manager.broadcast_to_campaign(
                campaign_id,
                {
                    "type": "combat_ended",
                    "data": {
                        "combat_id": str(active_combat["_id"]),
                        "ended_by": user_id
                    }
                }
            )

        logger.info(f"Combat event processed: {action} by {user_id}")

    except Exception as e:
        logger.error(f"Error handling combat event: {e}")
        await connection_manager.send_personal_message(
            {
                "type": "error",
                "message": "Erro interno ao processar evento de combate"
            },
            user_id,
            campaign_id
        )


async def handle_dice_event(
        data: Dict[str, Any],
        campaign_id: str,
        user_id: str,
        connection_manager: ConnectionManager,
        lock_manager: LockManager,
        db: AsyncIOMotorDatabase
) -> None:
    """
    Gerencia eventos relacionados a rolagem de dados.
    CORREÇÃO: Usa as funções importadas corretamente.
    """
    try:
        formula = data.get("formula", "1d20")
        description = data.get("description", "Rolagem de dados")
        advantage = data.get("advantage", False)
        disadvantage = data.get("disadvantage", False)

        # Usar as funções importadas corretamente
        if advantage and not disadvantage:
            result = roll_with_advantage(formula)
        elif disadvantage and not advantage:
            result = roll_with_disadvantage(formula)
        else:
            result = roll_dice(formula)

        # Salvar no histórico
        roll_record = {
            "campaign_id": IdHandler.to_object_id(campaign_id),
            "user_id": IdHandler.to_object_id(user_id),
            "formula": formula,
            "result": result,
            "description": description,
            "advantage": advantage,
            "disadvantage": disadvantage,
            "timestamp": datetime.utcnow()
        }

        await db.dice_rolls.insert_one(roll_record)

        # Broadcast do resultado
        await connection_manager.broadcast_to_campaign(
            campaign_id,
            {
                "type": "dice_rolled",
                "data": {
                    "user_id": user_id,
                    "formula": formula,
                    "result": result,
                    "description": description,
                    "advantage": advantage,
                    "disadvantage": disadvantage
                }
            }
        )

        logger.info(f"Dice rolled: {formula} = {result} by {user_id}")

    except Exception as e:
        logger.error(f"Error handling dice event: {e}")
        await connection_manager.send_personal_message(
            {
                "type": "error", 
                "message": "Erro ao rolar dados"
            },
            user_id,
            campaign_id
        )


async def handle_lock_event(
        data: Dict[str, Any],
        campaign_id: str,
        user_id: str,
        websocket: WebSocket,
        connection_manager: ConnectionManager,
        lock_manager: LockManager
) -> None:
    """
    Gerencia eventos relacionados a locks.
    CORREÇÃO: Função completamente implementada.
    """
    action = data.get("action")

    if not action:
        await websocket.send_json({
            "type": "error",
            "message": "Ação de lock não especificada"
        })
        return

    try:
        if action == "acquire":
            resource_id = data.get("resource_id")
            resource_type = data.get("resource_type")

            if not resource_id or not resource_type:
                await websocket.send_json({
                    "type": "error",
                    "message": "ID ou tipo de recurso não especificado"
                })
                return

            duration = data.get("duration", 300)  # 5 minutos por padrão

            # Tentar adquirir lock
            success = await lock_manager.acquire_lock(
                resource_id=resource_id,
                resource_type=resource_type,
                user_id=user_id,
                duration_seconds=duration
            )

            if success:
                # Notificar todos sobre o lock
                await connection_manager.broadcast_to_campaign(
                    campaign_id,
                    {
                        "type": "resource_locked",
                        "data": {
                            "resource_id": resource_id,
                            "resource_type": resource_type,
                            "locked_by": user_id
                        }
                    },
                    exclude_user=user_id
                )

                # Confirmar para o solicitante
                await websocket.send_json({
                    "type": "lock_acquired",
                    "data": {
                        "resource_id": resource_id,
                        "resource_type": resource_type
                    }
                })
            else:
                await websocket.send_json({
                    "type": "lock_failed",
                    "data": {
                        "resource_id": resource_id,
                        "resource_type": resource_type,
                        "message": "Recurso já está bloqueado"
                    }
                })

        elif action == "release":
            resource_id = data.get("resource_id")
            resource_type = data.get("resource_type")

            if not resource_id or not resource_type:
                await websocket.send_json({
                    "type": "error",
                    "message": "ID ou tipo de recurso não especificado"
                })
                return

            # Liberar lock
            success = await lock_manager.release_lock(
                resource_id=resource_id,
                resource_type=resource_type,
                user_id=user_id
            )

            if success:
                # Notificar todos sobre a liberação
                await connection_manager.broadcast_to_campaign(
                    campaign_id,
                    {
                        "type": "resource_unlocked",
                        "data": {
                            "resource_id": resource_id,
                            "resource_type": resource_type
                        }
                    }
                )

                # Confirmar para o solicitante
                await websocket.send_json({
                    "type": "lock_released",
                    "data": {
                        "resource_id": resource_id,
                        "resource_type": resource_type
                    }
                })

        logger.info(f"Lock event processed: {action} for {data.get('resource_type')}:{data.get('resource_id')} by {user_id}")

    except Exception as e:
        logger.error(f"Error handling lock event: {e}")
        await websocket.send_json({
            "type": "error",
            "message": "Erro interno ao processar evento de lock"
        })


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
    CORREÇÃO: Função completamente implementada.
    """
    try:
        spell_id = data.get("spell_id")
        caster_id = data.get("caster_id")
        spell_level = data.get("spell_level", 1)
        targets = data.get("targets", [])

        if not spell_id or not caster_id:
            await connection_manager.send_personal_message(
                {
                    "type": "error",
                    "message": "Dados de magia incompletos"
                },
                user_id,
                campaign_id
            )
            return

        # Buscar a magia
        spell = await db.spells.find_one({"_id": IdHandler.to_object_id(spell_id)})
        if not spell:
            await connection_manager.send_personal_message(
                {
                    "type": "error",
                    "message": "Magia não encontrada"
                },
                user_id,
                campaign_id
            )
            return

        # Buscar o conjurador
        caster = await db.characters.find_one({"_id": IdHandler.to_object_id(caster_id)})
        if not caster:
            # Tentar buscar em NPCs
            caster = await db.npcs.find_one({"_id": IdHandler.to_object_id(caster_id)})

        if not caster:
            await connection_manager.send_personal_message(
                {
                    "type": "error",
                    "message": "Conjurador não encontrado"
                },
                user_id,
                campaign_id
            )
            return

        # Verificar slots de magia se necessário
        spell_slots = caster.get("spell_slots", {})
        level_key = f"level_{spell_level}"
        
        if level_key in spell_slots and spell_slots[level_key].get("current", 0) > 0:
            # Consumir slot
            await db.characters.update_one(
                {"_id": IdHandler.to_object_id(caster_id)},
                {"$inc": {f"spell_slots.{level_key}.current": -1}}
            )

        # Registrar uso da magia
        spell_cast = {
            "campaign_id": IdHandler.to_object_id(campaign_id),
            "spell_id": IdHandler.to_object_id(spell_id),
            "caster_id": IdHandler.to_object_id(caster_id),
            "spell_level": spell_level,
            "targets": [IdHandler.to_object_id(t) for t in targets],
            "cast_at": datetime.utcnow(),
            "cast_by_user": IdHandler.to_object_id(user_id)
        }

        await db.spell_casts.insert_one(spell_cast)

        # Notificar todos
        await connection_manager.broadcast_to_campaign(
            campaign_id,
            {
                "type": "spell_cast",
                "data": {
                    "spell_name": spell.get("name"),
                    "caster_id": caster_id,
                    "caster_name": caster.get("name"),
                    "spell_level": spell_level,
                    "targets": targets
                }
            }
        )

        logger.info(f"Spell cast: {spell.get('name')} by {caster_id}")

    except Exception as e:
        logger.error(f"Error handling spell event: {e}")
        await connection_manager.send_personal_message(
            {
                "type": "error",
                "message": "Erro ao processar magia"
            },
            user_id,
            campaign_id
        )


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
    CORREÇÃO: Função completamente implementada.
    """
    try:
        action = data.get("action")
        
        if action == "share":
            image_url = data.get("image_url")
            image_name = data.get("image_name", "Imagem compartilhada")
            
            if not image_url:
                await connection_manager.send_personal_message(
                    {
                        "type": "error",
                        "message": "URL da imagem não fornecida"
                    },
                    user_id,
                    campaign_id
                )
                return

            # Salvar referência da imagem
            image_record = {
                "campaign_id": IdHandler.to_object_id(campaign_id),
                "shared_by": IdHandler.to_object_id(user_id),
                "image_url": image_url,
                "image_name": image_name,
                "shared_at": datetime.utcnow()
            }

            await db.shared_images.insert_one(image_record)

            # Compartilhar com todos
            await connection_manager.broadcast_to_campaign(
                campaign_id,
                {
                    "type": "image_shared",
                    "data": {
                        "image_url": image_url,
                        "image_name": image_name,
                        "shared_by": user_id
                    }
                }
            )

        elif action == "hide":
            # Ocultar imagem para todos
            await connection_manager.broadcast_to_campaign(
                campaign_id,
                {
                    "type": "image_hidden",
                    "data": {
                        "hidden_by": user_id
                    }
                }
            )

        logger.info(f"Image event processed: {action} by {user_id}")

    except Exception as e:
        logger.error(f"Error handling image event: {e}")
        await connection_manager.send_personal_message(
            {
                "type": "error",
                "message": "Erro ao processar evento de imagem"
            },
            user_id,
            campaign_id
        )


async def handle_chat_event(
        data: Dict[str, Any],
        campaign_id: str,
        user_id: str,
        connection_manager: ConnectionManager,
        lock_manager: LockManager,
        db: AsyncIOMotorDatabase
) -> None:
    """Gerencia mensagens de chat."""
    try:
        message = data.get("message")
        message_type = data.get("type", "ooc")  # ooc, ic, whisper

        if not message:
            return

        # Salvar mensagem
        chat_record = {
            "campaign_id": IdHandler.to_object_id(campaign_id),
            "user_id": IdHandler.to_object_id(user_id),
            "message": message,
            "type": message_type,
            "timestamp": datetime.utcnow()
        }

        await db.chat_messages.insert_one(chat_record)

        # Broadcast da mensagem
        await connection_manager.broadcast_to_campaign(
            campaign_id,
            {
                "type": "chat_message",
                "data": {
                    "user_id": user_id,
                    "message": message,
                    "message_type": message_type,
                    "timestamp": chat_record["timestamp"].isoformat()
                }
            }
        )

    except Exception as e:
        logger.error(f"Error handling chat event: {e}")


async def handle_initiative_event(
        data: Dict[str, Any],
        campaign_id: str,
        user_id: str,
        connection_manager: ConnectionManager,
        lock_manager: LockManager,
        db: AsyncIOMotorDatabase
) -> None:
    """Gerencia rolagem de iniciativa."""
    try:
        actor_id = data.get("actor_id")
        modifier = data.get("modifier", 0)
        advantage = data.get("advantage", False)
        disadvantage = data.get("disadvantage", False)

        # Rolar iniciativa
        if advantage and not disadvantage:
            roll = max(random.randint(1, 20), random.randint(1, 20))
        elif disadvantage and not advantage:
            roll = min(random.randint(1, 20), random.randint(1, 20))
        else:
            roll = random.randint(1, 20)

        initiative = roll + modifier

        # Atualizar iniciativa
        await db.characters.update_one(
            {"_id": IdHandler.to_object_id(actor_id)},
            {"$set": {"initiative": initiative}}
        )

        # Broadcast do resultado
        await connection_manager.broadcast_to_campaign(
            campaign_id,
            {
                "type": "initiative_rolled",
                "data": {
                    "actor_id": actor_id,
                    "initiative": initiative,
                    "roll": roll,
                    "modifier": modifier
                }
            }
        )

    except Exception as e:
        logger.error(f"Error handling initiative event: {e}")


async def handle_ping_event(
        data: Dict[str, Any],
        campaign_id: str,
        user_id: str,
        connection_manager: ConnectionManager,
        lock_manager: LockManager,
        db: AsyncIOMotorDatabase
) -> None:
    """Responde a ping para manter conexão."""
    await connection_manager.send_personal_message(
        {
            "type": "pong",
            "data": {"timestamp": data.get("timestamp")}
        },
        user_id,
        campaign_id
    )


# ===== 2. CONNECTION_MANAGER - VERIFICAÇÃO =====
# Baseado na análise, o connection_manager parece estar correto, mas vou criar
# uma versão com melhorias se necessário

# ===== 3. LOCK_MANAGER - VERIFICAÇÃO =====  
# O lock_manager também parece correto, mas vou garantir que os métodos
# usados pelos event_handlers existem

# Funções auxiliares para o LockManager que podem estar faltando:

async def get_lock_owner(lock_manager, resource_id: str, resource_type: str) -> Optional[str]:
    """Obtém o proprietário de um lock."""
    try:
        lock_doc = await lock_manager.locks_collection.find_one({
            "resource_id": resource_id,
            "resource_type": resource_type,
            "is_active": True,
            "expires_at": {"$gt": datetime.utcnow()}
        })
        return lock_doc.get("user_id") if lock_doc else None
    except Exception:
        return None


async def is_locked_by_other(lock_manager, resource_id: str, resource_type: str, user_id: str) -> bool:
    """Verifica se um recurso está bloqueado por outro usuário."""
    try:
        lock_doc = await lock_manager.locks_collection.find_one({
            "resource_id": resource_id,
            "resource_type": resource_type,
            "is_active": True,
            "expires_at": {"$gt": datetime.utcnow()}
        })
        
        if not lock_doc:
            return False
            
        return str(lock_doc.get("user_id")) != str(user_id)
    except Exception:
        return False


# Adicionar esses métodos ao LockManager se não existirem
def extend_lock_manager():
    """Estende o LockManager com métodos que podem estar faltando."""
    
    # Adicionar get_lock_owner se não existir
    if not hasattr(LockManager, 'get_lock_owner'):
        async def get_lock_owner_method(self, resource_id: str, resource_type: str) -> Optional[str]:
            return await get_lock_owner(self, resource_id, resource_type)
        
        LockManager.get_lock_owner = get_lock_owner_method
    
    # Adicionar is_locked_by_other se não existir  
    if not hasattr(LockManager, 'is_locked_by_other'):
        async def is_locked_by_other_method(self, resource_id: str, resource_type: str, user_id: str) -> bool:
            return await is_locked_by_other(self, resource_id, resource_type, user_id)
        
        LockManager.is_locked_by_other = is_locked_by_other_method

# Executar extensão
extend_lock_manager()