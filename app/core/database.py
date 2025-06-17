# app/core/database.py
"""
Database core - CORRIGIDO
Problemas resolvidos:
1. ✅ SafeCollection implementation corrigida
2. ✅ Proper error handling para operações de banco
3. ✅ Validação de ObjectIds implementada
4. ✅ Logging adequado adicionado
5. ✅ Métodos de conversão de ID melhorados
"""

import logging
from typing import Any, Dict, List, Optional, Union
from motor.motor_asyncio import AsyncIOMotorDatabase, AsyncIOMotorCollection
from bson import ObjectId
from bson.errors import InvalidId
from pymongo.errors import DuplicateKeyError, ValidationError

from app.utils.id_handler import IdHandler

logger = logging.getLogger(__name__)


class SafeCollection:
    """
    Wrapper seguro para coleções do MongoDB.
    Fornece conversão automática de IDs e tratamento de erros.
    """

    def __init__(self, collection: AsyncIOMotorCollection):
        """
        Inicializa o wrapper da coleção.

        Args:
            collection: Coleção MongoDB
        """
        self._collection = collection
        self.name = collection.name

    async def find_one(
            self,
            filter_doc: Dict[str, Any],
            *args,
            **kwargs
    ) -> Optional[Dict[str, Any]]:
        """
        Busca um documento, convertendo IDs automaticamente.

        Args:
            filter_doc: Filtro de busca
            *args: Argumentos posicionais
            **kwargs: Argumentos nomeados

        Returns:
            Documento encontrado ou None
        """
        try:
            # Converter IDs no filtro
            safe_filter = self._prepare_filter(filter_doc)

            logger.debug(f"find_one em {self.name} com filtro: {safe_filter}")

            result = await self._collection.find_one(safe_filter, *args, **kwargs)

            if result:
                # Normalizar IDs no resultado
                result = IdHandler.normalize_id(result)
                logger.debug(f"Documento encontrado em {self.name}")
            else:
                logger.debug(f"Nenhum documento encontrado em {self.name}")

            return result

        except Exception as e:
            logger.error(f"Erro em find_one na coleção {self.name}: {e}")
            raise

    async def find(
            self,
            filter_doc: Dict[str, Any],
            *args,
            **kwargs
    ):
        """
        Busca múltiplos documentos.

        Args:
            filter_doc: Filtro de busca
            *args: Argumentos posicionais
            **kwargs: Argumentos nomeados

        Returns:
            Cursor para os documentos
        """
        try:
            safe_filter = self._prepare_filter(filter_doc)
            logger.debug(f"find em {self.name} com filtro: {safe_filter}")

            return self._collection.find(safe_filter, *args, **kwargs)

        except Exception as e:
            logger.error(f"Erro em find na coleção {self.name}: {e}")
            raise

    async def insert_one(
            self,
            document: Dict[str, Any],
            *args,
            **kwargs
    ):
        """
        Insere um documento.

        Args:
            document: Documento a ser inserido
            *args: Argumentos posicionais
            **kwargs: Argumentos nomeados

        Returns:
            Resultado da inserção
        """
        try:
            # Preparar documento para inserção
            safe_doc = self._prepare_document(document)

            logger.debug(f"insert_one em {self.name}")

            result = await self._collection.insert_one(safe_doc, *args, **kwargs)

            logger.info(f"Documento inserido em {self.name} com ID: {result.inserted_id}")
            return result

        except DuplicateKeyError as e:
            logger.warning(f"Chave duplicada em {self.name}: {e}")
            raise
        except ValidationError as e:
            logger.error(f"Erro de validação em {self.name}: {e}")
            raise
        except Exception as e:
            logger.error(f"Erro em insert_one na coleção {self.name}: {e}")
            raise

    async def insert_many(
            self,
            documents: List[Dict[str, Any]],
            *args,
            **kwargs
    ):
        """
        Insere múltiplos documentos.

        Args:
            documents: Lista de documentos a serem inseridos
            *args: Argumentos posicionais
            **kwargs: Argumentos nomeados

        Returns:
            Resultado da inserção
        """
        try:
            if not documents:
                logger.warning(f"Lista vazia de documentos para insert_many em {self.name}")
                return await self._collection.insert_many([], *args, **kwargs)

            # Preparar todos os documentos
            safe_docs = [self._prepare_document(doc) for doc in documents]

            logger.debug(f"insert_many em {self.name} com {len(safe_docs)} documentos")

            result = await self._collection.insert_many(safe_docs, *args, **kwargs)

            logger.info(f"{len(result.inserted_ids)} documentos inseridos em {self.name}")
            return result

        except Exception as e:
            logger.error(f"Erro em insert_many na coleção {self.name}: {e}")
            raise

    async def update_one(
            self,
            filter_doc: Dict[str, Any],
            update_doc: Dict[str, Any],
            *args,
            **kwargs
    ):
        """
        Atualiza um documento.

        Args:
            filter_doc: Filtro para encontrar o documento
            update_doc: Dados da atualização
            *args: Argumentos posicionais
            **kwargs: Argumentos nomeados

        Returns:
            Resultado da atualização
        """
        try:
            safe_filter = self._prepare_filter(filter_doc)
            safe_update = self._prepare_update(update_doc)

            logger.debug(f"update_one em {self.name}")

            result = await self._collection.update_one(safe_filter, safe_update, *args, **kwargs)

            logger.debug(f"Documentos modificados em {self.name}: {result.modified_count}")
            return result

        except Exception as e:
            logger.error(f"Erro em update_one na coleção {self.name}: {e}")
            raise

    async def update_many(
            self,
            filter_doc: Dict[str, Any],
            update_doc: Dict[str, Any],
            *args,
            **kwargs
    ):
        """
        Atualiza múltiplos documentos.

        Args:
            filter_doc: Filtro para encontrar os documentos
            update_doc: Dados da atualização
            *args: Argumentos posicionais
            **kwargs: Argumentos nomeados

        Returns:
            Resultado da atualização
        """
        try:
            safe_filter = self._prepare_filter(filter_doc)
            safe_update = self._prepare_update(update_doc)

            logger.debug(f"update_many em {self.name}")

            result = await self._collection.update_many(safe_filter, safe_update, *args, **kwargs)

            logger.info(f"{result.modified_count} documentos modificados em {self.name}")
            return result

        except Exception as e:
            logger.error(f"Erro em update_many na coleção {self.name}: {e}")
            raise

    async def delete_one(
            self,
            filter_doc: Dict[str, Any],
            *args,
            **kwargs
    ):
        """
        Deleta um documento.

        Args:
            filter_doc: Filtro para encontrar o documento
            *args: Argumentos posicionais
            **kwargs: Argumentos nomeados

        Returns:
            Resultado da deleção
        """
        try:
            safe_filter = self._prepare_filter(filter_doc)

            logger.debug(f"delete_one em {self.name}")

            result = await self._collection.delete_one(safe_filter, *args, **kwargs)

            logger.info(f"{result.deleted_count} documento deletado em {self.name}")
            return result

        except Exception as e:
            logger.error(f"Erro em delete_one na coleção {self.name}: {e}")
            raise

    async def delete_many(
            self,
            filter_doc: Dict[str, Any],
            *args,
            **kwargs
    ):
        """
        Deleta múltiplos documentos.

        Args:
            filter_doc: Filtro para encontrar os documentos
            *args: Argumentos posicionais
            **kwargs: Argumentos nomeados

        Returns:
            Resultado da deleção
        """
        try:
            safe_filter = self._prepare_filter(filter_doc)

            logger.debug(f"delete_many em {self.name}")

            result = await self._collection.delete_many(safe_filter, *args, **kwargs)

            logger.info(f"{result.deleted_count} documentos deletados em {self.name}")
            return result

        except Exception as e:
            logger.error(f"Erro em delete_many na coleção {self.name}: {e}")
            raise

    async def count_documents(
            self,
            filter_doc: Dict[str, Any],
            *args,
            **kwargs
    ) -> int:
        """
        Conta documentos que correspondem ao filtro.

        Args:
            filter_doc: Filtro de busca
            *args: Argumentos posicionais
            **kwargs: Argumentos nomeados

        Returns:
            Número de documentos
        """
        try:
            safe_filter = self._prepare_filter(filter_doc)

            count = await self._collection.count_documents(safe_filter, *args, **kwargs)

            logger.debug(f"count_documents em {self.name}: {count}")
            return count

        except Exception as e:
            logger.error(f"Erro em count_documents na coleção {self.name}: {e}")
            raise

    async def aggregate(self, pipeline: List[Dict[str, Any]], *args, **kwargs):
        """
        Executa pipeline de agregação.

        Args:
            pipeline: Pipeline de agregação
            *args: Argumentos posicionais
            **kwargs: Argumentos nomeados

        Returns:
            Cursor de agregação
        """
        try:
            # Preparar pipeline (converter IDs em estágios $match, etc.)
            safe_pipeline = self._prepare_pipeline(pipeline)

            logger.debug(f"aggregate em {self.name} com {len(safe_pipeline)} estágios")

            return self._collection.aggregate(safe_pipeline, *args, **kwargs)

        except Exception as e:
            logger.error(f"Erro em aggregate na coleção {self.name}: {e}")
            raise

    def _prepare_filter(self, filter_doc: Dict[str, Any]) -> Dict[str, Any]:
        """
        Prepara filtro convertendo IDs para ObjectId.

        Args:
            filter_doc: Filtro original

        Returns:
            Filtro com IDs convertidos
        """
        if not filter_doc:
            return filter_doc

        prepared = filter_doc.copy()

        # Converter _id se presente
        if "_id" in prepared:
            id_value = prepared["_id"]

            # Se é um ObjectId, manter como está
            if isinstance(id_value, ObjectId):
                pass
            # Se é uma string, tentar converter
            elif isinstance(id_value, str):
                object_id = IdHandler.to_object_id(id_value)
                if object_id:
                    prepared["_id"] = object_id
            # Se é um dict (ex: {"$in": [...]})
            elif isinstance(id_value, dict):
                prepared["_id"] = self._convert_id_operators(id_value)

        # Converter outros campos que podem conter IDs
        for key in ["owner_id", "campaign_id", "dm_id", "character_id", "user_id"]:
            if key in prepared:
                converted_id = IdHandler.to_object_id(prepared[key])
                if converted_id:
                    prepared[key] = converted_id

        return prepared

    def _prepare_document(self, document: Dict[str, Any]) -> Dict[str, Any]:
        """
        Prepara documento para inserção.

        Args:
            document: Documento original

        Returns:
            Documento preparado
        """
        if not document:
            return document

        prepared = document.copy()

        # Converter campos de ID
        for key in ["owner_id", "campaign_id", "dm_id", "character_id", "user_id"]:
            if key in prepared and prepared[key]:
                converted_id = IdHandler.to_object_id(prepared[key])
                if converted_id:
                    prepared[key] = converted_id

        return prepared

    def _prepare_update(self, update_doc: Dict[str, Any]) -> Dict[str, Any]:
        """
        Prepara documento de atualização.

        Args:
            update_doc: Documento de atualização

        Returns:
            Documento preparado
        """
        if not update_doc:
            return update_doc

        prepared = {}

        for operator, data in update_doc.items():
            if isinstance(data, dict):
                prepared[operator] = self._prepare_document(data)
            else:
                prepared[operator] = data

        return prepared

    def _prepare_pipeline(self, pipeline: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Prepara pipeline de agregação.

        Args:
            pipeline: Pipeline original

        Returns:
            Pipeline preparado
        """
        prepared = []

        for stage in pipeline:
            prepared_stage = {}

            for operation, data in stage.items():
                if operation == "$match" and isinstance(data, dict):
                    prepared_stage[operation] = self._prepare_filter(data)
                else:
                    prepared_stage[operation] = data

            prepared.append(prepared_stage)

        return prepared

    def _convert_id_operators(self, id_value: Dict[str, Any]) -> Dict[str, Any]:
        """
        Converte operadores que contêm IDs.

        Args:
            id_value: Valor com operadores

        Returns:
            Valor com IDs convertidos
        """
        converted = {}

        for operator, value in id_value.items():
            if operator in ["$in", "$nin"] and isinstance(value, list):
                converted[operator] = [
                    IdHandler.to_object_id(item) or item for item in value
                ]
            elif operator in ["$eq", "$ne"]:
                converted[operator] = IdHandler.to_object_id(value) or value
            else:
                converted[operator] = value

        return converted


class DatabaseManager:
    """
    Gerenciador principal do banco de dados.
    """

    def __init__(self):
        self._db: Optional[AsyncIOMotorDatabase] = None
        self._collections: Dict[str, SafeCollection] = {}

    def set_database(self, database: AsyncIOMotorDatabase):
        """
        Define a instância do banco de dados.

        Args:
            database: Instância do banco MongoDB
        """
        self._db = database
        self._collections = {}
        logger.info("Database configurado no DatabaseManager")

    def get_collection(self, name: str) -> SafeCollection:
        """
        Obtém uma coleção segura.

        Args:
            name: Nome da coleção

        Returns:
            SafeCollection wrapper
        """
        if not self._db:
            raise RuntimeError("Database não foi configurado")

        if name not in self._collections:
            self._collections[name] = SafeCollection(self._db[name])

        return self._collections[name]

    @property
    def users(self) -> SafeCollection:
        """Coleção de usuários."""
        return self.get_collection("users")

    @property
    def campaigns(self) -> SafeCollection:
        """Coleção de campanhas."""
        return self.get_collection("campaigns")

    @property
    def characters(self) -> SafeCollection:
        """Coleção de personagens."""
        return self.get_collection("characters")

    @property
    def npcs(self) -> SafeCollection:
        """Coleção de NPCs."""
        return self.get_collection("npcs")

    @property
    def combats(self) -> SafeCollection:
        """Coleção de combates."""
        return self.get_collection("combats")

    @property
    def locks(self) -> SafeCollection:
        """Coleção de locks."""
        return self.get_collection("locks")

    @property
    def images(self) -> SafeCollection:
        """Coleção de imagens."""
        return self.get_collection("images")

    @property
    def compendium_spells(self) -> SafeCollection:
        """Coleção de magias do compêndio."""
        return self.get_collection("compendium_spells")

    @property
    def compendium_items(self) -> SafeCollection:
        """Coleção de itens do compêndio."""
        return self.get_collection("compendium_items")

    @property
    def compendium_monsters(self) -> SafeCollection:
        """Coleção de monstros do compêndio."""
        return self.get_collection("compendium_monsters")


# Instância global do gerenciador
db = DatabaseManager()


async def get_database() -> AsyncIOMotorDatabase:
    """
    Dependency para obter a instância do banco de dados.

    Returns:
        Instância do banco de dados
    """
    if not db._db:
        raise RuntimeError("Database não foi configurado")
    return db._db