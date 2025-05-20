# app/db.py
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
                return await self._collection.find_one({"_id": safe_object_id(filter)}, *args, **kwargs)
            except Exception:
                return await self._collection.find_one({"_id": filter}, *args, **kwargs)

        # Se o filtro for um dicionário com _id
        if "_id" in filter:
            filter_copy = filter.copy()
            filter_copy["_id"] = safe_object_id(filter["_id"])
            return await self._collection.find_one(filter_copy, *args, **kwargs)

        return await self._collection.find_one(filter, *args, **kwargs)

    async def update_one(self, filter, update, *args, **kwargs):
        """Wrapper para update_one que lida com IDs de forma segura."""
        if not isinstance(filter, dict):
            try:
                return await self._collection.update_one({"_id": safe_object_id(filter)}, update, *args, **kwargs)
            except Exception:
                return await self._collection.update_one({"_id": filter}, update, *args, **kwargs)

        if "_id" in filter:
            filter_copy = filter.copy()
            filter_copy["_id"] = safe_object_id(filter["_id"])
            return await self._collection.update_one(filter_copy, update, *args, **kwargs)

        return await self._collection.update_one(filter, update, *args, **kwargs)

    async def delete_one(self, filter, *args, **kwargs):
        """Wrapper para delete_one que lida com IDs de forma segura."""
        if not isinstance(filter, dict):
            try:
                return await self._collection.delete_one({"_id": safe_object_id(filter)}, *args, **kwargs)
            except Exception:
                return await self._collection.delete_one({"_id": filter}, *args, **kwargs)

        if "_id" in filter:
            filter_copy = filter.copy()
            filter_copy["_id"] = safe_object_id(filter["_id"])
            return await self._collection.delete_one(filter_copy, *args, **kwargs)

        return await self._collection.delete_one(filter, *args, **kwargs)

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