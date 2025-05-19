# app/config.py
from pydantic import BaseSettings, AnyHttpUrl
from typing import List, Optional, Union
import os
from dotenv import load_dotenv

# Carrega as variáveis de ambiente do arquivo .env
load_dotenv()


class Settings(BaseSettings):
    # Configurações da aplicação
    APP_NAME: str = "D&D VTT API"
    API_PREFIX: str = "/api"
    DEBUG: bool = False
    VERSION: str = "0.1.0"

    # Configurações do MongoDB
    MONGODB_URI: str
    DB_NAME: str = "dnd_vtt"

    # Configurações de segurança
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Configurações CORS
    ALLOW_ORIGINS: List[str] = ["*"]
    ALLOW_CREDENTIALS: bool = True
    ALLOW_METHODS: List[str] = ["*"]
    ALLOW_HEADERS: List[str] = ["*"]

    # Configurações de WebSocket
    WS_PING_INTERVAL: int = 30  # segundos
    WS_HEARTBEAT_TIMEOUT: int = 15  # segundos

    # Configurações de Lock
    LOCK_DEFAULT_TIMEOUT: int = 30  # segundos
    LOCK_MAX_TIMEOUT: int = 3600  # 1 hora em segundos

    # Configurações de upload
    MAX_UPLOAD_SIZE: int = 5242880  # 5MB em bytes
    ALLOWED_IMAGE_TYPES: List[str] = ["image/jpeg", "image/png", "image/gif", "image/webp"]

    # Outras configurações
    MAX_CONNECTIONS_PER_CAMPAIGN: int = 10

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


# Cria uma instância das configurações
settings = Settings()

# Valida configurações críticas
if not settings.SECRET_KEY:
    raise ValueError("SECRET_KEY não definida. Configure essa variável no arquivo .env")

if not settings.MONGODB_URI:
    raise ValueError("MONGODB_URI não definida. Configure essa variável no arquivo .env")