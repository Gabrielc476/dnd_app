# app/schemas/websocket.py
from datetime import datetime
from typing import Dict, List, Optional, Union, Any, Literal
from pydantic import BaseModel, Field, root_validator


class WSMessageSchema(BaseModel):
    type: str
    action: str
    timestamp: Optional[datetime] = None

    class Config:
        schema_extra = {
            "example": {
                "type": "character",
                "action": "update",
                "timestamp": "2025-01-01T12:00:00"
            }
        }


class CharacterEventSchema(WSMessageSchema):
    type: Literal["character"] = "character"
    action: Literal["update", "roll", "hp_change"]
    character_id: str
    data: Dict[str, Any]

    class Config:
        schema_extra = {
            "example": {
                "type": "character",
                "action": "update",
                "character_id": "character123",
                "data": {
                    "hp": {
                        "current": 35,
                        "max": 45
                    }
                }
            }
        }


class RollEventSchema(WSMessageSchema):
    type: Literal["roll"] = "roll"
    action: Literal["ability", "skill", "saving_throw", "attack", "damage", "initiative", "custom"]
    character_id: Optional[str] = None
    npc_id: Optional[str] = None
    formula: str
    modifier: int = 0
    advantage: Optional[bool] = None
    disadvantage: Optional[bool] = None

    class Config:
        schema_extra = {
            "example": {
                "type": "roll",
                "action": "ability",
                "character_id": "character123",
                "formula": "1d20",
                "modifier": 3,
                "advantage": True
            }
        }

    @root_validator
    def check_entity_id(cls, values):
        """Ensure either character_id or npc_id is provided, but not both."""
        character_id = values.get('character_id')
        npc_id = values.get('npc_id')

        if (character_id is None and npc_id is None) or (character_id is not None and npc_id is not None):
            raise ValueError("Either character_id or npc_id must be provided, but not both.")
        return values


class CombatEventSchema(WSMessageSchema):
    type: Literal["combat"] = "combat"
    action: Literal["start", "roll_initiative", "next_turn", "add_condition", "remove_condition", "end"]
    combat_id: Optional[str] = None
    data: Dict[str, Any]

    class Config:
        schema_extra = {
            "example": {
                "type": "combat",
                "action": "start",
                "data": {
                    "campaign_id": "campaign123",
                    "encounter_id": "encounter456"
                }
            }
        }


class LockEventSchema(WSMessageSchema):
    type: Literal["lock"] = "lock"
    action: Literal["acquire", "release", "heartbeat", "status"]
    resource_id: str
    resource_type: str
    duration: Optional[int] = None

    class Config:
        schema_extra = {
            "example": {
                "type": "lock",
                "action": "acquire",
                "resource_id": "character123",
                "resource_type": "character",
                "duration": 60
            }
        }


class ImageEventSchema(WSMessageSchema):
    type: Literal["image"] = "image"
    action: Literal["share", "hide", "reveal", "move_token"]
    image_id: str
    data: Dict[str, Any]

    class Config:
        schema_extra = {
            "example": {
                "type": "image",
                "action": "share",
                "image_id": "image123",
                "data": {
                    "url": "/images/maps/dungeon.jpg",
                    "name": "Dungeon Map",
                    "is_map": True
                }
            }
        }


class SpellEventSchema(WSMessageSchema):
    type: Literal["spell"] = "spell"
    action: Literal["prepare", "cast", "reset_slots"]
    character_id: str
    data: Dict[str, Any]

    class Config:
        schema_extra = {
            "example": {
                "type": "spell",
                "action": "cast",
                "character_id": "character123",
                "data": {
                    "spell_id": "spell456",
                    "spell_level": 3,
                    "target_ids": ["npc789"]
                }
            }
        }


class SystemEventSchema(WSMessageSchema):
    type: Literal["system"] = "system"
    action: Literal["connected", "disconnected", "error", "notification"]
    message: str
    details: Optional[Dict[str, Any]] = None

    class Config:
        schema_extra = {
            "example": {
                "type": "system",
                "action": "notification",
                "message": "Game will be paused in 5 minutes for server maintenance",
                "details": {
                    "scheduled_time": "2025-01-01T18:00:00",
                    "duration": "15 minutes"
                }
            }
        }