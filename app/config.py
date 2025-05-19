# app/config.py
from typing import List
import os
from dotenv import load_dotenv

# Carrega as variáveis de ambiente do arquivo .env
load_dotenv()

# Helper function to parse comma-separated env vars
def parse_comma_separated_list(value, default=None):
    if not value:
        return default or []
    return [item.strip() for item in value.split(",")]

# Simple settings class without Pydantic
class Settings:
    # Configurações da aplicação
    APP_NAME: str = os.getenv("APP_NAME", "D&D VTT API")
    API_PREFIX: str = os.getenv("API_PREFIX", "/api")
    DEBUG: bool = os.getenv("DEBUG", "False").lower() in ("true", "1", "t")
    VERSION: str = os.getenv("VERSION", "0.1.0")

    # Configurações do MongoDB
    MONGODB_URI: str = os.getenv("MONGODB_URI", "")
    DB_NAME: str = os.getenv("DB_NAME", "dnd_vtt")

    # Configurações de segurança
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

    # Configurações CORS
    ALLOW_ORIGINS: List[str] = parse_comma_separated_list(os.getenv("ALLOW_ORIGINS"), ["*"])
    ALLOW_CREDENTIALS: bool = os.getenv("ALLOW_CREDENTIALS", "True").lower() in ("true", "1", "t")
    ALLOW_METHODS: List[str] = parse_comma_separated_list(os.getenv("ALLOW_METHODS"), ["*"])
    ALLOW_HEADERS: List[str] = parse_comma_separated_list(os.getenv("ALLOW_HEADERS"), ["*"])

    # Configurações de WebSocket
    WS_PING_INTERVAL: int = int(os.getenv("WS_PING_INTERVAL", "30"))
    WS_HEARTBEAT_TIMEOUT: int = int(os.getenv("WS_HEARTBEAT_TIMEOUT", "15"))

    # Configurações de Lock
    LOCK_DEFAULT_TIMEOUT: int = int(os.getenv("LOCK_DEFAULT_TIMEOUT", "30"))
    LOCK_MAX_TIMEOUT: int = int(os.getenv("LOCK_MAX_TIMEOUT", "3600"))

    # Configurações de upload
    MAX_UPLOAD_SIZE: int = int(os.getenv("MAX_UPLOAD_SIZE", "5242880"))
    ALLOWED_IMAGE_TYPES: List[str] = parse_comma_separated_list(
        os.getenv("ALLOWED_IMAGE_TYPES"),
        ["image/jpeg", "image/png", "image/gif", "image/webp"]
    )

    # Outras configurações
    MAX_CONNECTIONS_PER_CAMPAIGN: int = int(os.getenv("MAX_CONNECTIONS_PER_CAMPAIGN", "10"))


# Cria uma instância das configurações
settings = Settings()

# Valida configurações críticas
if not settings.SECRET_KEY:
    raise ValueError("SECRET_KEY não definida. Configure essa variável no arquivo .env")

if not settings.MONGODB_URI:
    raise ValueError("MONGODB_URI não definida. Configure essa variável no arquivo .env")