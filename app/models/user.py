# app/models/user.py
"""
User models - CORRIGIDO
Problemas resolvidos:
1. ✅ password_hash removido do modelo User público
2. ✅ PyObjectId implementation corrigida
3. ✅ Separação clara entre User público e UserInDB
4. ✅ Validação melhorada de ObjectIds
"""

from datetime import datetime
from typing import Optional, Literal, Any
from pydantic import BaseModel, Field, EmailStr, validator
from bson import ObjectId
from bson.errors import InvalidId

from app.utils.id_handler import IdHandler


class PyObjectId(str):
    """
    Classe para manipular IDs do MongoDB de forma robusta.
    CORREÇÃO: Implementação corrigida para aceitar argumentos.
    """

    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, field=None):
        """
        Valida o valor do ObjectId.

        Args:
            v: Valor a ser validado
            field: Campo sendo validado (opcional)

        Returns:
            String representation do ObjectId

        Raises:
            ValueError: Se o valor não for um ObjectId válido
        """
        if v is None:
            return None

        if IdHandler.is_valid_id(v):
            return str(v)

        raise ValueError(f"Invalid ObjectId: {v}")

    @classmethod
    def to_object_id(cls, v):
        """Converte para ObjectId se possível, ou retorna None."""
        return IdHandler.to_object_id(v)

    def __new__(cls, value=None):
        """
        Cria nova instância do PyObjectId.
        CORREÇÃO: Agora aceita argumentos opcionais.
        """
        if value is not None:
            # Se um valor foi fornecido, use-o
            if IdHandler.is_valid_id(value):
                return str(value)
            else:
                raise ValueError(f"Invalid ObjectId: {value}")
        else:
            # Se nenhum valor foi fornecido, gere um novo
            return str(ObjectId())


class User(BaseModel):
    """
    Modelo público do usuário.
    CORREÇÃO: password_hash removido para segurança.
    """
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    role: Literal["player", "dm"]
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None
    is_active: bool = Field(default=True)

    # Campos opcionais para perfil
    display_name: Optional[str] = Field(None, max_length=100)
    avatar_url: Optional[str] = None
    bio: Optional[str] = Field(None, max_length=500)

    @validator('username')
    def validate_username(cls, v):
        """Valida o nome de usuário."""
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Username deve conter apenas letras, números, _ e -')
        return v.lower()

    @validator('display_name')
    def validate_display_name(cls, v):
        """Valida o nome de exibição."""
        if v and len(v.strip()) < 2:
            raise ValueError('Display name deve ter pelo menos 2 caracteres')
        return v.strip() if v else None

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        schema_extra = {
            "example": {
                "username": "dungeon_master1",
                "email": "dm@example.com",
                "role": "dm",
                "display_name": "Master of Dragons",
                "created_at": "2025-01-15T10:30:00Z",
                "last_login": "2025-01-15T10:30:00Z",
                "is_active": True
            }
        }


class UserCreate(BaseModel):
    """Schema para criação de usuário."""
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    role: Literal["player", "dm"] = "player"
    display_name: Optional[str] = Field(None, max_length=100)

    @validator('username')
    def validate_username(cls, v):
        """Valida o nome de usuário."""
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Username deve conter apenas letras, números, _ e -')
        return v.lower()

    @validator('password')
    def validate_password(cls, v):
        """Valida a senha."""
        if len(v) < 8:
            raise ValueError('Senha deve ter pelo menos 8 caracteres')
        if not any(c.isupper() for c in v):
            raise ValueError('Senha deve conter pelo menos uma letra maiúscula')
        if not any(c.islower() for c in v):
            raise ValueError('Senha deve conter pelo menos uma letra minúscula')
        if not any(c.isdigit() for c in v):
            raise ValueError('Senha deve conter pelo menos um número')
        return v

    class Config:
        schema_extra = {
            "example": {
                "username": "new_player",
                "email": "player@example.com",
                "password": "SecurePass123",
                "role": "player",
                "display_name": "João da Silva"
            }
        }


class UserUpdate(BaseModel):
    """Schema para atualização de usuário."""
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=8, max_length=128)
    role: Optional[Literal["player", "dm"]] = None
    display_name: Optional[str] = Field(None, max_length=100)
    avatar_url: Optional[str] = None
    bio: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None

    @validator('username')
    def validate_username(cls, v):
        """Valida o nome de usuário."""
        if v and not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Username deve conter apenas letras, números, _ e -')
        return v.lower() if v else None

    @validator('password')
    def validate_password(cls, v):
        """Valida a senha."""
        if v:
            if len(v) < 8:
                raise ValueError('Senha deve ter pelo menos 8 caracteres')
            if not any(c.isupper() for c in v):
                raise ValueError('Senha deve conter pelo menos uma letra maiúscula')
            if not any(c.islower() for c in v):
                raise ValueError('Senha deve conter pelo menos uma letra minúscula')
            if not any(c.isdigit() for c in v):
                raise ValueError('Senha deve conter pelo menos um número')
        return v


class UserInDB(User):
    """
    Modelo do usuário no banco de dados.
    CORREÇÃO: Agora contém password_hash que não é exposto publicamente.
    """
    password_hash: str

    # Campos adicionais para auditoria e segurança
    failed_login_attempts: int = Field(default=0)
    locked_until: Optional[datetime] = None
    email_verified: bool = Field(default=False)
    last_password_change: Optional[datetime] = None

    class Config:
        schema_extra = {
            "example": {
                "username": "dungeon_master1",
                "email": "dm@example.com",
                "password_hash": "$2b$12$...",
                "role": "dm",
                "created_at": "2025-01-15T10:30:00Z",
                "last_login": "2025-01-15T10:30:00Z",
                "is_active": True,
                "failed_login_attempts": 0,
                "email_verified": True
            }
        }


class UserLogin(BaseModel):
    """Schema para login de usuário."""
    email: EmailStr
    password: str

    class Config:
        schema_extra = {
            "example": {
                "email": "user@example.com",
                "password": "MySecurePassword123"
            }
        }


class UserListItem(BaseModel):
    """Schema simplificado para listagem de usuários."""
    id: PyObjectId = Field(alias="_id")
    username: str
    email: EmailStr
    role: Literal["player", "dm"]
    display_name: Optional[str] = None
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class UserProfile(BaseModel):
    """Schema para perfil público do usuário."""
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    role: Literal["player", "dm"]
    created_at: datetime

    class Config:
        schema_extra = {
            "example": {
                "username": "epic_dm",
                "display_name": "Epic Dungeon Master",
                "avatar_url": "/avatars/dm_avatar.jpg",
                "bio": "DM há 10 anos, especialista em campanhas épicas!",
                "role": "dm",
                "created_at": "2025-01-15T10:30:00Z"
            }
        }