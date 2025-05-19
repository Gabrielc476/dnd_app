# app/schemas/campaign.py
from datetime import datetime
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field, root_validator
from bson import ObjectId
from app.models.user import PyObjectId


class TrapSchema(BaseModel):
    name: str
    description: str
    dc: int = Field(..., ge=1, le=30)
    damage: str  # Damage formula (e.g., "2d6+3")
    triggered: bool = False

    class Config:
        schema_extra = {
            "example": {
                "name": "Dart Trap",
                "description": "Hidden darts shoot from the wall when a pressure plate is triggered",
                "dc": 15,
                "damage": "2d4+2",
                "triggered": False
            }
        }


class NPCReferenceSchema(BaseModel):
    npc_id: str
    quantity: int = Field(1, ge=1)
    hp_override: Optional[int] = None
    initiative_override: Optional[int] = None
    hidden: bool = False

    class Config:
        schema_extra = {
            "example": {
                "npc_id": "goblin123",
                "quantity": 4,
                "hidden": True
            }
        }


class ImageSchema(BaseModel):
    id: str
    url: str
    name: str
    description: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    is_map: bool = False
    grid_enabled: bool = False
    grid_size: Optional[int] = None

    class Config:
        schema_extra = {
            "example": {
                "id": "img123",
                "url": "/images/maps/dungeon_entrance.jpg",
                "name": "Dungeon Entrance",
                "description": "The large stone entrance to the ancient dungeon",
                "tags": ["dungeon", "map", "entrance"],
                "is_map": True,
                "grid_enabled": True,
                "grid_size": 50
            }
        }


class EncounterBaseSchema(BaseModel):
    name: str
    description: Optional[str] = None
    map_image_id: Optional[str] = None
    notes: Optional[str] = None


class EncounterCreateSchema(EncounterBaseSchema):
    npcs: List[NPCReferenceSchema] = Field(default_factory=list)
    traps: List[TrapSchema] = Field(default_factory=list)

    class Config:
        schema_extra = {
            "example": {
                "name": "Goblin Ambush",
                "description": "A group of goblins hiding in the forest",
                "npcs": [
                    {"npc_id": "goblin123", "quantity": 3, "hidden": True}
                ],
                "traps": [
                    {
                        "name": "Pit Trap",
                        "description": "A covered pit with spikes at the bottom",
                        "dc": 12,
                        "damage": "2d6",
                        "triggered": False
                    }
                ],
                "map_image_id": "map123",
                "notes": "The goblins will attempt to lure players into the pit trap"
            }
        }


class EncounterSchema(EncounterBaseSchema):
    id: str
    npcs: List[NPCReferenceSchema]
    traps: List[TrapSchema]

    class Config:
        schema_extra = {
            "example": {
                "id": "enc123",
                "name": "Goblin Ambush",
                "description": "A group of goblins hiding in the forest",
                "npcs": [
                    {"npc_id": "goblin123", "quantity": 3, "hidden": True}
                ],
                "traps": [
                    {
                        "name": "Pit Trap",
                        "description": "A covered pit with spikes at the bottom",
                        "dc": 12,
                        "damage": "2d6",
                        "triggered": False
                    }
                ],
                "map_image_id": "map123",
                "notes": "The goblins will attempt to lure players into the pit trap"
            }
        }


class CampaignBaseSchema(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None


class CampaignCreateSchema(CampaignBaseSchema):
    dm_id: str

    class Config:
        schema_extra = {
            "example": {
                "name": "The Curse of Strahd",
                "description": "A gothic horror campaign set in the realm of Barovia",
                "dm_id": "user123"
            }
        }


class CampaignUpdateSchema(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    players: Optional[List[str]] = None
    active_encounter: Optional[str] = None
    notes: Optional[str] = None

    class Config:
        schema_extra = {
            "example": {
                "name": "The Curse of Strahd - Reloaded",
                "players": ["user456", "user789"]
            }
        }

    @root_validator
    def check_at_least_one_field(cls, values):
        """Ensure at least one field has a value."""
        if not any(v is not None for v in values.values()):
            raise ValueError("At least one field must be provided for update.")
        return values


class CampaignSchema(CampaignBaseSchema):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    dm_id: str
    players: List[str]
    active_encounter: Optional[str] = None
    encounters: List[EncounterSchema]
    images: List[ImageSchema]
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class CampaignListSchema(BaseModel):
    id: PyObjectId = Field(..., alias="_id")
    name: str
    description: Optional[str] = None
    dm_id: str
    player_count: int
    active: bool
    created_at: datetime

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class EncounterUpdateSchema(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    npcs: Optional[List[NPCReferenceSchema]] = None
    traps: Optional[List[TrapSchema]] = None
    map_image_id: Optional[str] = None
    notes: Optional[str] = None

    class Config:
        schema_extra = {
            "example": {
                "name": "Updated Encounter Name",
                "traps": [
                    {
                        "name": "New Trap",
                        "description": "A new trap added to the encounter",
                        "dc": 15,
                        "damage": "3d6",
                        "triggered": False
                    }
                ]
            }
        }

    @root_validator
    def check_at_least_one_field(cls, values):
        """Ensure at least one field has a value."""
        if not any(v is not None for v in values.values()):
            raise ValueError("At least one field must be provided for update.")
        return values


class AddPlayerSchema(BaseModel):
    player_id: str

    class Config:
        schema_extra = {
            "example": {
                "player_id": "user456"
            }
        }


class RemovePlayerSchema(BaseModel):
    player_id: str

    class Config:
        schema_extra = {
            "example": {
                "player_id": "user456"
            }
        }