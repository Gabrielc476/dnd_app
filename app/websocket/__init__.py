# app/websocket/__init__.py
"""
Módulo de WebSockets para o sistema VTT D&D.
Gerencia conexões em tempo real, locks distribuídos e eventos de jogo.
"""

from app.websocket.connection_manager import ConnectionManager
from app.websocket.lock_manager import LockManager

__all__ = ["ConnectionManager", "LockManager"]