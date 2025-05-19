# app/models/combat.py
from datetime import datetime
from typing import List, Optional, Dict, Literal, Union
from pydantic import BaseModel, Field
from bson import ObjectId
from app.models.user import PyObjectId


class InitiativeEntry(BaseModel):
    id: str  # character_id ou npc_id
    type: Literal["character", "npc"]
    initiative: int
    has_acted: bool = False
    name: Optional[str] = None  # Para facilitar a exibição


class ConditionDuration(BaseModel):
    type: Literal["rounds", "minutes", "hours"]
    value: int


class ConditionApplication(BaseModel):
    round: int
    turn: int


class ConditionEffect(BaseModel):
    target_id: str
    target_type: Literal["character", "npc"]
    condition: str  # 'stunned', 'prone', etc.
    duration: ConditionDuration
    applied_at: ConditionApplication
    notes: Optional[str] = None


class CombatEvent(BaseModel):
    id: str
    round: int
    turn: int
    actor_id: str
    actor_type: Literal["character", "npc", "dm"]
    event_type: Literal["attack", "damage", "spell", "heal", "condition", "movement", "other"]
    target_id: Optional[str] = None
    target_type: Optional[Literal["character", "npc"]] = None
    description: str
    rolls: List[Dict[str, Union[str, int]]] = []  # Lista de rolagens {roll: "1d20+5", result: 17}
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class Combat(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    campaign_id: str
    encounter_id: Optional[str] = None
    status: Literal["active", "completed", "paused"] = "active"
    round: int = 1
    initiative_order: List[InitiativeEntry] = []
    current_turn: int = 0  # Índice no array de initiative_order
    conditions: List[ConditionEffect] = []
    events: List[CombatEvent] = []
    started_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    ended_at: Optional[datetime] = None

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        schema_extra = {
            "example": {
                "campaign_id": "campaign123",
                "encounter_id": "encounter456",
                "status": "active",
                "round": 2,
                "initiative_order": [
                    {
                        "id": "character789",
                        "type": "character",
                        "initiative": 18,
                        "has_acted": True,
                        "name": "Gandalf"
                    },
                    {
                        "id": "npc123",
                        "type": "npc",
                        "initiative": 12,
                        "has_acted": False,
                        "name": "Goblin"
                    }
                ],
                "current_turn": 1
            }
        }


class CombatCreate(BaseModel):
    campaign_id: str
    encounter_id: Optional[str] = None


class CombatUpdate(BaseModel):
    status: Optional[Literal["active", "completed", "paused"]] = None
    round: Optional[int] = None
    initiative_order: Optional[List[InitiativeEntry]] = None
    current_turn: Optional[int] = None
    conditions: Optional[List[ConditionEffect]] = None
    events: Optional[List[CombatEvent]] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    ended_at: Optional[datetime] = None