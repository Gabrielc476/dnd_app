# app/core/config.py
"""
Configuration settings - COMPLETO
Configurações centralizadas da aplicação com validação.
"""

import os
from datetime import datetime
from typing import List, Optional, Any
from pydantic import BaseSettings, validator, Field


class Settings(BaseSettings):
    """
    Configurações da aplicação usando Pydantic BaseSettings.
    Carrega automaticamente variáveis de ambiente.
    """

    # ===== APLICAÇÃO =====
    APP_NAME: str = "D&D Virtual Tabletop API"
    APP_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    DEBUG: bool = False
    ENVIRONMENT: str = Field(default="development", env="ENVIRONMENT")

    # ===== SERVIDOR =====
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    RELOAD: bool = True

    # ===== CORS =====
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001"
    ]

    # ===== SEGURANÇA =====
    SECRET_KEY: str = Field(..., env="SECRET_KEY")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 horas
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30  # 30 dias

    # ===== BANCO DE DADOS =====
    MONGODB_URI: str = Field(..., env="MONGODB_URI")
    DB_NAME: str = Field(default="dnd_vtt", env="DB_NAME")

    # Configurações de conexão MongoDB
    MONGODB_MIN_POOL_SIZE: int = 10
    MONGODB_MAX_POOL_SIZE: int = 50
    MONGODB_MAX_IDLE_TIME_MS: int = 30000

    # ===== REDIS (OPCIONAL) =====
    REDIS_URL: Optional[str] = Field(default=None, env="REDIS_URL")
    REDIS_EXPIRE_SECONDS: int = 3600

    # ===== EMAIL (FUTURO) =====
    SMTP_SERVER: Optional[str] = Field(default=None, env="SMTP_SERVER")
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = Field(default=None, env="SMTP_USERNAME")
    SMTP_PASSWORD: Optional[str] = Field(default=None, env="SMTP_PASSWORD")
    SMTP_FROM_EMAIL: Optional[str] = Field(default=None, env="SMTP_FROM_EMAIL")

    # ===== LOGGING =====
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    LOG_FILE: Optional[str] = None

    # ===== WEBSOCKET =====
    WEBSOCKET_HEARTBEAT_INTERVAL: int = 30  # segundos
    WEBSOCKET_TIMEOUT: int = 60  # segundos
    MAX_WEBSOCKET_CONNECTIONS: int = 1000

    # ===== UPLOADS =====
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_IMAGE_EXTENSIONS: List[str] = [".jpg", ".jpeg", ".png", ".gif", ".webp"]
    ALLOWED_DOCUMENT_EXTENSIONS: List[str] = [".pdf", ".txt", ".md"]

    # ===== CACHE =====
    CACHE_TTL: int = 300  # 5 minutos
    CACHE_ENABLED: bool = True

    # ===== RATE LIMITING =====
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_PERIOD: int = 60  # segundos

    # ===== GAME SETTINGS =====
    DEFAULT_CAMPAIGN_MAX_PLAYERS: int = 6
    MAX_CHARACTER_LEVEL: int = 20
    DEFAULT_HP_ON_LEVEL_UP: str = "average"  # "average", "roll", "max"

    # ===== WEBSOCKET LOCKS =====
    LOCK_TIMEOUT_SECONDS: int = 300  # 5 minutos
    LOCK_HEARTBEAT_INTERVAL: int = 30  # 30 segundos

    # ===== PERFORMANCE =====
    DATABASE_QUERY_TIMEOUT: int = 30  # segundos
    API_RESPONSE_TIMEOUT: int = 30  # segundos

    @validator("ALLOWED_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v: Any) -> List[str]:
        """Converte string separada por vírgula em lista."""
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    @validator("SECRET_KEY")
    def validate_secret_key(cls, v: str) -> str:
        """Valida que SECRET_KEY tem tamanho mínimo."""
        if len(v) < 32:
            raise ValueError("SECRET_KEY deve ter pelo menos 32 caracteres")
        return v

    @validator("MONGODB_URI")
    def validate_mongodb_uri(cls, v: str) -> str:
        """Valida formato básico da URI do MongoDB."""
        if not v.startswith("mongodb://") and not v.startswith("mongodb+srv://"):
            raise ValueError("MONGODB_URI deve começar com mongodb:// ou mongodb+srv://")
        return v

    @validator("ENVIRONMENT")
    def validate_environment(cls, v: str) -> str:
        """Valida ambiente."""
        allowed = ["development", "staging", "production", "testing"]
        if v.lower() not in allowed:
            raise ValueError(f"ENVIRONMENT deve ser um de: {allowed}")
        return v.lower()

    @validator("LOG_LEVEL")
    def validate_log_level(cls, v: str) -> str:
        """Valida nível de log."""
        allowed = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if v.upper() not in allowed:
            raise ValueError(f"LOG_LEVEL deve ser um de: {allowed}")
        return v.upper()

    @property
    def is_development(self) -> bool:
        """Retorna True se está em ambiente de desenvolvimento."""
        return self.ENVIRONMENT == "development"

    @property
    def is_production(self) -> bool:
        """Retorna True se está em ambiente de produção."""
        return self.ENVIRONMENT == "production"

    @property
    def is_testing(self) -> bool:
        """Retorna True se está em ambiente de teste."""
        return self.ENVIRONMENT == "testing"

    def get_mongodb_settings(self) -> dict:
        """Retorna configurações do MongoDB."""
        return {
            "minPoolSize": self.MONGODB_MIN_POOL_SIZE,
            "maxPoolSize": self.MONGODB_MAX_POOL_SIZE,
            "maxIdleTimeMS": self.MONGODB_MAX_IDLE_TIME_MS,
            "serverSelectionTimeoutMS": 5000,
            "socketTimeoutMS": 30000,
            "connectTimeoutMS": 10000,
        }

    def get_upload_path(self, filename: str = "") -> str:
        """Retorna caminho completo para uploads."""
        upload_path = os.path.join(os.getcwd(), self.UPLOAD_DIR)
        if filename:
            return os.path.join(upload_path, filename)
        return upload_path

    def get_current_timestamp(self) -> str:
        """Retorna timestamp atual em formato ISO."""
        return datetime.utcnow().isoformat()

    def is_allowed_file_extension(self, filename: str, file_type: str = "image") -> bool:
        """Verifica se extensão do arquivo é permitida."""
        ext = os.path.splitext(filename.lower())[1]

        if file_type == "image":
            return ext in self.ALLOWED_IMAGE_EXTENSIONS
        elif file_type == "document":
            return ext in self.ALLOWED_DOCUMENT_EXTENSIONS
        else:
            return ext in (self.ALLOWED_IMAGE_EXTENSIONS + self.ALLOWED_DOCUMENT_EXTENSIONS)

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


# Instância global das configurações
settings = Settings()


# Configurações específicas por ambiente
def get_environment_settings():
    """Retorna configurações específicas do ambiente."""
    if settings.is_development:
        return {
            "reload": True,
            "debug": True,
            "log_level": "DEBUG"
        }
    elif settings.is_production:
        return {
            "reload": False,
            "debug": False,
            "log_level": "INFO"
        }
    elif settings.is_testing:
        return {
            "reload": False,
            "debug": True,
            "log_level": "DEBUG"
        }
    else:
        return {
            "reload": False,
            "debug": False,
            "log_level": "INFO"
        }


def get_cors_settings():
    """Retorna configurações de CORS."""
    if settings.is_production:
        # Em produção, ser mais restritivo
        return {
            "allow_origins": settings.ALLOWED_ORIGINS,
            "allow_credentials": True,
            "allow_methods": ["GET", "POST", "PUT", "DELETE", "PATCH"],
            "allow_headers": ["*"],
        }
    else:
        # Em desenvolvimento, ser mais permissivo
        return {
            "allow_origins": ["*"] if settings.is_development else settings.ALLOWED_ORIGINS,
            "allow_credentials": True,
            "allow_methods": ["*"],
            "allow_headers": ["*"],
        }


def get_logging_config():
    """Retorna configuração de logging."""
    return {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "format": settings.LOG_FORMAT,
                "datefmt": "%Y-%m-%d %H:%M:%S",
            },
            "detailed": {
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(filename)s:%(lineno)d - %(message)s",
                "datefmt": "%Y-%m-%d %H:%M:%S",
            },
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "level": settings.LOG_LEVEL,
                "formatter": "default",
                "stream": "ext://sys.stdout",
            },
        },
        "loggers": {
            "": {  # root logger
                "level": settings.LOG_LEVEL,
                "handlers": ["console"],
                "propagate": False,
            },
            "uvicorn": {
                "level": "INFO",
                "handlers": ["console"],
                "propagate": False,
            },
            "uvicorn.error": {
                "level": "INFO",
                "handlers": ["console"],
                "propagate": False,
            },
            "uvicorn.access": {
                "level": "WARNING" if settings.is_production else "INFO",
                "handlers": ["console"],
                "propagate": False,
            },
        },
    }


# Adicionar handler de arquivo se especificado
def setup_file_logging():
    """Configura logging para arquivo se especificado."""
    if settings.LOG_FILE:
        import logging.config

        config = get_logging_config()
        config["handlers"]["file"] = {
            "class": "logging.handlers.RotatingFileHandler",
            "level": settings.LOG_LEVEL,
            "formatter": "detailed",
            "filename": settings.LOG_FILE,
            "maxBytes": 10485760,  # 10MB
            "backupCount": 5,
        }

        # Adicionar handler de arquivo a todos os loggers
        for logger_name in config["loggers"]:
            config["loggers"][logger_name]["handlers"].append("file")

        logging.config.dictConfig(config)