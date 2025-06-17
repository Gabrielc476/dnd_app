# app/routes/npcs.py
"""
NPC routes - COMPLETO
Rotas para gerenciamento de NPCs.
"""

import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Body, Path, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database
from app.dependencies import get_current_user, verify_campaign_access
from app.models.user import User
from app.schemas.npc import (
    NPCCreateSchema, NPCUpdateSchema, NPCSchema, NPCListSchema,
    NPCSummarySchema, NPCBulkImportSchema
)
from app.services.npc_service import NPCService

logger = logging.getLogger(__name__)

router = APIRouter()


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
    try:
        # Verificar se é DM da campanha
        await verify_campaign_access(npc_data.campaign_id, current_user, db, require_dm=True)

        npc_service = NPCService(db)
        npc = await npc_service.create_npc(npc_data, str(current_user.id))

        logger.info(f"NPC criado: {npc['name']} por {current_user.username}")
        return npc

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao criar NPC: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao criar NPC"
        )


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
    try:
        npc_service = NPCService(db)
        npc = await npc_service.get_npc(npc_id, str(current_user.id))

        return npc

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao obter NPC: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao obter NPC"
        )


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
    try:
        npc_service = NPCService(db)
        updated_npc = await npc_service.update_npc(npc_id, str(current_user.id), updates)

        logger.info(f"NPC atualizado: {npc_id} por {current_user.username}")
        return updated_npc

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao atualizar NPC: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao atualizar NPC"
        )


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
    try:
        npc_service = NPCService(db)
        await npc_service.delete_npc(npc_id, str(current_user.id))

        logger.info(f"NPC deletado: {npc_id} por {current_user.username}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao deletar NPC: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao deletar NPC"
        )


@router.get("/campaign/{campaign_id}", response_model=List[NPCListSchema])
async def list_campaign_npcs(
        campaign_id: str = Path(..., title="ID da campanha"),
        skip: int = Query(0, ge=0),
        limit: int = Query(50, ge=1, le=100),
        npc_type: Optional[str] = Query(None, max_length=50),
        cr_min: Optional[str] = Query(None),
        cr_max: Optional[str] = Query(None),
        search: Optional[str] = Query(None, max_length=100),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Lista NPCs de uma campanha.

    O usuário deve ser DM ou jogador da campanha.
    """
    try:
        # Verificar acesso à campanha
        await verify_campaign_access(campaign_id, current_user, db)

        npc_service = NPCService(db)

        # Preparar filtros
        filters = {}
        if npc_type:
            filters["type"] = npc_type
        if cr_min and cr_max:
            filters["cr_min"] = cr_min
            filters["cr_max"] = cr_max
        if search:
            filters["search"] = search

        npcs = await npc_service.list_npcs_for_campaign(
            campaign_id, str(current_user.id), skip, limit, filters
        )

        return npcs

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao listar NPCs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao listar NPCs"
        )


@router.post("/{npc_id}/duplicate", response_model=NPCSchema, status_code=status.HTTP_201_CREATED)
async def duplicate_npc(
        npc_id: str = Path(..., title="ID do NPC"),
        new_name: Optional[str] = Body(None, embed=True),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Duplica um NPC existente.

    O usuário deve ser o DM da campanha.
    """
    try:
        npc_service = NPCService(db)
        duplicated_npc = await npc_service.duplicate_npc(
            npc_id, str(current_user.id), new_name
        )

        logger.info(f"NPC duplicado: {npc_id} por {current_user.username}")
        return duplicated_npc

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao duplicar NPC: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao duplicar NPC"
        )


@router.post("/bulk-import", response_model=List[NPCSchema], status_code=status.HTTP_201_CREATED)
async def bulk_import_npcs(
        import_data: NPCBulkImportSchema,
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Importa múltiplos NPCs de uma vez.

    O usuário deve ser DM das campanhas especificadas.
    """
    try:
        npc_service = NPCService(db)
        created_npcs = []
        errors = []

        for i, npc_data in enumerate(import_data.npcs):
            try:
                # Verificar acesso à campanha para cada NPC
                await verify_campaign_access(npc_data.campaign_id, current_user, db, require_dm=True)

                # Criar NPC
                created_npc = await npc_service.create_npc(npc_data, str(current_user.id))
                created_npcs.append(created_npc)

            except Exception as e:
                error_msg = f"Erro no NPC {i + 1} ({npc_data.name}): {str(e)}"
                errors.append(error_msg)
                logger.warning(error_msg)

        if errors:
            # Se houve erros, incluir na resposta
            logger.warning(f"Importação em lote com {len(errors)} erros")

        logger.info(f"Importação em lote: {len(created_npcs)} NPCs criados por {current_user.username}")

        return created_npcs

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro na importação em lote: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno na importação em lote"
        )


@router.get("/campaign/{campaign_id}/summary", response_model=List[NPCSummarySchema])
async def get_campaign_npcs_summary(
        campaign_id: str = Path(..., title="ID da campanha"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Obtém resumo dos NPCs da campanha (para combate).

    Retorna apenas informações essenciais para combate.
    """
    try:
        # Verificar acesso à campanha
        await verify_campaign_access(campaign_id, current_user, db)

        npc_service = NPCService(db)
        npcs = await npc_service.list_npcs_for_campaign(
            campaign_id, str(current_user.id), 0, 1000  # Buscar todos
        )

        # Converter para resumo
        summaries = []
        for npc in npcs:
            summary = NPCSummarySchema(
                _id=npc["_id"],
                name=npc["name"],
                armor_class=npc["armor_class"],
                hit_points=npc["hit_points"],
                speed_walk=npc["speed_walk"],
                initiative_modifier=npc.get("initiative_modifier"),
                challenge_rating=npc["challenge_rating"],
                size=npc["size"],
                type=npc["type"]
            )
            summaries.append(summary)

        return summaries

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao obter resumo de NPCs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao obter resumo"
        )


@router.get("/campaign/{campaign_id}/stats", response_model=Dict[str, Any])
async def get_npc_stats(
        campaign_id: str = Path(..., title="ID da campanha"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Obtém estatísticas dos NPCs da campanha.

    O usuário deve ser DM ou jogador da campanha.
    """
    try:
        # Verificar acesso à campanha
        await verify_campaign_access(campaign_id, current_user, db)

        npc_service = NPCService(db)
        stats = await npc_service.get_npc_stats(campaign_id, str(current_user.id))

        return stats

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao obter estatísticas de NPCs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao obter estatísticas"
        )


@router.get("/campaign/{campaign_id}/types", response_model=List[str])
async def get_npc_types(
        campaign_id: str = Path(..., title="ID da campanha"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Obtém lista de tipos de NPCs na campanha.

    Útil para filtros.
    """
    try:
        # Verificar acesso à campanha
        await verify_campaign_access(campaign_id, current_user, db)

        # Buscar tipos únicos de NPCs na campanha
        from app.utils.id_handler import IdHandler

        campaign_object_id = IdHandler.to_object_id(campaign_id)
        if not campaign_object_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="ID de campanha inválido"
            )

        pipeline = [
            {"$match": {"campaign_id": campaign_object_id}},
            {"$group": {"_id": "$type"}},
            {"$sort": {"_id": 1}}
        ]

        cursor = db.npcs.aggregate(pipeline)
        types = [doc["_id"] async for doc in cursor]

        return types

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao obter tipos de NPCs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao obter tipos"
        )


@router.get("/campaign/{campaign_id}/challenge-ratings", response_model=List[str])
async def get_npc_challenge_ratings(
        campaign_id: str = Path(..., title="ID da campanha"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Obtém lista de Challenge Ratings dos NPCs na campanha.

    Útil para filtros.
    """
    try:
        # Verificar acesso à campanha
        await verify_campaign_access(campaign_id, current_user, db)

        # Buscar CRs únicos de NPCs na campanha
        from app.utils.id_handler import IdHandler

        campaign_object_id = IdHandler.to_object_id(campaign_id)
        if not campaign_object_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="ID de campanha inválido"
            )

        pipeline = [
            {"$match": {"campaign_id": campaign_object_id}},
            {"$group": {"_id": "$challenge_rating"}},
            {"$sort": {"_id": 1}}
        ]

        cursor = db.npcs.aggregate(pipeline)
        crs = [doc["_id"] async for doc in cursor]

        # Ordenar CRs corretamente (0, 1/8, 1/4, 1/2, 1, 2, ...)
        def cr_sort_key(cr):
            if cr == "0":
                return 0
            elif cr == "1/8":
                return 0.125
            elif cr == "1/4":
                return 0.25
            elif cr == "1/2":
                return 0.5
            else:
                try:
                    return int(cr)
                except ValueError:
                    return 999  # CRs inválidos vão para o final

        crs.sort(key=cr_sort_key)

        return crs

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao obter Challenge Ratings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao obter Challenge Ratings"
        )