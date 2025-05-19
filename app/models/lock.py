# app/models/lock.py
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from bson import ObjectId
from app.models.user import PyObjectId


class Lock(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    resource_id: str  # ID do recurso bloqueado (personagem, encontro, etc.)
    resource_type: str  # Tipo do recurso ('character', 'combat', etc.)
    locked_by: str  # ID do usuário que possui o lock
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        schema_extra = {
            "example": {
                "resource_id": "character123",
                "resource_type": "character",
                "locked_by": "user456",
                "timestamp": datetime.utcnow(),
                "expires_at": datetime.utcnow()
            }
        }


class SessionLock(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    campaign_id: str  # ID da campanha
    resource_type: str  # 'combat', 'initiative', etc.
    locked_by: str  # Geralmente o ID do mestre
    player_turn: Optional[str] = None  # ID do jogador atual, se aplicável
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}