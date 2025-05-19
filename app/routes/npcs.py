# app/routes/npcs.py
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Body, Path, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db import get_database
from app.dependencies import get_current_user, get_current_dm
from app.models.user import User
from app.schemas.npc import (
    NPCCreateSchema, NPCUpdateSchema, NPCSchema, NPCListSchema, NPCBulkImportSchema
)
from app.services.npc_service import NPCService

router = APIRouter(
    prefix="/api/npcs",
    tags=["npcs"],
    responses={404: {"description": "Not found"}},
)


@router.post("/", response_model=NPCSchema, status_code=status.HTTP_201_CREATED)
async def create_npc(
        npc_data: NPCCreateSchema,
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Cria um novo NPC.

    O usuário deve ser o DM da campanha especificada.
    """
    npc_service = NPCService(db)
    return await npc_service.create_npc(npc_data, str(current_user.id))


@router.get("/{npc_id}", response_model=NPCSchema)
async def get_npc(
        npc_id: str = Path(..., title="ID do NPC"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Obtém os detalhes de um NPC específico.

    O usuário deve ser o DM ou um jogador da campanha.
    """
    npc_service = NPCService(db)
    return await npc_service.get_npc(npc_id, str(current_user.id))


@router.put("/{npc_id}", response_model=NPCSchema)
async def update_npc(
        updates: NPCUpdateSchema,
        npc_id: str = Path(..., title="ID do NPC"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Atualiza um NPC existente.

    O usuário deve ser o DM da campanha.
    Apenas os campos especificados serão atualizados.
    """
    npc_service = NPCService(db)
    return await npc_service.update_npc(npc_id, str(current_user.id), updates)


@router.delete("/{npc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_npc(
        npc_id: str = Path(..., title="ID do NPC"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Exclui um NPC.

    O usuário deve ser o DM da campanha.
    O NPC não pode estar sendo usado em um encontro ou combate ativo.
    """
    npc_service = NPCService(db)
    success = await npc_service.delete_npc(npc_id, str(current_user.id))

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao excluir o NPC"
        )


@router.get("/campaign/{campaign_id}", response_model=List[NPCListSchema])
async def list_campaign_npcs(
        campaign_id: str = Path(..., title="ID da campanha"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Lista todos os NPCs de uma campanha específica.

    O usuário deve ser o DM ou um jogador da campanha.
    """
    npc_service = NPCService(db)
    return await npc_service.list_npcs_for_campaign(campaign_id, str(current_user.id))


@router.patch("/{npc_id}/hp", response_model=NPCSchema)
async def update_npc_hp(
        hp_change: int = Body(..., embed=True),
        npc_id: str = Path(..., title="ID do NPC"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Atualiza os pontos de vida de um NPC.

    O usuário deve ser o DM da campanha.
    O hp_change pode ser positivo (cura) ou negativo (dano).
    """
    npc_service = NPCService(db)
    return await npc_service.update_hp(npc_id, str(current_user.id), hp_change)


@router.post("/import/{campaign_id}/{monster_id}", response_model=NPCSchema)
async def import_from_compendium(
        campaign_id: str = Path(..., title="ID da campanha"),
        monster_id: str = Path(..., title="ID do monstro no compêndio"),
        name_override: str = Query(None, title="Nome personalizado"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Importa um monstro do compêndio para a campanha como NPC.

    O usuário deve ser o DM da campanha.
    """
    npc_service = NPCService(db)
    return await npc_service.import_from_compendium(
        campaign_id, str(current_user.id), monster_id, name_override
    )


@router.post("/bulk-import/{campaign_id}", response_model=List[NPCSchema])
async def bulk_import(
        import_data: NPCBulkImportSchema,
        campaign_id: str = Path(..., title="ID da campanha"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Importa vários NPCs de uma só vez.

    O usuário deve ser o DM da campanha.
    """
    npc_service = NPCService(db)
    return await npc_service.bulk_import(campaign_id, str(current_user.id), import_data)