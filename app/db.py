# app/db.py - Correção da classe SafeCollection

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase, AsyncIOMotorCollection
from bson import ObjectId
from bson.errors import InvalidId
from typing import Any, Dict, List, Optional, Union
from fastapi import Depends
from app.config import settings

# Cliente do MongoDB - inicializado durante o startup
mongodb_client = None


# Função helper para ObjectId
def safe_object_id(id_value):
    """Converte para ObjectId se possível, ou retorna o valor original."""
    if id_value is None:
        return None

    if isinstance(id_value, ObjectId):
        return id_value

    try:
        return ObjectId(str(id_value))
    except (InvalidId, TypeError):
        return id_value


# Classe que estende AsyncIOMotorCollection para lidar com IDs de forma segura
class SafeCollection:
    def __init__(self, collection):
        self._collection = collection

    async def find_one(self, filter=None, *args, **kwargs):
        """Wrapper para find_one que lida com IDs de forma segura."""
        if filter is None:
            return await self._collection.find_one(None, *args, **kwargs)

        # Se o filtro for apenas um ID
        if not isinstance(filter, dict):
            try:
                # Tenta converter para ObjectId primeiro
                object_id = safe_object_id(filter)
                result = await self._collection.find_one({"_id": object_id}, *args, **kwargs)
                if result:
                    return result

                # Se não encontrar, tenta com o ID original
                if object_id != filter:
                    return await self._collection.find_one({"_id": filter}, *args, **kwargs)
                return None
            except Exception:
                # Fallback para o comportamento original
                return await self._collection.find_one({"_id": filter}, *args, **kwargs)

        # Se o filtro for um dicionário com _id
        if "_id" in filter:
            filter_copy = filter.copy()
            original_id = filter["_id"]
            filter_copy["_id"] = safe_object_id(original_id)

            # Tenta com ObjectId
            result = await self._collection.find_one(filter_copy, *args, **kwargs)
            if result:
                return result

            # Se não encontrar e o ID foi alterado, tenta com o original
            if filter_copy["_id"] != original_id:
                filter_copy["_id"] = original_id
                return await self._collection.find_one(filter_copy, *args, **kwargs)
            return None

        return await self._collection.find_one(filter, *args, **kwargs)

    async def update_one(self, filter, update, *args, **kwargs):
        """Wrapper para update_one que lida com IDs de forma segura."""
        if not isinstance(filter, dict):
            try:
                # Tenta converter para ObjectId primeiro
                object_id = safe_object_id(filter)
                result = await self._collection.update_one({"_id": object_id}, update, *args, **kwargs)
                if result.matched_count > 0:
                    return result

                # Se não encontrar, tenta com o ID original
                if object_id != filter:
                    return await self._collection.update_one({"_id": filter}, update, *args, **kwargs)
                return result
            except Exception:
                # Fallback para o comportamento original
                return await self._collection.update_one({"_id": filter}, update, *args, **kwargs)

        if "_id" in filter:
            filter_copy = filter.copy()
            original_id = filter["_id"]
            filter_copy["_id"] = safe_object_id(original_id)

            # Tenta com ObjectId
            result = await self._collection.update_one(filter_copy, update, *args, **kwargs)
            if result.matched_count > 0:
                return result

            # Se não encontrar e o ID foi alterado, tenta com o original
            if filter_copy["_id"] != original_id:
                filter_copy["_id"] = original_id
                return await self._collection.update_one(filter_copy, update, *args, **kwargs)
            return result

        return await self._collection.update_one(filter, update, *args, **kwargs)

    async def delete_one(self, filter, *args, **kwargs):
        """Wrapper para delete_one que lida com IDs de forma segura."""
        if not isinstance(filter, dict):
            try:
                # Tenta converter para ObjectId primeiro
                object_id = safe_object_id(filter)
                result = await self._collection.delete_one({"_id": object_id}, *args, **kwargs)
                if result.deleted_count > 0:
                    return result

                # Se não encontrar, tenta com o ID original
                if object_id != filter:
                    return await self._collection.delete_one({"_id": filter}, *args, **kwargs)
                return result
            except Exception:
                # Fallback para o comportamento original
                return await self._collection.delete_one({"_id": filter}, *args, **kwargs)

        if "_id" in filter:
            filter_copy = filter.copy()
            original_id = filter["_id"]
            filter_copy["_id"] = safe_object_id(original_id)

            # Tenta com ObjectId
            result = await self._collection.delete_one(filter_copy, *args, **kwargs)
            if result.deleted_count > 0:
                return result

            # Se não encontrar e o ID foi alterado, tenta com o original
            if filter_copy["_id"] != original_id:
                filter_copy["_id"] = original_id
                return await self._collection.delete_one(filter_copy, *args, **kwargs)
            return result

        return await self._collection.delete_one(filter, *args, **kwargs)

    # CORREÇÃO: Remover async do método find
    def find(self, *args, **kwargs):
        """Mantém o método find original - NÃO DEVE SER ASYNC."""
        return self._collection.find(*args, **kwargs)

    async def insert_one(self, document, *args, **kwargs):
        """Wrapper para insert_one que garante ObjectId."""
        if document and "_id" in document and not isinstance(document["_id"], ObjectId):
            document_copy = document.copy()
            try:
                document_copy["_id"] = ObjectId(document["_id"])
                return await self._collection.insert_one(document_copy, *args, **kwargs)
            except (InvalidId, TypeError):
                # Fallback - usa o documento original
                pass

        return await self._collection.insert_one(document, *args, **kwargs)

    async def insert_many(self, documents, *args, **kwargs):
        """Wrapper para insert_many que garante ObjectId."""
        if not documents:
            return await self._collection.insert_many(documents, *args, **kwargs)

        documents_copy = []
        for doc in documents:
            doc_copy = doc.copy()
            if "_id" in doc and not isinstance(doc["_id"], ObjectId):
                try:
                    doc_copy["_id"] = ObjectId(doc["_id"])
                except (InvalidId, TypeError):
                    # Mantém o ID original se a conversão falhar
                    pass
            documents_copy.append(doc_copy)

        return await self._collection.insert_many(documents_copy, *args, **kwargs)

    async def delete_many(self, filter, *args, **kwargs):
        """Wrapper para delete_many."""
        return await self._collection.delete_many(filter, *args, **kwargs)

    # Delegar todas as outras operações à coleção original
    def __getattr__(self, name):
        return getattr(self._collection, name)


# Classe que estende AsyncIOMotorDatabase para usar SafeCollection
class SafeDatabase:
    def __init__(self, database):
        self._database = database

    def __getitem__(self, name):
        return SafeCollection(self._database[name])

    def __getattr__(self, name):
        # Se o atributo for uma coleção, envolvê-lo com SafeCollection
        try:
            collection = getattr(self._database, name)
            if isinstance(collection, AsyncIOMotorCollection):
                return SafeCollection(collection)
            return collection
        except AttributeError:
            # Se não for uma coleção, tentar como um item
            return self[name]


async def get_database() -> Union[AsyncIOMotorDatabase, SafeDatabase]:
    """
    Retorna uma instância da conexão com o banco de dados MongoDB.

    Returns:
        Instância de SafeDatabase que lida com IDs de forma robusta
    """
    global mongodb_client
    if mongodb_client is None:
        # In newer versions of PyMongo, use tlsAllowInvalidCertificates instead of ssl_cert_reqs
        connection_options = {
            "serverSelectionTimeoutMS": 5000,
            "connectTimeoutMS": 30000,
            "socketTimeoutMS": 60000,
            "connect": False
        }

        # Check if SSL is enabled in the connection string
        if "ssl=true" in settings.MONGODB_URI.lower():
            connection_options["tlsAllowInvalidCertificates"] = True

        # Cria um cliente com retry
        mongodb_client = AsyncIOMotorClient(
            settings.MONGODB_URI,
            **connection_options
        )

    # Retorna um wrapper que lida com IDs de forma segura
    return SafeDatabase(mongodb_client[settings.DB_NAME])


# Função para fechar a conexão (chamada durante o shutdown)
async def close_mongodb_connection():
    global mongodb_client
    if mongodb_client is not None:
        mongodb_client.close()