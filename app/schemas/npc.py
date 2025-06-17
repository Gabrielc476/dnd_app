# app/schemas/npc.py
"""
NPC schemas - COMPLETO
Schemas para NPCs (Non-Player Characters).
"""

from datetime import datetime
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field, validator
from bson import ObjectId


class NPCStatsSchema(BaseModel):
    """Schema para estatísticas básicas do NPC."""
    strength: int = Field(..., ge=1, le=30)
    dexterity: int = Field(..., ge=1, le=30)
    constitution: int = Field(..., ge=1, le=30)
    intelligence: int = Field(..., ge=1, le=30)
    wisdom: int = Field(..., ge=1, le=30)
    charisma: int = Field(..., ge=1, le=30)

    def get_modifier(self, ability: str) -> int:
        """Calcula modificador de um atributo."""
        value = getattr(self, ability)
        return (value - 10) // 2

    class Config:
        schema_extra = {
            "example": {
                "strength": 15,
                "dexterity": 12,
                "constitution": 13,
                "intelligence": 8,
                "wisdom": 11,
                "charisma": 14
            }
        }


class NPCActionSchema(BaseModel):
    """Schema para ações do NPC."""
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1, max_length=1000)
    action_type: Literal["action", "bonus_action", "reaction", "legendary"] = "action"
    attack_bonus: Optional[int] = Field(None, ge=-10, le=30)
    damage_dice: Optional[str] = Field(None, max_length=50)  # Ex: "1d8+3"
    damage_type: Optional[str] = Field(None, max_length=20)
    range: Optional[str] = Field(None, max_length=50)
    recharge: Optional[str] = Field(None, max_length=20)  # Ex: "5-6", "short rest"
    uses_per_day: Optional[int] = Field(None, ge=0, le=10)

    class Config:
        schema_extra = {
            "example": {
                "name": "Scimitar",
                "description": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) slashing damage.",
                "action_type": "action",
                "attack_bonus": 4,
                "damage_dice": "1d6+2",
                "damage_type": "slashing",
                "range": "5 ft.",
                "recharge": None,
                "uses_per_day": None
            }
        }


class NPCTraitSchema(BaseModel):
    """Schema para traços especiais do NPC."""
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1, max_length=1000)

    class Config:
        schema_extra = {
            "example": {
                "name": "Keen Senses",
                "description": "The wolf has advantage on Wisdom (Perception) checks that rely on hearing or smell."
            }
        }


class NPCBaseSchema(BaseModel):
    """Schema base para NPCs."""
    name: str = Field(..., min_length=1, max_length=100)
    size: Literal["tiny", "small", "medium", "large", "huge", "gargantuan"] = "medium"
    type: str = Field(..., min_length=1, max_length=50)  # humanoid, beast, dragon, etc.
    subtype: Optional[str] = Field(None, max_length=50)  # elf, goblinoid, etc.
    alignment: str = Field(..., max_length=50)

    # Defesas
    armor_class: int = Field(..., ge=1, le=30)
    armor_description: Optional[str] = Field(None, max_length=100)
    hit_points: int = Field(..., ge=1, le=1000)
    hit_dice: Optional[str] = Field(None, max_length=50)  # Ex: "8d8+16"

    # Velocidades (em pés)
    speed_walk: int = Field(30, ge=0, le=200)
    speed_fly: Optional[int] = Field(None, ge=0, le=200)
    speed_swim: Optional[int] = Field(None, ge=0, le=200)
    speed_climb: Optional[int] = Field(None, ge=0, le=200)
    speed_burrow: Optional[int] = Field(None, ge=0, le=200)

    # Atributos
    stats: NPCStatsSchema

    # Proficiências
    saving_throws: Dict[str, int] = Field(default_factory=dict)
    skills: Dict[str, int] = Field(default_factory=dict)

    # Resistências e imunidades
    damage_vulnerabilities: List[str] = Field(default_factory=list)
    damage_resistances: List[str] = Field(default_factory=list)
    damage_immunities: List[str] = Field(default_factory=list)
    condition_immunities: List[str] = Field(default_factory=list)

    # Sentidos
    darkvision: Optional[int] = Field(None, ge=0, le=240)  # Em pés
    blindsight: Optional[int] = Field(None, ge=0, le=120)
    tremorsense: Optional[int] = Field(None, ge=0, le=120)
    truesight: Optional[int] = Field(None, ge=0, le=120)
    passive_perception: int = Field(10, ge=1, le=40)

    # Linguagens
    languages: List[str] = Field(default_factory=list)
    telepathy: Optional[int] = Field(None, ge=0, le=240)  # Em pés

    # Desafio
    challenge_rating: str = Field("1/4", max_length=10)
    experience_points: int = Field(50, ge=0)
    proficiency_bonus: int = Field(2, ge=2, le=9)

    @validator('challenge_rating')
    def validate_cr(cls, v):
        """Valida o Challenge Rating."""
        valid_crs = [
                        "0", "1/8", "1/4", "1/2"
                    ] + [str(i) for i in range(1, 31)]

        if v not in valid_crs:
            raise ValueError(f'Challenge Rating inválido: {v}')
        return v

    @validator('experience_points')
    def validate_xp_matches_cr(cls, v, values):
        """Valida se XP corresponde ao CR."""
        cr = values.get('challenge_rating', '1/4')
        expected_xp = {
            "0": 0, "1/8": 25, "1/4": 50, "1/2": 100,
            "1": 200, "2": 450, "3": 700, "4": 1100, "5": 1800,
            "6": 2300, "7": 2900, "8": 3900, "9": 5000, "10": 5900,
            "11": 7200, "12": 8400, "13": 10000, "14": 11500, "15": 13000,
            "16": 15000, "17": 18000, "18": 20000, "19": 22000, "20": 25000,
            "21": 33000, "22": 41000, "23": 50000, "24": 62000, "25": 75000,
            "26": 90000, "27": 105000, "28": 120000, "29": 135000, "30": 155000
        }

        if cr in expected_xp and v != expected_xp[cr]:
            # Log warning but don't fail validation
            import logging
            logging.warning(f"XP {v} doesn't match expected value {expected_xp[cr]} for CR {cr}")

        return v

    class Config:
        use_enum_values = True


class NPCCreateSchema(NPCBaseSchema):
    """Schema para criação de NPC."""
    campaign_id: str

    # Componentes opcionais
    traits: List[NPCTraitSchema] = Field(default_factory=list)
    actions: List[NPCActionSchema] = Field(default_factory=list)
    bonus_actions: List[NPCActionSchema] = Field(default_factory=list)
    reactions: List[NPCActionSchema] = Field(default_factory=list)
    legendary_actions: List[NPCActionSchema] = Field(default_factory=list)
    legendary_actions_per_turn: int = Field(0, ge=0, le=5)

    # Informações adicionais
    description: Optional[str] = Field(None, max_length=2000)
    background: Optional[str] = Field(None, max_length=1000)
    personality: Optional[str] = Field(None, max_length=500)
    ideals: Optional[str] = Field(None, max_length=500)
    bonds: Optional[str] = Field(None, max_length=500)
    flaws: Optional[str] = Field(None, max_length=500)

    # Combate
    initiative_modifier: Optional[int] = Field(None, ge=-10, le=20)

    # Metadados
    source: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = Field(None, max_length=1000)
    tags: List[str] = Field(default_factory=list)

    # Imagem
    image_url: Optional[str] = None
    token_url: Optional[str] = None

    class Config:
        schema_extra = {
            "example": {
                "name": "Goblin Warrior",
                "campaign_id": "campaign123",
                "size": "small",
                "type": "humanoid",
                "subtype": "goblinoid",
                "alignment": "neutral evil",
                "armor_class": 15,
                "armor_description": "Leather armor, shield",
                "hit_points": 7,
                "hit_dice": "2d6",
                "speed_walk": 30,
                "stats": {
                    "strength": 8,
                    "dexterity": 14,
                    "constitution": 10,
                    "intelligence": 10,
                    "wisdom": 8,
                    "charisma": 8
                },
                "skills": {"stealth": 6},
                "darkvision": 60,
                "passive_perception": 9,
                "languages": ["Common", "Goblin"],
                "challenge_rating": "1/4",
                "experience_points": 50,
                "traits": [
                    {
                        "name": "Nimble Escape",
                        "description": "The goblin can take the Disengage or Hide action as a bonus action on each of its turns."
                    }
                ],
                "actions": [
                    {
                        "name": "Scimitar",
                        "description": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) slashing damage.",
                        "action_type": "action",
                        "attack_bonus": 4,
                        "damage_dice": "1d6+2",
                        "damage_type": "slashing",
                        "range": "5 ft."
                    }
                ],
                "description": "A small, cunning humanoid that delights in causing mischief.",
                "tags": ["goblinoid", "warrior", "low-level"]
            }
        }


class NPCUpdateSchema(BaseModel):
    """Schema para atualização de NPC."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    size: Optional[Literal["tiny", "small", "medium", "large", "huge", "gargantuan"]] = None
    type: Optional[str] = Field(None, min_length=1, max_length=50)
    subtype: Optional[str] = Field(None, max_length=50)
    alignment: Optional[str] = Field(None, max_length=50)

    # Defesas
    armor_class: Optional[int] = Field(None, ge=1, le=30)
    armor_description: Optional[str] = Field(None, max_length=100)
    hit_points: Optional[int] = Field(None, ge=1, le=1000)
    hit_dice: Optional[str] = Field(None, max_length=50)

    # Velocidades
    speed_walk: Optional[int] = Field(None, ge=0, le=200)
    speed_fly: Optional[int] = Field(None, ge=0, le=200)
    speed_swim: Optional[int] = Field(None, ge=0, le=200)
    speed_climb: Optional[int] = Field(None, ge=0, le=200)
    speed_burrow: Optional[int] = Field(None, ge=0, le=200)

    # Atributos
    stats: Optional[NPCStatsSchema] = None

    # Proficiências
    saving_throws: Optional[Dict[str, int]] = None
    skills: Optional[Dict[str, int]] = None

    # Resistências
    damage_vulnerabilities: Optional[List[str]] = None
    damage_resistances: Optional[List[str]] = None
    damage_immunities: Optional[List[str]] = None
    condition_immunities: Optional[List[str]] = None

    # Sentidos
    darkvision: Optional[int] = Field(None, ge=0, le=240)
    blindsight: Optional[int] = Field(None, ge=0, le=120)
    tremorsense: Optional[int] = Field(None, ge=0, le=120)
    truesight: Optional[int] = Field(None, ge=0, le=120)
    passive_perception: Optional[int] = Field(None, ge=1, le=40)

    # Linguagens
    languages: Optional[List[str]] = None
    telepathy: Optional[int] = Field(None, ge=0, le=240)

    # Desafio
    challenge_rating: Optional[str] = Field(None, max_length=10)
    experience_points: Optional[int] = Field(None, ge=0)
    proficiency_bonus: Optional[int] = Field(None, ge=2, le=9)

    # Componentes
    traits: Optional[List[NPCTraitSchema]] = None
    actions: Optional[List[NPCActionSchema]] = None
    bonus_actions: Optional[List[NPCActionSchema]] = None
    reactions: Optional[List[NPCActionSchema]] = None
    legendary_actions: Optional[List[NPCActionSchema]] = None
    legendary_actions_per_turn: Optional[int] = Field(None, ge=0, le=5)

    # Informações
    description: Optional[str] = Field(None, max_length=2000)
    background: Optional[str] = Field(None, max_length=1000)
    personality: Optional[str] = Field(None, max_length=500)
    ideals: Optional[str] = Field(None, max_length=500)
    bonds: Optional[str] = Field(None, max_length=500)
    flaws: Optional[str] = Field(None, max_length=500)

    # Combate
    initiative_modifier: Optional[int] = Field(None, ge=-10, le=20)

    # Metadados
    source: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = Field(None, max_length=1000)
    tags: Optional[List[str]] = None

    # Imagens
    image_url: Optional[str] = None
    token_url: Optional[str] = None

    @validator('challenge_rating')
    def validate_cr(cls, v):
        """Valida o Challenge Rating."""
        if v is None:
            return v

        valid_crs = [
                        "0", "1/8", "1/4", "1/2"
                    ] + [str(i) for i in range(1, 31)]

        if v not in valid_crs:
            raise ValueError(f'Challenge Rating inválido: {v}')
        return v

    class Config:
        use_enum_values = True


class NPCSchema(NPCBaseSchema):
    """Schema completo do NPC (response)."""
    id: str = Field(alias="_id")
    campaign_id: str
    created_by: str

    # Timestamps
    created_at: datetime
    updated_at: datetime

    # Componentes
    traits: List[NPCTraitSchema] = Field(default_factory=list)
    actions: List[NPCActionSchema] = Field(default_factory=list)
    bonus_actions: List[NPCActionSchema] = Field(default_factory=list)
    reactions: List[NPCActionSchema] = Field(default_factory=list)
    legendary_actions: List[NPCActionSchema] = Field(default_factory=list)
    legendary_actions_per_turn: int = Field(default=0)

    # Informações adicionais
    description: Optional[str] = None
    background: Optional[str] = None
    personality: Optional[str] = None
    ideals: Optional[str] = None
    bonds: Optional[str] = None
    flaws: Optional[str] = None

    # Combate
    initiative_modifier: Optional[int] = None

    # Metadados
    source: Optional[str] = None
    notes: Optional[str] = None
    tags: List[str] = Field(default_factory=list)

    # Imagens
    image_url: Optional[str] = None
    token_url: Optional[str] = None

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class NPCListSchema(BaseModel):
    """Schema simplificado para listagem de NPCs."""
    id: str = Field(alias="_id")
    name: str
    type: str
    subtype: Optional[str] = None
    size: str
    armor_class: int
    hit_points: int
    challenge_rating: str
    experience_points: int
    campaign_id: str
    created_at: datetime
    image_url: Optional[str] = None
    token_url: Optional[str] = None

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class NPCSummarySchema(BaseModel):
    """Schema de resumo para NPC em combate."""
    id: str = Field(alias="_id")
    name: str
    armor_class: int
    hit_points: int
    speed_walk: int
    initiative_modifier: Optional[int] = None
    challenge_rating: str
    size: str
    type: str

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class NPCBulkImportSchema(BaseModel):
    """Schema para importação em lote de NPCs."""
    npcs: List[NPCCreateSchema] = Field(..., min_items=1, max_items=50)

    class Config:
        schema_extra = {
            "example": {
                "npcs": [
                    {
                        "name": "Goblin Scout",
                        "campaign_id": "campaign123",
                        "size": "small",
                        "type": "humanoid",
                        "alignment": "neutral evil",
                        "armor_class": 13,
                        "hit_points": 5,
                        "stats": {
                            "strength": 8,
                            "dexterity": 14,
                            "constitution": 10,
                            "intelligence": 10,
                            "wisdom": 8,
                            "charisma": 8
                        },
                        "challenge_rating": "1/8",
                        "experience_points": 25
                    }
                ]
            }
        }