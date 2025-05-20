# app/dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from bson import ObjectId

from app.db import get_database
from app.utils.security import decode_access_token
from app.models.user import User, UserInDB

# Esquema de autenticação OAuth2
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user(
        token: str = Depends(oauth2_scheme),
        db: AsyncIOMotorDatabase = Depends(get_database)
) -> User:
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")

        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token de acesso inválido - ID não encontrado",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Convert string ID to ObjectId for MongoDB query
        try:
            # This is the key fix - explicitly convert to ObjectId
            object_id = ObjectId(user_id)
            user = await db.users.find_one({"_id": object_id})

            if user:
                return User(**user)
        except Exception as e:
            print(f"Error converting ID to ObjectId: {e}")

        # Fallback - try finding by string ID
        user = await db.users.find_one({"_id": user_id})

        if user:
            return User(**user)

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado",
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro interno: {str(e)}",
        )

async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """
    Verifica se o usuário atual está ativo.

    Args:
        current_user: Usuário atual obtido do token

    Returns:
        Usuário atual se estiver ativo

    Raises:
        HTTPException: Se o usuário estiver inativo
    """
    # Aqui poderíamos implementar uma verificação de usuário ativo
    # Por enquanto, apenas retorna o usuário atual
    return current_user


async def get_current_dm(current_user: User = Depends(get_current_user)) -> User:
    """
    Verifica se o usuário atual é um Dungeon Master.

    Args:
        current_user: Usuário atual obtido do token

    Returns:
        Usuário atual se for um DM

    Raises:
        HTTPException: Se o usuário não for um DM
    """
    if current_user.role != "dm":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito a Dungeon Masters",
        )
    return current_user


# Função auxiliar para verificar o acesso a personagens
async def check_character_access(
        character_id: str,
        user_id: str,
        db: AsyncIOMotorDatabase
) -> bool:
    """
    Verifica se um usuário tem acesso a um personagem específico.

    Args:
        character_id: ID do personagem
        user_id: ID do usuário
        db: Conexão com o banco de dados

    Returns:
        True se o usuário tiver acesso, False caso contrário
    """
    character = await db.characters.find_one({"_id": ObjectId(character_id)})

    if not character:
        return False

    # O proprietário do personagem tem acesso
    if character["owner_id"] == user_id:
        return True

    # O DM da campanha também tem acesso
    campaign = await db.campaigns.find_one({"_id": ObjectId(character["campaign_id"])})
    return campaign is not None and campaign["dm_id"] == user_id