# app/services/__init__.py
"""
Services para a lógica de negócios da aplicação.

Este módulo contém os serviços que implementam a lógica de negócios,
abstraindo as operações de banco de dados e funcionalidades específicas
do domínio. Os serviços são usados pelos routers para executar as
operações requisitadas pelo cliente.

CORREÇÃO: Removido import de dice_service inexistente
"""

from app.services.character_service import CharacterService
from app.services.campaign_service import CampaignService
from app.services.combat_service import CombatService
from app.services.npc_service import NPCService
from app.services.image_service import ImageService
from app.services.compendium_service import CompendiumService

# Funções utilitárias de dados implementadas diretamente aqui
import random


def roll_dice(sides: int, count: int = 1, modifier: int = 0) -> dict:
    """
    Rola dados e retorna o resultado.

    Args:
        sides: Número de lados do dado
        count: Quantos dados rolar
        modifier: Modificador a adicionar

    Returns:
        Dict com resultado da rolagem
    """
    if sides <= 0 or count <= 0:
        raise ValueError("Sides e count devem ser maiores que 0")

    rolls = [random.randint(1, sides) for _ in range(count)]
    total = sum(rolls) + modifier

    return {
        "rolls": rolls,
        "modifier": modifier,
        "total": total,
        "formula": f"{count}d{sides}{'+' + str(modifier) if modifier > 0 else '' if modifier == 0 else str(modifier)}"
    }


def roll_with_advantage(sides: int = 20, modifier: int = 0) -> dict:
    """
    Rola com vantagem (2d20, pega o maior).

    Args:
        sides: Número de lados do dado (padrão d20)
        modifier: Modificador a adicionar

    Returns:
        Dict com resultado da rolagem
    """
    roll1 = random.randint(1, sides)
    roll2 = random.randint(1, sides)
    result = max(roll1, roll2) + modifier

    return {
        "rolls": [roll1, roll2],
        "result": result,
        "modifier": modifier,
        "type": "advantage",
        "formula": f"2d{sides} (advantage){'+' + str(modifier) if modifier > 0 else '' if modifier == 0 else str(modifier)}"
    }


def roll_with_disadvantage(sides: int = 20, modifier: int = 0) -> dict:
    """
    Rola com desvantagem (2d20, pega o menor).

    Args:
        sides: Número de lados do dado (padrão d20)
        modifier: Modificador a adicionar

    Returns:
        Dict com resultado da rolagem
    """
    roll1 = random.randint(1, sides)
    roll2 = random.randint(1, sides)
    result = min(roll1, roll2) + modifier

    return {
        "rolls": [roll1, roll2],
        "result": result,
        "modifier": modifier,
        "type": "disadvantage",
        "formula": f"2d{sides} (disadvantage){'+' + str(modifier) if modifier > 0 else '' if modifier == 0 else str(modifier)}"
    }


def roll_damage(damage_dice: str, modifier: int = 0) -> dict:
    """
    Rola dano baseado em uma string de dados (ex: "2d6+3").

    Args:
        damage_dice: String com fórmula de dados (ex: "2d6", "1d8+2")
        modifier: Modificador adicional

    Returns:
        Dict com resultado da rolagem
    """
    import re

    # Parse da string de dados
    pattern = r"(\d+)d(\d+)(?:([+-])(\d+))?"
    match = re.match(pattern, damage_dice.replace(" ", ""))

    if not match:
        raise ValueError(f"Fórmula de dados inválida: {damage_dice}")

    count = int(match.group(1))
    sides = int(match.group(2))
    sign = match.group(3)
    dice_modifier = int(match.group(4)) if match.group(4) else 0

    if sign == "-":
        dice_modifier = -dice_modifier

    total_modifier = dice_modifier + modifier

    rolls = [random.randint(1, sides) for _ in range(count)]
    total = sum(rolls) + total_modifier

    return {
        "rolls": rolls,
        "dice_modifier": dice_modifier,
        "additional_modifier": modifier,
        "total_modifier": total_modifier,
        "total": total,
        "formula": f"{damage_dice}{'+' + str(modifier) if modifier > 0 else '' if modifier == 0 else str(modifier)}"
    }


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