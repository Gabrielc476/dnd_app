# app/routes/characters.py
"""
Character routes - CORRIGIDO
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
from app.dependencies import get_current_user, verify_character_access
from app.models.user import User
from app.schemas.character import (
    CharacterCreateSchema, CharacterUpdateSchema, CharacterSchema, CharacterListSchema
)
from app.services.character_service import CharacterService
from app.utils.id_handler import IdHandler

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/", response_model=CharacterSchema, status_code=status.HTTP_201_CREATED)
async def create_character(
        character_data: CharacterCreateSchema,
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Cria um novo personagem.

    O personagem será associado ao usuário atual e à campanha especificada.
    Apenas o proprietário do personagem ou o DM da campanha podem criar personagens.
    """
    try:
        character_service = CharacterService(db)

        # Verificar se o usuário é o proprietário do personagem
        if character_data.owner_id != str(current_user.id):
            # Verificar se é o DM da campanha
            campaign_id_obj = IdHandler.to_object_id(character_data.campaign_id)
            if not campaign_id_obj:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="ID de campanha inválido"
                )

            campaign = await db.campaigns.find_one({"_id": campaign_id_obj})
            if not campaign or campaign.get("dm_id") != str(current_user.id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Você só pode criar personagens para si mesmo ou como DM"
                )

        character = await character_service.create_character(character_data)
        logger.info(f"Personagem criado: {character.get('name')} por {current_user.username}")
        return character

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao criar personagem: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao criar personagem"
        )


@router.get("/", response_model=List[CharacterListSchema])
async def list_characters(
        campaign_id: Optional[str] = Query(None),
        owner_id: Optional[str] = Query(None),
        skip: int = Query(0, ge=0),
        limit: int = Query(50, ge=1, le=100),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Lista personagens.

    Por padrão lista apenas personagens do usuário atual.
    DM pode listar personagens de suas campanhas.
    """
    try:
        character_service = CharacterService(db)
        characters = await character_service.list_characters(
            str(current_user.id), campaign_id, owner_id, skip, limit
        )
        return characters

    except Exception as e:
        logger.error(f"Erro ao listar personagens: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao listar personagens"
        )


@router.get("/{character_id}", response_model=CharacterSchema)
async def get_character(
        character_id: str = Path(..., title="ID do personagem"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Obtém os detalhes de um personagem específico.

    O usuário deve ser o proprietário do personagem ou o DM da campanha.
    """
    try:
        character = await verify_character_access(character_id, current_user, db, allow_dm=True)
        character_service = CharacterService(db)
        return await character_service.get_character(character_id, str(current_user.id))

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao obter personagem: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao obter personagem"
        )


@router.put("/{character_id}", response_model=CharacterSchema)
async def update_character(
        updates: CharacterUpdateSchema,
        character_id: str = Path(..., title="ID do personagem"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Atualiza um personagem existente.

    O usuário deve ser o proprietário do personagem ou o DM da campanha.
    Apenas os campos especificados serão atualizados.
    """
    try:
        # Verificar acesso ao personagem
        await verify_character_access(character_id, current_user, db, allow_dm=True)

        character_service = CharacterService(db)
        character = await character_service.update_character(character_id, updates, str(current_user.id))

        logger.info(f"Personagem atualizado: {character_id} por {current_user.username}")
        return character

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao atualizar personagem: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao atualizar personagem"
        )


@router.delete("/{character_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_character(
        character_id: str = Path(..., title="ID do personagem"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Remove um personagem.

    O usuário deve ser o proprietário do personagem ou o DM da campanha.
    Esta operação não pode ser desfeita.
    """
    try:
        # Verificar acesso ao personagem
        await verify_character_access(character_id, current_user, db, allow_dm=True)

        character_service = CharacterService(db)
        await character_service.delete_character(character_id, str(current_user.id))

        logger.info(f"Personagem removido: {character_id} por {current_user.username}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao remover personagem: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao remover personagem"
        )


@router.get("/{character_id}/stats", response_model=Dict[str, Any])
async def get_character_stats(
        character_id: str = Path(..., title="ID do personagem"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Obtém estatísticas calculadas do personagem.

    Inclui modificadores, CA, pontos de vida, etc.
    """
    try:
        # Verificar acesso ao personagem
        await verify_character_access(character_id, current_user, db, allow_dm=True)

        character_service = CharacterService(db)
        stats = await character_service.get_character_stats(character_id)

        return stats

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao obter estatísticas do personagem: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao obter estatísticas"
        )


@router.post("/{character_id}/level-up", response_model=CharacterSchema)
async def level_up_character(
        character_id: str = Path(..., title="ID do personagem"),
        hp_increase: int = Body(..., ge=1, le=20, embed=True),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Aumenta o nível do personagem.

    Apenas o proprietário do personagem pode fazer isso.
    """
    try:
        # Verificar se é o proprietário (DM não pode subir nível de outros personagens)
        await verify_character_access(character_id, current_user, db, allow_dm=False)

        character_service = CharacterService(db)
        character = await character_service.level_up_character(character_id, hp_increase)

        logger.info(f"Personagem subiu de nível: {character_id} por {current_user.username}")
        return character

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao subir nível do personagem: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao subir nível"
        )


@router.post("/{character_id}/rest", response_model=CharacterSchema)
async def rest_character(
        character_id: str = Path(..., title="ID do personagem"),
        rest_type: str = Body(..., regex="^(short|long)$", embed=True),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Faz o personagem descansar (short ou long rest).

    Restaura recursos baseado no tipo de descanso.
    """
    try:
        # Verificar acesso ao personagem
        await verify_character_access(character_id, current_user, db, allow_dm=True)

        character_service = CharacterService(db)
        character = await character_service.rest_character(character_id, rest_type)

        logger.info(f"Personagem descansou ({rest_type}): {character_id}")
        return character

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao fazer personagem descansar: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno no descanso"
        )