# app/models/npc.py
from datetime import datetime
from typing import List, Optional, Dict, Literal
from pydantic import BaseModel, Field
from bson import ObjectId
from app.models.user import PyObjectId
from app.models.character import Attributes, HitPoints


class NPCAction(BaseModel):
    name: str
    description: str
    attack_bonus: Optional[int] = None
    damage: Optional[str] = None  # Fórmula de dano, ex: "2d6+3"
    damage_type: Optional[str] = None


class NPCStats(BaseModel):
    ac: int
    hp: HitPoints
    speed: int
    attributes: Attributes
    saving_throws: Optional[Dict[str, int]] = None
    skills: Optional[Dict[str, int]] = None
    damage_vulnerabilities: List[str] = []
    damage_resistances: List[str] = []
    damage_immunities: List[str] = []
    condition_immunities: List[str] = []
    senses: Optional[str] = None
    languages: List[str] = []
    challenge_rating: str


class NPC(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    name: str
    source: Literal["custom", "compendium"]
    compendium_id: Optional[str] = None  # ID no compêndio se não for custom
    campaign_id: str
    stats: NPCStats
    actions: List[NPCAction] = []
    legendary_actions: List[NPCAction] = []
    reactions: List[NPCAction] = []
    features: List[Dict[str, str]] = []  # Lista de características {name: str, description: str}
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        schema_extra = {
            "example": {
                "name": "Goblin Arqueiro",
                "source": "custom",
                "campaign_id": "campaign123",
                "stats": {
                    "ac": 12,
                    "hp": {"current": 7, "max": 7},
                    "speed": 30,
                    "attributes": {
                        "strength": 8,
                        "dexterity": 14,
                        "constitution": 10,
                        "intelligence": 10,
                        "wisdom": 8,
                        "charisma": 8
                    },
                    "challenge_rating": "1/4"
                },
                "actions": [
                    {
                        "name": "Arco Curto",
                        "description": "Ataque à distância",
                        "attack_bonus": 4,
                        "damage": "1d6+2",
                        "damage_type": "piercing"
                    }
                ]
            }
        }


class NPCCreate(BaseModel):
    name: str
    source: Literal["custom", "compendium"]
    compendium_id: Optional[str] = None
    campaign_id: str
    stats: NPCStats
    actions: List[NPCAction] = []
    legendary_actions: List[NPCAction] = []
    reactions: List[NPCAction] = []
    features: List[Dict[str, str]] = []
    description: Optional[str] = None


class NPCUpdate(BaseModel):
    name: Optional[str] = None
    stats: Optional[NPCStats] = None
    actions: Optional[List[NPCAction]] = None
    legendary_actions: Optional[List[NPCAction]] = None
    reactions: Optional[List[NPCAction]] = None
    features: Optional[List[Dict[str, str]]] = None
    description: Optional[str] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)