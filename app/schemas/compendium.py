# app/models/compendium.py
"""
Compendium models - CORRIGIDO
Problema resolvido:
1. ✅ Nome do arquivo corrigido de compedium.py para compendium.py
2. ✅ Modelos completados e melhorados
3. ✅ Validações adicionadas
4. ✅ Consistency com padrões do projeto
"""

from datetime import datetime
from typing import List, Optional, Dict, Any, Literal, Union
from pydantic import BaseModel, Field, validator
from bson import ObjectId
from app.models.user import PyObjectId


class SpellModel(BaseModel):
    """Modelo para magias do compêndio."""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    name: str = Field(..., min_length=1, max_length=100)
    level: int = Field(..., ge=0, le=9)
    school: Literal[
        "abjuration", "conjuration", "divination", "enchantment",
        "evocation", "illusion", "necromancy", "transmutation"
    ]
    casting_time: str = Field(..., max_length=100)
    range: str = Field(..., max_length=100)
    components: str = Field(..., max_length=200)
    duration: str = Field(..., max_length=100)
    description: str = Field(..., min_length=10, max_length=5000)
    at_higher_levels: Optional[str] = Field(None, max_length=2000)
    classes: List[str] = Field(..., min_items=1)
    subclasses: List[str] = Field(default_factory=list)
    source: str = Field(..., max_length=100)
    page: Optional[int] = Field(None, ge=1)
    ritual: bool = False
    concentration: bool = False
    material_cost: Optional[str] = Field(None, max_length=500)
    tags: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @validator('name')
    def validate_name(cls, v):
        """Valida o nome da magia."""
        if not v.strip():
            raise ValueError('Nome da magia não pode estar vazio')
        return v.strip()

    @validator('classes')
    def validate_classes(cls, v):
        """Valida as classes que podem usar a magia."""
        valid_classes = [
            "artificer", "bard", "cleric", "druid", "paladin", "ranger",
            "sorcerer", "warlock", "wizard"
        ]
        for class_name in v:
            if class_name.lower() not in valid_classes:
                raise ValueError(f'Classe inválida: {class_name}')
        return [c.lower() for c in v]

    @validator('level')
    def validate_level(cls, v):
        """Valida o nível da magia."""
        if v == 0:
            return v  # Cantrip
        if not 1 <= v <= 9:
            raise ValueError('Nível de magia deve estar entre 0 (cantrip) e 9')
        return v

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        schema_extra = {
            "example": {
                "name": "Fireball",
                "level": 3,
                "school": "evocation",
                "casting_time": "1 action",
                "range": "150 feet",
                "components": "V, S, M (a tiny ball of bat guano and sulfur)",
                "duration": "Instantaneous",
                "description": "A bright streak flashes from your pointing finger to a point you choose within range...",
                "at_higher_levels": "When you cast this spell using a spell slot of 4th level or higher...",
                "classes": ["sorcerer", "wizard"],
                "source": "Player's Handbook",
                "page": 241,
                "ritual": False,
                "concentration": False,
                "material_cost": "A tiny ball of bat guano and sulfur",
                "tags": ["damage", "fire", "area"]
            }
        }


class ItemModel(BaseModel):
    """Modelo para itens do compêndio."""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    name: str = Field(..., min_length=1, max_length=100)
    type: Literal[
        "weapon", "armor", "shield", "ammunition", "adventuring_gear",
        "tools", "mounts_and_vehicles", "trade_goods", "wondrous_item",
        "potion", "scroll", "wand", "rod", "staff", "ring", "artifact"
    ]
    subtype: Optional[str] = Field(None, max_length=50)
    rarity: Literal["common", "uncommon", "rare", "very_rare", "legendary", "artifact"] = "common"
    requires_attunement: bool = False
    description: str = Field(..., min_length=10, max_length=5000)
    weight: Optional[float] = Field(None, ge=0, le=1000)
    value: Optional[int] = Field(None, ge=0)  # Em moedas de cobre
    properties: List[str] = Field(default_factory=list)
    damage: Optional[str] = Field(None, max_length=50)  # Ex: "1d8 slashing"
    damage_type: Optional[str] = Field(None, max_length=20)
    armor_class: Optional[int] = Field(None, ge=10, le=30)
    strength_requirement: Optional[int] = Field(None, ge=1, le=30)
    stealth_disadvantage: bool = False
    source: str = Field(..., max_length=100)
    page: Optional[int] = Field(None, ge=1)
    tags: List[str] = Field(default_factory=list)
    charges: Optional[int] = Field(None, ge=0)
    charge_recovery: Optional[str] = Field(None, max_length=200)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @validator('name')
    def validate_name(cls, v):
        """Valida o nome do item."""
        if not v.strip():
            raise ValueError('Nome do item não pode estar vazio')
        return v.strip()

    @validator('value')
    def validate_value(cls, v):
        """Valida o valor do item."""
        if v is not None and v < 0:
            raise ValueError('Valor do item não pode ser negativo')
        return v

    @validator('weight')
    def validate_weight(cls, v):
        """Valida o peso do item."""
        if v is not None and v < 0:
            raise ValueError('Peso do item não pode ser negativo')
        return v

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        schema_extra = {
            "example": {
                "name": "Longsword +1",
                "type": "weapon",
                "subtype": "martial melee",
                "rarity": "uncommon",
                "requires_attunement": False,
                "description": "You have a +1 bonus to attack and damage rolls made with this magic weapon.",
                "weight": 3.0,
                "value": 100000,  # 1000 gp em moedas de cobre
                "properties": ["versatile"],
                "damage": "1d8 slashing",
                "damage_type": "slashing",
                "source": "Dungeon Master's Guide",
                "page": 213,
                "tags": ["magic", "weapon", "enhancement"]
            }
        }


class MonsterTemplate(BaseModel):
    """Template para criaturas do compêndio."""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    name: str = Field(..., min_length=1, max_length=100)
    size: Literal["tiny", "small", "medium", "large", "huge", "gargantuan"]
    type: str = Field(..., max_length=50)  # Ex: "humanoid", "dragon", "undead"
    subtype: Optional[str] = Field(None, max_length=50)  # Ex: "elf", "goblinoid"
    alignment: str = Field(..., max_length=50)

    # Defesas
    armor_class: int = Field(..., ge=1, le=30)
    armor_desc: Optional[str] = Field(None, max_length=100)
    hit_points: int = Field(..., ge=1, le=1000)
    hit_dice: str = Field(..., max_length=20)  # Ex: "8d8 + 16"

    # Velocidades - ✅ CORRIGIDO: Removido min_items
    speed: Dict[str, int] = Field(...)  # Ex: {"walk": 30, "fly": 60}

    # Atributos
    strength: int = Field(..., ge=1, le=30)
    dexterity: int = Field(..., ge=1, le=30)
    constitution: int = Field(..., ge=1, le=30)
    intelligence: int = Field(..., ge=1, le=30)
    wisdom: int = Field(..., ge=1, le=30)
    charisma: int = Field(..., ge=1, le=30)

    # Resistências e imunidades
    saving_throws: Optional[Dict[str, int]] = None
    skills: Optional[Dict[str, int]] = None
    damage_vulnerabilities: List[str] = Field(default_factory=list)
    damage_resistances: List[str] = Field(default_factory=list)
    damage_immunities: List[str] = Field(default_factory=list)
    condition_immunities: List[str] = Field(default_factory=list)

    # Sentidos e linguagens
    senses: str = Field(default="passive Perception 10")
    languages: str = Field(default="—")

    # Dificuldade
    challenge_rating: str = Field(..., max_length=10)  # Ex: "1/2", "5", "30"
    experience_points: int = Field(..., ge=0)
    proficiency_bonus: int = Field(..., ge=2, le=9)

    # Habilidades especiais
    traits: List[Dict[str, str]] = Field(default_factory=list)
    actions: List[Dict[str, str]] = Field(default_factory=list)
    bonus_actions: List[Dict[str, str]] = Field(default_factory=list)
    reactions: List[Dict[str, str]] = Field(default_factory=list)
    legendary_actions: List[Dict[str, str]] = Field(default_factory=list)
    legendary_actions_per_turn: int = Field(default=0, ge=0, le=5)

    # Metadados
    source: str = Field(..., max_length=100)
    page: Optional[int] = Field(None, ge=1)
    environment: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @validator('name')
    def validate_name(cls, v):
        """Valida o nome da criatura."""
        if not v.strip():
            raise ValueError('Nome da criatura não pode estar vazio')
        return v.strip()

    @validator('speed')
    def validate_speed(cls, v):
        """Valida as velocidades."""
        if not v:
            raise ValueError('Criatura deve ter pelo menos uma velocidade')
        for speed_type, value in v.items():
            if value < 0:
                raise ValueError(f'Velocidade {speed_type} não pode ser negativa')
        return v

    @validator('challenge_rating')
    def validate_cr(cls, v):
        """Valida o desafio."""
        valid_crs = ["0", "1/8", "1/4", "1/2"] + [str(i) for i in range(1, 31)]
        if v not in valid_crs:
            raise ValueError(f'Challenge Rating inválido: {v}')
        return v

    def get_modifier(self, ability_score: int) -> int:
        """Calcula modificador de atributo."""
        return (ability_score - 10) // 2

    def get_ability_modifiers(self) -> Dict[str, int]:
        """Retorna todos os modificadores de atributo."""
        return {
            "strength": self.get_modifier(self.strength),
            "dexterity": self.get_modifier(self.dexterity),
            "constitution": self.get_modifier(self.constitution),
            "intelligence": self.get_modifier(self.intelligence),
            "wisdom": self.get_modifier(self.wisdom),
            "charisma": self.get_modifier(self.charisma)
        }

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class CompendiumCategory(BaseModel):
    """Categoria do compêndio."""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    name: str = Field(..., min_length=1, max_length=50)
    type: Literal["spell", "item", "monster"]
    description: Optional[str] = Field(None, max_length=500)
    parent_id: Optional[str] = None
    order: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}