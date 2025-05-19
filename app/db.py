# app/db.py
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from fastapi import Depends
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

    return mongodb_client[settings.DB_NAME]


# Função para fechar a conexão (chamada durante o shutdown)
async def close_mongodb_connection():
    global mongodb_client
    if mongodb_client is not None:
        mongodb_client.close()