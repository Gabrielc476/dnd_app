# app/schemas/character.py
from datetime import datetime
from typing import Dict, List, Optional, Union, Literal
from pydantic import BaseModel, Field, validator, root_validator
from bson import ObjectId
from app.models.user import PyObjectId


class AttributesSchema(BaseModel):
    strength: int = Field(..., ge=1, le=30)
    dexterity: int = Field(..., ge=1, le=30)
    constitution: int = Field(..., ge=1, le=30)
    intelligence: int = Field(..., ge=1, le=30)
    wisdom: int = Field(..., ge=1, le=30)
    charisma: int = Field(..., ge=1, le=30)

    class Config:
        schema_extra = {
            "example": {
                "strength": 16,
                "dexterity": 14,
                "constitution": 15,
                "intelligence": 10,
                "wisdom": 12,
                "charisma": 8
            }
        }


class HitPointsSchema(BaseModel):
    current: int = Field(..., ge=0)
    max: int = Field(..., ge=1)

    @validator('current')
    def current_le_max(cls, v, values):
        if 'max' in values and v > values['max']:
            raise ValueError('current HP cannot exceed max HP')
        return v

    class Config:
        schema_extra = {
            "example": {
                "current": 27,
                "max": 35
            }
        }


class SpellSlotSchema(BaseModel):
    used: int = Field(0, ge=0)
    total: int = Field(..., ge=0)

    @validator('used')
    def used_le_total(cls, v, values):
        if 'total' in values and v > values['total']:
            raise ValueError('used slots cannot exceed total slots')
        return v

    class Config:
        schema_extra = {
            "example": {
                "used": 2,
                "total": 4
            }
        }


class SpellcastingSchema(BaseModel):
    ability: str = Field(..., description="The ability used for spellcasting (e.g., 'intelligence')")
    spell_slots: Dict[str, SpellSlotSchema] = Field(..., description="Spell slots by level")
    prepared_spells: List[str] = Field(default_factory=list, description="IDs of prepared spells")

    class Config:
        schema_extra = {
            "example": {
                "ability": "intelligence",
                "spell_slots": {
                    "1": {"used": 2, "total": 4},
                    "2": {"used": 1, "total": 3},
                    "3": {"used": 0, "total": 2}
                },
                "prepared_spells": ["spell1", "spell2", "spell3"]
            }
        }


class InventoryItemSchema(BaseModel):
    item_id: str
    name: str
    quantity: int = Field(1, ge=1)
    equipped: bool = False
    description: Optional[str] = None
    weight: Optional[float] = None
    value: Optional[int] = None

    class Config:
        schema_extra = {
            "example": {
                "item_id": "item123",
                "name": "Longsword +1",
                "quantity": 1,
                "equipped": True,
                "description": "A masterfully crafted longsword with magical enhancements",
                "weight": 3.0,
                "value": 1000
            }
        }


class ProficiencySchema(BaseModel):
    name: str
    type: Literal["skill", "saving_throw", "tool", "weapon", "armor", "language"]
    expertise: bool = False

    class Config:
        schema_extra = {
            "example": {
                "name": "Perception",
                "type": "skill",
                "expertise": True
            }
        }


class FeatureSchema(BaseModel):
    name: str
    description: str

    class Config:
        schema_extra = {
            "example": {
                "name": "Action Surge",
                "description": "You can push yourself beyond your normal limits for a moment. On your turn, you can take one additional action."
            }
        }


class CharacterBaseSchema(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    race: str
    class_name: str = Field(..., alias="class")
    level: int = Field(..., ge=1, le=20)
    attributes: AttributesSchema
    hp: HitPointsSchema
    armor_class: int = Field(..., ge=0)
    speed: int = Field(..., ge=0)

    class Config:
        allow_population_by_field_name = True
        use_enum_values = True


class CharacterCreateSchema(CharacterBaseSchema):
    owner_id: str
    campaign_id: str
    temporary_hp: int = Field(0, ge=0)
    initiative_bonus: int = 0
    spellcasting: Optional[SpellcastingSchema] = None
    inventory: List[InventoryItemSchema] = Field(default_factory=list)
    proficiencies: List[ProficiencySchema] = Field(default_factory=list)
    features: List[FeatureSchema] = Field(default_factory=list)
    background: Optional[str] = None
    alignment: Optional[str] = None
    experience_points: int = 0
    inspiration: bool = False
    conditions: List[str] = Field(default_factory=list)

    class Config:
        schema_extra = {
            "example": {
                "name": "Thordak Firehammer",
                "owner_id": "user123",
                "campaign_id": "campaign456",
                "race": "Dwarf",
                "class": "Fighter",
                "level": 5,
                "attributes": {
                    "strength": 16,
                    "dexterity": 12,
                    "constitution": 18,
                    "intelligence": 10,
                    "wisdom": 14,
                    "charisma": 8
                },
                "hp": {
                    "current": 45,
                    "max": 45
                },
                "armor_class": 17,
                "speed": 25,
                "initiative_bonus": 1,
                "background": "Soldier",
                "alignment": "Lawful Good"
            }
        }


class CharacterUpdateSchema(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    race: Optional[str] = None
    class_name: Optional[str] = Field(None, alias="class")
    level: Optional[int] = Field(None, ge=1, le=20)
    attributes: Optional[AttributesSchema] = None
    hp: Optional[HitPointsSchema] = None
    temporary_hp: Optional[int] = Field(None, ge=0)
    armor_class: Optional[int] = Field(None, ge=0)
    speed: Optional[int] = Field(None, ge=0)
    initiative_bonus: Optional[int] = None
    spellcasting: Optional[SpellcastingSchema] = None
    inventory: Optional[List[InventoryItemSchema]] = None
    proficiencies: Optional[List[ProficiencySchema]] = None
    features: Optional[List[FeatureSchema]] = None
    background: Optional[str] = None
    alignment: Optional[str] = None
    experience_points: Optional[int] = None
    inspiration: Optional[bool] = None
    conditions: Optional[List[str]] = None

    class Config:
        allow_population_by_field_name = True
        use_enum_values = True
        schema_extra = {
            "example": {
                "hp": {
                    "current": 38,
                    "max": 45
                },
                "level": 6,
                "experience_points": 9000,
                "conditions": ["poisoned"]
            }
        }

    @root_validator
    def check_at_least_one_field(cls, values):
        """Ensure at least one field has a value."""
        if not any(v is not None for v in values.values()):
            raise ValueError("At least one field must be provided for update.")
        return values


class CharacterSchema(CharacterBaseSchema):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    owner_id: str
    campaign_id: str
    temporary_hp: int
    initiative_bonus: int
    spellcasting: Optional[SpellcastingSchema] = None
    inventory: List[InventoryItemSchema]
    proficiencies: List[ProficiencySchema]
    features: List[FeatureSchema]
    background: Optional[str] = None
    alignment: Optional[str] = None
    experience_points: int
    inspiration: bool
    conditions: List[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class CharacterListSchema(BaseModel):
    id: PyObjectId = Field(..., alias="_id")
    name: str
    owner_id: str
    level: int
    race: str
    class_name: str = Field(..., alias="class")
    hp: HitPointsSchema

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}