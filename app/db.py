# app/db.py
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from fastapi import Depends
import ssl

from app.config import settings

# Cliente do MongoDB - inicializado durante o startup
mongodb_client = None


async def get_database() -> AsyncIOMotorDatabase:
    """
    Retorna uma instância da conexão com o banco de dados MongoDB.

    Returns:
        Instância de AsyncIOMotorDatabase
    """
    global mongodb_client
    if mongodb_client is None:
        # Cria um cliente com retry
        mongodb_client = AsyncIOMotorClient(
            settings.MONGODB_URI,
            serverSelectionTimeoutMS=5000,
            connect=False,
            ssl_cert_reqs=ssl.CERT_NONE if "ssl=true" in settings.MONGODB_URI.lower() else None
        )

    return mongodb_client[settings.DB_NAME]


# Função para fechar a conexão (chamada durante o shutdown)
async def close_mongodb_connection():
    global mongodb_client
    if mongodb_client is not None:
        mongodb_client.close()