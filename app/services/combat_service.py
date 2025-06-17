# app/services/combat_service.py
"""
Combat Service - COMPLETO
Serviço para gerenciamento de combates D&D.
"""

import logging
from datetime import datetime
from typing import List, Dict, Optional, Any, Tuple
from bson import ObjectId
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.schemas.combat import (
    CombatCreateSchema, CombatUpdateSchema, InitiativeEntrySchema,
    CombatEventSchema, AddParticipantSchema, UpdateParticipantSchema,
    ActionSchema, CombatActionResultSchema, ConditionEffectSchema
)
from app.utils.id_handler import IdHandler
from app.services import roll_dice, roll_with_advantage, roll_with_disadvantage

logger = logging.getLogger(__name__)


class CombatService:
    """
    Serviço para gerenciar operações relacionadas a combates.
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

    async def create_combat(self, combat_data: CombatCreateSchema, dm_id: str) -> Dict[str, Any]:
        """
        Cria um novo combate.

        Args:
            combat_data: Dados do combate
            dm_id: ID do DM

        Returns:
            Combate criado
        """
        try:
            # Verificar se o usuário é DM da campanha
            dm_object_id = IdHandler.to_object_id(dm_id)
            campaign_object_id = IdHandler.to_object_id(combat_data.campaign_id)

            if not dm_object_id or not campaign_object_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="IDs inválidos fornecidos"
                )

            campaign = await self.db.campaigns.find_one({"_id": campaign_object_id})
            if not campaign:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Campanha não encontrada"
                )

            if str(campaign.get("dm_id")) != str(dm_object_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Apenas o DM pode criar combates"
                )

            # Verificar se já existe combate ativo
            active_combat = await self.db.combats.find_one({
                "campaign_id": campaign_object_id,
                "status": {"$in": ["preparing", "active", "paused"]}
            })

            if active_combat:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Já existe um combate ativo nesta campanha"
                )

            # Preparar dados do combate
            now = datetime.utcnow()
            combat_dict = combat_data.dict(exclude={"participants", "auto_roll_initiative", "sort_initiative"},
                                           exclude_unset=True)

            # Adicionar campos de sistema
            combat_dict.update({
                "dm_id": dm_object_id,
                "campaign_id": campaign_object_id,
                "created_at": now,
                "updated_at": now,
                "started_at": None,
                "ended_at": None,
                "total_rounds": 0,
                "total_damage_dealt": 0,
                "total_healing_done": 0
            })

            # Converter encounter_id se fornecido
            if combat_data.encounter_id:
                encounter_object_id = IdHandler.to_object_id(combat_data.encounter_id)
                if encounter_object_id:
                    combat_dict["encounter_id"] = encounter_object_id

            # Processar participantes iniciais
            initiative_order = []
            if combat_data.participants:
                for participant_data in combat_data.participants:
                    await self._add_participant_to_initiative(
                        initiative_order, participant_data, combat_data.auto_roll_initiative
                    )

            # Ordenar por iniciativa se solicitado
            if combat_data.sort_initiative and initiative_order:
                initiative_order.sort(key=lambda x: x["initiative"], reverse=True)

            combat_dict["initiative_order"] = [entry.dict() for entry in initiative_order]

            # Inserir no banco
            result = await self.db.combats.insert_one(combat_dict)

            # Recuperar combate criado
            created_combat = await self.db.combats.find_one({"_id": result.inserted_id})

            formatted_combat = self._format_id(created_combat)
            logger.info(f"Combate criado: {formatted_combat['name']} por DM {dm_id}")

            return formatted_combat

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Erro ao criar combate: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno ao criar combate"
            )

    async def get_combat(self, combat_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Obtém um combate pelo ID.

        Args:
            combat_id: ID do combate
            user_id: ID do usuário solicitante

        Returns:
            Dados do combate ou None
        """
        try:
            combat_object_id = IdHandler.to_object_id(combat_id)
            if not combat_object_id:
                return None

            combat = await self.db.combats.find_one({"_id": combat_object_id})

            if not combat:
                return None

            # Verificar acesso à campanha
            await self._verify_campaign_access(combat, user_id)

            # Adicionar participante atual
            combat = self._add_current_participant(combat)

            formatted_combat = self._format_id(combat)
            return formatted_combat

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Erro ao obter combate: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno ao obter combate"
            )

    async def get_active_combat(self, campaign_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Obtém o combate ativo de uma campanha.

        Args:
            campaign_id: ID da campanha
            user_id: ID do usuário

        Returns:
            Combate ativo ou None
        """
        try:
            campaign_object_id = IdHandler.to_object_id(campaign_id)
            if not campaign_object_id:
                return None

            # Verificar acesso à campanha
            campaign = await self.db.campaigns.find_one({"_id": campaign_object_id})
            if not campaign:
                return None

            await self._verify_campaign_access_by_data(campaign, user_id)

            # Buscar combate ativo
            combat = await self.db.combats.find_one({
                "campaign_id": campaign_object_id,
                "status": {"$in": ["preparing", "active", "paused"]}
            })

            if not combat:
                return None

            # Adicionar participante atual
            combat = self._add_current_participant(combat)

            formatted_combat = self._format_id(combat)
            return formatted_combat

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Erro ao obter combate ativo: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno ao obter combate ativo"
            )

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
            user_id: ID do usuário (deve ser DM)
            updates: Dados de atualização

        Returns:
            Combate atualizado
        """
        try:
            combat_object_id = IdHandler.to_object_id(combat_id)
            if not combat_object_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="ID de combate inválido"
                )

            # Buscar combate
            combat = await self.db.combats.find_one({"_id": combat_object_id})
            if not combat:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Combate não encontrado"
                )

            # Verificar se é o DM
            await self._verify_dm_access(combat, user_id)

            # Preparar dados de atualização
            update_data = updates.dict(exclude_unset=True)

            if update_data:
                update_data["updated_at"] = datetime.utcnow()

                # Atualizar no banco
                await self.db.combats.update_one(
                    {"_id": combat_object_id},
                    {"$set": update_data}
                )

            # Recuperar combate atualizado
            updated_combat = await self.db.combats.find_one({"_id": combat_object_id})
            updated_combat = self._add_current_participant(updated_combat)

            formatted_combat = self._format_id(updated_combat)
            logger.info(f"Combate atualizado: {combat_id} por {user_id}")

            return formatted_combat

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Erro ao atualizar combate: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno ao atualizar combate"
            )

    async def start_combat(self, combat_id: str, user_id: str) -> Dict[str, Any]:
        """
        Inicia um combate.

        Args:
            combat_id: ID do combate
            user_id: ID do usuário (deve ser DM)

        Returns:
            Combate iniciado
        """
        try:
            combat_object_id = IdHandler.to_object_id(combat_id)
            combat = await self.db.combats.find_one({"_id": combat_object_id})

            if not combat:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Combate não encontrado"
                )

            # Verificar se é o DM
            await self._verify_dm_access(combat, user_id)

            # Verificar se pode ser iniciado
            if combat.get("status") not in ["preparing"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Combate não pode ser iniciado neste estado"
                )

            if not combat.get("initiative_order"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Não há participantes no combate"
                )

            # Atualizar status e iniciar
            now = datetime.utcnow()
            update_data = {
                "status": "active",
                "started_at": now,
                "updated_at": now,
                "current_round": 1,
                "current_turn": 0
            }

            # Adicionar evento de início
            start_event = CombatEventSchema(
                round_number=1,
                turn_number=0,
                event_type="combat_start",
                description=f"Combate '{combat.get('name')}' iniciado",
                details={"participant_count": len(combat.get("initiative_order", []))}
            )

            update_data["$push"] = {"events": start_event.dict()}

            await self.db.combats.update_one(
                {"_id": combat_object_id},
                {"$set": update_data}
            )

            # Recuperar combate atualizado
            updated_combat = await self.db.combats.find_one({"_id": combat_object_id})
            updated_combat = self._add_current_participant(updated_combat)

            formatted_combat = self._format_id(updated_combat)
            logger.info(f"Combate iniciado: {combat_id} por {user_id}")

            return formatted_combat

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Erro ao iniciar combate: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno ao iniciar combate"
            )

    async def end_combat(self, combat_id: str, user_id: str) -> Dict[str, Any]:
        """
        Finaliza um combate.

        Args:
            combat_id: ID do combate
            user_id: ID do usuário (deve ser DM)

        Returns:
            Combate finalizado
        """
        try:
            combat_object_id = IdHandler.to_object_id(combat_id)
            combat = await self.db.combats.find_one({"_id": combat_object_id})

            if not combat:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Combate não encontrado"
                )

            # Verificar se é o DM
            await self._verify_dm_access(combat, user_id)

            # Atualizar status
            now = datetime.utcnow()
            update_data = {
                "status": "completed",
                "ended_at": now,
                "updated_at": now,
                "total_rounds": combat.get("current_round", 1)
            }

            # Adicionar evento de fim
            end_event = CombatEventSchema(
                round_number=combat.get("current_round", 1),
                turn_number=combat.get("current_turn", 0),
                event_type="combat_end",
                description=f"Combate '{combat.get('name')}' finalizado",
                details={
                    "duration_rounds": combat.get("current_round", 1),
                    "total_events": len(combat.get("events", []))
                }
            )

            await self.db.combats.update_one(
                {"_id": combat_object_id},
                {
                    "$set": update_data,
                    "$push": {"events": end_event.dict()}
                }
            )

            # Recuperar combate atualizado
            updated_combat = await self.db.combats.find_one({"_id": combat_object_id})

            formatted_combat = self._format_id(updated_combat)
            logger.info(f"Combate finalizado: {combat_id} por {user_id}")

            return formatted_combat

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Erro ao finalizar combate: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno ao finalizar combate"
            )

    async def next_turn(self, combat_id: str, user_id: str) -> Dict[str, Any]:
        """
        Avança para o próximo turno.

        Args:
            combat_id: ID do combate
            user_id: ID do usuário (deve ser DM)

        Returns:
            Combate atualizado
        """
        try:
            combat_object_id = IdHandler.to_object_id(combat_id)
            combat = await self.db.combats.find_one({"_id": combat_object_id})

            if not combat:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Combate não encontrado"
                )

            # Verificar se é o DM
            await self._verify_dm_access(combat, user_id)

            if combat.get("status") != "active":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Combate não está ativo"
                )

            initiative_order = combat.get("initiative_order", [])
            if not initiative_order:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Não há participantes no combate"
                )

            current_turn = combat.get("current_turn", 0)
            current_round = combat.get("current_round", 1)

            # Avançar turno
            next_turn = current_turn + 1
            next_round = current_round

            # Se passou de todos os participantes, próximo round
            if next_turn >= len(initiative_order):
                next_turn = 0
                next_round += 1

            # Atualizar duração de condições
            updated_initiative = self._update_condition_durations(initiative_order, next_turn == 0)

            update_data = {
                "current_turn": next_turn,
                "current_round": next_round,
                "updated_at": datetime.utcnow(),
                "initiative_order": updated_initiative
            }

            # Adicionar evento
            events_to_add = []

            if next_turn == 0:
                # Novo round
                round_event = CombatEventSchema(
                    round_number=next_round,
                    turn_number=next_turn,
                    event_type="round_start",
                    description=f"Início do round {next_round}"
                )
                events_to_add.append(round_event.dict())

            # Turno do participante
            if next_turn < len(initiative_order):
                participant = initiative_order[next_turn]
                turn_event = CombatEventSchema(
                    round_number=next_round,
                    turn_number=next_turn,
                    event_type="turn_start",
                    actor_id=participant.get("participant_id"),
                    actor_name=participant.get("participant_name"),
                    description=f"Turno de {participant.get('participant_name')}"
                )
                events_to_add.append(turn_event.dict())

            if events_to_add:
                await self.db.combats.update_one(
                    {"_id": combat_object_id},
                    {
                        "$set": update_data,
                        "$push": {"events": {"$each": events_to_add}}
                    }
                )
            else:
                await self.db.combats.update_one(
                    {"_id": combat_object_id},
                    {"$set": update_data}
                )

            # Recuperar combate atualizado
            updated_combat = await self.db.combats.find_one({"_id": combat_object_id})
            updated_combat = self._add_current_participant(updated_combat)

            formatted_combat = self._format_id(updated_combat)
            logger.info(f"Próximo turno no combate {combat_id}: Round {next_round}, Turn {next_turn}")

            return formatted_combat

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Erro ao avançar turno: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno ao avançar turno"
            )

    async def add_participant(
            self,
            combat_id: str,
            user_id: str,
            participant_data: AddParticipantSchema
    ) -> Dict[str, Any]:
        """
        Adiciona participante ao combate.

        Args:
            combat_id: ID do combate
            user_id: ID do usuário (deve ser DM)
            participant_data: Dados do participante

        Returns:
            Combate atualizado
        """
        try:
            combat_object_id = IdHandler.to_object_id(combat_id)
            combat = await self.db.combats.find_one({"_id": combat_object_id})

            if not combat:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Combate não encontrado"
                )

            # Verificar se é o DM
            await self._verify_dm_access(combat, user_id)

            # Buscar dados do participante
            participant_info = await self._get_participant_info(
                participant_data.participant_id,
                participant_data.participant_type
            )

            if not participant_info:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Participante não encontrado"
                )

            # Criar entrada na iniciativa
            initiative_entry = await self._create_initiative_entry(
                participant_info,
                participant_data.participant_type,
                participant_data.initiative,
                participant_data.position_x,
                participant_data.position_y
            )

            # Adicionar à ordem de iniciativa
            initiative_order = combat.get("initiative_order", [])
            initiative_order.append(initiative_entry.dict())

            # Reordenar por iniciativa
            initiative_order.sort(key=lambda x: x["initiative"], reverse=True)

            await self.db.combats.update_one(
                {"_id": combat_object_id},
                {
                    "$set": {
                        "initiative_order": initiative_order,
                        "updated_at": datetime.utcnow()
                    }
                }
            )

            # Recuperar combate atualizado
            updated_combat = await self.db.combats.find_one({"_id": combat_object_id})
            updated_combat = self._add_current_participant(updated_combat)

            formatted_combat = self._format_id(updated_combat)
            logger.info(f"Participante adicionado ao combate {combat_id}: {participant_info['name']}")

            return formatted_combat

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Erro ao adicionar participante: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno ao adicionar participante"
            )

    async def update_participant(
            self,
            combat_id: str,
            participant_id: str,
            user_id: str,
            updates: UpdateParticipantSchema
    ) -> Dict[str, Any]:
        """
        Atualiza participante do combate.

        Args:
            combat_id: ID do combate
            participant_id: ID do participante
            user_id: ID do usuário
            updates: Dados de atualização

        Returns:
            Combate atualizado
        """
        try:
            combat_object_id = IdHandler.to_object_id(combat_id)
            combat = await self.db.combats.find_one({"_id": combat_object_id})

            if not combat:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Combate não encontrado"
                )

            # Verificar acesso (DM ou dono do personagem)
            await self._verify_participant_access(combat, participant_id, user_id)

            # Atualizar participante na ordem de iniciativa
            initiative_order = combat.get("initiative_order", [])
            participant_found = False

            for participant in initiative_order:
                if participant.get("participant_id") == participant_id:
                    participant_found = True

                    # Aplicar atualizações
                    update_data = updates.dict(exclude_unset=True)
                    for key, value in update_data.items():
                        participant[key] = value

                    break

            if not participant_found:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Participante não encontrado no combate"
                )

            await self.db.combats.update_one(
                {"_id": combat_object_id},
                {
                    "$set": {
                        "initiative_order": initiative_order,
                        "updated_at": datetime.utcnow()
                    }
                }
            )

            # Recuperar combate atualizado
            updated_combat = await self.db.combats.find_one({"_id": combat_object_id})
            updated_combat = self._add_current_participant(updated_combat)

            formatted_combat = self._format_id(updated_combat)
            logger.info(f"Participante atualizado no combate {combat_id}: {participant_id}")

            return formatted_combat

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Erro ao atualizar participante: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno ao atualizar participante"
            )

    async def roll_initiative_for_participant(
            self,
            combat_id: str,
            participant_id: str,
            user_id: str,
            advantage: bool = False,
            disadvantage: bool = False
    ) -> Dict[str, Any]:
        """
        Rola iniciativa para um participante.

        Args:
            combat_id: ID do combate
            participant_id: ID do participante
            user_id: ID do usuário
            advantage: Se deve rolar com vantagem
            disadvantage: Se deve rolar com desvantagem

        Returns:
            Resultado da rolagem e combate atualizado
        """
        try:
            combat_object_id = IdHandler.to_object_id(combat_id)
            combat = await self.db.combats.find_one({"_id": combat_object_id})

            if not combat:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Combate não encontrado"
                )

            # Buscar participante
            initiative_order = combat.get("initiative_order", [])
            participant = None

            for p in initiative_order:
                if p.get("participant_id") == participant_id:
                    participant = p
                    break

            if not participant:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Participante não encontrado no combate"
                )

            # Rolar iniciativa
            modifier = participant.get("initiative_modifier", 0)

            if advantage:
                roll_result = roll_with_advantage(f"1d20+{modifier}")
            elif disadvantage:
                roll_result = roll_with_disadvantage(f"1d20+{modifier}")
            else:
                roll_result = roll_dice(f"1d20+{modifier}")

            # Atualizar participante
            participant["initiative"] = roll_result["total"]
            participant["rolled_initiative"] = roll_result["total"] - modifier

            # Reordenar por iniciativa
            initiative_order.sort(key=lambda x: x["initiative"], reverse=True)

            await self.db.combats.update_one(
                {"_id": combat_object_id},
                {
                    "$set": {
                        "initiative_order": initiative_order,
                        "updated_at": datetime.utcnow()
                    }
                }
            )

            # Recuperar combate atualizado
            updated_combat = await self.db.combats.find_one({"_id": combat_object_id})
            updated_combat = self._add_current_participant(updated_combat)

            result = {
                "combat": self._format_id(updated_combat),
                "roll_result": roll_result,
                "participant_name": participant.get("participant_name"),
                "new_initiative": roll_result["total"]
            }

            logger.info(f"Iniciativa rolada para {participant['participant_name']}: {roll_result['total']}")

            return result

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Erro ao rolar iniciativa: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno ao rolar iniciativa"
            )

    # ===== HELPER METHODS =====

    async def _add_participant_to_initiative(
            self,
            initiative_order: List,
            participant_data: Dict[str, Any],
            auto_roll: bool
    ) -> None:
        """Adiciona participante à ordem de iniciativa."""
        participant_type = participant_data.get("type", "character")
        participant_id = participant_data.get("id")

        # Buscar informações do participante
        participant_info = await self._get_participant_info(participant_id, participant_type)

        if participant_info:
            # Lidar com quantidade (para NPCs)
            quantity = participant_data.get("quantity", 1)

            for i in range(quantity):
                name_suffix = f" #{i + 1}" if quantity > 1 else ""

                entry = await self._create_initiative_entry(
                    participant_info,
                    participant_type,
                    None if auto_roll else participant_data.get("initiative"),
                    participant_data.get("position_x"),
                    participant_data.get("position_y"),
                    name_suffix
                )
                initiative_order.append(entry)

    async def _get_participant_info(self, participant_id: str, participant_type: str) -> Optional[Dict[str, Any]]:
        """Busca informações do participante."""
        participant_object_id = IdHandler.to_object_id(participant_id)

        if participant_type == "character":
            return await self.db.characters.find_one({"_id": participant_object_id})
        elif participant_type == "npc":
            return await self.db.npcs.find_one({"_id": participant_object_id})

        return None

    async def _create_initiative_entry(
            self,
            participant_info: Dict[str, Any],
            participant_type: str,
            initiative: Optional[int] = None,
            position_x: Optional[int] = None,
            position_y: Optional[int] = None,
            name_suffix: str = ""
    ) -> InitiativeEntrySchema:
        """Cria entrada na ordem de iniciativa."""
        # Obter modificador de iniciativa
        if participant_type == "character":
            dex_mod = participant_info.get("attributes", {}).get("dexterity", 10)
            dex_mod = (dex_mod - 10) // 2
            init_mod = participant_info.get("initiative_bonus", 0) + dex_mod
        else:  # NPC
            dex = participant_info.get("stats", {}).get("dexterity", 10)
            dex_mod = (dex - 10) // 2
            init_mod = participant_info.get("initiative_modifier", dex_mod)

        # Rolar iniciativa se não fornecida
        if initiative is None:
            roll_result = roll_dice(f"1d20+{init_mod}")
            initiative = roll_result["total"]
            rolled_initiative = roll_result["total"] - init_mod
        else:
            rolled_initiative = initiative - init_mod

        # Criar entrada
        entry_data = {
            "id": str(ObjectId()),
            "participant_type": participant_type,
            "participant_id": str(participant_info["_id"]),
            "participant_name": participant_info["name"] + name_suffix,
            "initiative": initiative,
            "initiative_modifier": init_mod,
            "rolled_initiative": rolled_initiative,
            "current_hp": participant_info.get("hp", {}).get("current", participant_info.get("hit_points", 1)),
            "max_hp": participant_info.get("hp", {}).get("max", participant_info.get("hit_points", 1)),
            "temporary_hp": participant_info.get("hp", {}).get("temporary", 0),
            "armor_class": participant_info.get("armor_class", 10),
            "conditions": [],
            "is_active": True,
            "is_conscious": True,
            "death_saves_successes": 0,
            "death_saves_failures": 0,
            "spell_slots_used": {},
            "resources_used": {},
            "position_x": position_x,
            "position_y": position_y
        }

        return InitiativeEntrySchema(**entry_data)

    def _add_current_participant(self, combat: Dict[str, Any]) -> Dict[str, Any]:
        """Adiciona informações do participante atual ao combate."""
        initiative_order = combat.get("initiative_order", [])
        current_turn = combat.get("current_turn", 0)

        if initiative_order and 0 <= current_turn < len(initiative_order):
            combat["current_participant"] = initiative_order[current_turn]
        else:
            combat["current_participant"] = None

        return combat

    def _update_condition_durations(self, initiative_order: List[Dict[str, Any]], new_round: bool) -> List[
        Dict[str, Any]]:
        """Atualiza duração das condições."""
        updated_order = []

        for participant in initiative_order:
            updated_conditions = []

            for condition in participant.get("conditions", []):
                duration = condition.get("duration")
                duration_type = condition.get("duration_type", "turns")

                if duration is not None and duration > 0:
                    # Decrementar duração baseado no tipo
                    if duration_type == "turns" or (duration_type == "rounds" and new_round):
                        duration -= 1
                        condition["duration"] = duration

                # Manter condição se ainda tem duração ou é permanente
                if duration is None or duration > 0:
                    updated_conditions.append(condition)

            participant["conditions"] = updated_conditions
            updated_order.append(participant)

        return updated_order

    async def _verify_campaign_access(self, combat: Dict[str, Any], user_id: str) -> None:
        """Verifica acesso à campanha do combate."""
        campaign_id = combat.get("campaign_id")
        user_object_id = IdHandler.to_object_id(user_id)

        campaign = await self.db.campaigns.find_one({"_id": campaign_id})
        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Campanha não encontrada"
            )

        await self._verify_campaign_access_by_data(campaign, user_id)

    async def _verify_campaign_access_by_data(self, campaign: Dict[str, Any], user_id: str) -> None:
        """Verifica acesso usando dados da campanha."""
        user_object_id = IdHandler.to_object_id(user_id)
        dm_id = campaign.get("dm_id")
        players = campaign.get("players", [])

        is_dm = str(dm_id) == str(user_object_id)
        is_player = user_object_id in players

        if not (is_dm or is_player):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuário não tem acesso a esta campanha"
            )

    async def _verify_dm_access(self, combat: Dict[str, Any], user_id: str) -> None:
        """Verifica se o usuário é DM do combate."""
        user_object_id = IdHandler.to_object_id(user_id)
        dm_id = combat.get("dm_id")

        if str(dm_id) != str(user_object_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas o DM pode realizar esta operação"
            )

    async def _verify_participant_access(self, combat: Dict[str, Any], participant_id: str, user_id: str) -> None:
        """Verifica se o usuário pode modificar o participante."""
        user_object_id = IdHandler.to_object_id(user_id)
        dm_id = combat.get("dm_id")

        # DM sempre pode modificar
        if str(dm_id) == str(user_object_id):
            return

        # Verificar se é dono do personagem
        participant_info = await self._get_participant_info(participant_id, "character")
        if participant_info and str(participant_info.get("owner_id")) == str(user_object_id):
            return

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para modificar este participante"
        )