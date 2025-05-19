# app/services/dice_service.py
import random
import re
from typing import Tuple, List, Dict, Any, Union, Optional


def parse_dice_formula(formula: str) -> List[Tuple[int, int]]:
    """
    Analisa uma fórmula de dados (ex: "2d6+1d8").

    Args:
        formula: String da fórmula de dados (ex: "2d6", "1d20+5", "2d4+1d6")

    Returns:
        Lista de tuplas (quantidade, faces)
    """
    dice_pattern = re.compile(r'(\d+)d(\d+)')
    matches = dice_pattern.findall(formula)

    if not matches:
        raise ValueError(f"Fórmula de dados inválida: {formula}")

    return [(int(count), int(sides)) for count, sides in matches]


def roll_dice(formula: str, modifier: int = 0) -> int:
    """
    Rola dados baseado na fórmula fornecida.

    Args:
        formula: String da fórmula de dados (ex: "2d6", "1d20", "2d4+1d6")
        modifier: Modificador a ser adicionado ao resultado (opcional)

    Returns:
        Resultado total da rolagem
    """
    # Remover espaços e converter para minúsculas
    formula = formula.lower().replace(" ", "")

    # Separar modificadores que possam estar na fórmula
    formula_parts = re.split(r'(\+|\-)', formula)
    base_formula = formula_parts[0]

    dice_list = parse_dice_formula(base_formula)

    # Fazer as rolagens
    result = 0
    for count, sides in dice_list:
        for _ in range(count):
            result += random.randint(1, sides)

    # Processar modificadores adicionais da fórmula
    if len(formula_parts) > 1:
        i = 1
        while i < len(formula_parts):
            operator = formula_parts[i]
            if i + 1 < len(formula_parts):
                operand = formula_parts[i + 1]

                # Verificar se é um dado ou um número
                dice_match = re.match(r'(\d+)d(\d+)', operand)
                if dice_match:
                    # É um dado, precisa rolar
                    dice_count = int(dice_match.group(1))
                    dice_sides = int(dice_match.group(2))
                    dice_result = 0
                    for _ in range(dice_count):
                        dice_result += random.randint(1, dice_sides)

                    if operator == '+':
                        result += dice_result
                    elif operator == '-':
                        result -= dice_result
                else:
                    # É um número direto
                    try:
                        value = int(operand)
                        if operator == '+':
                            result += value
                        elif operator == '-':
                            result -= value
                    except ValueError:
                        # Ignorar partes inválidas
                        pass

            i += 2

    # Adicionar o modificador final
    result += modifier

    return result


def roll_with_advantage(modifier: int = 0) -> Dict[str, Any]:
    """
    Rola 1d20 com vantagem.

    Args:
        modifier: Modificador a ser adicionado ao resultado

    Returns:
        Dicionário com os resultados da rolagem
    """
    roll1 = random.randint(1, 20)
    roll2 = random.randint(1, 20)

    highest = max(roll1, roll2)

    return {
        "roll1": roll1,
        "roll2": roll2,
        "result": highest,
        "total": highest + modifier,
        "modifier": modifier,
        "advantage": True,
        "disadvantage": False
    }


def roll_with_disadvantage(modifier: int = 0) -> Dict[str, Any]:
    """
    Rola 1d20 com desvantagem.

    Args:
        modifier: Modificador a ser adicionado ao resultado

    Returns:
        Dicionário com os resultados da rolagem
    """
    roll1 = random.randint(1, 20)
    roll2 = random.randint(1, 20)

    lowest = min(roll1, roll2)

    return {
        "roll1": roll1,
        "roll2": roll2,
        "result": lowest,
        "total": lowest + modifier,
        "modifier": modifier,
        "advantage": False,
        "disadvantage": True
    }


def check_critical(roll_result: int, threshold: int = 20) -> bool:
    """
    Verifica se uma rolagem é um acerto crítico.

    Args:
        roll_result: Resultado da rolagem (sem modificadores)
        threshold: Valor limite para crítico (padrão: 20)

    Returns:
        True se for um acerto crítico, False caso contrário
    """
    return roll_result >= threshold


def check_fumble(roll_result: int) -> bool:
    """
    Verifica se uma rolagem é uma falha crítica (fumble).

    Args:
        roll_result: Resultado da rolagem (sem modificadores)

    Returns:
        True se for uma falha crítica, False caso contrário
    """
    return roll_result == 1


def roll_damage(formula: str, critical: bool = False) -> int:
    """
    Rola dano baseado na fórmula fornecida, dobrando dados em caso de crítico.

    Args:
        formula: String da fórmula de dano (ex: "2d6+3")
        critical: Se verdadeiro, dobra o número de dados (não o modificador)

    Returns:
        Resultado total do dano
    """
    # Separar a fórmula em componentes (dados e modificador)
    dice_pattern = re.compile(r'(\d+)d(\d+)')
    parts = re.split(dice_pattern, formula)

    result = 0
    i = 0

    while i < len(parts):
        if i % 4 == 0:  # Modificadores antes dos dados
            try:
                mod = int(parts[i].strip('+'))
                result += mod
            except (ValueError, IndexError):
                pass
        elif i % 4 == 1:  # Quantidade de dados
            try:
                count = int(parts[i])
                sides = int(parts[i + 1])

                # Se for crítico, dobrar a quantidade de dados
                if critical:
                    count *= 2

                for _ in range(count):
                    result += random.randint(1, sides)

                i += 1  # Pular o próximo item (lados do dado)
            except (ValueError, IndexError):
                pass

        i += 1

    return result