# app/routes/combat.py
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Body, Path, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db import get_database
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.combat import (
    CombatCreateSchema, CombatUpdateSchema, CombatSchema,
    ConditionEffectSchema, ActionSchema, RollInitiativeSchema
)
from app.services.combat_service import CombatService

router = APIRouter(
    prefix="/api/combat",
    tags=["combat"],
    responses={404: {"description": "Not found"}},
)


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
    combat_service = CombatService(db)
    return await combat_service.create_combat(combat_data, str(current_user.id))


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
    combat_service = CombatService(db)
    return await combat_service.get_combat(combat_id, str(current_user.id))


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
    combat_service = CombatService(db)
    combat = await combat_service.get_active_combat(campaign_id, str(current_user.id))

    if not combat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Nenhum combate ativo encontrado na campanha {campaign_id}"
        )

    return combat


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
    combat_service = CombatService(db)
    return await combat_service.update_combat(combat_id, str(current_user.id), updates)


@router.post("/{combat_id}/end", response_model=CombatSchema)
async def end_combat(
        combat_id: str = Path(..., title="ID do combate"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Encerra um combate.

    O usuário deve ser o DM da campanha.
    """
    combat_service = CombatService(db)
    return await combat_service.end_combat(combat_id, str(current_user.id))


@router.post("/{combat_id}/initiative", response_model=CombatSchema)
async def roll_initiative(
        initiative_data: RollInitiativeSchema,
        combat_id: str = Path(..., title="ID do combate"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Rola iniciativa para um personagem ou NPC.

    O usuário deve ser o DM para NPCs, ou o proprietário do personagem.
    """
    combat_service = CombatService(db)
    return await combat_service.roll_initiative(
        combat_id, str(current_user.id), initiative_data
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
    combat_service = CombatService(db)
    return await combat_service.next_turn(combat_id, str(current_user.id))


@router.post("/{combat_id}/conditions", response_model=CombatSchema)
async def add_condition(
        condition_data: ConditionEffectSchema,
        combat_id: str = Path(..., title="ID do combate"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Adiciona uma condição a uma entidade no combate.

    O usuário deve ser o DM da campanha.
    """
    combat_service = CombatService(db)
    return await combat_service.add_condition(
        combat_id, str(current_user.id), condition_data
    )


@router.delete("/{combat_id}/conditions/{condition_id}", response_model=CombatSchema)
async def remove_condition(
        combat_id: str = Path(..., title="ID do combate"),
        condition_id: str = Path(..., title="ID da condição"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Remove uma condição de uma entidade no combate.

    O usuário deve ser o DM da campanha.
    """
    combat_service = CombatService(db)
    return await combat_service.remove_condition(
        combat_id, str(current_user.id), condition_id
    )


@router.post("/{combat_id}/actions", response_model=CombatSchema)
async def register_action(
        action_data: ActionSchema,
        combat_id: str = Path(..., title="ID do combate"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Registra uma ação executada durante o combate.

    O usuário deve ser o DM ou o jogador cujo personagem está no turno atual.
    """
    combat_service = CombatService(db)
    return await combat_service.register_action(
        combat_id, str(current_user.id), action_data
    )