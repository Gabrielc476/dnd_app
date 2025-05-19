# app/routes/__init__.py
"""
Routers da API para o sistema D&D VTT.

Este módulo contém os routers que definem os endpoints da API,
organizados por domínio da aplicação.
"""

from app.routes.auth import router as auth_router
from app.routes.characters import router as characters_router
from app.routes.campaigns import router as campaigns_router
from app.routes.npcs import router as npcs_router
from app.routes.compendium import router as compendium_router

__all__ = [
    "auth_router",
    "characters_router",
    "campaigns_router",
    "npcs_router",
    "compendium_router"
]