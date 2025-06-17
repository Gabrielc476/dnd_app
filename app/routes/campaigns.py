# app/routes/campaigns.py
"""
Campaign routes - COMPLETO
Rotas para gerenciamento de campanhas.
"""

import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Body, Path, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database
from app.dependencies import get_current_user, verify_campaign_access
from app.models.user import User
from app.schemas.campaign import (
    CampaignCreateSchema, CampaignUpdateSchema, CampaignSchema,
    CampaignListSchema, CampaignSummarySchema, PlayerInviteSchema,
    CampaignJoinRequestSchema, EncounterCreateSchema, SessionNoteSchema
)
from app.services.campaign_service import CampaignService
from app.utils.id_handler import IdHandler

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/", response_model=CampaignSchema, status_code=status.HTTP_201_CREATED)
async def create_campaign(
        campaign_data: CampaignCreateSchema,
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Cria uma nova campanha.

    O usuário que cria a campanha automaticamente se torna o DM.
    """
    try:
        campaign_service = CampaignService(db)
        campaign = await campaign_service.create_campaign(campaign_data, str(current_user.id))

        logger.info(f"Campanha criada: {campaign['name']} por {current_user.username}")
        return campaign

    except Exception as e:
        logger.error(f"Erro ao criar campanha: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao criar campanha"
        )


@router.get("/", response_model=List[CampaignListSchema])
async def list_campaigns(
        skip: int = Query(0, ge=0),
        limit: int = Query(50, ge=1, le=100),
        is_public: Optional[bool] = Query(None),
        is_active: Optional[bool] = Query(None),
        search: Optional[str] = Query(None, max_length=100),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Lista campanhas.

    Por padrão lista apenas campanhas onde o usuário é DM ou jogador.
    Use is_public=true para listar campanhas públicas.
    """
    try:
        campaign_service = CampaignService(db)

        filters = {}
        if is_public is not None:
            filters["is_public"] = is_public
        if is_active is not None:
            filters["is_active"] = is_active
        if search:
            filters["search"] = search

        campaigns = await campaign_service.list_campaigns(
            user_id=str(current_user.id),
            skip=skip,
            limit=limit,
            filters=filters
        )

        return campaigns

    except Exception as e:
        logger.error(f"Erro ao listar campanhas: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao listar campanhas"
        )


@router.get("/my", response_model=List[CampaignListSchema])
async def list_my_campaigns(
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Lista apenas as campanhas do usuário atual (como DM ou jogador).
    """
    try:
        campaign_service = CampaignService(db)
        campaigns = await campaign_service.get_user_campaigns(str(current_user.id))

        return campaigns

    except Exception as e:
        logger.error(f"Erro ao listar campanhas do usuário: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao listar campanhas"
        )


@router.get("/{campaign_id}", response_model=CampaignSchema)
async def get_campaign(
        campaign_id: str = Path(..., title="ID da campanha"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Obtém detalhes de uma campanha específica.

    O usuário deve ser DM ou jogador da campanha.
    """
    try:
        # Verificar acesso à campanha
        await verify_campaign_access(campaign_id, current_user, db)

        campaign_service = CampaignService(db)
        campaign = await campaign_service.get_campaign(campaign_id, str(current_user.id))

        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Campanha não encontrada"
            )

        return campaign

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao obter campanha: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao obter campanha"
        )


@router.put("/{campaign_id}", response_model=CampaignSchema)
async def update_campaign(
        updates: CampaignUpdateSchema,
        campaign_id: str = Path(..., title="ID da campanha"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Atualiza uma campanha.

    Apenas o DM da campanha pode atualizá-la.
    """
    try:
        # Verificar se é DM da campanha
        await verify_campaign_access(campaign_id, current_user, db, require_dm=True)

        campaign_service = CampaignService(db)
        updated_campaign = await campaign_service.update_campaign(
            campaign_id, str(current_user.id), updates
        )

        logger.info(f"Campanha atualizada: {campaign_id} por {current_user.username}")
        return updated_campaign

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao atualizar campanha: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao atualizar campanha"
        )


@router.delete("/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_campaign(
        campaign_id: str = Path(..., title="ID da campanha"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Deleta uma campanha.

    Apenas o DM da campanha pode deletá-la.
    """
    try:
        # Verificar se é DM da campanha
        await verify_campaign_access(campaign_id, current_user, db, require_dm=True)

        campaign_service = CampaignService(db)
        await campaign_service.delete_campaign(campaign_id, str(current_user.id))

        logger.info(f"Campanha deletada: {campaign_id} por {current_user.username}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao deletar campanha: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao deletar campanha"
        )


@router.post("/{campaign_id}/invite", status_code=status.HTTP_201_CREATED)
async def invite_player(
        invite_data: PlayerInviteSchema,
        campaign_id: str = Path(..., title="ID da campanha"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Convida um jogador para a campanha.

    Apenas o DM pode enviar convites.
    """
    try:
        # Verificar se é DM da campanha
        await verify_campaign_access(campaign_id, current_user, db, require_dm=True)

        campaign_service = CampaignService(db)
        result = await campaign_service.invite_player(
            campaign_id, invite_data.email, str(current_user.id), invite_data.message
        )

        logger.info(f"Convite enviado para {invite_data.email} na campanha {campaign_id}")
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao enviar convite: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao enviar convite"
        )


@router.post("/{campaign_id}/join")
async def join_campaign(
        join_data: CampaignJoinRequestSchema,
        campaign_id: str = Path(..., title="ID da campanha"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Solicita entrada em uma campanha pública.
    """
    try:
        campaign_service = CampaignService(db)
        result = await campaign_service.join_campaign(
            campaign_id, str(current_user.id), join_data.message
        )

        logger.info(f"Usuário {current_user.username} solicitou entrada na campanha {campaign_id}")
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao solicitar entrada na campanha: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao solicitar entrada"
        )


@router.post("/{campaign_id}/leave", status_code=status.HTTP_204_NO_CONTENT)
async def leave_campaign(
        campaign_id: str = Path(..., title="ID da campanha"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Sai de uma campanha.

    DMs não podem sair de suas próprias campanhas.
    """
    try:
        # Verificar acesso à campanha
        campaign = await verify_campaign_access(campaign_id, current_user, db)

        # Verificar se não é o DM
        if str(campaign.get("dm_id")) == str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="DMs não podem sair de suas próprias campanhas"
            )

        campaign_service = CampaignService(db)
        await campaign_service.remove_player(campaign_id, str(current_user.id))

        logger.info(f"Usuário {current_user.username} saiu da campanha {campaign_id}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao sair da campanha: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao sair da campanha"
        )


@router.delete("/{campaign_id}/players/{player_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_player(
        campaign_id: str = Path(..., title="ID da campanha"),
        player_id: str = Path(..., title="ID do jogador"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Remove um jogador da campanha.

    Apenas o DM pode remover jogadores.
    """
    try:
        # Verificar se é DM da campanha
        await verify_campaign_access(campaign_id, current_user, db, require_dm=True)

        campaign_service = CampaignService(db)
        await campaign_service.remove_player(campaign_id, player_id)

        logger.info(f"Jogador {player_id} removido da campanha {campaign_id} por {current_user.username}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao remover jogador: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao remover jogador"
        )


@router.get("/{campaign_id}/players", response_model=List[Dict[str, Any]])
async def get_campaign_players(
        campaign_id: str = Path(..., title="ID da campanha"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Lista jogadores da campanha com suas informações básicas.
    """
    try:
        # Verificar acesso à campanha
        await verify_campaign_access(campaign_id, current_user, db)

        campaign_service = CampaignService(db)
        players = await campaign_service.get_campaign_players(campaign_id)

        return players

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao listar jogadores: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao listar jogadores"
        )


# ===== ENCOUNTERS =====

@router.post("/{campaign_id}/encounters", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_encounter(
        encounter_data: EncounterCreateSchema,
        campaign_id: str = Path(..., title="ID da campanha"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Cria um novo encontro na campanha.

    Apenas o DM pode criar encontros.
    """
    try:
        # Verificar se é DM da campanha
        await verify_campaign_access(campaign_id, current_user, db, require_dm=True)

        campaign_service = CampaignService(db)
        encounter = await campaign_service.create_encounter(
            campaign_id, encounter_data, str(current_user.id)
        )

        logger.info(f"Encontro criado: {encounter['name']} na campanha {campaign_id}")
        return encounter

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao criar encontro: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao criar encontro"
        )


@router.get("/{campaign_id}/encounters", response_model=List[Dict[str, Any]])
async def list_encounters(
        campaign_id: str = Path(..., title="ID da campanha"),
        encounter_type: Optional[str] = Query(None),
        is_active: Optional[bool] = Query(None),
        is_completed: Optional[bool] = Query(None),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Lista encontros da campanha.
    """
    try:
        # Verificar acesso à campanha
        await verify_campaign_access(campaign_id, current_user, db)

        campaign_service = CampaignService(db)

        filters = {}
        if encounter_type:
            filters["type"] = encounter_type
        if is_active is not None:
            filters["is_active"] = is_active
        if is_completed is not None:
            filters["is_completed"] = is_completed

        encounters = await campaign_service.list_encounters(campaign_id, filters)

        return encounters

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao listar encontros: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao listar encontros"
        )


@router.get("/{campaign_id}/encounters/{encounter_id}", response_model=Dict[str, Any])
async def get_encounter(
        campaign_id: str = Path(..., title="ID da campanha"),
        encounter_id: str = Path(..., title="ID do encontro"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Obtém detalhes de um encontro específico.
    """
    try:
        # Verificar acesso à campanha
        await verify_campaign_access(campaign_id, current_user, db)

        campaign_service = CampaignService(db)
        encounter = await campaign_service.get_encounter(campaign_id, encounter_id)

        if not encounter:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Encontro não encontrado"
            )

        return encounter

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao obter encontro: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao obter encontro"
        )


# ===== SESSION NOTES =====

@router.post("/{campaign_id}/notes", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_session_note(
        note_data: SessionNoteSchema,
        campaign_id: str = Path(..., title="ID da campanha"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Cria uma nova nota de sessão.

    Qualquer membro da campanha pode criar notas.
    """
    try:
        # Verificar acesso à campanha
        await verify_campaign_access(campaign_id, current_user, db)

        campaign_service = CampaignService(db)
        note = await campaign_service.create_session_note(
            campaign_id, note_data, str(current_user.id)
        )

        logger.info(f"Nota de sessão criada: {note['title']} na campanha {campaign_id}")
        return note

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao criar nota de sessão: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao criar nota"
        )


@router.get("/{campaign_id}/notes", response_model=List[Dict[str, Any]])
async def list_session_notes(
        campaign_id: str = Path(..., title="ID da campanha"),
        is_public: Optional[bool] = Query(None),
        skip: int = Query(0, ge=0),
        limit: int = Query(50, ge=1, le=100),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Lista notas de sessão da campanha.
    """
    try:
        # Verificar acesso à campanha
        campaign = await verify_campaign_access(campaign_id, current_user, db)

        campaign_service = CampaignService(db)

        # Determinar se pode ver notas privadas
        is_dm = str(campaign.get("dm_id")) == str(current_user.id)

        filters = {}
        if is_public is not None:
            filters["is_public"] = is_public
        elif not is_dm:
            # Se não é DM, só pode ver notas públicas
            filters["is_public"] = True

        notes = await campaign_service.list_session_notes(
            campaign_id, filters, skip, limit
        )

        return notes

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao listar notas de sessão: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao listar notas"
        )


@router.get("/{campaign_id}/stats", response_model=Dict[str, Any])
async def get_campaign_stats(
        campaign_id: str = Path(..., title="ID da campanha"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Obtém estatísticas da campanha.
    """
    try:
        # Verificar acesso à campanha
        await verify_campaign_access(campaign_id, current_user, db)

        campaign_service = CampaignService(db)
        stats = await campaign_service.get_campaign_stats(campaign_id)

        return stats

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao obter estatísticas: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao obter estatísticas"
        )