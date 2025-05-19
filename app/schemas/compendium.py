# app/schemas/compendium.py
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field
from bson import ObjectId
from app.models.user import PyObjectId


class SpellSchema(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    name: str
    level: int = Field(..., ge=0, le=9)
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
        schema_extra = {
            "example": {
                "name": "Fireball",
                "level": 3,
                "school": "Evocation",
                "casting_time": "1 action",
                "range": "150 feet",
                "components": "V, S, M (a tiny ball of bat guano and sulfur)",
                "duration": "Instantaneous",
                "description": "A bright streak flashes from your pointing finger to a point you choose...",
                "classes": ["Sorcerer", "Wizard"],
                "source": "Player's Handbook"
            }
        }


class ItemSchema(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    name: str
    type: str  # weapon, armor, wondrous item, potion, etc.
    rarity: str
    requires_attunement: bool = False
    description: str
    weight: Optional[float] = None
    value: Optional[int] = None
    properties: List[str] = Field(default_factory=list)
    source: str

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        schema_extra = {
            "example": {
                "name": "Longsword +1",
                "type": "weapon",
                "rarity": "uncommon",
                "requires_attunement": False,
                "description": "You have a +1 bonus to attack and damage rolls made with this magic weapon.",
                "weight": 3.0,
                "value": 1500,
                "properties": ["versatile"],
                "source": "Dungeon Master's Guide"
            }
        }


class MonsterTemplateSchema(BaseModel):
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
    damage_vulnerabilities: List[str] = Field(default_factory=list)
    damage_resistances: List[str] = Field(default_factory=list)
    damage_immunities: List[str] = Field(default_factory=list)
    condition_immunities: List[str] = Field(default_factory=list)
    senses: str
    languages: str
    challenge_rating: str
    traits: List[Dict[str, str]] = Field(default_factory=list)
    actions: List[Dict[str, str]] = Field(default_factory=list)
    legendary_actions: List[Dict[str, str]] = Field(default_factory=list)
    source: str

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        schema_extra = {
            "example": {
                "name": "Ancient Red Dragon",
                "size": "Gargantuan",
                "type": "dragon",
                "alignment": "chaotic evil",
                "armor_class": 22,
                "armor_desc": "natural armor",
                "hit_points": 546,
                "hit_dice": "28d20+252",
                "speed": {"walk": 40, "climb": 40, "fly": 80},
                "strength": 30,
                "dexterity": 10,
                "constitution": 29,
                "intelligence": 18,
                "wisdom": 15,
                "charisma": 23,
                "saving_throws": {
                    "dexterity": 7,
                    "constitution": 16,
                    "wisdom": 9,
                    "charisma": 13
                },
                "skills": {
                    "perception": 16,
                    "stealth": 7
                },
                "damage_immunities": ["fire"],
                "senses": "blindsight 60 ft., darkvision 120 ft., passive Perception 26",
                "languages": "Common, Draconic",
                "challenge_rating": "24",
                "source": "Monster Manual"
            }
        }


class CompendiumSearchSchema(BaseModel):
    query: str
    type: Literal["spell", "item", "monster"] = None
    classes: Optional[List[str]] = None
    level_min: Optional[int] = Field(None, ge=0, le=9)
    level_max: Optional[int] = Field(None, ge=0, le=9)
    school: Optional[str] = None
    rarity: Optional[str] = None
    item_type: Optional[str] = None
    challenge_rating_min: Optional[str] = None
    challenge_rating_max: Optional[str] = None
    monster_type: Optional[str] = None

    class Config:
        schema_extra = {
            "example": {
                "query": "fire",
                "type": "spell",
                "classes": ["Wizard"],
                "level_min": 2,
                "level_max": 5,
                "school": "Evocation"
            }
        }


class SpellListSchema(BaseModel):
    id: PyObjectId = Field(..., alias="_id")
    name: str
    level: int
    school: str
    classes: List[str]

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class ItemListSchema(BaseModel):
    id: PyObjectId = Field(..., alias="_id")
    name: str
    type: str
    rarity: str
    requires_attunement: bool

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class MonsterListSchema(BaseModel):
    id: PyObjectId = Field(..., alias="_id")
    name: str
    size: str
    type: str
    challenge_rating: str

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}