# app/routers/auth.py
from datetime import datetime, timedelta
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, EmailStr


from app.db import get_database
from app.models.user import User, UserCreate, UserInDB
from app.dependencies import get_current_user
from app.utils.security import get_password_hash, verify_password, create_access_token
from app.config import settings

router = APIRouter(
    prefix="/api/auth",
    tags=["authentication"],
    responses={404: {"description": "Not found"}},
)


class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    username: str
    role: str


@router.post("/register", response_model=User)
async def register_user(
        user_data: UserCreate,
        db: AsyncIOMotorDatabase = Depends(get_database)
) -> Any:
    """
    Registra um novo usuário.

    Args:
        user_data: Dados do usuário a ser registrado
        db: Conexão com o banco de dados

    Returns:
        Usuário registrado

    Raises:
        HTTPException: Se o e-mail ou nome de usuário já estiverem em uso
    """
    # Verificar se o e-mail já está registrado
    existing_email = await db.users.find_one({"email": user_data.email})
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="E-mail já registrado",
        )

    # Verificar se o nome de usuário já está em uso
    existing_username = await db.users.find_one({"username": user_data.username})
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nome de usuário já em uso",
        )

    # Criar novo usuário
    hashed_password = get_password_hash(user_data.password)
    new_user = UserInDB(
        username=user_data.username,
        email=user_data.email,
        password_hash=hashed_password,
        role=user_data.role,
        created_at=datetime.utcnow(),
    )

    # Inserir no banco de dados
    result = await db.users.insert_one(new_user.dict(by_alias=True))

    # Recuperar o usuário criado
    created_user = await db.users.find_one({"_id": result.inserted_id})

    return User(**created_user)


@router.post("/login", response_model=Token)
async def login_for_access_token(
        form_data: OAuth2PasswordRequestForm = Depends(),
        db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, str]:
    """
    Login para obter um token de acesso.

    Args:
        form_data: Formulário de login OAuth2
        db: Conexão com o banco de dados

    Returns:
        Token de acesso, tipo de token e dados básicos do usuário

    Raises:
        HTTPException: Se as credenciais estiverem incorretas
    """
    # Buscar usuário por nome de usuário
    user = await db.users.find_one({"username": form_data.username})

    if not user or not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nome de usuário ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Atualizar último login
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": datetime.utcnow()}}
    )

    # Criar token de acesso
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user["_id"])},
        expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": str(user["_id"]),
        "username": user["username"],
        "role": user["role"]
    }


@router.post("/refresh-token", response_model=Token)
async def refresh_access_token(
        current_user: User = Depends(get_current_user)
) -> Dict[str, str]:
    """
    Renova o token de acesso do usuário atual.

    Args:
        current_user: Usuário atual obtido do token

    Returns:
        Novo token de acesso e tipo de token
    """
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(current_user.id)},
        expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": str(current_user.id),
        "username": current_user.username,
        "role": current_user.role
    }


@router.get("/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_user)) -> User:
    """
    Retorna informações sobre o usuário atual.

    Args:
        current_user: Usuário atual obtido do token

    Returns:
        Dados do usuário atual
    """
    return current_user


@router.get("/debug-users")
async def debug_users(db: AsyncIOMotorDatabase = Depends(get_database)):
    """FOR DEBUGGING ONLY - List all users and their ID formats"""
    users = await db.users.find().to_list(length=100)
    user_data = []

    for user in users:
        user_data.append({
            "id": str(user.get("_id")),
            "id_type": type(user.get("_id")).__name__,
            "username": user.get("username"),
            "role": user.get("role")
        })

    return {"users": user_data}