# app/services/dice_service.py
"""
Dice Service - COMPLETO
Serviço completo para rolagem de dados D&D.
Corrige o problema de import inexistente no event_handlers.py.
"""

import re
import random
import logging
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class DiceRoll:
    """Resultado de uma rolagem de dados."""
    dice_expression: str
    rolls: List[int]
    total: int
    modifier: int
    critical: bool = False
    fumble: bool = False
    dropped_rolls: List[int] = None

    def __post_init__(self):
        if self.dropped_rolls is None:
            self.dropped_rolls = []


class DiceParser:
    """Parser para expressões de dados."""

    # Regex para parsing de dados
    DICE_PATTERN = re.compile(
        r'(\d*)d(\d+)(?:(kh|kl|dh|dl)(\d+))?(?:([+\-])(\d+))?',
        re.IGNORECASE
    )

    MODIFIER_PATTERN = re.compile(r'([+\-])(\d+)')

    @classmethod
    def parse_dice_expression(cls, expression: str) -> List[Dict[str, Any]]:
        """
        Parsa uma expressão de dados em componentes.

        Exemplos:
        - "1d20" -> [{'count': 1, 'sides': 20}]
        - "2d6+3" -> [{'count': 2, 'sides': 6, 'modifier': 3}]
        - "1d20kh1" -> [{'count': 1, 'sides': 20, 'keep_highest': 1}]

        Args:
            expression: Expressão de dados (ex: "2d6+3", "1d20kh1")

        Returns:
            Lista de componentes parseados
        """
        expression = expression.replace(" ", "").lower()
        components = []

        # Dividir por + e - mantendo os operadores
        parts = re.split(r'([+\-])', expression)
        current_sign = 1

        for part in parts:
            if part == '+':
                current_sign = 1
                continue
            elif part == '-':
                current_sign = -1
                continue
            elif not part:
                continue

            # Tentar fazer match com padrão de dados
            dice_match = cls.DICE_PATTERN.match(part)

            if dice_match:
                count_str, sides_str, keep_type, keep_count_str, mod_sign, mod_value_str = dice_match.groups()

                component = {
                    'type': 'dice',
                    'count': int(count_str) if count_str else 1,
                    'sides': int(sides_str),
                    'sign': current_sign
                }

                # Adicionar modificadores de keep/drop
                if keep_type and keep_count_str:
                    keep_count = int(keep_count_str)
                    if keep_type.lower() == 'kh':
                        component['keep_highest'] = keep_count
                    elif keep_type.lower() == 'kl':
                        component['keep_lowest'] = keep_count
                    elif keep_type.lower() == 'dh':
                        component['drop_highest'] = keep_count
                    elif keep_type.lower() == 'dl':
                        component['drop_lowest'] = keep_count

                # Modificador numérico
                if mod_sign and mod_value_str:
                    mod_value = int(mod_value_str)
                    if mod_sign == '-':
                        mod_value = -mod_value
                    component['modifier'] = mod_value

                components.append(component)

            else:
                # Tentar como modificador puro
                try:
                    value = int(part)
                    components.append({
                        'type': 'modifier',
                        'value': value * current_sign
                    })
                except ValueError:
                    logger.warning(f"Não foi possível parsar: {part}")

            current_sign = 1  # Reset

        return components


class DiceRoller:
    """Classe principal para rolagem de dados."""

    def __init__(self, seed: Optional[int] = None):
        """
        Inicializa o roller.

        Args:
            seed: Seed para o gerador de números aleatórios (para testes)
        """
        if seed is not None:
            random.seed(seed)

    def roll_dice(self, expression: str) -> DiceRoll:
        """
        Rola dados baseado na expressão fornecida.

        Args:
            expression: Expressão de dados

        Returns:
            Resultado da rolagem

        Raises:
            ValueError: Se a expressão for inválida
        """
        try:
            components = DiceParser.parse_dice_expression(expression)

            if not components:
                raise ValueError(f"Expressão de dados inválida: {expression}")

            all_rolls = []
            total_modifier = 0
            total = 0
            dropped_rolls = []

            for component in components:
                if component['type'] == 'dice':
                    dice_result = self._roll_dice_component(component)
                    all_rolls.extend(dice_result['kept_rolls'])
                    dropped_rolls.extend(dice_result['dropped_rolls'])
                    total += dice_result['total'] * component.get('sign', 1)

                    # Adicionar modificador do componente
                    if 'modifier' in component:
                        total += component['modifier'] * component.get('sign', 1)
                        total_modifier += component['modifier'] * component.get('sign', 1)

                elif component['type'] == 'modifier':
                    total += component['value']
                    total_modifier += component['value']

            # Detectar crítico e fumble
            critical = self._is_critical(components, all_rolls)
            fumble = self._is_fumble(components, all_rolls)

            return DiceRoll(
                dice_expression=expression,
                rolls=all_rolls,
                total=total,
                modifier=total_modifier,
                critical=critical,
                fumble=fumble,
                dropped_rolls=dropped_rolls
            )

        except Exception as e:
            logger.error(f"Erro ao rolar dados '{expression}': {e}")
            raise ValueError(f"Erro na rolagem: {str(e)}")

    def _roll_dice_component(self, component: Dict[str, Any]) -> Dict[str, Any]:
        """Rola um componente específico de dados."""
        count = component['count']
        sides = component['sides']

        # Validações
        if count <= 0 or count > 100:
            raise ValueError(f"Número de dados deve estar entre 1 e 100, recebido: {count}")
        if sides <= 0 or sides > 1000:
            raise ValueError(f"Número de lados deve estar entre 1 e 1000, recebido: {sides}")

        # Rolar todos os dados
        rolls = [random.randint(1, sides) for _ in range(count)]

        # Aplicar keep/drop
        kept_rolls, dropped_rolls = self._apply_keep_drop(rolls, component)

        return {
            'kept_rolls': kept_rolls,
            'dropped_rolls': dropped_rolls,
            'total': sum(kept_rolls)
        }

    def _apply_keep_drop(self, rolls: List[int], component: Dict[str, Any]) -> Tuple[List[int], List[int]]:
        """Aplica regras de keep/drop aos dados."""
        sorted_rolls = sorted(rolls, reverse=True)  # Maior para menor
        kept = list(rolls)  # Cópia dos dados originais
        dropped = []

        if 'keep_highest' in component:
            keep_count = min(component['keep_highest'], len(rolls))
            kept = sorted_rolls[:keep_count]
            dropped = sorted_rolls[keep_count:]

        elif 'keep_lowest' in component:
            keep_count = min(component['keep_lowest'], len(rolls))
            kept = sorted_rolls[-keep_count:]
            dropped = sorted_rolls[:-keep_count]

        elif 'drop_highest' in component:
            drop_count = min(component['drop_highest'], len(rolls) - 1)
            kept = sorted_rolls[drop_count:]
            dropped = sorted_rolls[:drop_count]

        elif 'drop_lowest' in component:
            drop_count = min(component['drop_lowest'], len(rolls) - 1)
            kept = sorted_rolls[:-drop_count]
            dropped = sorted_rolls[-drop_count:]

        return kept, dropped

    def _is_critical(self, components: List[Dict[str, Any]], rolls: List[int]) -> bool:
        """Determina se a rolagem é um crítico."""
        # Crítico apenas para d20s que rolaram 20
        for component in components:
            if (component['type'] == 'dice' and
                    component['sides'] == 20 and
                    20 in rolls):
                return True
        return False

    def _is_fumble(self, components: List[Dict[str, Any]], rolls: List[int]) -> bool:
        """Determina se a rolagem é um fumble."""
        # Fumble apenas para d20s que rolaram 1
        for component in components:
            if (component['type'] == 'dice' and
                    component['sides'] == 20 and
                    1 in rolls):
                return True
        return False


# Instância global do roller
_roller = DiceRoller()


def roll_dice(expression: str) -> Dict[str, Any]:
    """
    Função principal para rolar dados.
    CORREÇÃO: Esta função estava sendo importada no event_handlers mas não existia.

    Args:
        expression: Expressão de dados (ex: "1d20+5", "2d6")

    Returns:
        Resultado da rolagem em formato dict
    """
    try:
        result = _roller.roll_dice(expression)

        return {
            "expression": result.dice_expression,
            "rolls": result.rolls,
            "total": result.total,
            "modifier": result.modifier,
            "critical": result.critical,
            "fumble": result.fumble,
            "dropped": result.dropped_rolls,
            "success": True
        }

    except Exception as e:
        logger.error(f"Erro na rolagem de dados: {e}")
        return {
            "expression": expression,
            "error": str(e),
            "success": False
        }


def roll_with_advantage(expression: str) -> Dict[str, Any]:
    """
    Rola dados com vantagem (mantém o maior de dois d20s).

    Args:
        expression: Expressão base (será modificada para vantagem)

    Returns:
        Resultado da rolagem com vantagem
    """
    try:
        # Substituir d20 por 2d20kh1 (vantagem)
        advantage_expr = re.sub(r'(\d*)d20', r'2d20kh1', expression, count=1)

        result = roll_dice(advantage_expr)
        result["advantage"] = True
        result["original_expression"] = expression

        return result

    except Exception as e:
        logger.error(f"Erro na rolagem com vantagem: {e}")
        return {
            "expression": expression,
            "error": str(e),
            "success": False,
            "advantage": True
        }


def roll_with_disadvantage(expression: str) -> Dict[str, Any]:
    """
    Rola dados com desvantagem (mantém o menor de dois d20s).

    Args:
        expression: Expressão base (será modificada para desvantagem)

    Returns:
        Resultado da rolagem com desvantagem
    """
    try:
        # Substituir d20 por 2d20kl1 (desvantagem)
        disadvantage_expr = re.sub(r'(\d*)d20', r'2d20kl1', expression, count=1)

        result = roll_dice(disadvantage_expr)
        result["disadvantage"] = True
        result["original_expression"] = expression

        return result

    except Exception as e:
        logger.error(f"Erro na rolagem com desvantagem: {e}")
        return {
            "expression": expression,
            "error": str(e),
            "success": False,
            "disadvantage": True
        }


def roll_damage(expression: str, critical: bool = False) -> Dict[str, Any]:
    """
    Rola dano, dobrando os dados em caso de crítico.

    Args:
        expression: Expressão de dano
        critical: Se é um acerto crítico

    Returns:
        Resultado da rolagem de dano
    """
    try:
        if critical:
            # Dobrar apenas os dados, não os modificadores
            critical_expr = _double_dice_in_expression(expression)
            result = roll_dice(critical_expr)
            result["critical_damage"] = True
            result["original_expression"] = expression
        else:
            result = roll_dice(expression)
            result["critical_damage"] = False

        return result

    except Exception as e:
        logger.error(f"Erro na rolagem de dano: {e}")
        return {
            "expression": expression,
            "error": str(e),
            "success": False,
            "critical_damage": critical
        }


def _double_dice_in_expression(expression: str) -> str:
    """Dobra os dados em uma expressão (para críticos)."""

    def replace_dice(match):
        count_str = match.group(1)
        sides = match.group(2)
        rest = match.group(3) or ""

        count = int(count_str) if count_str else 1
        doubled_count = count * 2

        return f"{doubled_count}d{sides}{rest}"

    # Dobrar todos os dados na expressão
    pattern = r'(\d*)d(\d+)([^+\-]*)'
    doubled_expr = re.sub(pattern, replace_dice, expression)

    return doubled_expr


def roll_ability_score() -> Dict[str, Any]:
    """
    Rola atributo usando método 4d6, remove o menor.

    Returns:
        Resultado da rolagem de atributo
    """
    try:
        result = roll_dice("4d6dl1")
        result["ability_score"] = True

        return result

    except Exception as e:
        logger.error(f"Erro na rolagem de atributo: {e}")
        return {
            "error": str(e),
            "success": False,
            "ability_score": True
        }


def roll_hit_points(hit_die: str, constitution_modifier: int, level: int) -> Dict[str, Any]:
    """
    Rola pontos de vida para um nível.

    Args:
        hit_die: Tipo do dado de vida (ex: "d8")
        constitution_modifier: Modificador de Constituição
        level: Nível do personagem

    Returns:
        Resultado da rolagem de HP
    """
    try:
        # Primeiro nível sempre máximo
        if level == 1:
            max_hp = int(hit_die[1:]) + constitution_modifier
            return {
                "expression": f"max({hit_die}) + {constitution_modifier}",
                "total": max_hp,
                "level": level,
                "hit_die": hit_die,
                "constitution_modifier": constitution_modifier,
                "max_first_level": True,
                "success": True
            }

        # Níveis subsequentes
        expression = f"1{hit_die}+{constitution_modifier}"
        result = roll_dice(expression)
        result["level"] = level
        result["hit_die"] = hit_die
        result["constitution_modifier"] = constitution_modifier
        result["max_first_level"] = False

        return result

    except Exception as e:
        logger.error(f"Erro na rolagem de HP: {e}")
        return {
            "error": str(e),
            "success": False,
            "level": level,
            "hit_die": hit_die
        }


def roll_multiple(expressions: List[str]) -> List[Dict[str, Any]]:
    """
    Rola múltiplas expressões de uma vez.

    Args:
        expressions: Lista de expressões de dados

    Returns:
        Lista de resultados
    """
    results = []

    for expr in expressions:
        try:
            result = roll_dice(expr)
            results.append(result)
        except Exception as e:
            logger.error(f"Erro ao rolar '{expr}': {e}")
            results.append({
                "expression": expr,
                "error": str(e),
                "success": False
            })

    return results


def validate_dice_expression(expression: str) -> Dict[str, Any]:
    """
    Valida se uma expressão de dados é válida.

    Args:
        expression: Expressão a ser validada

    Returns:
        Resultado da validação
    """
    try:
        components = DiceParser.parse_dice_expression(expression)

        if not components:
            return {
                "valid": False,
                "error": "Expressão vazia ou inválida"
            }

        # Verificar limites
        for component in components:
            if component['type'] == 'dice':
                if component['count'] > 100:
                    return {
                        "valid": False,
                        "error": "Máximo de 100 dados por rolagem"
                    }
                if component['sides'] > 1000:
                    return {
                        "valid": False,
                        "error": "Máximo de 1000 lados por dado"
                    }

        return {
            "valid": True,
            "components": components
        }

    except Exception as e:
        return {
            "valid": False,
            "error": str(e)
        }


# Exportar funções principais
__all__ = [
    "roll_dice",
    "roll_with_advantage",
    "roll_with_disadvantage",
    "roll_damage",
    "roll_ability_score",
    "roll_hit_points",
    "roll_multiple",
    "validate_dice_expression",
    "DiceRoll",
    "DiceRoller"
]