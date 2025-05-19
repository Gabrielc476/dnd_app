# app/schemas/combat.py
from datetime import datetime
from typing import List, Optional, Dict, Any, Literal, Union
from pydantic import BaseModel, Field, root_validator
from bson import ObjectId
from app.models.user import PyObjectId


class InitiativeEntrySchema(BaseModel):
    id: str  # character_id or npc_id
    type: Literal["character", "npc"]
    initiative: int
    has_acted: bool = False
    name: Optional[str] = None  # For display purposes

    class Config:
        schema_extra = {
            "example": {
                "id": "character123",
                "type": "character",
                "initiative": 18,
                "has_acted": False,
                "name": "Thordak Firehammer"
            }
        }


class ConditionDurationSchema(BaseModel):
    type: Literal["rounds", "minutes", "hours"]
    value: int = Field(..., gt=0)

    class Config:
        schema_extra = {
            "example": {
                "type": "rounds",
                "value": 3
            }
        }


class ConditionApplicationSchema(BaseModel):
    round: int = Field(..., gt=0)
    turn: int = Field(..., ge=0)

    class Config:
        schema_extra = {
            "example": {
                "round": 2,
                "turn": 3
            }
        }


class ConditionEffectSchema(BaseModel):
    target_id: str
    target_type: Literal["character", "npc"]
    condition: str  # e.g., 'stunned', 'prone', etc.
    duration: ConditionDurationSchema
    applied_at: ConditionApplicationSchema
    notes: Optional[str] = None

    class Config:
        schema_extra = {
            "example": {
                "target_id": "character123",
                "target_type": "character",
                "condition": "stunned",
                "duration": {
                    "type": "rounds",
                    "value": 2
                },
                "applied_at": {
                    "round": 3,
                    "turn": 2
                },
                "notes": "Failed saving throw against Mind Blast"
            }
        }


class DiceRollSchema(BaseModel):
    roll: str  # e.g., "1d20+5"
    result: int

    class Config:
        schema_extra = {
            "example": {
                "roll": "1d20+5",
                "result": 17
            }
        }


class CombatEventSchema(BaseModel):
    id: str
    round: int = Field(..., gt=0)
    turn: int = Field(..., ge=0)
    actor_id: str
    actor_type: Literal["character", "npc", "dm"]
    event_type: Literal["attack", "damage", "spell", "heal", "condition", "movement", "other"]
    target_id: Optional[str] = None
    target_type: Optional[Literal["character", "npc"]] = None
    description: str
    rolls: List[DiceRollSchema] = Field(default_factory=list)
    timestamp: datetime

    class Config:
        schema_extra = {
            "example": {
                "id": "event123",
                "round": 2,
                "turn": 1,
                "actor_id": "character123",
                "actor_type": "character",
                "event_type": "attack",
                "target_id": "npc456",
                "target_type": "npc",
                "description": "Thordak attacks Goblin Chief with longsword",
                "rolls": [
                    {
                        "roll": "1d20+7",
                        "result": 19
                    },
                    {
                        "roll": "1d8+4",
                        "result": 9
                    }
                ],
                "timestamp": "2025-01-01T12:00:00"
            }
        }


class CombatBaseSchema(BaseModel):
    campaign_id: str


class CombatCreateSchema(CombatBaseSchema):
    encounter_id: Optional[str] = None

    class Config:
        schema_extra = {
            "example": {
                "campaign_id": "campaign123",
                "encounter_id": "encounter456"
            }
        }


class CombatUpdateSchema(BaseModel):
    status: Optional[Literal["active", "completed", "paused"]] = None
    round: Optional[int] = Field(None, gt=0)
    initiative_order: Optional[List[InitiativeEntrySchema]] = None
    current_turn: Optional[int] = Field(None, ge=0)
    conditions: Optional[List[ConditionEffectSchema]] = None
    events: Optional[List[CombatEventSchema]] = None

    class Config:
        schema_extra = {
            "example": {
                "status": "paused",
                "round": 3,
                "current_turn": 2
            }
        }

    @root_validator
    def check_at_least_one_field(cls, values):
        """Ensure at least one field has a value."""
        if not any(v is not None for v in values.values()):
            raise ValueError("At least one field must be provided for update.")
        return values


class CombatSchema(CombatBaseSchema):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    encounter_id: Optional[str] = None
    status: Literal["active", "completed", "paused"]
    round: int
    initiative_order: List[InitiativeEntrySchema]
    current_turn: int
    conditions: List[ConditionEffectSchema]
    events: List[CombatEventSchema]
    started_at: datetime
    updated_at: datetime
    ended_at: Optional[datetime] = None

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class RollInitiativeSchema(BaseModel):
    entity_id: str
    entity_type: Literal["character", "npc"]
    initiative_roll: Optional[int] = None  # If None, system will roll automatically

    class Config:
        schema_extra = {
            "example": {
                "entity_id": "character123",
                "entity_type": "character"
            }
        }


class ActionSchema(BaseModel):
    action_type: Literal["attack", "cast", "dash", "disengage", "dodge", "help", "hide", "ready", "use", "other"]
    description: str
    target_id: Optional[str] = None
    target_type: Optional[Literal["character", "npc"]] = None

    class Config:
        schema_extra = {
            "example": {
                "action_type": "attack",
                "description": "Attack with Longsword",
                "target_id": "npc123",
                "target_type": "npc"
            }
        }