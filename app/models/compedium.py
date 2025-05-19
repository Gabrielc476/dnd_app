# app/models/compendium.py
from datetime import datetime
from typing import List, Optional, Dict, Any, Literal, Union
from pydantic import BaseModel, Field
from bson import ObjectId
from app.models.user import PyObjectId


class SpellModel(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    name: str
    level: int
    school: str
    casting_time: str
    range: str
    components: str
    duration: str
    description: str
    classes: List[str]
    source: str

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class ItemModel(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    name: str
    type: str  # weapon, armor, wondrous item, potion, etc.
    rarity: str
    requires_attunement: bool = False
    description: str
    weight: Optional[float] = None
    value: Optional[int] = None
    properties: List[str] = []
    source: str

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class MonsterTemplate(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    name: str
    size: str
    type: str
    alignment: str
    armor_class: int
    armor_desc: Optional[str] = None
    hit_points: int
    hit_dice: str
    speed: Dict[str, int]
    strength: int
    dexterity: int
    constitution: int
    intelligence: int
    wisdom: int
    charisma: int
    saving_throws: Optional[Dict[str, int]] = None
    skills: Optional[Dict[str, int]] = None
    damage_vulnerabilities: List[str] = []
    damage_resistances: List[str] = []
    damage_immunities: List[str] = []
    condition_immunities: List[str] = []
    senses: str
    languages: str
    challenge_rating: str
    traits: List[Dict[str, str]] = []
    actions: List[Dict[str, str]] = []
    legendary_actions: List[Dict[str, str]] = []
    source: str

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}