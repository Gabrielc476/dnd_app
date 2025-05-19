# app/schemas/npc.py
from datetime import datetime
from typing import List, Optional, Dict, Literal
from pydantic import BaseModel, Field, root_validator
from bson import ObjectId
from app.models.user import PyObjectId
from app.schemas.character import AttributesSchema, HitPointsSchema


class NPCActionSchema(BaseModel):
    name: str
    description: str
    attack_bonus: Optional[int] = None
    damage: Optional[str] = None  # Damage formula, e.g. "2d6+3"
    damage_type: Optional[str] = None

    class Config:
        schema_extra = {
            "example": {
                "name": "Greataxe",
                "description": "Melee Weapon Attack",
                "attack_bonus": 5,
                "damage": "1d12+3",
                "damage_type": "slashing"
            }
        }


class NPCStatsSchema(BaseModel):
    ac: int = Field(..., ge=0)
    hp: HitPointsSchema
    speed: int = Field(..., ge=0)
    attributes: AttributesSchema
    saving_throws: Optional[Dict[str, int]] = None
    skills: Optional[Dict[str, int]] = None
    damage_vulnerabilities: List[str] = Field(default_factory=list)
    damage_resistances: List[str] = Field(default_factory=list)
    damage_immunities: List[str] = Field(default_factory=list)
    condition_immunities: List[str] = Field(default_factory=list)
    senses: Optional[str] = None
    languages: List[str] = Field(default_factory=list)
    challenge_rating: str

    class Config:
        schema_extra = {
            "example": {
                "ac": 15,
                "hp": {
                    "current": 45,
                    "max": 45
                },
                "speed": 30,
                "attributes": {
                    "strength": 16,
                    "dexterity": 12,
                    "constitution": 14,
                    "intelligence": 8,
                    "wisdom": 10,
                    "charisma": 10
                },
                "saving_throws": {
                    "strength": 5,
                    "constitution": 4
                },
                "skills": {
                    "perception": 2,
                    "intimidation": 2
                },
                "damage_resistances": ["fire"],
                "languages": ["Common", "Orc"],
                "challenge_rating": "2"
            }
        }


class NPCFeatureSchema(BaseModel):
    name: str
    description: str

    class Config:
        schema_extra = {
            "example": {
                "name": "Aggressive",
                "description": "As a bonus action, the orc can move up to its speed toward an enemy that it can see."
            }
        }


class NPCBaseSchema(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    source: Literal["custom", "compendium"]
    campaign_id: str
    stats: NPCStatsSchema


class NPCCreateSchema(NPCBaseSchema):
    compendium_id: Optional[str] = None
    actions: List[NPCActionSchema] = Field(default_factory=list)
    legendary_actions: List[NPCActionSchema] = Field(default_factory=list)
    reactions: List[NPCActionSchema] = Field(default_factory=list)
    features: List[NPCFeatureSchema] = Field(default_factory=list)
    description: Optional[str] = None

    class Config:
        schema_extra = {
            "example": {
                "name": "Orc Chieftain",
                "source": "custom",
                "campaign_id": "campaign123",
                "stats": {
                    "ac": 16,
                    "hp": {
                        "current": 60,
                        "max": 60
                    },
                    "speed": 30,
                    "attributes": {
                        "strength": 18,
                        "dexterity": 12,
                        "constitution": 16,
                        "intelligence": 10,
                        "wisdom": 12,
                        "charisma": 14
                    },
                    "challenge_rating": "3",
                    "languages": ["Common", "Orc"]
                },
                "actions": [
                    {
                        "name": "Greataxe",
                        "description": "Melee Weapon Attack",
                        "attack_bonus": 6,
                        "damage": "1d12+4",
                        "damage_type": "slashing"
                    }
                ],
                "features": [
                    {
                        "name": "Aggressive",
                        "description": "As a bonus action, the orc can move up to its speed toward an enemy that it can see."
                    }
                ],
                "description": "A large, brutish orc adorned with trophies from previous battles."
            }
        }


class NPCUpdateSchema(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    stats: Optional[NPCStatsSchema] = None
    actions: Optional[List[NPCActionSchema]] = None
    legendary_actions: Optional[List[NPCActionSchema]] = None
    reactions: Optional[List[NPCActionSchema]] = None
    features: Optional[List[NPCFeatureSchema]] = None
    description: Optional[str] = None

    class Config:
        schema_extra = {
            "example": {
                "stats": {
                    "hp": {
                        "current": 45,
                        "max": 60
                    }
                },
                "description": "Updated description for the NPC"
            }
        }

    @root_validator
    def check_at_least_one_field(cls, values):
        """Ensure at least one field has a value."""
        if not any(v is not None for v in values.values()):
            raise ValueError("At least one field must be provided for update.")
        return values


class NPCSchema(NPCBaseSchema):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    compendium_id: Optional[str] = None
    actions: List[NPCActionSchema]
    legendary_actions: List[NPCActionSchema]
    reactions: List[NPCActionSchema]
    features: List[NPCFeatureSchema]
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class NPCListSchema(BaseModel):
    id: PyObjectId = Field(..., alias="_id")
    name: str
    source: Literal["custom", "compendium"]
    challenge_rating: str
    type: str  # Inferred from data, like "humanoid", "beast", etc.

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class NPCBulkImportSchema(BaseModel):
    npcs: List[NPCCreateSchema]

    class Config:
        schema_extra = {
            "example": {
                "npcs": [
                    {
                        "name": "Orc Warrior",
                        "source": "custom",
                        "campaign_id": "campaign123",
                        "stats": {
                            "ac": 13,
                            "hp": {
                                "current": 15,
                                "max": 15
                            },
                            "speed": 30,
                            "attributes": {
                                "strength": 16,
                                "dexterity": 12,
                                "constitution": 16,
                                "intelligence": 7,
                                "wisdom": 11,
                                "charisma": 10
                            },
                            "challenge_rating": "1/2",
                            "languages": ["Common", "Orc"]
                        }
                    }
                ]
            }
        }