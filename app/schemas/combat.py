# app/schemas/combat.py
"""
Combat schemas - COMPLETO
Schemas para sistema de combate D&D.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any, Literal, Union
from pydantic import BaseModel, Field, validator
from bson import ObjectId


class ConditionEffectSchema(BaseModel):
    """Schema para condições e efeitos em combate."""
    name: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = Field(None, max_length=500)
    duration: Optional[int] = Field(None, ge=0)  # Em turnos, None = permanente
    duration_type: Literal["turns", "rounds", "minutes", "hours", "permanent"] = "turns"
    concentration: bool = False
    source: Optional[str] = Field(None, max_length=100)  # Quem/o que causou
    level: Optional[int] = Field(None, ge=0, le=9)  # Nível da magia, se aplicável
    save_dc: Optional[int] = Field(None, ge=1, le=30)  # DC para salvar
    save_ability: Optional[
        Literal["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]] = None

    class Config:
        schema_extra = {
            "example": {
                "name": "Poisoned",
                "description": "The creature is poisoned. While poisoned, the creature has disadvantage on attack rolls and ability checks.",
                "duration": 10,
                "duration_type": "turns",
                "concentration": False,
                "source": "Poison Dart Trap",
                "save_dc": 13,
                "save_ability": "constitution"
            }
        }


class InitiativeEntrySchema(BaseModel):
    """Schema para entrada na ordem de iniciativa."""
    id: str = Field(..., description="ID único da entrada")
    participant_type: Literal["character", "npc", "other"] = "character"
    participant_id: str = Field(..., description="ID do personagem/NPC")
    participant_name: str = Field(..., min_length=1, max_length=100)
    initiative: int = Field(..., ge=-10, le=50)
    initiative_modifier: int = Field(0, ge=-10, le=20)
    rolled_initiative: int = Field(..., ge=1, le=20)

    # Status atual
    current_hp: int = Field(..., ge=0)
    max_hp: int = Field(..., ge=1)
    temporary_hp: int = Field(0, ge=0)
    armor_class: int = Field(..., ge=1, le=50)

    # Condições ativas
    conditions: List[ConditionEffectSchema] = Field(default_factory=list)

    # Status de combate
    is_active: bool = True
    is_conscious: bool = True
    death_saves_successes: int = Field(0, ge=0, le=3)
    death_saves_failures: int = Field(0, ge=0, le=3)

    # Recursos
    spell_slots_used: Dict[str, int] = Field(default_factory=dict)  # Ex: {"level_1": 2}
    resources_used: Dict[str, int] = Field(default_factory=dict)  # Rage, Ki, etc.

    # Posicionamento (se usando grid)
    position_x: Optional[int] = Field(None, ge=0)
    position_y: Optional[int] = Field(None, ge=0)

    @validator('current_hp')
    def validate_current_hp(cls, v, values):
        """Valida que HP atual não excede HP máximo."""
        max_hp = values.get('max_hp', 0)
        if v > max_hp + values.get('temporary_hp', 0):
            raise ValueError('HP atual não pode exceder HP máximo + HP temporário')
        return v

    @validator('death_saves_successes', 'death_saves_failures')
    def validate_death_saves(cls, v):
        """Valida que salvamentos contra morte não excedem 3."""
        if v > 3:
            raise ValueError('Salvamentos contra morte não podem exceder 3')
        return v

    def is_dying(self) -> bool:
        """Verifica se o participante está morrendo (0 HP e consciente)."""
        return self.current_hp == 0 and self.is_conscious

    def is_dead(self) -> bool:
        """Verifica se o participante está morto."""
        return self.death_saves_failures >= 3 or not self.is_active

    def is_stable(self) -> bool:
        """Verifica se o participante está estável."""
        return self.death_saves_successes >= 3

    class Config:
        schema_extra = {
            "example": {
                "id": "init_001",
                "participant_type": "character",
                "participant_id": "char_123",
                "participant_name": "Gandalf",
                "initiative": 15,
                "initiative_modifier": 2,
                "rolled_initiative": 13,
                "current_hp": 45,
                "max_hp": 68,
                "temporary_hp": 0,
                "armor_class": 12,
                "conditions": [],
                "is_active": True,
                "is_conscious": True,
                "death_saves_successes": 0,
                "death_saves_failures": 0,
                "spell_slots_used": {"level_1": 2, "level_3": 1},
                "resources_used": {},
                "position_x": 5,
                "position_y": 8
            }
        }


class CombatEventSchema(BaseModel):
    """Schema para eventos de combate (log)."""
    id: str = Field(default_factory=lambda: str(ObjectId()))
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    round_number: int = Field(..., ge=1)
    turn_number: int = Field(..., ge=1)
    event_type: Literal[
        "combat_start", "combat_end", "turn_start", "turn_end", "round_start", "round_end",
        "attack", "damage", "healing", "spell_cast", "ability_use", "condition_applied",
        "condition_removed", "death_save", "stabilize", "revive", "move", "other"
    ]

    # Participantes envolvidos
    actor_id: Optional[str] = None
    actor_name: Optional[str] = None
    target_ids: List[str] = Field(default_factory=list)
    target_names: List[str] = Field(default_factory=list)

    # Detalhes do evento
    description: str = Field(..., min_length=1, max_length=500)
    details: Dict[str, Any] = Field(default_factory=dict)

    # Resultados
    damage_dealt: Optional[int] = Field(None, ge=0)
    healing_done: Optional[int] = Field(None, ge=0)
    spell_level: Optional[int] = Field(None, ge=0, le=9)

    class Config:
        schema_extra = {
            "example": {
                "event_type": "attack",
                "round_number": 2,
                "turn_number": 3,
                "actor_id": "char_123",
                "actor_name": "Gandalf",
                "target_ids": ["npc_456"],
                "target_names": ["Orc Warrior"],
                "description": "Gandalf attacks Orc Warrior with his staff",
                "details": {
                    "attack_roll": 18,
                    "damage_roll": "1d6+2",
                    "damage_type": "bludgeoning",
                    "critical": False
                },
                "damage_dealt": 7
            }
        }


class RollInitiativeSchema(BaseModel):
    """Schema para rolagem de iniciativa."""
    participant_id: str
    participant_type: Literal["character", "npc"] = "character"
    advantage: bool = False
    disadvantage: bool = False
    modifier: Optional[int] = None  # Override do modificador padrão

    class Config:
        schema_extra = {
            "example": {
                "participant_id": "char_123",
                "participant_type": "character",
                "advantage": False,
                "disadvantage": False,
                "modifier": 3
            }
        }


class ActionSchema(BaseModel):
    """Schema para ações em combate."""
    action_type: Literal[
        "attack", "spell", "ability", "item", "move", "dash", "dodge", "help", "hide", "ready", "search", "other"]
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)

    # Alvos
    target_ids: List[str] = Field(default_factory=list)
    target_type: Literal["single", "multiple", "area", "self"] = "single"

    # Recursos gastos
    spell_slot_level: Optional[int] = Field(None, ge=1, le=9)
    resource_cost: Dict[str, int] = Field(default_factory=dict)

    # Posicionamento
    move_to_x: Optional[int] = Field(None, ge=0)
    move_to_y: Optional[int] = Field(None, ge=0)

    # Dados adicionais
    data: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        schema_extra = {
            "example": {
                "action_type": "spell",
                "name": "Fireball",
                "description": "Casts fireball at 3rd level targeting multiple enemies",
                "target_ids": ["npc_456", "npc_789"],
                "target_type": "area",
                "spell_slot_level": 3,
                "data": {
                    "area_center_x": 10,
                    "area_center_y": 15,
                    "area_radius": 20,
                    "save_dc": 15,
                    "damage_dice": "8d6"
                }
            }
        }


class CombatBaseSchema(BaseModel):
    """Schema base para combate."""
    name: str = Field(..., min_length=1, max_length=100)
    campaign_id: str
    encounter_id: Optional[str] = None

    # Estado do combate
    status: Literal["preparing", "active", "paused", "completed"] = "preparing"
    current_round: int = Field(1, ge=1)
    current_turn: int = Field(0, ge=0)

    # Configurações
    use_theater_of_mind: bool = True
    grid_size: Optional[int] = Field(None, ge=5, le=10)  # Tamanho do grid em pés
    map_width: Optional[int] = Field(None, ge=1, le=200)  # Em squares
    map_height: Optional[int] = Field(None, ge=1, le=200)  # Em squares

    # Ordem de iniciativa
    initiative_order: List[InitiativeEntrySchema] = Field(default_factory=list)

    # Log de eventos
    events: List[CombatEventSchema] = Field(default_factory=list)

    @validator('current_turn')
    def validate_current_turn(cls, v, values):
        """Valida que turno atual não excede número de participantes."""
        initiative_order = values.get('initiative_order', [])
        if initiative_order and v >= len(initiative_order):
            raise ValueError('Turno atual não pode exceder número de participantes')
        return v

    class Config:
        use_enum_values = True


class CombatCreateSchema(CombatBaseSchema):
    """Schema para criação de combate."""
    # Participantes iniciais (opcionais)
    participants: List[Dict[str, Any]] = Field(default_factory=list)

    # Configurações específicas de criação
    auto_roll_initiative: bool = True
    sort_initiative: bool = True

    class Config:
        schema_extra = {
            "example": {
                "name": "Goblin Ambush",
                "campaign_id": "campaign_123",
                "encounter_id": "encounter_456",
                "use_theater_of_mind": False,
                "grid_size": 5,
                "map_width": 20,
                "map_height": 15,
                "participants": [
                    {
                        "type": "character",
                        "id": "char_123",
                        "name": "Gandalf"
                    },
                    {
                        "type": "npc",
                        "id": "npc_456",
                        "name": "Goblin Warrior",
                        "quantity": 3
                    }
                ],
                "auto_roll_initiative": True,
                "sort_initiative": True
            }
        }


class CombatUpdateSchema(BaseModel):
    """Schema para atualização de combate."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    status: Optional[Literal["preparing", "active", "paused", "completed"]] = None
    current_round: Optional[int] = Field(None, ge=1)
    current_turn: Optional[int] = Field(None, ge=0)

    # Configurações
    use_theater_of_mind: Optional[bool] = None
    grid_size: Optional[int] = Field(None, ge=5, le=10)
    map_width: Optional[int] = Field(None, ge=1, le=200)
    map_height: Optional[int] = Field(None, ge=1, le=200)

    class Config:
        use_enum_values = True


class CombatSchema(CombatBaseSchema):
    """Schema completo do combate (response)."""
    id: str = Field(alias="_id")
    dm_id: str

    # Timestamps
    created_at: datetime
    updated_at: datetime
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None

    # Estatísticas
    total_rounds: int = 0
    total_damage_dealt: int = 0
    total_healing_done: int = 0

    # Participante ativo
    current_participant: Optional[InitiativeEntrySchema] = None

    def get_current_participant(self) -> Optional[InitiativeEntrySchema]:
        """Obtém o participante do turno atual."""
        if self.initiative_order and 0 <= self.current_turn < len(self.initiative_order):
            return self.initiative_order[self.current_turn]
        return None

    def get_active_participants(self) -> List[InitiativeEntrySchema]:
        """Obtém participantes ativos (não mortos)."""
        return [p for p in self.initiative_order if p.is_active]

    def is_combat_over(self) -> bool:
        """Verifica se o combate terminou."""
        if self.status == "completed":
            return True

        # Verificar se apenas um lado tem participantes ativos
        active_chars = [p for p in self.initiative_order if p.is_active and p.participant_type == "character"]
        active_npcs = [p for p in self.initiative_order if p.is_active and p.participant_type == "npc"]

        return len(active_chars) == 0 or len(active_npcs) == 0

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class CombatListSchema(BaseModel):
    """Schema simplificado para listagem de combates."""
    id: str = Field(alias="_id")
    name: str
    campaign_id: str
    status: str
    current_round: int
    participant_count: int
    created_at: datetime
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class CombatSummarySchema(BaseModel):
    """Schema de resumo para combate ativo."""
    id: str = Field(alias="_id")
    name: str
    status: str
    current_round: int
    current_turn: int
    current_participant_name: Optional[str] = None
    active_participants: int
    total_participants: int

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class AddParticipantSchema(BaseModel):
    """Schema para adicionar participante ao combate."""
    participant_type: Literal["character", "npc"] = "character"
    participant_id: str
    initiative: Optional[int] = None  # Se não fornecido, será rolado
    position_x: Optional[int] = None
    position_y: Optional[int] = None

    class Config:
        schema_extra = {
            "example": {
                "participant_type": "character",
                "participant_id": "char_789",
                "initiative": 14,
                "position_x": 3,
                "position_y": 7
            }
        }


class UpdateParticipantSchema(BaseModel):
    """Schema para atualizar participante em combate."""
    current_hp: Optional[int] = Field(None, ge=0)
    temporary_hp: Optional[int] = Field(None, ge=0)
    conditions: Optional[List[ConditionEffectSchema]] = None
    position_x: Optional[int] = Field(None, ge=0)
    position_y: Optional[int] = Field(None, ge=0)
    death_saves_successes: Optional[int] = Field(None, ge=0, le=3)
    death_saves_failures: Optional[int] = Field(None, ge=0, le=3)
    is_conscious: Optional[bool] = None
    spell_slots_used: Optional[Dict[str, int]] = None
    resources_used: Optional[Dict[str, int]] = None

    class Config:
        schema_extra = {
            "example": {
                "current_hp": 25,
                "temporary_hp": 5,
                "conditions": [
                    {
                        "name": "Blessed",
                        "description": "+1d4 to attack rolls and saving throws",
                        "duration": 10,
                        "duration_type": "turns",
                        "concentration": True,
                        "source": "Cleric spell"
                    }
                ],
                "position_x": 8,
                "position_y": 12
            }
        }


class CombatActionResultSchema(BaseModel):
    """Schema para resultado de ação em combate."""
    success: bool
    message: str
    details: Dict[str, Any] = Field(default_factory=dict)
    events_created: List[CombatEventSchema] = Field(default_factory=list)
    participants_affected: List[str] = Field(default_factory=list)

    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "message": "Attack hit for 8 damage",
                "details": {
                    "attack_roll": 16,
                    "damage_roll": "1d8+3",
                    "damage_dealt": 8,
                    "target_hp_remaining": 17
                },
                "events_created": [],
                "participants_affected": ["npc_456"]
            }
        }