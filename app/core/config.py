# app/core/config.py
"""
Configuration settings - CORRIGIDO
Configurações centralizadas da aplicação com validação adequada.
Resolve problemas de SECRET_KEY e integração com python-socketio.
"""

import os
import secrets
from datetime import datetime
from typing import List, Optional, Any
from pydantic import BaseSettings, validator, Field


class Settings(BaseSettings):
    """
    Configurações da aplicação usando Pydantic BaseSettings.
    Carrega automaticamente variáveis de ambiente do arquivo .env
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
    SECRET_KEY: str = Field(
        default_factory=lambda: secrets.token_urlsafe(32),
        env="SECRET_KEY",
        description="Chave secreta para JWT - deve ter pelo menos 32 caracteres"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 horas
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30  # 30 dias

    # ===== BANCO DE DADOS =====
    MONGODB_URI: str = Field(
        default="mongodb://localhost:27017",
        env="MONGODB_URI",
        description="URI de conexão com MongoDB"
    )
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

    # ===== WEBSOCKET & SOCKET.IO =====
    WEBSOCKET_HEARTBEAT_INTERVAL: int = 30  # segundos
    WEBSOCKET_TIMEOUT: int = 60  # segundos
    MAX_WEBSOCKET_CONNECTIONS: int = 1000

    # Socket.IO Settings (para python-socketio)
    SOCKETIO_CORS_ORIGINS: str = "*"  # Configure para produção
    SOCKETIO_PATH: str = "/socket.io"
    SOCKETIO_LOGGER: bool = True
    SOCKETIO_ENGINEIO_LOGGER: bool = True

    # WebSocket Settings
    WS_HEARTBEAT_INTERVAL: int = 30  # segundos
    WS_CONNECTION_TIMEOUT: int = 300  # 5 minutos

    # Lock Settings
    LOCK_DEFAULT_TIMEOUT: int = 300  # 5 minutos
    LOCK_CLEANUP_INTERVAL: int = 60  # 1 minuto

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
            # Se a SECRET_KEY é muito pequena, gerar uma nova automaticamente
            new_key = secrets.token_urlsafe(32)
            print(f"⚠️  SECRET_KEY muito pequena. Usando chave gerada automaticamente.")
            print(f"🔐 Adicione esta linha ao seu arquivo .env:")
            print(f"SECRET_KEY={new_key}")
            return new_key
        return v

    @validator("MONGODB_URI")
    def validate_mongodb_uri(cls, v: str) -> str:
        """Valida formato básico da URI do MongoDB."""
        if not v:
            print("⚠️  MONGODB_URI não definida. Usando padrão local.")
            return "mongodb://localhost:27017"

        if not v.startswith("mongodb://") and not v.startswith("mongodb+srv://"):
            print("⚠️  MONGODB_URI deve começar com mongodb:// ou mongodb+srv://")
            return "mongodb://localhost:27017"
        return v

    @validator("ENVIRONMENT")
    def validate_environment(cls, v: str) -> str:
        """Valida ambiente."""
        allowed = ["development", "staging", "production", "testing"]
        if v.lower() not in allowed:
            print(f"⚠️  ENVIRONMENT deve ser um de: {allowed}. Usando 'development'.")
            return "development"
        return v.lower()

    @validator("LOG_LEVEL")
    def validate_log_level(cls, v: str) -> str:
        """Valida nível de log."""
        allowed = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if v.upper() not in allowed:
            print(f"⚠️  LOG_LEVEL deve ser um de: {allowed}. Usando 'INFO'.")
            return "INFO"
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

    def get_socketio_settings(self) -> dict:
        """Retorna configurações do Socket.IO."""
        return {
            "cors_allowed_origins": self.SOCKETIO_CORS_ORIGINS,
            "logger": self.SOCKETIO_LOGGER,
            "engineio_logger": self.SOCKETIO_ENGINEIO_LOGGER,
        }

    def get_cors_settings(self) -> dict:
        """Retorna configurações de CORS."""
        if self.is_production:
            # Em produção, ser mais restritivo
            return {
                "allow_origins": self.ALLOWED_ORIGINS,
                "allow_credentials": True,
                "allow_methods": ["GET", "POST", "PUT", "DELETE", "PATCH"],
                "allow_headers": ["*"],
            }
        else:
            # Em desenvolvimento, ser mais permissivo
            return {
                "allow_origins": ["*"] if self.is_development else self.ALLOWED_ORIGINS,
                "allow_credentials": True,
                "allow_methods": ["*"],
                "allow_headers": ["*"],
            }

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        # Permitir campos extras sem erro
        extra = "ignore"


# Função para criar .env se não existir
def create_default_env():
    """Cria arquivo .env padrão se não existir."""
    env_path = ".env"

    if not os.path.exists(env_path):
        print("📝 Criando arquivo .env padrão...")

        secret_key = secrets.token_urlsafe(32)

        env_content = f"""# ===== D&D VTT Backend Configuration =====
# Arquivo .env gerado automaticamente

# ===== APLICAÇÃO =====
APP_NAME=D&D Virtual Tabletop API
ENVIRONMENT=development
DEBUG=true

# ===== SEGURANÇA (CRÍTICO) =====
SECRET_KEY={secret_key}
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# ===== BANCO DE DADOS =====
MONGODB_URI=mongodb://localhost:27017
DB_NAME=dnd_vtt

# ===== SERVIDOR =====
HOST=0.0.0.0
PORT=8000

# ===== CORS =====
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000

# ===== WEBSOCKET =====
WEBSOCKET_HEARTBEAT_INTERVAL=30
WEBSOCKET_TIMEOUT=60
MAX_WEBSOCKET_CONNECTIONS=1000

# ===== SOCKET.IO =====
SOCKETIO_CORS_ORIGINS=*
SOCKETIO_PATH=/socket.io
SOCKETIO_LOGGER=true
SOCKETIO_ENGINEIO_LOGGER=true

# ===== LOCKS =====
LOCK_TIMEOUT_SECONDS=300
LOCK_HEARTBEAT_INTERVAL=30

# ===== UPLOADS =====
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760

# ===== LOGGING =====
LOG_LEVEL=INFO
"""

        with open(env_path, "w", encoding="utf-8") as f:
            f.write(env_content)

        print(f"✅ Arquivo .env criado com SUCCESS!")
        print(f"🔐 SECRET_KEY gerada automaticamente: {secret_key[:16]}...")
        print(f"📁 Localização: {os.path.abspath(env_path)}")

        return True

    return False


# Criar .env se necessário (executado na importação)
try:
    create_default_env()
except Exception as e:
    print(f"⚠️  Aviso ao criar .env: {e}")

# Instância global das configurações
try:
    settings = Settings()
    print(f"✅ Configurações carregadas com sucesso!")
    print(f"🌍 Ambiente: {settings.ENVIRONMENT}")
    print(f"🔐 SECRET_KEY: {'✓' if len(settings.SECRET_KEY) >= 32 else '✗'}")
    print(f"🗄️  MongoDB: {settings.MONGODB_URI}")
except Exception as e:
    print(f"❌ Erro ao carregar configurações: {e}")
    print("🔧 Verifique o arquivo .env ou execute o script generate_secret.py")
    raise


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


def get_logging_config():
    """Retorna configuração de logging."""
    return {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "format": settings.LOG_FORMAT,
            },
        },
        "handlers": {
            "default": {
                "formatter": "default",
                "class": "logging.StreamHandler",
                "stream": "ext://sys.stdout",
            },
        },
        "root": {
            "level": settings.LOG_LEVEL,
            "handlers": ["default"],
        },
    }