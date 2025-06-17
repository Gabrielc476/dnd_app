# app/config.py
"""
Configuração simples sem Pydantic - CORRIGIDA
Para compatibilidade quando BaseSettings não está disponível
"""
from typing import List
import os
from dotenv import load_dotenv

# Carrega as variáveis de ambiente do arquivo .env
load_dotenv()


# Helper function to parse comma-separated env vars - MELHORADA
def parse_comma_separated_list(value, default=None):
    """Parse valores separados por vírgula de forma mais robusta."""
    if not value:
        return default or []

    # Se é uma string vazia ou só espaços
    if isinstance(value, str) and not value.strip():
        return default or []

    # Se parece com uma lista JSON
    if isinstance(value, str) and value.strip().startswith('[') and value.strip().endswith(']'):
        try:
            import ast
            parsed = ast.literal_eval(value)
            if isinstance(parsed, list):
                return [str(item).strip() for item in parsed if str(item).strip()]
        except (ValueError, SyntaxError):
            pass

    # Processar como string separada por vírgula
    if isinstance(value, str):
        return [item.strip() for item in value.split(",") if item.strip()]

    # Se for uma lista, apenas limpar
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]

    # Fallback
    return default or []


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

    # Configurações CORS - CORRIGIDAS
    # Tenta ALLOWED_ORIGINS primeiro, depois ALLOW_ORIGINS para compatibilidade
    _cors_origins = os.getenv("ALLOWED_ORIGINS") or os.getenv("ALLOW_ORIGINS")
    ALLOW_ORIGINS: List[str] = parse_comma_separated_list(
        _cors_origins,
        ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000"]
    )

    # Compatibilidade: adicionar ALLOWED_ORIGINS como alias
    ALLOWED_ORIGINS: List[str] = ALLOW_ORIGINS

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

    # Propriedades para compatibilidade
    @property
    def is_development(self) -> bool:
        """Retorna True se está em ambiente de desenvolvimento."""
        return os.getenv("ENVIRONMENT", "development").lower() == "development"

    @property
    def is_production(self) -> bool:
        """Retorna True se está em ambiente de produção."""
        return os.getenv("ENVIRONMENT", "development").lower() == "production"


# Cria uma instância das configurações
settings = Settings()

# Valida configurações críticas - COM MELHOR TRATAMENTO DE ERRO
try:
    if not settings.SECRET_KEY:
        # Tentar gerar uma chave automaticamente
        import secrets

        new_key = secrets.token_urlsafe(32)
        print(f"⚠️  SECRET_KEY não definida. Gerando automaticamente: {new_key[:16]}...")
        print("🔧 Adicione esta linha ao seu arquivo .env:")
        print(f"SECRET_KEY={new_key}")
        settings.SECRET_KEY = new_key

    if not settings.MONGODB_URI:
        print("⚠️  MONGODB_URI não definida. Usando padrão local.")
        settings.MONGODB_URI = "mongodb://localhost:27017"

    # Log das configurações carregadas
    print("✅ Configurações básicas carregadas:")
    print(f"   🌐 CORS Origins: {len(settings.ALLOW_ORIGINS)} configurados")
    print(f"   🔐 SECRET_KEY: {'✓' if len(settings.SECRET_KEY) >= 32 else '✗'}")
    print(f"   🗄️  MongoDB: {settings.MONGODB_URI}")

except Exception as e:
    print(f"❌ Erro crítico na configuração: {e}")
    # Não fazer raise aqui para permitir que a aplicação continue
    print("⚠️  Aplicação pode não funcionar corretamente")