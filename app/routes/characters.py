# app/routes/characters.py
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Body, Path, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db import get_database
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.character import (
    CharacterCreateSchema, CharacterUpdateSchema, CharacterSchema, CharacterListSchema
)
from app.services.character_service import CharacterService

router = APIRouter(
    prefix="/api/characters",
    tags=["characters"],
    responses={404: {"description": "Not found"}},
)


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
    character_service = CharacterService(db)

    # Verificar se o usuário é o proprietário do personagem
    if character_data.owner_id != str(current_user.id):
        # Verificar se é o DM da campanha
        campaign = await db.campaigns.find_one({"_id": character_data.campaign_id})
        if not campaign or campaign.get("dm_id") != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você só pode criar personagens para si mesmo ou como DM"
            )

    return await character_service.create_character(character_data)


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
    character_service = CharacterService(db)
    return await character_service.get_character(character_id, str(current_user.id))


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
    character_service = CharacterService(db)
    return await character_service.update_character(character_id, str(current_user.id), updates)


@router.delete("/{character_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_character(
        character_id: str = Path(..., title="ID do personagem"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Exclui um personagem.

    O usuário deve ser o proprietário do personagem ou o DM da campanha.
    """
    character_service = CharacterService(db)
    success = await character_service.delete_character(character_id, str(current_user.id))

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao excluir o personagem"
        )


@router.get("/user/me", response_model=List[CharacterListSchema])
async def list_my_characters(
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Lista todos os personagens do usuário atual.
    """
    character_service = CharacterService(db)
    return await character_service.list_characters_for_user(str(current_user.id))


@router.get("/campaign/{campaign_id}", response_model=List[CharacterListSchema])
async def list_campaign_characters(
        campaign_id: str = Path(..., title="ID da campanha"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Lista todos os personagens de uma campanha específica.

    O usuário deve ser um jogador da campanha ou o DM.
    """
    character_service = CharacterService(db)
    return await character_service.list_characters_for_campaign(campaign_id, str(current_user.id))


@router.patch("/{character_id}/hp", response_model=CharacterSchema)
async def update_character_hp(
        hp_change: int = Body(..., embed=True),
        is_temp: bool = Body(False, embed=True),
        character_id: str = Path(..., title="ID do personagem"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Atualiza os pontos de vida de um personagem.

    O usuário deve ser o proprietário do personagem ou o DM da campanha.
    O hp_change pode ser positivo (cura) ou negativo (dano).
    O parâmetro is_temp indica se a alteração é no HP temporário.
    """
    character_service = CharacterService(db)
    return await character_service.update_hp(
        character_id, str(current_user.id), hp_change, is_temp
    )


@router.post("/{character_id}/conditions/{condition}", response_model=CharacterSchema)
async def add_condition(
        character_id: str = Path(..., title="ID do personagem"),
        condition: str = Path(..., title="Nome da condição"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Adiciona uma condição a um personagem.

    O usuário deve ser o proprietário do personagem ou o DM da campanha.
    """
    character_service = CharacterService(db)
    return await character_service.add_condition(
        character_id, str(current_user.id), condition
    )


@router.delete("/{character_id}/conditions/{condition}", response_model=CharacterSchema)
async def remove_condition(
        character_id: str = Path(..., title="ID do personagem"),
        condition: str = Path(..., title="Nome da condição"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Remove uma condição de um personagem.

    O usuário deve ser o proprietário do personagem ou o DM da campanha.
    """
    character_service = CharacterService(db)
    return await character_service.remove_condition(
        character_id, str(current_user.id), condition
    )


@router.post("/{character_id}/roll/{ability}", response_model=Dict[str, Any])
async def roll_ability_check(
        character_id: str = Path(..., title="ID do personagem"),
        ability: str = Path(..., title="Atributo a ser testado"),
        advantage: bool = Query(False, title="Rolar com vantagem"),
        disadvantage: bool = Query(False, title="Rolar com desvantagem"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Realiza uma rolagem de teste de atributo para um personagem.

    O usuário deve ser o proprietário do personagem ou o DM da campanha.
    """
    character_service = CharacterService(db)
    return await character_service.roll_ability_check(
        character_id, str(current_user.id), ability, advantage, disadvantage
    )