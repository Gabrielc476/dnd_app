# app/dependencies.py
"""
Dependencies para FastAPI - CORRIGIDO PARA PyJWT
Problemas resolvidos:
1. ✅ Removidos prints de debug inseguros
2. ✅ Melhorado tratamento de exceções específicas
3. ✅ Corrigida conversão de ObjectId
4. ✅ Adicionado logging adequado
5. ✅ Implementadas validações de permissão
6. ✅ Migrado para PyJWT (compatibility fix)
7. ✅ ADICIONADA verify_character_access que estava faltando
"""

import logging
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from bson.errors import InvalidId

from app.core.database import get_database
from app.utils.security import decode_access_token
from app.utils.id_handler import IdHandler
from app.models.user import User, UserInDB

logger = logging.getLogger(__name__)

# Esquema de autenticação OAuth2
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user(
        token: str = Depends(oauth2_scheme),
        db: AsyncIOMotorDatabase = Depends(get_database)
) -> User:
    """
    Obtém o usuário atual a partir do token JWT.

    Args:
        token: Token JWT de autenticação
        db: Conexão com o banco de dados

    Returns:
        Usuário autenticado

    Raises:
        HTTPException: Se o token for inválido ou usuário não existir
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não foi possível validar as credenciais",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Decodificar o token
        payload = decode_access_token(token)
        user_id = payload.get("sub")

        if user_id is None:
            logger.warning("Token sem campo 'sub' válido")
            raise credentials_exception

        # Converter para ObjectId de forma segura
        user_object_id = IdHandler.to_object_id(user_id)
        if user_object_id is None:
            logger.warning(f"ID de usuário inválido no token: {user_id}")
            raise credentials_exception

        # Buscar usuário no banco
        user_doc = await db.users.find_one({"_id": user_object_id})

        if user_doc is None:
            logger.warning(f"Usuário não encontrado: {user_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário não encontrado",
            )

        # Verificar se o usuário está ativo
        if not user_doc.get("is_active", True):
            logger.warning(f"Tentativa de acesso com usuário inativo: {user_id}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuário inativo"
            )

        # Converter documento para modelo User (sem password_hash)
        user_doc.pop("password_hash", None)  # Remove senha do retorno
        user = User(**user_doc)

        logger.debug(f"Usuário autenticado com sucesso: {user.username}")
        return user

    except HTTPException:
        # Re-propagar HTTPExceptions
        raise
    except InvalidId:
        logger.warning(f"ObjectId inválido no token: {user_id}")
        raise credentials_exception
    except Exception as e:
        logger.error(f"Erro inesperado na autenticação: {type(e).__name__}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno na autenticação"
        )


async def get_current_user_with_password(
        token: str = Depends(oauth2_scheme),
        db: AsyncIOMotorDatabase = Depends(get_database)
) -> UserInDB:
    """
    Obtém o usuário atual com password_hash (para operações internas).

    Args:
        token: Token JWT de autenticação
        db: Conexão com o banco de dados

    Returns:
        Usuário completo com password_hash
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não foi possível validar as credenciais",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")

        if user_id is None:
            raise credentials_exception

        user_object_id = IdHandler.to_object_id(user_id)
        if user_object_id is None:
            raise credentials_exception

        user_doc = await db.users.find_one({"_id": user_object_id})

        if user_doc is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário não encontrado",
            )

        if not user_doc.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuário inativo"
            )

        return UserInDB(**user_doc)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro na autenticação com password: {type(e).__name__}")
        raise credentials_exception


async def get_current_active_user(
        current_user: User = Depends(get_current_user)
) -> User:
    """
    Verifica se o usuário atual está ativo.

    Args:
        current_user: Usuário atual obtido do token

    Returns:
        Usuário atual se estiver ativo

    Raises:
        HTTPException: Se o usuário estiver inativo
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário inativo"
        )
    return current_user


async def get_current_dm(
        current_user: User = Depends(get_current_active_user)
) -> User:
    """
    Verifica se o usuário atual é um Dungeon Master.

    Args:
        current_user: Usuário atual obtido do token

    Returns:
        Usuário atual se for DM

    Raises:
        HTTPException: Se o usuário não for DM
    """
    if current_user.role != "dm":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operação requer privilégios de Dungeon Master"
        )
    return current_user


async def verify_campaign_access(
        campaign_id: str,
        user: User,
        db: AsyncIOMotorDatabase,
        require_dm: bool = False
) -> dict:
    """
    Verifica se o usuário tem acesso à campanha.

    Args:
        campaign_id: ID da campanha
        user: Usuário atual
        db: Conexão com o banco de dados
        require_dm: Se requer privilégios de DM

    Returns:
        Documento da campanha

    Raises:
        HTTPException: Se não tiver acesso ou campanha não existir
    """
    campaign_object_id = IdHandler.to_object_id(campaign_id)
    if campaign_object_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID de campanha inválido"
        )

    campaign = await db.campaigns.find_one({"_id": campaign_object_id})
    if campaign is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campanha não encontrada"
        )

    user_object_id = IdHandler.to_object_id(str(user.id))

    # Verificar se é o DM da campanha
    is_dm = campaign.get("dm_id") == user_object_id

    # Verificar se é um jogador na campanha
    players = campaign.get("players", [])
    is_player = user_object_id in players

    # Verificar acesso
    if require_dm and not is_dm:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operação requer privilégios de Dungeon Master"
        )

    if not (is_dm or is_player):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado à campanha"
        )

    return campaign


async def verify_character_access(
        character_id: str,
        user: User,
        db: AsyncIOMotorDatabase,
        allow_dm: bool = True
) -> dict:
    """
    Verifica se o usuário tem acesso ao personagem.

    Args:
        character_id: ID do personagem
        user: Usuário fazendo a requisição
        db: Conexão com banco de dados
        allow_dm: Se True, permite acesso ao DM da campanha

    Returns:
        Documento do personagem

    Raises:
        HTTPException: Se não tiver acesso ou personagem não existir
    """
    try:
        character_object_id = IdHandler.to_object_id(character_id)
        if character_object_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="ID de personagem inválido"
            )

        character = await db.characters.find_one({"_id": character_object_id})
        if not character:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Personagem não encontrado"
            )

        user_object_id = IdHandler.to_object_id(str(user.id))
        is_owner = character.get("owner_id") == user_object_id

        # Se não é o dono, verificar se é DM da campanha (se permitido)
        if not is_owner and allow_dm:
            campaign_id = character.get("campaign_id")
            if campaign_id:
                try:
                    campaign = await verify_campaign_access(
                        str(campaign_id),
                        user,
                        db,
                        require_dm=True
                    )
                    # Se chegou até aqui, é DM da campanha
                    logger.debug(f"Acesso de DM concedido ao personagem {character_id}")
                except HTTPException:
                    # Se falhou a verificação de DM, negar acesso
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Usuário não tem acesso a este personagem"
                    )
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Personagem não está associado a uma campanha"
                )
        elif not is_owner:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuário não tem acesso a este personagem"
            )

        return character

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao verificar acesso ao personagem: {type(e).__name__}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao verificar acesso"
        )


async def get_campaign_with_access(
        campaign_id: str,
        current_user: User = Depends(get_current_active_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
) -> dict:
    """
    Dependency que verifica acesso e retorna a campanha.

    Args:
        campaign_id: ID da campanha
        current_user: Usuário atual
        db: Conexão com o banco de dados

    Returns:
        Documento da campanha
    """
    return await verify_campaign_access(campaign_id, current_user, db)


async def get_campaign_with_dm_access(
        campaign_id: str,
        current_user: User = Depends(get_current_active_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
) -> dict:
    """
    Dependency que verifica acesso de DM e retorna a campanha.

    Args:
        campaign_id: ID da campanha
        current_user: Usuário atual (deve ser DM)
        db: Conexão com o banco de dados

    Returns:
        Documento da campanha
    """
    return await verify_campaign_access(campaign_id, current_user, db, require_dm=True)


async def get_character_with_access(
        character_id: str,
        current_user: User = Depends(get_current_active_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
) -> dict:
    """
    Dependency que verifica acesso e retorna o personagem.

    Args:
        character_id: ID do personagem
        current_user: Usuário atual
        db: Conexão com o banco de dados

    Returns:
        Documento do personagem
    """
    return await verify_character_access(character_id, current_user, db)


# Alias para compatibilidade
get_db = get_database