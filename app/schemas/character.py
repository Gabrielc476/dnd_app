# app/schemas/character.py
"""
Character schemas - COMPLETO E CORRIGIDO
Problemas resolvidos:
1. ✅ Schema truncado completado
2. ✅ Validações melhoradas
3. ✅ Campos adicionais implementados
4. ✅ Consistency com padrões do projeto
5. ✅ Proper examples adicionados
"""

from datetime import datetime
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field, validator
from bson import ObjectId


class AttributesSchema(BaseModel):
    """Schema para os atributos básicos do personagem."""
    strength: int = Field(..., ge=1, le=30)
    dexterity: int = Field(..., ge=1, le=30)
    constitution: int = Field(..., ge=1, le=30)
    intelligence: int = Field(..., ge=1, le=30)
    wisdom: int = Field(..., ge=1, le=30)
    charisma: int = Field(..., ge=1, le=30)

    @validator('*')
    def validate_attributes(cls, v):
        """Valida que todos os atributos estão no range correto."""
        if not isinstance(v, int) or v < 1 or v > 30:
            raise ValueError('Atributos devem estar entre 1 e 30')
        return v

    def get_modifier(self, attribute: str) -> int:
        """Calcula o modificador de um atributo."""
        value = getattr(self, attribute)
        return (value - 10) // 2

    class Config:
        schema_extra = {
            "example": {
                "strength": 15,
                "dexterity": 14,
                "constitution": 13,
                "intelligence": 12,
                "wisdom": 10,
                "charisma": 8
            }
        }


class HitPointsSchema(BaseModel):
    """Schema para pontos de vida do personagem."""
    max: int = Field(..., ge=1, le=1000)
    current: int = Field(..., ge=0)
    temporary: int = Field(0, ge=0)

    @validator('current')
    def validate_current_hp(cls, v, values):
        """Valida que HP atual não excede o máximo."""
        max_hp = values.get('max', 0)
        if v > max_hp:
            raise ValueError('HP atual não pode exceder HP máximo')
        return v

    class Config:
        schema_extra = {
            "example": {
                "max": 45,
                "current": 32,
                "temporary": 5
            }
        }


class SpellSlotSchema(BaseModel):
    """Schema para slots de magia por nível."""
    max: int = Field(..., ge=0, le=20)
    current: int = Field(..., ge=0)

    @validator('current')
    def validate_current_slots(cls, v, values):
        """Valida que slots atuais não excedem o máximo."""
        max_slots = values.get('max', 0)
        if v > max_slots:
            raise ValueError('Slots atuais não podem exceder slots máximos')
        return v


class SpellcastingSchema(BaseModel):
    """Schema para informações de conjuração."""
    spellcasting_ability: Literal["intelligence", "wisdom", "charisma"]
    spell_attack_bonus: int = Field(..., ge=0)
    spell_save_dc: int = Field(..., ge=8, le=30)
    spell_slots: Dict[str, SpellSlotSchema] = Field(default_factory=dict)
    prepared_spells: List[str] = Field(default_factory=list)
    known_spells: List[str] = Field(default_factory=list)
    cantrips_known: List[str] = Field(default_factory=list)

    @validator('spell_slots')
    def validate_spell_slots(cls, v):
        """Valida níveis de magia."""
        valid_levels = [f"level_{i}" for i in range(1, 10)]
        for level in v.keys():
            if level not in valid_levels:
                raise ValueError(f'Nível de magia inválido: {level}')
        return v

    class Config:
        schema_extra = {
            "example": {
                "spellcasting_ability": "intelligence",
                "spell_attack_bonus": 7,
                "spell_save_dc": 15,
                "spell_slots": {
                    "level_1": {"max": 4, "current": 2},
                    "level_2": {"max": 3, "current": 1}
                },
                "prepared_spells": ["magic_missile", "shield", "fireball"],
                "known_spells": ["magic_missile", "shield", "fireball", "counterspell"],
                "cantrips_known": ["mage_hand", "prestidigitation", "light"]
            }
        }


class InventoryItemSchema(BaseModel):
    """Schema para itens no inventário."""
    item_id: str
    name: str
    quantity: int = Field(1, ge=1)
    equipped: bool = False
    description: Optional[str] = None
    weight: Optional[float] = Field(None, ge=0)
    value: Optional[int] = Field(None, ge=0)
    rarity: Optional[Literal["common", "uncommon", "rare", "very_rare", "legendary", "artifact"]] = "common"
    requires_attunement: bool = False
    attuned: bool = False

    @validator('attuned')
    def validate_attunement(cls, v, values):
        """Valida que item só pode estar sintonizado se requerer sintonização."""
        requires_attunement = values.get('requires_attunement', False)
        if v and not requires_attunement:
            raise ValueError('Item não pode estar sintonizado se não requer sintonização')
        return v

    class Config:
        schema_extra = {
            "example": {
                "item_id": "item123",
                "name": "Longsword +1",
                "quantity": 1,
                "equipped": True,
                "description": "A masterfully crafted longsword with magical enhancements",
                "weight": 3.0,
                "value": 1000,
                "rarity": "uncommon",
                "requires_attunement": False,
                "attuned": False
            }
        }


class ProficiencySchema(BaseModel):
    """Schema para proficiências."""
    name: str
    type: Literal["skill", "saving_throw", "tool", "weapon", "armor", "language"]
    expertise: bool = False
    source: Optional[str] = None  # Classe, raça, background, etc.

    class Config:
        schema_extra = {
            "example": {
                "name": "Perception",
                "type": "skill",
                "expertise": True,
                "source": "class"
            }
        }


class FeatureSchema(BaseModel):
    """Schema para habilidades e traços."""
    name: str
    description: str
    source: Optional[str] = None  # Classe, raça, background, feat
    level_acquired: Optional[int] = Field(None, ge=1, le=20)
    uses_per_rest: Optional[int] = Field(None, ge=0)
    current_uses: Optional[int] = Field(None, ge=0)
    recharge: Optional[Literal["short_rest", "long_rest", "dawn", "none"]] = "none"

    @validator('current_uses')
    def validate_current_uses(cls, v, values):
        """Valida usos atuais."""
        max_uses = values.get('uses_per_rest')
        if v is not None and max_uses is not None and v > max_uses:
            raise ValueError('Usos atuais não podem exceder usos máximos')
        return v

    class Config:
        schema_extra = {
            "example": {
                "name": "Action Surge",
                "description": "You can push yourself beyond your normal limits for a moment. On your turn, you can take one additional action.",
                "source": "Fighter",
                "level_acquired": 2,
                "uses_per_rest": 1,
                "current_uses": 0,
                "recharge": "short_rest"
            }
        }


class SavingThrowSchema(BaseModel):
    """Schema para salvaguardas."""
    strength: bool = False
    dexterity: bool = False
    constitution: bool = False
    intelligence: bool = False
    wisdom: bool = False
    charisma: bool = False

    class Config:
        schema_extra = {
            "example": {
                "strength": True,
                "dexterity": False,
                "constitution": True,
                "intelligence": False,
                "wisdom": False,
                "charisma": False
            }
        }


class CharacterBaseSchema(BaseModel):
    """Schema base para personagens."""
    name: str = Field(..., min_length=1, max_length=100)
    race: str = Field(..., min_length=1, max_length=50)
    class_name: str = Field(..., alias="class", min_length=1, max_length=50)
    subclass: Optional[str] = Field(None, max_length=50)
    level: int = Field(..., ge=1, le=20)
    background: Optional[str] = Field(None, max_length=50)
    alignment: Optional[str] = Field(None, max_length=50)

    # Atributos e combate
    attributes: AttributesSchema
    hp: HitPointsSchema
    armor_class: int = Field(..., ge=0, le=50)
    speed: int = Field(..., ge=0, le=200)
    initiative_bonus: int = Field(0, ge=-10, le=20)

    # Proficiências
    proficiency_bonus: int = Field(..., ge=2, le=6)
    saving_throws: SavingThrowSchema = Field(default_factory=SavingThrowSchema)

    @validator('proficiency_bonus')
    def validate_proficiency_bonus(cls, v, values):
        """Valida bônus de proficiência baseado no nível."""
        level = values.get('level', 1)
        expected_bonus = 2 + ((level - 1) // 4)
        if v != expected_bonus:
            raise ValueError(f'Bônus de proficiência incorreto para nível {level}. Esperado: {expected_bonus}')
        return v

    class Config:
        allow_population_by_field_name = True
        use_enum_values = True


class CharacterCreateSchema(CharacterBaseSchema):
    """Schema para criação de personagem."""
    owner_id: str
    campaign_id: str

    # Campos opcionais para criação
    temporary_hp: int = Field(0, ge=0)
    experience_points: int = Field(0, ge=0)
    inspiration: bool = False
    conditions: List[str] = Field(default_factory=list)

    # Componentes opcionais
    spellcasting: Optional[SpellcastingSchema] = None
    inventory: List[InventoryItemSchema] = Field(default_factory=list)
    proficiencies: List[ProficiencySchema] = Field(default_factory=list)
    features: List[FeatureSchema] = Field(default_factory=list)

    # Informações adicionais
    personality_traits: Optional[str] = Field(None, max_length=500)
    ideals: Optional[str] = Field(None, max_length=500)
    bonds: Optional[str] = Field(None, max_length=500)
    flaws: Optional[str] = Field(None, max_length=500)
    backstory: Optional[str] = Field(None, max_length=2000)

    # Aparência
    age: Optional[int] = Field(None, ge=0, le=1000)
    height: Optional[str] = Field(None, max_length=20)
    weight: Optional[str] = Field(None, max_length=20)
    eyes: Optional[str] = Field(None, max_length=30)
    skin: Optional[str] = Field(None, max_length=30)
    hair: Optional[str] = Field(None, max_length=30)

    # Avatar
    avatar_url: Optional[str] = None

    class Config:
        schema_extra = {
            "example": {
                "name": "Gandalf the Grey",
                "race": "Human",
                "class": "Wizard",
                "subclass": "School of Evocation",
                "level": 5,
                "background": "Hermit",
                "alignment": "Lawful Good",
                "owner_id": "user123",
                "campaign_id": "campaign456",
                "attributes": {
                    "strength": 10,
                    "dexterity": 14,
                    "constitution": 12,
                    "intelligence": 20,
                    "wisdom": 15,
                    "charisma": 16
                },
                "hp": {
                    "max": 31,
                    "current": 31,
                    "temporary": 0
                },
                "armor_class": 12,
                "speed": 30,
                "initiative_bonus": 2,
                "proficiency_bonus": 3,
                "experience_points": 6500,
                "inspiration": False,
                "age": 87,
                "height": "5'11\"",
                "weight": "180 lbs",
                "eyes": "Grey",
                "skin": "Fair",
                "hair": "Grey",
                "personality_traits": "Wise and patient, but can be stern when necessary",
                "ideals": "Knowledge should be preserved and shared responsibly",
                "bonds": "I am bound to protect the innocent and fight evil",
                "flaws": "I can be overly cautious and sometimes too trusting"
            }
        }


class CharacterUpdateSchema(BaseModel):
    """Schema para atualização de personagem."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    race: Optional[str] = Field(None, min_length=1, max_length=50)
    class_name: Optional[str] = Field(None, alias="class", min_length=1, max_length=50)
    subclass: Optional[str] = Field(None, max_length=50)
    level: Optional[int] = Field(None, ge=1, le=20)
    background: Optional[str] = Field(None, max_length=50)
    alignment: Optional[str] = Field(None, max_length=50)

    # Atributos e combate
    attributes: Optional[AttributesSchema] = None
    hp: Optional[HitPointsSchema] = None
    armor_class: Optional[int] = Field(None, ge=0, le=50)
    speed: Optional[int] = Field(None, ge=0, le=200)
    initiative_bonus: Optional[int] = Field(None, ge=-10, le=20)

    # Proficiências
    proficiency_bonus: Optional[int] = Field(None, ge=2, le=6)
    saving_throws: Optional[SavingThrowSchema] = None

    # Campos opcionais
    temporary_hp: Optional[int] = Field(None, ge=0)
    experience_points: Optional[int] = Field(None, ge=0)
    inspiration: Optional[bool] = None
    conditions: Optional[List[str]] = None

    # Componentes
    spellcasting: Optional[SpellcastingSchema] = None
    inventory: Optional[List[InventoryItemSchema]] = None
    proficiencies: Optional[List[ProficiencySchema]] = None
    features: Optional[List[FeatureSchema]] = None

    # Informações adicionais
    personality_traits: Optional[str] = Field(None, max_length=500)
    ideals: Optional[str] = Field(None, max_length=500)
    bonds: Optional[str] = Field(None, max_length=500)
    flaws: Optional[str] = Field(None, max_length=500)
    backstory: Optional[str] = Field(None, max_length=2000)

    # Aparência
    age: Optional[int] = Field(None, ge=0, le=1000)
    height: Optional[str] = Field(None, max_length=20)
    weight: Optional[str] = Field(None, max_length=20)
    eyes: Optional[str] = Field(None, max_length=30)
    skin: Optional[str] = Field(None, max_length=30)
    hair: Optional[str] = Field(None, max_length=30)

    # Avatar
    avatar_url: Optional[str] = None

    class Config:
        allow_population_by_field_name = True
        use_enum_values = True


class CharacterSchema(CharacterBaseSchema):
    """Schema completo do personagem (response)."""
    id: str = Field(alias="_id")
    owner_id: str
    campaign_id: str

    # Timestamps
    created_at: datetime
    updated_at: datetime

    # Campos opcionais
    temporary_hp: int = 0
    experience_points: int = 0
    inspiration: bool = False
    conditions: List[str] = Field(default_factory=list)

    # Componentes
    spellcasting: Optional[SpellcastingSchema] = None
    inventory: List[InventoryItemSchema] = Field(default_factory=list)
    proficiencies: List[ProficiencySchema] = Field(default_factory=list)
    features: List[FeatureSchema] = Field(default_factory=list)

    # Informações adicionais
    personality_traits: Optional[str] = None
    ideals: Optional[str] = None
    bonds: Optional[str] = None
    flaws: Optional[str] = None
    backstory: Optional[str] = None

    # Aparência
    age: Optional[int] = None
    height: Optional[str] = None
    weight: Optional[str] = None
    eyes: Optional[str] = None
    skin: Optional[str] = None
    hair: Optional[str] = None

    # Avatar
    avatar_url: Optional[str] = None

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class CharacterListSchema(BaseModel):
    """Schema simplificado para listagem de personagens."""
    id: str = Field(alias="_id")
    name: str
    race: str
    class_name: str = Field(alias="class")
    level: int
    owner_id: str
    campaign_id: str
    hp: HitPointsSchema
    armor_class: int
    created_at: datetime
    avatar_url: Optional[str] = None

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class CharacterSummarySchema(BaseModel):
    """Schema de resumo para personagem em combate."""
    id: str = Field(alias="_id")
    name: str
    hp: HitPointsSchema
    armor_class: int
    initiative_bonus: int
    conditions: List[str] = Field(default_factory=list)
    avatar_url: Optional[str] = None

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}