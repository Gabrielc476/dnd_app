# app/routes/compendium.py
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Path, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db import get_database
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.compendium import (
    SpellSchema, ItemSchema, MonsterTemplateSchema, CompendiumSearchSchema,
    SpellListSchema, ItemListSchema, MonsterListSchema
)
from app.services.compendium_service import CompendiumService

router = APIRouter(
    prefix="/api/compendium",
    tags=["compendium"],
    responses={404: {"description": "Not found"}},
)


@router.get("/spells", response_model=List[SpellListSchema])
async def search_spells(
        query: Optional[str] = Query(None, title="Termo de busca"),
        level_min: Optional[int] = Query(None, title="Nível mínimo", ge=0, le=9),
        level_max: Optional[int] = Query(None, title="Nível máximo", ge=0, le=9),
        school: Optional[str] = Query(None, title="Escola de magia"),
        classes: Optional[str] = Query(None, title="Classes (separadas por vírgula)"),
        limit: int = Query(50, title="Limite de resultados", ge=1, le=100),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Busca magias no compêndio.

    Filtra por nome, nível, escola de magia e classes.
    """
    # Processar classes como lista
    classes_list = [c.strip() for c in classes.split(",")] if classes else None

    compendium_service = CompendiumService(db)
    return await compendium_service.search_spells(
        query=query,
        level_min=level_min,
        level_max=level_max,
        school=school,
        classes=classes_list,
        limit=limit
    )


@router.get("/spells/{spell_id}", response_model=SpellSchema)
async def get_spell(
        spell_id: str = Path(..., title="ID da magia"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Obtém os detalhes de uma magia específica.
    """
    compendium_service = CompendiumService(db)
    return await compendium_service.get_spell(spell_id)


@router.get("/items", response_model=List[ItemListSchema])
async def search_items(
        query: Optional[str] = Query(None, title="Termo de busca"),
        item_type: Optional[str] = Query(None, title="Tipo de item"),
        rarity: Optional[str] = Query(None, title="Raridade"),
        requires_attunement: Optional[bool] = Query(None, title="Requer sintonia"),
        limit: int = Query(50, title="Limite de resultados", ge=1, le=100),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Busca itens no compêndio.

    Filtra por nome, tipo, raridade e requisito de sintonia.
    """
    compendium_service = CompendiumService(db)
    return await compendium_service.search_items(
        query=query,
        item_type=item_type,
        rarity=rarity,
        requires_attunement=requires_attunement,
        limit=limit
    )


@router.get("/items/{item_id}", response_model=ItemSchema)
async def get_item(
        item_id: str = Path(..., title="ID do item"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Obtém os detalhes de um item específico.
    """
    compendium_service = CompendiumService(db)
    return await compendium_service.get_item(item_id)


@router.get("/monsters", response_model=List[MonsterListSchema])
async def search_monsters(
        query: Optional[str] = Query(None, title="Termo de busca"),
        monster_type: Optional[str] = Query(None, title="Tipo de monstro"),
        challenge_rating_min: Optional[str] = Query(None, title="CR mínimo"),
        challenge_rating_max: Optional[str] = Query(None, title="CR máximo"),
        size: Optional[str] = Query(None, title="Tamanho"),
        limit: int = Query(50, title="Limite de resultados", ge=1, le=100),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Busca monstros no compêndio.

    Filtra por nome, tipo, challenge rating e tamanho.
    """
    compendium_service = CompendiumService(db)
    return await compendium_service.search_monsters(
        query=query,
        monster_type=monster_type,
        challenge_rating_min=challenge_rating_min,
        challenge_rating_max=challenge_rating_max,
        size=size,
        limit=limit
    )


@router.get("/monsters/{monster_id}", response_model=MonsterTemplateSchema)
async def get_monster(
        monster_id: str = Path(..., title="ID do monstro"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Obtém os detalhes de um monstro específico.
    """
    compendium_service = CompendiumService(db)
    return await compendium_service.get_monster(monster_id)


@router.post("/search", response_model=Dict[str, List[Dict[str, Any]]])
async def search_compendium(
        search_data: CompendiumSearchSchema,
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Busca no compêndio por magias, itens e monstros.

    Retorna resultados categorizados por tipo.
    """
    compendium_service = CompendiumService(db)
    return await compendium_service.search_compendium(search_data)


@router.get("/class-spells/{class_name}", response_model=List[SpellListSchema])
async def get_class_spells(
        class_name: str = Path(..., title="Nome da classe"),
        level: Optional[int] = Query(None, title="Nível das magias", ge=0, le=9),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Obtém todas as magias disponíveis para uma classe específica, com filtro opcional por nível.
    """
    compendium_service = CompendiumService(db)
    return await compendium_service.get_class_spells(class_name, level)


@router.get("/metadata/monster-types", response_model=List[str])
async def get_monster_types(
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Obtém a lista de todos os tipos de monstros disponíveis no compêndio.
    """
    compendium_service = CompendiumService(db)
    return await compendium_service.get_monster_types()


@router.get("/metadata/challenge-ratings", response_model=List[str])
async def get_monster_challenge_ratings(
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Obtém a lista de todos os CRs de monstros disponíveis no compêndio.
    """
    compendium_service = CompendiumService(db)
    return await compendium_service.get_monster_challenge_ratings()


@router.get("/metadata/item-types", response_model=List[str])
async def get_item_types(
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Obtém a lista de todos os tipos de itens disponíveis no compêndio.
    """
    compendium_service = CompendiumService(db)
    return await compendium_service.get_item_types()


@router.get("/metadata/item-rarities", response_model=List[str])
async def get_item_rarities(
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Obtém a lista de todas as raridades de itens disponíveis no compêndio.
    """
    compendium_service = CompendiumService(db)
    return await compendium_service.get_item_rarities()


@router.get("/metadata/spell-schools", response_model=List[str])
async def get_spell_schools(
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Obtém a lista de todas as escolas de magia disponíveis no compêndio.
    """
    compendium_service = CompendiumService(db)
    return await compendium_service.get_spell_schools()


@router.get("/metadata/spell-classes", response_model=List[str])
async def get_spell_classes_list(
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Obtém a lista de todas as classes que têm acesso a magias no compêndio.
    """
    compendium_service = CompendiumService(db)
    return await compendium_service.get_spell_classes_list()