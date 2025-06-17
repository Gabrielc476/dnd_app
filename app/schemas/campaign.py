# app/schemas/campaign.py
"""
Campaign schemas - COMPLETO E CORRIGIDO
Problemas resolvidos:
1. ✅ Schema truncado completado
2. ✅ Todas as classes implementadas
3. ✅ Validações adequadas
4. ✅ Examples completos
5. ✅ Consistency com padrões do projeto
"""

from datetime import datetime
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field, validator
from bson import ObjectId


class ImageSchema(BaseModel):
    """Schema para imagens de campanha."""
    id: str
    name: str
    url: str
    type: Literal["map", "token", "handout", "portrait", "background"] = "handout"
    description: Optional[str] = None
    is_public: bool = True  # Visível para jogadores
    width: Optional[int] = Field(None, ge=1)
    height: Optional[int] = Field(None, ge=1)
    grid_size: Optional[int] = Field(None, ge=1)  # Para mapas
    tags: List[str] = Field(default_factory=list)
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        schema_extra = {
            "example": {
                "id": "img123",
                "name": "Tavern Map",
                "url": "/images/tavern_map.jpg",
                "type": "map",
                "description": "First floor of the Dragon's Rest tavern",
                "is_public": True,
                "width": 1920,
                "height": 1080,
                "grid_size": 40,
                "tags": ["tavern", "indoor", "level1"],
                "uploaded_at": "2025-01-15T10:30:00Z"
            }
        }


class NPCReferenceSchema(BaseModel):
    """Schema para referência de NPC em encontros."""
    npc_id: str
    name: str
    quantity: int = Field(1, ge=1, le=50)
    starting_hp: Optional[int] = Field(None, ge=1)
    conditions: List[str] = Field(default_factory=list)
    notes: Optional[str] = Field(None, max_length=500)
    initiative_modifier: Optional[int] = Field(None, ge=-5, le=20)

    class Config:
        schema_extra = {
            "example": {
                "npc_id": "npc123",
                "name": "Goblin Warrior",
                "quantity": 3,
                "starting_hp": 7,
                "conditions": [],
                "notes": "Armed with scimitars and shields",
                "initiative_modifier": 2
            }
        }


class TrapSchema(BaseModel):
    """Schema para armadilhas."""
    name: str
    description: str
    trigger: str
    effect: str
    dc: int = Field(..., ge=5, le=30)
    damage: Optional[str] = None  # Ex: "2d6 fire"
    save_type: Literal["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]
    is_magical: bool = False
    is_detected: bool = False
    is_disarmed: bool = False
    detection_dc: int = Field(..., ge=5, le=30)
    disarm_dc: int = Field(..., ge=5, le=30)

    class Config:
        schema_extra = {
            "example": {
                "name": "Poison Dart Trap",
                "description": "Darts shoot from the walls when the pressure plate is stepped on",
                "trigger": "Pressure plate activation",
                "effect": "Darts hit target, poison save required",
                "dc": 13,
                "damage": "1d4 piercing + 2d4 poison",
                "save_type": "constitution",
                "is_magical": False,
                "is_detected": False,
                "is_disarmed": False,
                "detection_dc": 15,
                "disarm_dc": 13
            }
        }


class EncounterSchema(BaseModel):
    """Schema para encontros."""
    id: str = Field(default_factory=lambda: str(ObjectId()))
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    type: Literal["combat", "social", "exploration", "puzzle", "trap"] = "combat"
    difficulty: Literal["trivial", "easy", "medium", "hard", "deadly"] = "medium"
    location: Optional[str] = Field(None, max_length=100)

    # Componentes do encontro
    npcs: List[NPCReferenceSchema] = Field(default_factory=list)
    traps: List[TrapSchema] = Field(default_factory=list)
    treasure: List[str] = Field(default_factory=list)  # IDs de itens ou descrições

    # Configurações
    experience_reward: int = Field(0, ge=0)
    is_active: bool = False
    is_completed: bool = False

    # Mapas e imagens
    map_image_id: Optional[str] = None
    handout_images: List[str] = Field(default_factory=list)

    # Notas do DM
    dm_notes: Optional[str] = Field(None, max_length=2000)
    player_notes: Optional[str] = Field(None, max_length=1000)  # Visível para jogadores

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None

    @validator('npcs')
    def validate_npcs(cls, v, values):
        """Valida que encontros de combate tenham pelo menos um NPC."""
        encounter_type = values.get('type')
        if encounter_type == 'combat' and not v:
            raise ValueError('Encontros de combate devem ter pelo menos um NPC')
        return v

    class Config:
        schema_extra = {
            "example": {
                "name": "Goblin Ambush",
                "description": "A group of goblins attacks the party on the forest road",
                "type": "combat",
                "difficulty": "medium",
                "location": "Forest Road",
                "npcs": [
                    {
                        "npc_id": "npc123",
                        "name": "Goblin Warrior",
                        "quantity": 3,
                        "starting_hp": 7
                    }
                ],
                "experience_reward": 450,
                "dm_notes": "Goblins try to capture, not kill. Retreat if half are defeated.",
                "player_notes": "The goblins seem organized and well-equipped."
            }
        }


class EncounterCreateSchema(BaseModel):
    """Schema para criação de encontro."""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    type: Literal["combat", "social", "exploration", "puzzle", "trap"] = "combat"
    difficulty: Literal["trivial", "easy", "medium", "hard", "deadly"] = "medium"
    location: Optional[str] = Field(None, max_length=100)

    npcs: List[NPCReferenceSchema] = Field(default_factory=list)
    traps: List[TrapSchema] = Field(default_factory=list)
    treasure: List[str] = Field(default_factory=list)

    experience_reward: int = Field(0, ge=0)
    map_image_id: Optional[str] = None
    handout_images: List[str] = Field(default_factory=list)

    dm_notes: Optional[str] = Field(None, max_length=2000)
    player_notes: Optional[str] = Field(None, max_length=1000)


class SessionNoteSchema(BaseModel):
    """Schema para notas de sessão."""
    id: str = Field(default_factory=lambda: str(ObjectId()))
    title: str = Field(..., min_length=1, max_length=100)
    content: str = Field(..., min_length=1, max_length=5000)
    author_id: str  # ID do usuário que criou a nota
    is_public: bool = False  # Visível para jogadores
    session_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        schema_extra = {
            "example": {
                "title": "Session 1 - The Adventure Begins",
                "content": "The party met at the tavern and accepted the quest to investigate the missing caravans...",
                "author_id": "dm123",
                "is_public": True,
                "session_date": "2025-01-15T19:00:00Z"
            }
        }


class CampaignSettingsSchema(BaseModel):
    """Schema para configurações da campanha."""
    # Regras da casa
    allow_multiclassing: bool = True
    allow_feats: bool = True
    allow_variant_human: bool = True
    use_flanking: bool = False
    use_healing_surge: bool = False

    # Configurações de jogo
    starting_level: int = Field(1, ge=1, le=20)
    max_level: int = Field(20, ge=1, le=20)
    ability_score_method: Literal["standard_array", "point_buy", "roll_4d6", "roll_3d6"] = "standard_array"

    # Configurações de experiência
    milestone_leveling: bool = False
    shared_experience: bool = True

    # Configurações de morte
    death_save_dc: int = Field(10, ge=5, le=20)
    massive_damage_threshold: Optional[int] = Field(None, ge=10)

    # Configurações de descanso
    short_rest_duration: int = Field(60, ge=1)  # em minutos
    long_rest_duration: int = Field(480, ge=60)  # em minutos

    # Configurações visuais
    use_theater_of_mind: bool = False
    grid_type: Literal["square", "hex", "none"] = "square"

    @validator('max_level')
    def validate_max_level(cls, v, values):
        """Valida que nível máximo >= nível inicial."""
        starting_level = values.get('starting_level', 1)
        if v < starting_level:
            raise ValueError('Nível máximo deve ser maior ou igual ao nível inicial')
        return v

    class Config:
        schema_extra = {
            "example": {
                "allow_multiclassing": True,
                "allow_feats": True,
                "starting_level": 1,
                "max_level": 20,
                "ability_score_method": "point_buy",
                "milestone_leveling": True,
                "shared_experience": True,
                "use_theater_of_mind": False,
                "grid_type": "square"
            }
        }


class CampaignBaseSchema(BaseModel):
    """Schema base para campanhas."""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=2000)
    system: str = Field("D&D 5e", max_length=50)  # Sistema de jogo
    setting: Optional[str] = Field(None, max_length=100)  # Cenário/ambientação

    # Status da campanha
    is_active: bool = True
    is_public: bool = False  # Visível para outros usuários

    # Configurações
    max_players: int = Field(6, ge=1, le=12)
    settings: CampaignSettingsSchema = Field(default_factory=CampaignSettingsSchema)

    class Config:
        use_enum_values = True


class CampaignCreateSchema(CampaignBaseSchema):
    """Schema para criação de campanha."""
    # Campos adicionais para criação
    player_emails: List[str] = Field(default_factory=list)  # E-mails para convites

    class Config:
        schema_extra = {
            "example": {
                "name": "Lost Mine of Phandelver",
                "description": "A classic D&D adventure for new players",
                "system": "D&D 5e",
                "setting": "Forgotten Realms",
                "max_players": 4,
                "player_emails": ["player1@example.com", "player2@example.com"],
                "settings": {
                    "starting_level": 1,
                    "milestone_leveling": True,
                    "allow_feats": True
                }
            }
        }


class CampaignUpdateSchema(BaseModel):
    """Schema para atualização de campanha."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=2000)
    system: Optional[str] = Field(None, max_length=50)
    setting: Optional[str] = Field(None, max_length=100)

    is_active: Optional[bool] = None
    is_public: Optional[bool] = None
    max_players: Optional[int] = Field(None, ge=1, le=12)

    settings: Optional[CampaignSettingsSchema] = None

    class Config:
        use_enum_values = True


class CampaignSchema(CampaignBaseSchema):
    """Schema completo da campanha (response)."""
    id: str = Field(alias="_id")
    dm_id: str  # ID do Dungeon Master
    players: List[str] = Field(default_factory=list)  # IDs dos jogadores

    # Conteúdo da campanha
    encounters: List[EncounterSchema] = Field(default_factory=list)
    session_notes: List[SessionNoteSchema] = Field(default_factory=list)
    images: List[ImageSchema] = Field(default_factory=list)

    # Estatísticas
    total_sessions: int = 0
    current_session: int = 0
    total_experience_awarded: int = 0

    # Timestamps
    created_at: datetime
    updated_at: datetime
    last_session_date: Optional[datetime] = None

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class CampaignListSchema(BaseModel):
    """Schema simplificado para listagem de campanhas."""
    id: str = Field(alias="_id")
    name: str
    description: Optional[str] = None
    system: str
    dm_id: str
    players: List[str] = Field(default_factory=list)
    max_players: int
    is_active: bool
    total_sessions: int
    created_at: datetime
    last_session_date: Optional[datetime] = None

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class CampaignSummarySchema(BaseModel):
    """Schema de resumo para campanha."""
    id: str = Field(alias="_id")
    name: str
    system: str
    player_count: int
    max_players: int
    is_active: bool
    dm_name: Optional[str] = None  # Preenchido via lookup

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class PlayerInviteSchema(BaseModel):
    """Schema para convite de jogador."""
    email: str
    message: Optional[str] = Field(None, max_length=500)

    class Config:
        schema_extra = {
            "example": {
                "email": "newplayer@example.com",
                "message": "Join our weekly D&D game! We play every Friday at 7 PM."
            }
        }


class CampaignJoinRequestSchema(BaseModel):
    """Schema para solicitação de entrada na campanha."""
    message: Optional[str] = Field(None, max_length=500)

    class Config:
        schema_extra = {
            "example": {
                "message": "I'm an experienced player looking for a new group. I prefer playing spellcasters."
            }
        }