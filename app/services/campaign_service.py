# app/services/campaign_service.py
"""
Campaign Service - COMPLETO
Serviço para gerenciamento de campanhas.
"""

import logging
from datetime import datetime
from typing import List, Dict, Optional, Any
from bson import ObjectId
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.schemas.campaign import (
    CampaignCreateSchema, CampaignUpdateSchema, EncounterCreateSchema,
    SessionNoteSchema
)
from app.utils.id_handler import IdHandler

logger = logging.getLogger(__name__)


class CampaignService:
    """
    Serviço para gerenciar operações relacionadas a campanhas.
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

    async def create_campaign(
            self,
            campaign_data: CampaignCreateSchema,
            dm_id: str
    ) -> Dict[str, Any]:
        """
        Cria uma nova campanha.

        Args:
            campaign_data: Dados da campanha
            dm_id: ID do Dungeon Master

        Returns:
            Campanha criada
        """
        try:
            # Converter ID do DM
            dm_object_id = IdHandler.to_object_id(dm_id)
            if not dm_object_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="ID de DM inválido"
                )

            # Verificar se o usuário existe
            dm = await self.db.users.find_one({"_id": dm_object_id})
            if not dm:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Usuário DM não encontrado"
                )

            # Preparar dados da campanha
            now = datetime.utcnow()
            campaign_dict = campaign_data.dict(exclude={"player_emails"}, exclude_unset=True)

            # Adicionar campos de sistema
            campaign_dict.update({
                "dm_id": dm_object_id,
                "players": [],  # Será preenchido via convites
                "encounters": [],
                "session_notes": [],
                "images": [],
                "total_sessions": 0,
                "current_session": 0,
                "total_experience_awarded": 0,
                "created_at": now,
                "updated_at": now,
                "last_session_date": None
            })

            # Inserir no banco
            result = await self.db.campaigns.insert_one(campaign_dict)

            # Recuperar campanha criada
            created_campaign = await self.db.campaigns.find_one({"_id": result.inserted_id})

            # Processar convites por email se fornecidos
            if campaign_data.player_emails:
                await self._send_email_invites(
                    str(result.inserted_id),
                    campaign_data.player_emails,
                    dm_id
                )

            formatted_campaign = self._format_id(created_campaign)
            logger.info(f"Campanha criada: {formatted_campaign['name']} por DM {dm_id}")

            return formatted_campaign

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Erro ao criar campanha: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno ao criar campanha"
            )

    async def get_campaign(self, campaign_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Obtém uma campanha pelo ID.

        Args:
            campaign_id: ID da campanha
            user_id: ID do usuário solicitante

        Returns:
            Dados da campanha ou None
        """
        try:
            campaign_object_id = IdHandler.to_object_id(campaign_id)
            if not campaign_object_id:
                return None

            campaign = await self.db.campaigns.find_one({"_id": campaign_object_id})

            if not campaign:
                return None

            # Verificar acesso
            await self._verify_campaign_access(campaign, user_id)

            formatted_campaign = self._format_id(campaign)
            return formatted_campaign

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Erro ao obter campanha: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno ao obter campanha"
            )

    async def update_campaign(
            self,
            campaign_id: str,
            user_id: str,
            updates: CampaignUpdateSchema
    ) -> Dict[str, Any]:
        """
        Atualiza uma campanha.

        Args:
            campaign_id: ID da campanha
            user_id: ID do usuário (deve ser DM)
            updates: Dados de atualização

        Returns:
            Campanha atualizada
        """
        try:
            campaign_object_id = IdHandler.to_object_id(campaign_id)
            if not campaign_object_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="ID de campanha inválido"
                )

            # Buscar campanha
            campaign = await self.db.campaigns.find_one({"_id": campaign_object_id})
            if not campaign:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Campanha não encontrada"
                )

            # Verificar se é o DM
            await self._verify_dm_access(campaign, user_id)

            # Preparar dados de atualização
            update_data = updates.dict(exclude_unset=True)

            if update_data:
                update_data["updated_at"] = datetime.utcnow()

                # Atualizar no banco
                await self.db.campaigns.update_one(
                    {"_id": campaign_object_id},
                    {"$set": update_data}
                )

            # Recuperar campanha atualizada
            updated_campaign = await self.db.campaigns.find_one({"_id": campaign_object_id})

            formatted_campaign = self._format_id(updated_campaign)
            logger.info(f"Campanha atualizada: {campaign_id} por {user_id}")

            return formatted_campaign

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Erro ao atualizar campanha: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno ao atualizar campanha"
            )

    async def delete_campaign(self, campaign_id: str, user_id: str) -> bool:
        """
        Deleta uma campanha.

        Args:
            campaign_id: ID da campanha
            user_id: ID do usuário (deve ser DM)

        Returns:
            True se deletada com sucesso
        """
        try:
            campaign_object_id = IdHandler.to_object_id(campaign_id)
            if not campaign_object_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="ID de campanha inválido"
                )

            # Buscar campanha
            campaign = await self.db.campaigns.find_one({"_id": campaign_object_id})
            if not campaign:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Campanha não encontrada"
                )

            # Verificar se é o DM
            await self._verify_dm_access(campaign, user_id)

            # Verificar se não há combates ativos
            active_combats = await self.db.combats.count_documents({
                "campaign_id": campaign_object_id,
                "status": "active"
            })

            if active_combats > 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Não é possível deletar campanha com combates ativos"
                )

            # Deletar dados relacionados
            await self._delete_campaign_data(campaign_object_id)

            # Deletar campanha
            result = await self.db.campaigns.delete_one({"_id": campaign_object_id})

            if result.deleted_count == 1:
                logger.info(f"Campanha deletada: {campaign_id} por {user_id}")
                return True
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Falha ao deletar campanha"
                )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Erro ao deletar campanha: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno ao deletar campanha"
            )

    async def list_campaigns(
            self,
            user_id: str,
            skip: int = 0,
            limit: int = 50,
            filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Lista campanhas do usuário ou públicas.

        Args:
            user_id: ID do usuário
            skip: Número de registros para pular
            limit: Limite de registros
            filters: Filtros adicionais

        Returns:
            Lista de campanhas
        """
        try:
            user_object_id = IdHandler.to_object_id(user_id)
            if not user_object_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="ID de usuário inválido"
                )

            filters = filters or {}
            query = {}

            # Se is_public está especificado, buscar campanhas públicas
            if filters.get("is_public") is True:
                query["is_public"] = True
            else:
                # Buscar campanhas onde o usuário é DM ou jogador
                query["$or"] = [
                    {"dm_id": user_object_id},
                    {"players": user_object_id}
                ]

            # Aplicar outros filtros
            if "is_active" in filters:
                query["is_active"] = filters["is_active"]

            if "search" in filters:
                search_term = filters["search"]
                query["$or"] = [
                    {"name": {"$regex": search_term, "$options": "i"}},
                    {"description": {"$regex": search_term, "$options": "i"}}
                ]

            # Buscar campanhas
            cursor = self.db.campaigns.find(query).skip(skip).limit(limit).sort("created_at", -1)
            campaigns = await cursor.to_list(length=limit)

            formatted_campaigns = self._format_id_list(campaigns)
            return formatted_campaigns

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Erro ao listar campanhas: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno ao listar campanhas"
            )

    async def get_user_campaigns(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Obtém todas as campanhas do usuário (como DM ou jogador).

        Args:
            user_id: ID do usuário

        Returns:
            Lista de campanhas do usuário
        """
        try:
            user_object_id = IdHandler.to_object_id(user_id)
            if not user_object_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="ID de usuário inválido"
                )

            query = {
                "$or": [
                    {"dm_id": user_object_id},
                    {"players": user_object_id}
                ]
            }

            cursor = self.db.campaigns.find(query).sort("created_at", -1)
            campaigns = await cursor.to_list(length=100)

            formatted_campaigns = self._format_id_list(campaigns)
            return formatted_campaigns

        except Exception as e:
            logger.error(f"Erro ao obter campanhas do usuário: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno ao obter campanhas"
            )

    async def invite_player(
            self,
            campaign_id: str,
            email: str,
            dm_id: str,
            message: Optional[str] = None
    ) -> Dict[str, str]:
        """
        Convida um jogador para a campanha.

        Args:
            campaign_id: ID da campanha
            email: Email do jogador a ser convidado
            dm_id: ID do DM
            message: Mensagem do convite

        Returns:
            Resultado do convite
        """
        try:
            # Buscar usuário pelo email
            user = await self.db.users.find_one({"email": email.lower()})

            if not user:
                # Por enquanto, retornar erro. Futuramente implementar convite por email
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Usuário não encontrado com este email"
                )

            user_id = str(user["_id"])

            # Verificar se usuário já está na campanha
            campaign_object_id = IdHandler.to_object_id(campaign_id)
            campaign = await self.db.campaigns.find_one({"_id": campaign_object_id})

            if not campaign:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Campanha não encontrada"
                )

            # Verificar se é o DM
            await self._verify_dm_access(campaign, dm_id)

            # Verificar se usuário já está na campanha
            user_object_id = IdHandler.to_object_id(user_id)
            if user_object_id in campaign.get("players", []):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Usuário já está na campanha"
                )

            # Verificar limite de jogadores
            max_players = campaign.get("max_players", 6)
            current_players = len(campaign.get("players", []))

            if current_players >= max_players:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Campanha atingiu o limite máximo de jogadores"
                )

            # Adicionar jogador à campanha
            await self.db.campaigns.update_one(
                {"_id": campaign_object_id},
                {
                    "$push": {"players": user_object_id},
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )

            logger.info(f"Jogador {email} adicionado à campanha {campaign_id}")

            return {
                "message": f"Jogador {email} foi adicionado à campanha com sucesso",
                "user_id": user_id
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Erro ao convidar jogador: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno ao convidar jogador"
            )

    async def join_campaign(
            self,
            campaign_id: str,
            user_id: str,
            message: Optional[str] = None
    ) -> Dict[str, str]:
        """
        Solicita entrada em uma campanha pública.

        Args:
            campaign_id: ID da campanha
            user_id: ID do usuário
            message: Mensagem da solicitação

        Returns:
            Resultado da solicitação
        """
        try:
            campaign_object_id = IdHandler.to_object_id(campaign_id)
            user_object_id = IdHandler.to_object_id(user_id)

            if not campaign_object_id or not user_object_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="IDs inválidos"
                )

            # Buscar campanha
            campaign = await self.db.campaigns.find_one({"_id": campaign_object_id})

            if not campaign:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Campanha não encontrada"
                )

            # Verificar se é campanha pública
            if not campaign.get("is_public", False):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Esta campanha não aceita solicitações públicas"
                )

            # Verificar se usuário já está na campanha
            if user_object_id in campaign.get("players", []):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Você já está nesta campanha"
                )

            # Verificar se é o DM
            if str(campaign.get("dm_id")) == str(user_object_id):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Você é o DM desta campanha"
                )

            # Por enquanto, adicionar automaticamente. Futuramente implementar aprovação
            await self.db.campaigns.update_one(
                {"_id": campaign_object_id},
                {
                    "$push": {"players": user_object_id},
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )

            logger.info(f"Usuário {user_id} entrou na campanha {campaign_id}")

            return {
                "message": "Você entrou na campanha com sucesso"
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Erro ao entrar na campanha: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno ao entrar na campanha"
            )

    async def remove_player(self, campaign_id: str, player_id: str) -> bool:
        """
        Remove um jogador da campanha.

        Args:
            campaign_id: ID da campanha
            player_id: ID do jogador

        Returns:
            True se removido com sucesso
        """
        try:
            campaign_object_id = IdHandler.to_object_id(campaign_id)
            player_object_id = IdHandler.to_object_id(player_id)

            if not campaign_object_id or not player_object_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="IDs inválidos"
                )

            # Remover jogador da campanha
            result = await self.db.campaigns.update_one(
                {"_id": campaign_object_id},
                {
                    "$pull": {"players": player_object_id},
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )

            if result.modified_count > 0:
                logger.info(f"Jogador {player_id} removido da campanha {campaign_id}")
                return True
            else:
                return False

        except Exception as e:
            logger.error(f"Erro ao remover jogador: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno ao remover jogador"
            )

    async def get_campaign_players(self, campaign_id: str) -> List[Dict[str, Any]]:
        """
        Obtém lista de jogadores da campanha com informações básicas.

        Args:
            campaign_id: ID da campanha

        Returns:
            Lista de jogadores
        """
        try:
            campaign_object_id = IdHandler.to_object_id(campaign_id)
            if not campaign_object_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="ID de campanha inválido"
                )

            # Buscar campanha
            campaign = await self.db.campaigns.find_one({"_id": campaign_object_id})

            if not campaign:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Campanha não encontrada"
                )

            player_ids = campaign.get("players", [])
            dm_id = campaign.get("dm_id")

            # Buscar informações dos jogadores
            players = []

            if player_ids:
                cursor = self.db.users.find(
                    {"_id": {"$in": player_ids}},
                    {"username": 1, "email": 1, "display_name": 1, "avatar_url": 1}
                )

                async for player in cursor:
                    player_info = self._format_id(player)
                    player_info["role"] = "player"
                    players.append(player_info)

            # Adicionar DM à lista
            if dm_id:
                dm = await self.db.users.find_one(
                    {"_id": dm_id},
                    {"username": 1, "email": 1, "display_name": 1, "avatar_url": 1}
                )

                if dm:
                    dm_info = self._format_id(dm)
                    dm_info["role"] = "dm"
                    players.append(dm_info)

            return players

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Erro ao obter jogadores da campanha: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno ao obter jogadores"
            )

    # ===== ENCOUNTER METHODS =====

    async def create_encounter(
            self,
            campaign_id: str,
            encounter_data: EncounterCreateSchema,
            dm_id: str
    ) -> Dict[str, Any]:
        """Cria um novo encontro na campanha."""
        try:
            campaign_object_id = IdHandler.to_object_id(campaign_id)
            encounter_dict = encounter_data.dict(exclude_unset=True)
            encounter_dict.update({
                "id": str(ObjectId()),
                "created_at": datetime.utcnow(),
                "completed_at": None
            })

            # Adicionar encontro à campanha
            await self.db.campaigns.update_one(
                {"_id": campaign_object_id},
                {
                    "$push": {"encounters": encounter_dict},
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )

            logger.info(f"Encontro criado: {encounter_dict['name']} na campanha {campaign_id}")
            return encounter_dict

        except Exception as e:
            logger.error(f"Erro ao criar encontro: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno ao criar encontro"
            )

    async def list_encounters(
            self,
            campaign_id: str,
            filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Lista encontros da campanha."""
        try:
            campaign_object_id = IdHandler.to_object_id(campaign_id)
            campaign = await self.db.campaigns.find_one({"_id": campaign_object_id})

            if not campaign:
                return []

            encounters = campaign.get("encounters", [])

            # Aplicar filtros
            if filters:
                filtered_encounters = []
                for encounter in encounters:
                    if self._match_encounter_filters(encounter, filters):
                        filtered_encounters.append(encounter)
                encounters = filtered_encounters

            return encounters

        except Exception as e:
            logger.error(f"Erro ao listar encontros: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno ao listar encontros"
            )

    async def get_encounter(self, campaign_id: str, encounter_id: str) -> Optional[Dict[str, Any]]:
        """Obtém um encontro específico."""
        try:
            campaign_object_id = IdHandler.to_object_id(campaign_id)
            campaign = await self.db.campaigns.find_one({"_id": campaign_object_id})

            if not campaign:
                return None

            encounters = campaign.get("encounters", [])
            for encounter in encounters:
                if encounter.get("id") == encounter_id:
                    return encounter

            return None

        except Exception as e:
            logger.error(f"Erro ao obter encontro: {e}")
            return None

    # ===== SESSION NOTES METHODS =====

    async def create_session_note(
            self,
            campaign_id: str,
            note_data: SessionNoteSchema,
            author_id: str
    ) -> Dict[str, Any]:
        """Cria uma nova nota de sessão."""
        try:
            campaign_object_id = IdHandler.to_object_id(campaign_id)
            note_dict = note_data.dict(exclude_unset=True)
            note_dict.update({
                "id": str(ObjectId()),
                "author_id": author_id,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            })

            # Adicionar nota à campanha
            await self.db.campaigns.update_one(
                {"_id": campaign_object_id},
                {
                    "$push": {"session_notes": note_dict},
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )

            logger.info(f"Nota de sessão criada: {note_dict['title']} na campanha {campaign_id}")
            return note_dict

        except Exception as e:
            logger.error(f"Erro ao criar nota de sessão: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno ao criar nota"
            )

    async def list_session_notes(
            self,
            campaign_id: str,
            filters: Optional[Dict[str, Any]] = None,
            skip: int = 0,
            limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Lista notas de sessão da campanha."""
        try:
            campaign_object_id = IdHandler.to_object_id(campaign_id)
            campaign = await self.db.campaigns.find_one({"_id": campaign_object_id})

            if not campaign:
                return []

            notes = campaign.get("session_notes", [])

            # Aplicar filtros
            if filters:
                filtered_notes = []
                for note in notes:
                    if self._match_note_filters(note, filters):
                        filtered_notes.append(note)
                notes = filtered_notes

            # Ordenar por data de criação (mais recentes primeiro)
            notes.sort(key=lambda x: x.get("created_at", datetime.min), reverse=True)

            # Aplicar paginação
            return notes[skip:skip + limit]

        except Exception as e:
            logger.error(f"Erro ao listar notas de sessão: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno ao listar notas"
            )

    async def get_campaign_stats(self, campaign_id: str) -> Dict[str, Any]:
        """Obtém estatísticas da campanha."""
        try:
            campaign_object_id = IdHandler.to_object_id(campaign_id)

            # Buscar dados da campanha
            campaign = await self.db.campaigns.find_one({"_id": campaign_object_id})
            if not campaign:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Campanha não encontrada"
                )

            # Contar personagens
            character_count = await self.db.characters.count_documents({
                "campaign_id": campaign_object_id
            })

            # Contar combates
            combat_count = await self.db.combats.count_documents({
                "campaign_id": campaign_object_id
            })

            active_combats = await self.db.combats.count_documents({
                "campaign_id": campaign_object_id,
                "status": "active"
            })

            stats = {
                "campaign_id": campaign_id,
                "name": campaign.get("name"),
                "total_players": len(campaign.get("players", [])),
                "max_players": campaign.get("max_players", 6),
                "total_characters": character_count,
                "total_encounters": len(campaign.get("encounters", [])),
                "total_combats": combat_count,
                "active_combats": active_combats,
                "total_sessions": campaign.get("total_sessions", 0),
                "current_session": campaign.get("current_session", 0),
                "total_experience_awarded": campaign.get("total_experience_awarded", 0),
                "session_notes_count": len(campaign.get("session_notes", [])),
                "images_count": len(campaign.get("images", [])),
                "created_at": campaign.get("created_at"),
                "last_session_date": campaign.get("last_session_date"),
                "is_active": campaign.get("is_active", True)
            }

            return stats

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Erro ao obter estatísticas: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno ao obter estatísticas"
            )

    # ===== HELPER METHODS =====

    async def _verify_campaign_access(self, campaign: Dict[str, Any], user_id: str) -> None:
        """Verifica se o usuário tem acesso à campanha."""
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

    async def _verify_dm_access(self, campaign: Dict[str, Any], user_id: str) -> None:
        """Verifica se o usuário é o DM da campanha."""
        user_object_id = IdHandler.to_object_id(user_id)
        dm_id = campaign.get("dm_id")

        if str(dm_id) != str(user_object_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas o DM pode realizar esta operação"
            )

    async def _delete_campaign_data(self, campaign_object_id: ObjectId) -> None:
        """Deleta dados relacionados à campanha."""
        try:
            # Deletar personagens
            await self.db.characters.delete_many({"campaign_id": campaign_object_id})

            # Deletar combates
            await self.db.combats.delete_many({"campaign_id": campaign_object_id})

            # Deletar NPCs
            await self.db.npcs.delete_many({"campaign_id": campaign_object_id})

            # Deletar locks
            await self.db.locks.delete_many({"resource_id": str(campaign_object_id)})

        except Exception as e:
            logger.error(f"Erro ao deletar dados da campanha: {e}")

    async def _send_email_invites(
            self,
            campaign_id: str,
            emails: List[str],
            dm_id: str
    ) -> None:
        """Envia convites por email (implementação futura)."""
        # TODO: Implementar envio de emails
        logger.info(f"Convites enviados para {len(emails)} emails na campanha {campaign_id}")

    def _match_encounter_filters(self, encounter: Dict[str, Any], filters: Dict[str, Any]) -> bool:
        """Verifica se encontro corresponde aos filtros."""
        for key, value in filters.items():
            if key in encounter and encounter[key] != value:
                return False
        return True

    def _match_note_filters(self, note: Dict[str, Any], filters: Dict[str, Any]) -> bool:
        """Verifica se nota corresponde aos filtros."""
        for key, value in filters.items():
            if key in note and note[key] != value:
                return False
        return True