# app/core/config.py
"""
Configuração SIMPLES usando apenas dotenv
Sem Pydantic, sem validators, sem complicação.
Compatível com o main.py existente.
"""

import os
import secrets
from dotenv import load_dotenv

# Carrega o .env
load_dotenv()


class Settings:
    """Configurações simples e funcionais - compatível com main.py existente"""

    # ===== APLICAÇÃO =====
    APP_NAME = os.getenv("APP_NAME", "D&D Virtual Tabletop API")
    DEBUG = os.getenv("DEBUG", "true").lower() in ("true", "1", "yes")
    ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

    # ===== SERVIDOR =====
    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = int(os.getenv("PORT", "8000"))
    RELOAD = True  # Para compatibilidade com main.py

    # ===== SEGURANÇA =====
    SECRET_KEY = os.getenv("SECRET_KEY")
    if not SECRET_KEY or len(SECRET_KEY) < 32:
        SECRET_KEY = secrets.token_urlsafe(32)
        print(f"⚠️  SECRET_KEY gerada automaticamente: {SECRET_KEY}")
        print("🔧 Adicione ao seu .env:")
        print(f"SECRET_KEY={SECRET_KEY}")

    ALGORITHM = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))

    # ===== BANCO DE DADOS =====
    MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    DB_NAME = os.getenv("DB_NAME", "dnd_vtt")

    # ===== CORS =====
    _cors_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000")
    ALLOWED_ORIGINS = [origin.strip() for origin in _cors_origins.split(",") if origin.strip()]

    # ===== SOCKET.IO =====
    SOCKETIO_CORS_ORIGINS = os.getenv("SOCKETIO_CORS_ORIGINS", "*")
    SOCKETIO_LOGGER = os.getenv("SOCKETIO_LOGGER", "true").lower() in ("true", "1", "yes")
    SOCKETIO_ENGINEIO_LOGGER = os.getenv("SOCKETIO_ENGINEIO_LOGGER", "true").lower() in ("true", "1", "yes")

    # ===== WEBSOCKET =====
    WEBSOCKET_HEARTBEAT_INTERVAL = int(os.getenv("WEBSOCKET_HEARTBEAT_INTERVAL", "30"))
    WEBSOCKET_TIMEOUT = int(os.getenv("WEBSOCKET_TIMEOUT", "60"))
    WS_HEARTBEAT_INTERVAL = WEBSOCKET_HEARTBEAT_INTERVAL  # Alias para compatibilidade
    WS_CONNECTION_TIMEOUT = int(os.getenv("WS_CONNECTION_TIMEOUT", "300"))

    # ===== UPLOADS =====
    UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
    MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", "10485760"))

    # ===== LOGGING =====
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

    # ===== LOCKS =====
    LOCK_TIMEOUT_SECONDS = int(os.getenv("LOCK_TIMEOUT_SECONDS", "300"))
    LOCK_HEARTBEAT_INTERVAL = int(os.getenv("LOCK_HEARTBEAT_INTERVAL", "30"))

    # ===== PROPRIEDADES ÚTEIS =====
    @property
    def is_development(self):
        return self.ENVIRONMENT.lower() == "development"

    @property
    def is_production(self):
        return self.ENVIRONMENT.lower() == "production"

    @property
    def is_testing(self):
        return self.ENVIRONMENT.lower() == "testing"


# Criar .env se não existir
def create_env_if_missing():
    if not os.path.exists(".env"):
        secret_key = secrets.token_urlsafe(32)
        env_content = f"""# D&D VTT Configuration
APP_NAME=D&D Virtual Tabletop API
ENVIRONMENT=development
DEBUG=true

SECRET_KEY={secret_key}
ACCESS_TOKEN_EXPIRE_MINUTES=1440
REFRESH_TOKEN_EXPIRE_DAYS=30

MONGODB_URI=mongodb://localhost:27017
DB_NAME=dnd_vtt

HOST=0.0.0.0
PORT=8000

ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000

SOCKETIO_CORS_ORIGINS=*
SOCKETIO_LOGGER=true
SOCKETIO_ENGINEIO_LOGGER=true

WEBSOCKET_HEARTBEAT_INTERVAL=30
WEBSOCKET_TIMEOUT=60
WS_CONNECTION_TIMEOUT=300

LOCK_TIMEOUT_SECONDS=300
LOCK_HEARTBEAT_INTERVAL=30

UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760

LOG_LEVEL=INFO
"""
        with open(".env", "w") as f:
            f.write(env_content)
        print("✅ Arquivo .env criado!")


# Executar na importação
create_env_if_missing()

# Instância global
settings = Settings()

print(f"✅ Configuração simples carregada!")
print(f"🌍 Ambiente: {settings.ENVIRONMENT}")
print(f"🌐 CORS: {settings.ALLOWED_ORIGINS}")
print(f"🗄️  MongoDB: {settings.MONGODB_URI}")