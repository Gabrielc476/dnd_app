# app/routes/combat.py
"""
Combat routes - CORRIGIDO
Problemas resolvidos:
1. ✅ Import corrigido de app.db para app.core.database
2. ✅ Proper error handling implementado
3. ✅ Validação de permissões melhorada
4. ✅ Logging adequado adicionado
5. ✅ Endpoints completos implementados
"""

import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Body, Path, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database
from app.dependencies import get_current_user, verify_campaign_access
from app.models.user import User
from app.schemas.combat import (
    CombatCreateSchema, CombatUpdateSchema, CombatSchema,
    ConditionEffectSchema, InitiativeEntrySchema
)
from app.services.combat_service import CombatService
from app.utils.id_handler import IdHandler

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/", response_model=CombatSchema, status_code=status.HTTP_201_CREATED)
async def create_combat(
        combat_data: CombatCreateSchema,
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Inicia um novo combate.

    O usuário deve ser o DM da campanha especificada.
    """
    try:
        # Verificar se é DM da campanha
        await verify_campaign_access(combat_data.campaign_id, current_user, db, require_dm=True)

        combat_service = CombatService(db)
        combat = await combat_service.create_combat(combat_data, str(current_user.id))

        logger.info(f"Combate criado na campanha {combat_data.campaign_id} por {current_user.username}")
        return combat

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao criar combate: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao criar combate"
        )


@router.get("/", response_model=List[CombatSchema])
async def list_combats(
        campaign_id: Optional[str] = Query(None),
        is_active: Optional[bool] = Query(None),
        skip: int = Query(0, ge=0),
        limit: int = Query(50, ge=1, le=100),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Lista combates do usuário.

    Se campaign_id for especificado, lista combates da campanha (requer acesso à campanha).
    """
    try:
        combat_service = CombatService(db)
        combats = await combat_service.list_combats(
            str(current_user.id), campaign_id, is_active, skip, limit
        )
        return combats

    except Exception as e:
        logger.error(f"Erro ao listar combates: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao listar combates"
        )


@router.get("/{combat_id}", response_model=CombatSchema)
async def get_combat(
        combat_id: str = Path(..., title="ID do combate"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Obtém os detalhes de um combate específico.

    O usuário deve ser o DM ou um jogador da campanha.
    """
    try:
        combat_service = CombatService(db)
        combat = await combat_service.get_combat(combat_id, str(current_user.id))

        if not combat:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Combate não encontrado"
            )

        return combat

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao obter combate: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao obter combate"
        )


@router.get("/campaign/{campaign_id}/active", response_model=CombatSchema)
async def get_active_combat(
        campaign_id: str = Path(..., title="ID da campanha"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Obtém o combate ativo em uma campanha.

    O usuário deve ser o DM ou um jogador da campanha.
    Retorna 404 se não houver combate ativo.
    """
    try:
        # Verificar acesso à campanha
        await verify_campaign_access(campaign_id, current_user, db)

        combat_service = CombatService(db)
        combat = await combat_service.get_active_combat(campaign_id, str(current_user.id))

        if not combat:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Nenhum combate ativo encontrado na campanha {campaign_id}"
            )

        return combat

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao obter combate ativo: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao obter combate ativo"
        )


@router.put("/{combat_id}", response_model=CombatSchema)
async def update_combat(
        updates: CombatUpdateSchema,
        combat_id: str = Path(..., title="ID do combate"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Atualiza um combate existente.

    O usuário deve ser o DM da campanha.
    Apenas os campos especificados serão atualizados.
    """
    try:
        combat_service = CombatService(db)

        # Verificar se o usuário pode editar este combate
        combat = await combat_service.get_combat(combat_id, str(current_user.id))
        if not combat:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Combate não encontrado"
            )

        # Verificar se é DM da campanha
        await verify_campaign_access(combat["campaign_id"], current_user, db, require_dm=True)

        updated_combat = await combat_service.update_combat(combat_id, updates, str(current_user.id))

        logger.info(f"Combate atualizado: {combat_id} por {current_user.username}")
        return updated_combat

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao atualizar combate: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao atualizar combate"
        )


@router.delete("/{combat_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_combat(
        combat_id: str = Path(..., title="ID do combate"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Remove um combate.

    O usuário deve ser o DM da campanha.
    Esta operação não pode ser desfeita.
    """
    try:
        combat_service = CombatService(db)

        # Verificar se o combate existe e se o usuário pode deletá-lo
        combat = await combat_service.get_combat(combat_id, str(current_user.id))
        if not combat:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Combate não encontrado"
            )

        # Verificar se é DM da campanha
        await verify_campaign_access(combat["campaign_id"], current_user, db, require_dm=True)

        await combat_service.delete_combat(combat_id, str(current_user.id))

        logger.info(f"Combate removido: {combat_id} por {current_user.username}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao remover combate: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao remover combate"
        )


@router.post("/{combat_id}/start", response_model=CombatSchema)
async def start_combat(
        combat_id: str = Path(..., title="ID do combate"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Inicia um combate (muda status para 'active').

    O usuário deve ser o DM da campanha.
    """
    try:
        combat_service = CombatService(db)

        # Verificar se o combate existe
        combat = await combat_service.get_combat(combat_id, str(current_user.id))
        if not combat:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Combate não encontrado"
            )

        # Verificar se é DM da campanha
        await verify_campaign_access(combat["campaign_id"], current_user, db, require_dm=True)

        started_combat = await combat_service.start_combat(combat_id)

        logger.info(f"Combate iniciado: {combat_id} por {current_user.username}")
        return started_combat

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao iniciar combate: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao iniciar combate"
        )


@router.post("/{combat_id}/end", response_model=CombatSchema)
async def end_combat(
        combat_id: str = Path(..., title="ID do combate"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Finaliza um combate (muda status para 'completed').

    O usuário deve ser o DM da campanha.
    """
    try:
        combat_service = CombatService(db)

        # Verificar se o combate existe
        combat = await combat_service.get_combat(combat_id, str(current_user.id))
        if not combat:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Combate não encontrado"
            )

        # Verificar se é DM da campanha
        await verify_campaign_access(combat["campaign_id"], current_user, db, require_dm=True)

        ended_combat = await combat_service.end_combat(combat_id)

        logger.info(f"Combate finalizado: {combat_id} por {current_user.username}")
        return ended_combat

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao finalizar combate: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao finalizar combate"
        )


@router.post("/{combat_id}/next-turn", response_model=CombatSchema)
async def next_turn(
        combat_id: str = Path(..., title="ID do combate"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Avança para o próximo turno no combate.

    O usuário deve ser o DM da campanha.
    """
    try:
        combat_service = CombatService(db)

        # Verificar se o combate existe
        combat = await combat_service.get_combat(combat_id, str(current_user.id))
        if not combat:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Combate não encontrado"
            )

        # Verificar se é DM da campanha
        await verify_campaign_access(combat["campaign_id"], current_user, db, require_dm=True)

        updated_combat = await combat_service.next_turn(combat_id)

        logger.info(f"Turno avançado no combate: {combat_id}")
        return updated_combat

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao avançar turno: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao avançar turno"
        )


@router.post("/{combat_id}/initiative", response_model=CombatSchema)
async def add_initiative_entry(
        initiative_entry: InitiativeEntrySchema,
        combat_id: str = Path(..., title="ID do combate"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Adiciona uma entrada na iniciativa do combate.

    O usuário deve ser o DM da campanha.
    """
    try:
        combat_service = CombatService(db)

        # Verificar se o combate existe
        combat = await combat_service.get_combat(combat_id, str(current_user.id))
        if not combat:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Combate não encontrado"
            )

        # Verificar se é DM da campanha
        await verify_campaign_access(combat["campaign_id"], current_user, db, require_dm=True)

        updated_combat = await combat_service.add_initiative_entry(combat_id, initiative_entry)

        logger.info(f"Entrada de iniciativa adicionada no combate: {combat_id}")
        return updated_combat

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao adicionar entrada de iniciativa: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao adicionar iniciativa"
        )


@router.post("/{combat_id}/conditions", response_model=CombatSchema)
async def add_condition(
        condition: ConditionEffectSchema,
        combat_id: str = Path(..., title="ID do combate"),
        target_id: str = Body(..., embed=True),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Adiciona uma condição a um participante do combate.

    O usuário deve ser o DM da campanha.
    """
    try:
        combat_service = CombatService(db)

        # Verificar se o combate existe
        combat = await combat_service.get_combat(combat_id, str(current_user.id))
        if not combat:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Combate não encontrado"
            )

        # Verificar se é DM da campanha
        await verify_campaign_access(combat["campaign_id"], current_user, db, require_dm=True)

        updated_combat = await combat_service.add_condition(combat_id, target_id, condition)

        logger.info(f"Condição adicionada no combate: {combat_id}")
        return updated_combat

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao adicionar condição: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao adicionar condição"
        )