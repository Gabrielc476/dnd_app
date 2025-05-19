# app/models/character.py
from datetime import datetime
from typing import Dict, List, Optional, Union, Literal
from pydantic import BaseModel, Field
from bson import ObjectId
from app.models.user import PyObjectId


class Attributes(BaseModel):
    strength: int = Field(..., ge=1, le=30)
    dexterity: int = Field(..., ge=1, le=30)
    constitution: int = Field(..., ge=1, le=30)
    intelligence: int = Field(..., ge=1, le=30)
    wisdom: int = Field(..., ge=1, le=30)
    charisma: int = Field(..., ge=1, le=30)


class HitPoints(BaseModel):
    current: int
    max: int


class SpellSlot(BaseModel):
    used: int = 0
    total: int


class Spellcasting(BaseModel):
    ability: str
    spell_slots: Dict[str, SpellSlot]  # Por exemplo, "1": {used: 2, total: 4}
    prepared_spells: List[str] = []  # IDs das magias preparadas


class InventoryItem(BaseModel):
    item_id: str
    name: str
    quantity: int = 1
    equipped: bool = False
    description: Optional[str] = None
    weight: Optional[float] = None
    value: Optional[int] = None


class Proficiency(BaseModel):
    name: str
    type: Literal["skill", "saving_throw", "tool", "weapon", "armor", "language"]
    expertise: bool = False


class Character(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    name: str
    owner_id: str  # ID do usuário
    campaign_id: str  # ID da campanha
    race: str
    class_name: str = Field(..., alias="class")  # 'class' é palavra reservada em Python
    level: int = Field(..., ge=1, le=20)
    attributes: Attributes
    hp: HitPoints
    temporary_hp: int = 0
    armor_class: int
    speed: int
    initiative_bonus: int = 0
    spellcasting: Optional[Spellcasting] = None
    inventory: List[InventoryItem] = []
    proficiencies: List[Proficiency] = []
    features: List[Dict[str, str]] = []  # Lista de características {name: str, description: str}
    background: Optional[str] = None
    alignment: Optional[str] = None
    experience_points: int = 0
    inspiration: bool = False
    conditions: List[str] = []  # Condições como "poisoned", "stunned", etc.
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        schema_extra = {
            "example": {
                "name": "Gandalf",
                "owner_id": "user123",
                "campaign_id": "campaign456",
                "race": "Human",
                "class": "Wizard",
                "level": 5,
                "attributes": {
                    "strength": 10,
                    "dexterity": 14,
                    "constitution": 12,
                    "intelligence": 18,
                    "wisdom": 16,
                    "charisma": 13
                },
                "hp": {
                    "current": 25,
                    "max": 32
                },
                "armor_class": 13,
                "speed": 30
            }
        }


class CharacterCreate(BaseModel):
    name: str
    owner_id: str
    campaign_id: str
    race: str
    class_name: str = Field(..., alias="class")
    level: int = Field(..., ge=1, le=20)
    attributes: Attributes
    hp: HitPoints
    armor_class: int
    speed: int
    # Outros campos opcionais omitidos por brevidade


class CharacterUpdate(BaseModel):
    name: Optional[str] = None
    race: Optional[str] = None
    class_name: Optional[str] = Field(None, alias="class")
    level: Optional[int] = Field(None, ge=1, le=20)
    attributes: Optional[Attributes] = None
    hp: Optional[HitPoints] = None
    temporary_hp: Optional[int] = None
    armor_class: Optional[int] = None
    speed: Optional[int] = None
    initiative_bonus: Optional[int] = None
    spellcasting: Optional[Spellcasting] = None
    inventory: Optional[List[InventoryItem]] = None
    proficiencies: Optional[List[Proficiency]] = None
    features: Optional[List[Dict[str, str]]] = None
    background: Optional[str] = None
    alignment: Optional[str] = None
    experience_points: Optional[int] = None
    inspiration: Optional[bool] = None
    conditions: Optional[List[str]] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)