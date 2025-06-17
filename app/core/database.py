# app/core/database.py
"""
Database core - CORRIGIDO
Problemas resolvidos:
1. ✅ SafeCollection implementation corrigida
2. ✅ Proper error handling para operações de banco
3. ✅ Validação de ObjectIds implementada
4. ✅ Logging adequado adicionado
5. ✅ Métodos de conversão de ID melhorados
6. ✅ ValidationError removido (não existe no pymongo moderno)
"""

import logging
from typing import Any, Dict, List, Optional, Union
from motor.motor_asyncio import AsyncIOMotorDatabase, AsyncIOMotorCollection
from bson import ObjectId
from bson.errors import InvalidId
from pymongo.errors import DuplicateKeyError, WriteError, OperationFailure

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
            Cursor com resultados
        """
        try:
            # Converter IDs no filtro
            safe_filter = self._prepare_filter(filter_doc)

            logger.debug(f"find em {self.name} com filtro: {safe_filter}")

            cursor = self._collection.find(safe_filter, *args, **kwargs)

            # Converter cursor para list com IDs normalizados
            results = []
            async for document in cursor:
                results.append(IdHandler.normalize_id(document))

            logger.debug(f"Encontrados {len(results)} documentos em {self.name}")
            return results

        except Exception as e:
            logger.error(f"Erro em find na coleção {self.name}: {e}")
            raise

    async def insert_one(
            self,
            document: Dict[str, Any],
            **kwargs
    ) -> str:
        """
        Insere um documento.

        Args:
            document: Documento a ser inserido
            **kwargs: Argumentos adicionais

        Returns:
            ID do documento inserido
        """
        try:
            # Preparar documento
            safe_document = self._prepare_document(document)

            logger.debug(f"insert_one em {self.name}")

            result = await self._collection.insert_one(safe_document, **kwargs)

            document_id = str(result.inserted_id)
            logger.debug(f"Documento inserido em {self.name} com ID: {document_id}")

            return document_id

        except DuplicateKeyError as e:
            logger.warning(f"Documento duplicado em {self.name}: {e}")
            raise
        except Exception as e:
            logger.error(f"Erro em insert_one na coleção {self.name}: {e}")
            raise

    async def insert_many(
            self,
            documents: List[Dict[str, Any]],
            **kwargs
    ) -> List[str]:
        """
        Insere múltiplos documentos.

        Args:
            documents: Lista de documentos
            **kwargs: Argumentos adicionais

        Returns:
            Lista de IDs dos documentos inseridos
        """
        try:
            # Preparar documentos
            safe_documents = [self._prepare_document(doc) for doc in documents]

            logger.debug(f"insert_many em {self.name} - {len(safe_documents)} documentos")

            result = await self._collection.insert_many(safe_documents, **kwargs)

            document_ids = [str(doc_id) for doc_id in result.inserted_ids]
            logger.debug(f"Documentos inseridos em {self.name}: {len(document_ids)}")

            return document_ids

        except Exception as e:
            logger.error(f"Erro em insert_many na coleção {self.name}: {e}")
            raise

    async def update_one(
            self,
            filter_doc: Dict[str, Any],
            update_doc: Dict[str, Any],
            **kwargs
    ) -> bool:
        """
        Atualiza um documento.

        Args:
            filter_doc: Filtro para encontrar o documento
            update_doc: Operações de atualização
            **kwargs: Argumentos adicionais

        Returns:
            True se um documento foi modificado
        """
        try:
            # Converter IDs no filtro
            safe_filter = self._prepare_filter(filter_doc)
            safe_update = self._prepare_update(update_doc)

            logger.debug(f"update_one em {self.name}")

            result = await self._collection.update_one(safe_filter, safe_update, **kwargs)

            modified = result.modified_count > 0
            logger.debug(f"Documento {'modificado' if modified else 'não modificado'} em {self.name}")

            return modified

        except Exception as e:
            logger.error(f"Erro em update_one na coleção {self.name}: {e}")
            raise

    async def update_many(
            self,
            filter_doc: Dict[str, Any],
            update_doc: Dict[str, Any],
            **kwargs
    ) -> int:
        """
        Atualiza múltiplos documentos.

        Args:
            filter_doc: Filtro para encontrar documentos
            update_doc: Operações de atualização
            **kwargs: Argumentos adicionais

        Returns:
            Número de documentos modificados
        """
        try:
            # Converter IDs no filtro
            safe_filter = self._prepare_filter(filter_doc)
            safe_update = self._prepare_update(update_doc)

            logger.debug(f"update_many em {self.name}")

            result = await self._collection.update_many(safe_filter, safe_update, **kwargs)

            modified_count = result.modified_count
            logger.debug(f"{modified_count} documentos modificados em {self.name}")

            return modified_count

        except Exception as e:
            logger.error(f"Erro em update_many na coleção {self.name}: {e}")
            raise

    async def delete_one(
            self,
            filter_doc: Dict[str, Any],
            **kwargs
    ) -> bool:
        """
        Remove um documento.

        Args:
            filter_doc: Filtro para encontrar o documento
            **kwargs: Argumentos adicionais

        Returns:
            True se um documento foi removido
        """
        try:
            # Converter IDs no filtro
            safe_filter = self._prepare_filter(filter_doc)

            logger.debug(f"delete_one em {self.name}")

            result = await self._collection.delete_one(safe_filter, **kwargs)

            deleted = result.deleted_count > 0
            logger.debug(f"Documento {'removido' if deleted else 'não encontrado'} em {self.name}")

            return deleted

        except Exception as e:
            logger.error(f"Erro em delete_one na coleção {self.name}: {e}")
            raise

    async def delete_many(
            self,
            filter_doc: Dict[str, Any],
            **kwargs
    ) -> int:
        """
        Remove múltiplos documentos.

        Args:
            filter_doc: Filtro para encontrar documentos
            **kwargs: Argumentos adicionais

        Returns:
            Número de documentos removidos
        """
        try:
            # Converter IDs no filtro
            safe_filter = self._prepare_filter(filter_doc)

            logger.debug(f"delete_many em {self.name}")

            result = await self._collection.delete_many(safe_filter, **kwargs)

            deleted_count = result.deleted_count
            logger.debug(f"{deleted_count} documentos removidos em {self.name}")

            return deleted_count

        except Exception as e:
            logger.error(f"Erro em delete_many na coleção {self.name}: {e}")
            raise

    async def count_documents(
            self,
            filter_doc: Dict[str, Any] = None,
            **kwargs
    ) -> int:
        """
        Conta documentos na coleção.

        Args:
            filter_doc: Filtro opcional
            **kwargs: Argumentos adicionais

        Returns:
            Número de documentos
        """
        try:
            if filter_doc is None:
                filter_doc = {}

            # Converter IDs no filtro
            safe_filter = self._prepare_filter(filter_doc)

            count = await self._collection.count_documents(safe_filter, **kwargs)

            logger.debug(f"Contados {count} documentos em {self.name}")
            return count

        except Exception as e:
            logger.error(f"Erro em count_documents na coleção {self.name}: {e}")
            raise

    async def aggregate(
            self,
            pipeline: List[Dict[str, Any]],
            **kwargs
    ) -> List[Dict[str, Any]]:
        """
        Executa pipeline de agregação.

        Args:
            pipeline: Pipeline de agregação
            **kwargs: Argumentos adicionais

        Returns:
            Lista de resultados
        """
        try:
            logger.debug(f"aggregate em {self.name} - {len(pipeline)} estágios")

            cursor = self._collection.aggregate(pipeline, **kwargs)

            # Converter cursor para list com IDs normalizados
            results = []
            async for document in cursor:
                results.append(IdHandler.normalize_id(document))

            logger.debug(f"Agregação retornou {len(results)} resultados em {self.name}")
            return results

        except Exception as e:
            logger.error(f"Erro em aggregate na coleção {self.name}: {e}")
            raise

    def _prepare_filter(self, filter_doc: Dict[str, Any]) -> Dict[str, Any]:
        """
        Prepara um filtro convertendo IDs para ObjectId.

        Args:
            filter_doc: Filtro original

        Returns:
            Filtro com IDs convertidos
        """
        if not filter_doc:
            return {}

        return IdHandler.prepare_filter(filter_doc)

    def _prepare_document(self, document: Dict[str, Any]) -> Dict[str, Any]:
        """
        Prepara um documento convertendo IDs para ObjectId.

        Args:
            document: Documento original

        Returns:
            Documento com IDs convertidos
        """
        if not document:
            return {}

        return IdHandler.prepare_document(document)

    def _prepare_update(self, update_doc: Dict[str, Any]) -> Dict[str, Any]:
        """
        Prepara um update convertendo IDs para ObjectId.

        Args:
            update_doc: Update original

        Returns:
            Update com IDs convertidos
        """
        if not update_doc:
            return {}

        return IdHandler.prepare_update(update_doc)


class DatabaseManager:
    """
    Gerenciador principal do banco de dados.
    """

    def __init__(self, database: AsyncIOMotorDatabase):
        """
        Inicializa o gerenciador.

        Args:
            database: Instância do banco MongoDB
        """
        self.db = database
        self._collections = {}

    def get_collection(self, name: str) -> SafeCollection:
        """
        Obtém uma coleção segura por nome.

        Args:
            name: Nome da coleção

        Returns:
            Wrapper SafeCollection
        """
        if name not in self._collections:
            collection = self.db[name]
            self._collections[name] = SafeCollection(collection)

        return self._collections[name]

    @property
    def users(self) -> SafeCollection:
        """Coleção de usuários."""
        return self.get_collection("users")

    @property
    def characters(self) -> SafeCollection:
        """Coleção de personagens."""
        return self.get_collection("characters")

    @property
    def campaigns(self) -> SafeCollection:
        """Coleção de campanhas."""
        return self.get_collection("campaigns")

    @property
    def npcs(self) -> SafeCollection:
        """Coleção de NPCs."""
        return self.get_collection("npcs")

    @property
    def combats(self) -> SafeCollection:
        """Coleção de combates."""
        return self.get_collection("combats")

    @property
    def spells(self) -> SafeCollection:
        """Coleção de magias."""
        return self.get_collection("spells")

    @property
    def items(self) -> SafeCollection:
        """Coleção de itens."""
        return self.get_collection("items")

    @property
    def monsters(self) -> SafeCollection:
        """Coleção de monstros."""
        return self.get_collection("monsters")

    async def ping(self) -> bool:
        """
        Testa conexão com o banco.

        Returns:
            True se conectado
        """
        try:
            await self.db.command("ping")
            return True
        except Exception as e:
            logger.error(f"Erro ao fazer ping no banco: {e}")
            return False

    async def create_indexes(self):
        """Cria índices necessários nas coleções."""
        try:
            # Índices para usuários
            await self.users._collection.create_index("email", unique=True)
            await self.users._collection.create_index("username", unique=True)

            # Índices para personagens
            await self.characters._collection.create_index("owner_id")
            await self.characters._collection.create_index("campaign_id")

            # Índices para campanhas
            await self.campaigns._collection.create_index("dm_id")
            await self.campaigns._collection.create_index("players")

            # Índices para NPCs
            await self.npcs._collection.create_index("campaign_id")
            await self.npcs._collection.create_index("creator_id")

            # Índices para combates
            await self.combats._collection.create_index("campaign_id")
            await self.combats._collection.create_index("dm_id")

            logger.info("✅ Índices do banco criados com sucesso")

        except Exception as e:
            logger.error(f"Erro ao criar índices: {e}")
            raise


# Instância global do database manager
db_manager: Optional[DatabaseManager] = None


async def connect_to_mongo(mongodb_uri: str, db_name: str) -> DatabaseManager:
    """
    Conecta ao MongoDB e retorna o gerenciador.

    Args:
        mongodb_uri: URI de conexão do MongoDB
        db_name: Nome do banco de dados

    Returns:
        Instância do DatabaseManager
    """
    global db_manager

    try:
        from motor.motor_asyncio import AsyncIOMotorClient

        client = AsyncIOMotorClient(mongodb_uri)
        database = client[db_name]

        db_manager = DatabaseManager(database)

        # Testar conexão
        if await db_manager.ping():
            logger.info(f"✅ Conectado ao MongoDB: {db_name}")
            await db_manager.create_indexes()
            return db_manager
        else:
            raise Exception("Falha no ping do MongoDB")

    except Exception as e:
        logger.error(f"❌ Erro ao conectar ao MongoDB: {e}")
        raise


async def close_mongo_connection():
    """Fecha a conexão com o MongoDB."""
    global db_manager
    if db_manager:
        # Motor/AsyncIOMotorClient fecha automaticamente
        logger.info("✅ Conexão com MongoDB fechada")
        db_manager = None


def get_database() -> DatabaseManager:
    """
    Dependency para obter instância do banco.

    Returns:
        Instância do DatabaseManager

    Raises:
        Exception: Se não estiver conectado
    """
    global db_manager
    if db_manager is None:
        raise Exception("Banco de dados não conectado")
    return db_manager