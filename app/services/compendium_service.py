# app/services/compendium_service.py
from typing import List, Dict, Optional, Any, Union
from bson import ObjectId
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.schemas.compendium import (
    SpellSchema, ItemSchema, MonsterTemplateSchema, CompendiumSearchSchema,
    SpellListSchema, ItemListSchema, MonsterListSchema
)


class CompendiumService:
    """
    Serviço para gerenciar o compêndio de D&D.

    Responsável por:
    - Buscar magias, itens e monstros
    - Filtrar resultados por diversos critérios
    - Fornecer detalhes específicos para cada tipo de entrada
    """

    def __init__(self, db: AsyncIOMotorDatabase):
        """
        Inicializa o serviço com a conexão de banco de dados.

        Args:
            db: Conexão com o banco de dados MongoDB
        """
        self.db = db

    async def search_spells(
            self,
            query: Optional[str] = None,
            level_min: Optional[int] = None,
            level_max: Optional[int] = None,
            school: Optional[str] = None,
            classes: Optional[List[str]] = None,
            limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Busca magias no compêndio.

        Args:
            query: Termo de busca (opcional)
            level_min: Nível mínimo (opcional)
            level_max: Nível máximo (opcional)
            school: Escola de magia (opcional)
            classes: Lista de classes que podem usar a magia (opcional)
            limit: Limite de resultados (padrão: 50)

        Returns:
            Lista de magias
        """
        # Construir a query
        filter_query = {}

        if query:
            # Busca por texto em nome e descrição
            filter_query["$or"] = [
                {"name": {"$regex": query, "$options": "i"}},
                {"description": {"$regex": query, "$options": "i"}}
            ]

        # Filtrar por nível
        if level_min is not None or level_max is not None:
            filter_query["level"] = {}

            if level_min is not None:
                filter_query["level"]["$gte"] = level_min

            if level_max is not None:
                filter_query["level"]["$lte"] = level_max

        # Filtrar por escola
        if school:
            filter_query["school"] = {"$regex": f"^{school}$", "$options": "i"}

        # Filtrar por classes
        if classes:
            # A magia deve estar disponível para pelo menos uma das classes especificadas
            class_query = []
            for class_name in classes:
                class_query.append({"classes": {"$regex": class_name, "$options": "i"}})

            if class_query:
                filter_query["$or"] = filter_query.get("$or", []) + class_query

        # Executar a busca
        cursor = self.db.spells.find(filter_query).limit(limit)
        spells = await cursor.to_list(length=limit)

        return spells

    async def get_spell(self, spell_id: str) -> Dict[str, Any]:
        """
        Obtém uma magia pelo ID.

        Args:
            spell_id: ID da magia

        Returns:
            Dados da magia

        Raises:
            HTTPException: Se a magia não for encontrada
        """
        spell = await self.db.spells.find_one({"_id": ObjectId(spell_id)})

        if not spell:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Magia com ID {spell_id} não encontrada"
            )

        return spell

    async def search_items(
            self,
            query: Optional[str] = None,
            item_type: Optional[str] = None,
            rarity: Optional[str] = None,
            requires_attunement: Optional[bool] = None,
            limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Busca itens no compêndio.

        Args:
            query: Termo de busca (opcional)
            item_type: Tipo de item (opcional)
            rarity: Raridade do item (opcional)
            requires_attunement: Se requer sintonia (opcional)
            limit: Limite de resultados (padrão: 50)

        Returns:
            Lista de itens
        """
        # Construir a query
        filter_query = {}

        if query:
            # Busca por texto em nome e descrição
            filter_query["$or"] = [
                {"name": {"$regex": query, "$options": "i"}},
                {"description": {"$regex": query, "$options": "i"}}
            ]

        # Filtrar por tipo
        if item_type:
            filter_query["type"] = {"$regex": item_type, "$options": "i"}

        # Filtrar por raridade
        if rarity:
            filter_query["rarity"] = {"$regex": f"^{rarity}$", "$options": "i"}

        # Filtrar por sintonia
        if requires_attunement is not None:
            filter_query["requires_attunement"] = requires_attunement

        # Executar a busca
        cursor = self.db.items.find(filter_query).limit(limit)
        items = await cursor.to_list(length=limit)

        return items

    async def get_item(self, item_id: str) -> Dict[str, Any]:
        """
        Obtém um item pelo ID.

        Args:
            item_id: ID do item

        Returns:
            Dados do item

        Raises:
            HTTPException: Se o item não for encontrado
        """
        item = await self.db.items.find_one({"_id": ObjectId(item_id)})

        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Item com ID {item_id} não encontrado"
            )

        return item

    async def search_monsters(
            self,
            query: Optional[str] = None,
            monster_type: Optional[str] = None,
            challenge_rating_min: Optional[str] = None,
            challenge_rating_max: Optional[str] = None,
            size: Optional[str] = None,
            limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Busca monstros no compêndio.

        Args:
            query: Termo de busca (opcional)
            monster_type: Tipo de monstro (opcional)
            challenge_rating_min: CR mínimo (opcional)
            challenge_rating_max: CR máximo (opcional)
            size: Tamanho do monstro (opcional)
            limit: Limite de resultados (padrão: 50)

        Returns:
            Lista de monstros
        """
        # Construir a query
        filter_query = {}

        if query:
            # Busca por texto em nome e tipo
            filter_query["$or"] = [
                {"name": {"$regex": query, "$options": "i"}},
                {"type": {"$regex": query, "$options": "i"}}
            ]

        # Filtrar por tipo
        if monster_type:
            filter_query["type"] = {"$regex": monster_type, "$options": "i"}

        # Filtrar por tamanho
        if size:
            filter_query["size"] = {"$regex": f"^{size}$", "$options": "i"}

        # Filtrar por CR é mais complexo pois CR pode ser fracionário ("1/4", "1/2", etc.)
        # ou numérico ("1", "2", etc.)
        # Seria necessário converter para valores numéricos para comparação
        # Por simplicidade, apenas filtramos por match exato
        if challenge_rating_min or challenge_rating_max:
            # Implementação simplificada
            filter_query["challenge_rating"] = {}

            if challenge_rating_min:
                filter_query["challenge_rating"]["$gte"] = challenge_rating_min

            if challenge_rating_max:
                filter_query["challenge_rating"]["$lte"] = challenge_rating_max

        # Executar a busca
        cursor = self.db.monster_templates.find(filter_query).limit(limit)
        monsters = await cursor.to_list(length=limit)

        return monsters

    async def get_monster(self, monster_id: str) -> Dict[str, Any]:
        """
        Obtém um monstro pelo ID.

        Args:
            monster_id: ID do monstro

        Returns:
            Dados do monstro

        Raises:
            HTTPException: Se o monstro não for encontrado
        """
        monster = await self.db.monster_templates.find_one({"_id": ObjectId(monster_id)})

        if not monster:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Monstro com ID {monster_id} não encontrado"
            )

        return monster

    async def search_compendium(self, search_data: CompendiumSearchSchema) -> Dict[str, List[Dict[str, Any]]]:
        """
        Busca no compêndio por magias, itens e monstros.

        Args:
            search_data: Dados da busca

        Returns:
            Resultados categorizados por tipo
        """
        query = search_data.query
        type_filter = search_data.type

        results = {
            "spells": [],
            "items": [],
            "monsters": []
        }

        # Buscar magias se nenhum tipo específico for fornecido ou o tipo for "spell"
        if not type_filter or type_filter == "spell":
            results["spells"] = await self.search_spells(
                query=query,
                level_min=search_data.level_min,
                level_max=search_data.level_max,
                school=search_data.school,
                classes=search_data.classes
            )

        # Buscar itens se nenhum tipo específico for fornecido ou o tipo for "item"
        if not type_filter or type_filter == "item":
            results["items"] = await self.search_items(
                query=query,
                item_type=search_data.item_type,
                rarity=search_data.rarity
            )

        # Buscar monstros se nenhum tipo específico for fornecido ou o tipo for "monster"
        if not type_filter or type_filter == "monster":
            results["monsters"] = await self.search_monsters(
                query=query,
                monster_type=search_data.monster_type,
                challenge_rating_min=search_data.challenge_rating_min,
                challenge_rating_max=search_data.challenge_rating_max
            )

        return results

    async def get_class_spells(self, class_name: str, level: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Obtém todas as magias disponíveis para uma classe específica, com filtro opcional por nível.

        Args:
            class_name: Nome da classe
            level: Nível das magias (opcional)

        Returns:
            Lista de magias
        """
        # Construir a query
        filter_query = {
            "classes": {"$regex": class_name, "$options": "i"}
        }

        # Filtrar por nível se especificado
        if level is not None:
            filter_query["level"] = level

        # Executar a busca
        cursor = self.db.spells.find(filter_query).sort("level", 1)
        spells = await cursor.to_list(length=100)

        return spells

    async def get_spell_classes(self, spell_id: str) -> List[str]:
        """
        Obtém a lista de classes que podem usar uma magia específica.

        Args:
            spell_id: ID da magia

        Returns:
            Lista de classes

        Raises:
            HTTPException: Se a magia não for encontrada
        """
        spell = await self.get_spell(spell_id)
        return spell.get("classes", [])

    async def get_monster_types(self) -> List[str]:
        """
        Obtém a lista de todos os tipos de monstros disponíveis no compêndio.

        Returns:
            Lista de tipos de monstros
        """
        # Agrupar por tipo e retornar a lista única
        pipeline = [
            {
                "$group": {
                    "_id": "$type"
                }
            },
            {
                "$sort": {
                    "_id": 1
                }
            }
        ]

        cursor = self.db.monster_templates.aggregate(pipeline)
        types = await cursor.to_list(length=100)

        return [t["_id"] for t in types]

    async def get_monster_challenge_ratings(self) -> List[str]:
        """
        Obtém a lista de todos os CRs de monstros disponíveis no compêndio.

        Returns:
            Lista de CRs
        """
        # Agrupar por CR e retornar a lista única
        pipeline = [
            {
                "$group": {
                    "_id": "$challenge_rating"
                }
            },
            {
                "$sort": {
                    "_id": 1
                }
            }
        ]

        cursor = self.db.monster_templates.aggregate(pipeline)
        crs = await cursor.to_list(length=100)

        return [cr["_id"] for cr in crs]

    async def get_item_types(self) -> List[str]:
        """
        Obtém a lista de todos os tipos de itens disponíveis no compêndio.

        Returns:
            Lista de tipos de itens
        """
        # Agrupar por tipo e retornar a lista única
        pipeline = [
            {
                "$group": {
                    "_id": "$type"
                }
            },
            {
                "$sort": {
                    "_id": 1
                }
            }
        ]

        cursor = self.db.items.aggregate(pipeline)
        types = await cursor.to_list(length=100)

        return [t["_id"] for t in types]

    async def get_item_rarities(self) -> List[str]:
        """
        Obtém a lista de todas as raridades de itens disponíveis no compêndio.

        Returns:
            Lista de raridades
        """
        # Agrupar por raridade e retornar a lista única
        pipeline = [
            {
                "$group": {
                    "_id": "$rarity"
                }
            },
            {
                "$sort": {
                    "_id": 1
                }
            }
        ]

        cursor = self.db.items.aggregate(pipeline)
        rarities = await cursor.to_list(length=100)

        return [r["_id"] for r in rarities]

    async def get_spell_schools(self) -> List[str]:
        """
        Obtém a lista de todas as escolas de magia disponíveis no compêndio.

        Returns:
            Lista de escolas
        """
        # Agrupar por escola e retornar a lista única
        pipeline = [
            {
                "$group": {
                    "_id": "$school"
                }
            },
            {
                "$sort": {
                    "_id": 1
                }
            }
        ]

        cursor = self.db.spells.aggregate(pipeline)
        schools = await cursor.to_list(length=100)

        return [s["_id"] for s in schools]

    async def get_spell_classes_list(self) -> List[str]:
        """
        Obtém a lista de todas as classes que têm acesso a magias no compêndio.

        Returns:
            Lista de classes
        """
        # Este é mais complexo pois as classes são armazenadas como uma lista em cada magia
        # Uma abordagem simplificada seria retornar uma lista fixa das classes principais
        return [
            "Bard", "Cleric", "Druid", "Paladin", "Ranger",
            "Sorcerer", "Warlock", "Wizard", "Artificer"
        ]