# app/utils/security.py
"""
Utilidades de segurança - CORRIGIDO PARA PyJWT
Problemas resolvidos:
1. ✅ Removidos logs de debug que expunham SECRET_KEY
2. ✅ Implementado logging seguro usando logger
3. ✅ Melhorado tratamento de erros
4. ✅ Adicionada validação de token mais robusta
5. ✅ Migrado de python-jose para PyJWT (mais estável)
"""

import logging
from datetime import datetime, timedelta
from typing import Union, Optional, Dict, Any
import jwt  # PyJWT em vez de python-jose
from jwt.exceptions import InvalidTokenError, ExpiredSignatureError, DecodeError
from passlib.context import CryptContext
from fastapi import HTTPException, status

from app.config import settings

# Configure logger
logger = logging.getLogger(__name__)

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifica se a senha em texto plano corresponde ao hash.

    Args:
        plain_password: Senha em texto plano
        hashed_password: Hash da senha armazenado

    Returns:
        True se a senha estiver correta, False caso contrário
    """
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        logger.error(f"Erro ao verificar senha: {type(e).__name__}")
        return False


def get_password_hash(password: str) -> str:
    """
    Gera um hash seguro da senha.

    Args:
        password: Senha em texto plano

    Returns:
        Hash da senha
    """
    try:
        return pwd_context.hash(password)
    except Exception as e:
        logger.error(f"Erro ao gerar hash da senha: {type(e).__name__}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno no processamento da senha"
        )


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Cria um token JWT de acesso.

    Args:
        data: Dados a serem incluídos no token
        expires_delta: Tempo de expiração personalizado

    Returns:
        Token JWT assinado

    Raises:
        HTTPException: Se houver erro na criação do token
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire, "iat": datetime.utcnow()})

    try:
        encoded_jwt = jwt.encode(
            to_encode,
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM
        )
        logger.info("Token de acesso criado com sucesso")
        return encoded_jwt

    except Exception as e:
        logger.error(f"Erro ao criar token: {type(e).__name__}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno na criação do token"
        )


def decode_access_token(token: str) -> Dict[str, Any]:
    """
    Decodifica e valida um token JWT.

    Args:
        token: Token JWT a ser decodificado

    Returns:
        Payload do token decodificado

    Raises:
        HTTPException: Se o token for inválido ou expirado
    """
    try:
        logger.debug("Validando token de acesso")

        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )

        # Verificar se o token tem o campo 'sub' (subject)
        if payload.get("sub") is None:
            logger.warning("Token sem campo 'sub'")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido - dados incompletos",
                headers={"WWW-Authenticate": "Bearer"},
            )

        logger.debug("Token validado com sucesso")
        return payload

    except ExpiredSignatureError:
        logger.warning("Token expirado")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except (InvalidTokenError, DecodeError) as e:
        logger.warning(f"Erro de JWT: {type(e).__name__}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except HTTPException:
        # Re-raise HTTPExceptions
        raise
    except Exception as e:
        logger.error(f"Erro inesperado ao decodificar token: {type(e).__name__}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno na validação do token"
        )


def validate_token_format(token: str) -> bool:
    """
    Valida se o token tem o formato JWT básico.

    Args:
        token: Token a ser validado

    Returns:
        True se o formato estiver correto, False caso contrário
    """
    if not token or not isinstance(token, str):
        return False

    # JWT deve ter 3 partes separadas por pontos
    parts = token.split('.')
    return len(parts) == 3


def create_refresh_token(user_id: str) -> str:
    """
    Cria um token de refresh com duração maior.

    Args:
        user_id: ID do usuário

    Returns:
        Refresh token
    """
    data = {"sub": user_id, "type": "refresh"}
    expires_delta = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    return create_access_token(data, expires_delta)


def get_current_timestamp() -> str:
    """
    Retorna timestamp atual no formato ISO.

    Returns:
        Timestamp atual
    """
    return datetime.utcnow().isoformat()


def hash_api_key(api_key: str) -> str:
    """
    Gera hash para chaves de API.

    Args:
        api_key: Chave de API em texto plano

    Returns:
        Hash da chave de API
    """
    return get_password_hash(api_key)


def verify_api_key(plain_api_key: str, hashed_api_key: str) -> bool:
    """
    Verifica uma chave de API.

    Args:
        plain_api_key: Chave de API em texto plano
        hashed_api_key: Hash da chave de API

    Returns:
        True se a chave estiver correta, False caso contrário
    """
    return verify_password(plain_api_key, hashed_api_key)


def generate_secure_token(length: int = 32) -> str:
    """
    Gera um token seguro aleatório.

    Args:
        length: Comprimento do token

    Returns:
        Token seguro
    """
    import secrets
    return secrets.token_urlsafe(length)


def is_token_expired(token: str) -> bool:
    """
    Verifica se um token está expirado sem lançar exceção.

    Args:
        token: Token JWT para verificar

    Returns:
        True se expirado, False se válido
    """
    try:
        jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        return False
    except ExpiredSignatureError:
        return True
    except Exception:
        # Se houve qualquer outro erro, considerar como expirado
        return True