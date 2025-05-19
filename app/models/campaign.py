# app/models/campaign.py
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from bson import ObjectId
from app.models.user import PyObjectId


class TrapModel(BaseModel):
    name: str
    description: str
    dc: int
    damage: str  # Fórmula de dano, ex: "2d6+3"
    triggered: bool = False


class NPCReference(BaseModel):
    npc_id: str
    quantity: int = 1
    hp_override: Optional[int] = None
    initiative_override: Optional[int] = None
    hidden: bool = False


class EncounterModel(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    npcs: List[NPCReference] = []
    traps: List[TrapModel] = []
    map_image_id: Optional[str] = None
    notes: Optional[str] = None


class ImageModel(BaseModel):
    id: str
    url: str
    name: str
    description: Optional[str] = None
    tags: List[str] = []
    is_map: bool = False
    grid_enabled: bool = False
    grid_size: Optional[int] = None


class Campaign(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    name: str
    description: Optional[str] = None
    dm_id: str  # ID do mestre
    players: List[str] = []  # IDs dos jogadores
    active_encounter: Optional[str] = None  # ID do encontro ativo
    encounters: List[EncounterModel] = []
    images: List[ImageModel] = []
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        schema_extra = {
            "example": {
                "name": "The Lost Mines of Phandelver",
                "description": "A campanha para iniciantes do D&D 5e",
                "dm_id": "user123",
                "players": ["user456", "user789"],
                "encounters": [
                    {
                        "id": "enc1",
                        "name": "Emboscada Goblin",
                        "npcs": [
                            {"npc_id": "goblin1", "quantity": 3}
                        ]
                    }
                ]
            }
        }


class CampaignCreate(BaseModel):
    name: str
    description: Optional[str] = None
    dm_id: str


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    players: Optional[List[str]] = None
    active_encounter: Optional[str] = None
    notes: Optional[str] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)