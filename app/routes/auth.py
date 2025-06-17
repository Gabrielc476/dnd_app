# app/routes/auth.py
"""
Auth routes - COMPLETO E CORRIGIDO
Problemas resolvidos:
1. ✅ Função login_for_access_token completada
2. ✅ Endpoint /me implementado (estava faltando)
3. ✅ Proper error handling
4. ✅ Validação de dados melhorada
5. ✅ Logging adequado adicionado
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, EmailStr

from app.core.database import get_database
from app.models.user import User, UserCreate, UserInDB, UserUpdate, UserLogin
from app.dependencies import get_current_user, get_current_user_with_password
from app.utils.security import (
    get_password_hash, verify_password, create_access_token, create_refresh_token
)
from app.core.config import settings
from app.utils.id_handler import IdHandler

logger = logging.getLogger(__name__)

router = APIRouter()


class Token(BaseModel):
    """Schema para resposta de token."""
    access_token: str
    token_type: str
    expires_in: int
    refresh_token: Optional[str] = None
    user: User

    class Config:
        schema_extra = {
            "example": {
                "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
                "token_type": "bearer",
                "expires_in": 3600,
                "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
                "user": {
                    "id": "507f1f77bcf86cd799439011",
                    "username": "dungeon_master",
                    "email": "dm@example.com",
                    "role": "dm",
                    "is_active": True
                }
            }
        }


class RefreshTokenRequest(BaseModel):
    """Schema para refresh token."""
    refresh_token: str


class PasswordChangeRequest(BaseModel):
    """Schema para mudança de senha."""
    current_password: str
    new_password: str


class PasswordResetRequest(BaseModel):
    """Schema para reset de senha."""
    email: EmailStr


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register_user(
        user_data: UserCreate,
        db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """
    Registra um novo usuário.

    Args:
        user_data: Dados do usuário a ser registrado
        db: Conexão com o banco de dados

    Returns:
        Token de acesso e dados do usuário

    Raises:
        HTTPException: Se o e-mail ou nome de usuário já estiverem em uso
    """
    try:
        logger.info(f"Tentativa de registro para: {user_data.email}")

        # Verificar se o e-mail já está registrado
        existing_email = await db.users.find_one({"email": user_data.email})
        if existing_email:
            logger.warning(f"Tentativa de registro com e-mail já existente: {user_data.email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="E-mail já registrado",
            )

        # Verificar se o nome de usuário já está em uso
        existing_username = await db.users.find_one({"username": user_data.username.lower()})
        if existing_username:
            logger.warning(f"Tentativa de registro com username já existente: {user_data.username}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nome de usuário já em uso",
            )

        # Criar hash da senha
        hashed_password = get_password_hash(user_data.password)

        # Criar novo usuário
        new_user_data = {
            "username": user_data.username.lower(),
            "email": user_data.email.lower(),
            "password_hash": hashed_password,
            "role": user_data.role,
            "display_name": user_data.display_name,
            "created_at": datetime.utcnow(),
            "is_active": True,
            "failed_login_attempts": 0,
            "email_verified": False  # Implementar verificação por e-mail futuramente
        }

        # Inserir no banco de dados
        result = await db.users.insert_one(new_user_data)

        # Recuperar o usuário criado (sem password_hash)
        created_user_doc = await db.users.find_one({"_id": result.inserted_id})
        created_user_doc.pop("password_hash", None)  # Remove senha do retorno
        created_user = User(**created_user_doc)

        # Criar tokens
        token_data = {"sub": str(created_user.id)}
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(str(created_user.id))

        # Atualizar último login
        await db.users.update_one(
            {"_id": result.inserted_id},
            {"$set": {"last_login": datetime.utcnow()}}
        )

        logger.info(f"Usuário registrado com sucesso: {created_user.username}")

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "refresh_token": refresh_token,
            "user": created_user
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro no registro de usuário: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno no registro"
        )


@router.post("/login", response_model=Token)
async def login_for_access_token(
        form_data: OAuth2PasswordRequestForm = Depends(),
        db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """
    Login para obter um token de acesso.
    CORREÇÃO: Função completamente implementada.

    Args:
        form_data: Dados de login (email/username e senha)
        db: Conexão com o banco de dados

    Returns:
        Token de acesso e dados do usuário

    Raises:
        HTTPException: Se as credenciais forem inválidas
    """
    try:
        logger.info(f"Tentativa de login para: {form_data.username}")

        # Buscar usuário por email ou username
        user_doc = await db.users.find_one({
            "$or": [
                {"email": form_data.username.lower()},
                {"username": form_data.username.lower()}
            ]
        })

        if not user_doc:
            logger.warning(f"Usuário não encontrado: {form_data.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciais incorretas",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Verificar se a conta não está bloqueada
        if user_doc.get("locked_until") and user_doc["locked_until"] > datetime.utcnow():
            logger.warning(f"Tentativa de login em conta bloqueada: {form_data.username}")
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail="Conta temporariamente bloqueada devido a múltiplas tentativas de login incorretas",
            )

        # Verificar senha
        if not verify_password(form_data.password, user_doc.get("password_hash", "")):
            # Incrementar tentativas de login falhadas
            failed_attempts = user_doc.get("failed_login_attempts", 0) + 1
            update_data = {"failed_login_attempts": failed_attempts}

            # Bloquear conta após 5 tentativas
            if failed_attempts >= 5:
                update_data["locked_until"] = datetime.utcnow() + timedelta(minutes=30)
                logger.warning(f"Conta bloqueada após 5 tentativas: {form_data.username}")

            await db.users.update_one(
                {"_id": user_doc["_id"]},
                {"$set": update_data}
            )

            logger.warning(f"Senha incorreta para: {form_data.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciais incorretas",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Verificar se a conta está ativa
        if not user_doc.get("is_active", True):
            logger.warning(f"Tentativa de login em conta inativa: {form_data.username}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Conta inativa"
            )

        # Login bem-sucedido - resetar tentativas falhadas
        await db.users.update_one(
            {"_id": user_doc["_id"]},
            {
                "$set": {
                    "failed_login_attempts": 0,
                    "last_login": datetime.utcnow()
                },
                "$unset": {"locked_until": ""}
            }
        )

        # Criar modelo de usuário (sem password_hash)
        user_doc.pop("password_hash", None)
        user = User(**user_doc)

        # Criar tokens
        token_data = {"sub": str(user.id)}
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(str(user.id))

        logger.info(f"Login bem-sucedido para: {user.username}")

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "refresh_token": refresh_token,
            "user": user
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro no login: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno no login"
        )


@router.get("/me", response_model=User)
async def get_current_user_info(
        current_user: User = Depends(get_current_user)
) -> User:
    """
    Obtém informações do usuário atual.
    CORREÇÃO: Endpoint implementado (estava faltando).

    Args:
        current_user: Usuário atual obtido do token

    Returns:
        Dados do usuário atual
    """
    logger.debug(f"Informações solicitadas para usuário: {current_user.username}")
    return current_user


@router.put("/me", response_model=User)
async def update_current_user(
        user_updates: UserUpdate,
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
) -> User:
    """
    Atualiza informações do usuário atual.

    Args:
        user_updates: Dados para atualização
        current_user: Usuário atual
        db: Conexão com banco de dados

    Returns:
        Usuário atualizado
    """
    try:
        user_object_id = IdHandler.to_object_id(current_user.id)

        # Preparar dados de atualização
        update_data = user_updates.dict(exclude_unset=True)

        if not update_data:
            return current_user

        # Verificar se email ou username não estão em uso por outro usuário
        if "email" in update_data:
            existing_email = await db.users.find_one({
                "email": update_data["email"].lower(),
                "_id": {"$ne": user_object_id}
            })
            if existing_email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="E-mail já está em uso por outro usuário"
                )
            update_data["email"] = update_data["email"].lower()

        if "username" in update_data:
            existing_username = await db.users.find_one({
                "username": update_data["username"].lower(),
                "_id": {"$ne": user_object_id}
            })
            if existing_username:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Nome de usuário já está em uso"
                )
            update_data["username"] = update_data["username"].lower()

        # Hash nova senha se fornecida
        if "password" in update_data:
            update_data["password_hash"] = get_password_hash(update_data["password"])
            update_data["last_password_change"] = datetime.utcnow()
            update_data.pop("password")

        # Atualizar no banco
        await db.users.update_one(
            {"_id": user_object_id},
            {"$set": update_data}
        )

        # Recuperar usuário atualizado
        updated_user_doc = await db.users.find_one({"_id": user_object_id})
        updated_user_doc.pop("password_hash", None)
        updated_user = User(**updated_user_doc)

        logger.info(f"Usuário atualizado: {updated_user.username}")
        return updated_user

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao atualizar usuário: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno na atualização"
        )


@router.post("/refresh", response_model=Token)
async def refresh_access_token(
        refresh_request: RefreshTokenRequest,
        db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """
    Renova o token de acesso usando refresh token.

    Args:
        refresh_request: Dados do refresh token
        db: Conexão com banco de dados

    Returns:
        Novo token de acesso
    """
    try:
        from app.utils.security import decode_access_token

        # Decodificar refresh token
        payload = decode_access_token(refresh_request.refresh_token)
        user_id = payload.get("sub")
        token_type = payload.get("type")

        if not user_id or token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token inválido"
            )

        # Buscar usuário
        user_object_id = IdHandler.to_object_id(user_id)
        user_doc = await db.users.find_one({"_id": user_object_id})

        if not user_doc or not user_doc.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuário não encontrado ou inativo"
            )

        # Criar novo token de acesso
        user_doc.pop("password_hash", None)
        user = User(**user_doc)

        token_data = {"sub": str(user.id)}
        access_token = create_access_token(token_data)

        logger.info(f"Token renovado para usuário: {user.username}")

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": user
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao renovar token: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno na renovação do token"
        )


@router.post("/change-password")
async def change_password(
        password_change: PasswordChangeRequest,
        current_user_with_password: UserInDB = Depends(get_current_user_with_password),
        db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, str]:
    """
    Altera a senha do usuário atual.

    Args:
        password_change: Dados para mudança de senha
        current_user_with_password: Usuário atual com senha
        db: Conexão com banco de dados

    Returns:
        Mensagem de sucesso
    """
    try:
        # Verificar senha atual
        if not verify_password(password_change.current_password, current_user_with_password.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Senha atual incorreta"
            )

        # Hash nova senha
        new_password_hash = get_password_hash(password_change.new_password)

        # Atualizar no banco
        user_object_id = IdHandler.to_object_id(current_user_with_password.id)
        await db.users.update_one(
            {"_id": user_object_id},
            {
                "$set": {
                    "password_hash": new_password_hash,
                    "last_password_change": datetime.utcnow(),
                    "failed_login_attempts": 0
                },
                "$unset": {"locked_until": ""}
            }
        )

        logger.info(f"Senha alterada para usuário: {current_user_with_password.username}")

        return {"message": "Senha alterada com sucesso"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao alterar senha: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno na alteração de senha"
        )


@router.post("/logout")
async def logout(
        current_user: User = Depends(get_current_user)
) -> Dict[str, str]:
    """
    Logout do usuário.

    Nota: Como JWT é stateless, o logout efetivo deve ser implementado
    no frontend removendo o token.

    Args:
        current_user: Usuário atual

    Returns:
        Mensagem de sucesso
    """
    logger.info(f"Logout realizado para usuário: {current_user.username}")

    return {"message": "Logout realizado com sucesso"}


@router.post("/verify-token")
async def verify_token(
        current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Verifica se o token atual é válido.

    Args:
        current_user: Usuário atual

    Returns:
        Dados do usuário se token válido
    """
    return {
        "valid": True,
        "user": current_user
    }