# app/models/user.py
from datetime import datetime
from typing import Optional, Literal, Any
from pydantic import BaseModel, Field, EmailStr
from bson import ObjectId
from bson.errors import InvalidId
from app.utils.id_handler import IdHandler


class PyObjectId(str):
    """
    Classe para manipular IDs do MongoDB de forma robusta.
    Aceita string ou ObjectId e fornece validação.
    """

    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if v is None:
            return None

        if IdHandler.is_valid_id(v):
            return str(v)
        raise ValueError("Invalid ObjectId")

    @classmethod
    def to_object_id(cls, v):
        """Converte para ObjectId se possível, ou retorna None."""
        return IdHandler.to_object_id(v)

    # Para uso como factory
    def __new__(cls, *args, **kwargs):
        return str(ObjectId())

class User(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    username: str
    email: EmailStr
    password_hash: str
    role: Literal["player", "dm"]
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        schema_extra = {
            "example": {
                "username": "dungeon_master1",
                "email": "dm@example.com",
                "password_hash": "hashed_password_here",
                "role": "dm",
                "created_at": datetime.utcnow(),
                "last_login": datetime.utcnow()
            }
        }


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: Literal["player", "dm"] = "player"


class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    role: Optional[Literal["player", "dm"]] = None


class UserInDB(User):
    pass