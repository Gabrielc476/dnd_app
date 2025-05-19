# app/services/__init__.py
"""
Services para a lógica de negócios da aplicação.

Este módulo contém os serviços que implementam a lógica de negócios,
abstraindo as operações de banco de dados e funcionalidades específicas
do domínio. Os serviços são usados pelos routers para executar as
operações requisitadas pelo cliente.
"""

from app.services.character_service import CharacterService
from app.services.campaign_service import CampaignService
from app.services.combat_service import CombatService
from app.services.npc_service import NPCService
from app.services.image_service import ImageService
from app.services.compendium_service import CompendiumService
from app.services.dice_service import roll_dice, roll_with_advantage, roll_with_disadvantage, roll_damage

__all__ = [
    "CharacterService",
    "CampaignService",
    "CombatService",
    "NPCService",
    "ImageService",
    "CompendiumService",
    "roll_dice",
    "roll_with_advantage",
    "roll_with_disadvantage",
    "roll_damage"
]