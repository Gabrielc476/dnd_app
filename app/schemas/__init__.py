# app/schemas/__init__.py
"""
Schemas para validação e serialização de dados na API.

Este módulo contém schemas Pydantic para validação e serialização de
dados em requests e respostas da API. Os schemas são separados dos
modelos para permitir diferentes representações para entrada, saída e
operações específicas.
"""

from app.schemas.character import (
    CharacterSchema, CharacterCreateSchema, CharacterUpdateSchema, CharacterListSchema
)
from app.schemas.campaign import (
    CampaignSchema, CampaignCreateSchema, CampaignUpdateSchema, CampaignListSchema,
    EncounterSchema, EncounterCreateSchema, TrapSchema, NPCReferenceSchema, ImageSchema
)
from app.schemas.combat import (
    CombatSchema, CombatCreateSchema, CombatUpdateSchema,
    InitiativeEntrySchema, ConditionEffectSchema, CombatEventSchema
)
from app.schemas.npc import (
    NPCSchema, NPCCreateSchema, NPCUpdateSchema, NPCActionSchema, NPCStatsSchema, NPCListSchema
)
from app.schemas.compendium import (
    SpellSchema, ItemSchema, MonsterTemplateSchema, CompendiumSearchSchema
)
from app.schemas.websocket import (
    WSMessageSchema, CharacterEventSchema, CombatEventSchema,
    LockEventSchema, ImageEventSchema, SpellEventSchema
)

__all__ = [
    # Character schemas
    "CharacterSchema", "CharacterCreateSchema", "CharacterUpdateSchema", "CharacterListSchema",

    # Campaign schemas
    "CampaignSchema", "CampaignCreateSchema", "CampaignUpdateSchema", "CampaignListSchema",
    "EncounterSchema", "EncounterCreateSchema", "TrapSchema", "NPCReferenceSchema", "ImageSchema",

    # Combat schemas
    "CombatSchema", "CombatCreateSchema", "CombatUpdateSchema",
    "InitiativeEntrySchema", "ConditionEffectSchema", "CombatEventSchema",

    # NPC schemas
    "NPCSchema", "NPCCreateSchema", "NPCUpdateSchema", "NPCActionSchema", "NPCStatsSchema", "NPCListSchema",

    # Compendium schemas
    "SpellSchema", "ItemSchema", "MonsterTemplateSchema", "CompendiumSearchSchema",

    # WebSocket schemas
    "WSMessageSchema", "CharacterEventSchema", "CombatEventSchema",
    "LockEventSchema", "ImageEventSchema", "SpellEventSchema"
]