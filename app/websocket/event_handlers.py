# =====================================
# 2. app/websocket/event_handlers.py - CORRIGIDO
# =====================================

"""
WebSocket Event Handlers - CORRIGIDO
Handlers específicos para eventos do Socket.IO
"""

import logging
from typing import Dict, Any, Optional
import socketio
from datetime import datetime

logger = logging.getLogger(__name__)


class SocketIOEventHandlers:
    """
    Classe para organizar os event handlers do Socket.IO.
    """

    def __init__(self, sio: socketio.AsyncServer, lock_manager, websocket_manager):
        self.sio = sio
        self.lock_manager = lock_manager
        self.websocket_manager = websocket_manager

    async def handle_character_event(self, sid: str, data: Dict[str, Any]):
        """Handle character-related events."""
        try:
            event_type = data.get('type')
            character_id = data.get('character_id')
            campaign_id = data.get('campaign_id')
            user_id = data.get('user_id')

            if event_type == 'update':
                # Emit character update to campaign
                await self.sio.emit('character_updated', {
                    'character_id': character_id,
                    'data': data.get('character_data', {}),
                    'updated_by': user_id,
                    'timestamp': datetime.utcnow().isoformat()
                }, room=f"campaign_{campaign_id}")

            elif event_type == 'stats_change':
                # Handle stats changes
                await self.sio.emit('character_stats_changed', {
                    'character_id': character_id,
                    'stats': data.get('stats', {}),
                    'changed_by': user_id,
                    'timestamp': datetime.utcnow().isoformat()
                }, room=f"campaign_{campaign_id}")

            logger.info(f"Character event {event_type} processed for {character_id}")

        except Exception as e:
            logger.error(f"Error handling character event: {e}")
            await self.sio.emit('error', {
                'message': 'Failed to process character event'
            }, room=sid)

    async def handle_combat_event(self, sid: str, data: Dict[str, Any]):
        """Handle combat-related events."""
        try:
            event_type = data.get('type')
            campaign_id = data.get('campaign_id')
            user_id = data.get('user_id')

            if event_type == 'initiative_roll':
                # Handle initiative roll
                character_id = data.get('character_id')
                initiative = data.get('initiative')

                await self.sio.emit('initiative_rolled', {
                    'character_id': character_id,
                    'initiative': initiative,
                    'rolled_by': user_id,
                    'timestamp': datetime.utcnow().isoformat()
                }, room=f"campaign_{campaign_id}")

            elif event_type == 'turn_change':
                # Handle turn changes
                current_character = data.get('current_character')

                await self.sio.emit('turn_changed', {
                    'current_character': current_character,
                    'changed_by': user_id,
                    'timestamp': datetime.utcnow().isoformat()
                }, room=f"campaign_{campaign_id}")

            elif event_type == 'action':
                # Handle combat actions
                action_data = data.get('action_data', {})

                await self.sio.emit('combat_action', {
                    'action': action_data,
                    'performed_by': user_id,
                    'timestamp': datetime.utcnow().isoformat()
                }, room=f"campaign_{campaign_id}")

            logger.info(f"Combat event {event_type} processed")

        except Exception as e:
            logger.error(f"Error handling combat event: {e}")
            await self.sio.emit('error', {
                'message': 'Failed to process combat event'
            }, room=sid)

    async def handle_dice_event(self, sid: str, data: Dict[str, Any]):
        """Handle dice rolling events."""
        try:
            dice_notation = data.get('dice')  # e.g., "1d20+5"
            character_id = data.get('character_id')
            campaign_id = data.get('campaign_id')
            user_id = data.get('user_id')
            roll_type = data.get('roll_type', 'general')  # attack, save, check, etc.

            # Simular roll de dados (implementar lógica real depois)
            import random

            # Parse dice notation básico (implementar parser completo depois)
            if 'd' in dice_notation:
                parts = dice_notation.replace('+', ' +').replace('-', ' -').split()
                base_dice = parts[0]
                modifier = 0

                if len(parts) > 1:
                    modifier = int(parts[1])

                if 'd' in base_dice:
                    num_dice, die_size = map(int, base_dice.split('d'))
                    rolls = [random.randint(1, die_size) for _ in range(num_dice)]
                    total = sum(rolls) + modifier

                    result = {
                        'dice': dice_notation,
                        'rolls': rolls,
                        'modifier': modifier,
                        'total': total,
                        'character_id': character_id,
                        'roll_type': roll_type,
                        'rolled_by': user_id,
                        'timestamp': datetime.utcnow().isoformat()
                    }

                    await self.sio.emit('dice_rolled', result, room=f"campaign_{campaign_id}")
                    logger.info(f"Dice rolled: {dice_notation} = {total}")

        except Exception as e:
            logger.error(f"Error handling dice event: {e}")
            await self.sio.emit('error', {
                'message': 'Failed to process dice roll'
            }, room=sid)

    async def handle_map_event(self, sid: str, data: Dict[str, Any]):
        """Handle map-related events."""
        try:
            event_type = data.get('type')
            campaign_id = data.get('campaign_id')
            user_id = data.get('user_id')

            if event_type == 'token_move':
                # Handle token movement
                token_id = data.get('token_id')
                position = data.get('position', {})

                await self.sio.emit('token_moved', {
                    'token_id': token_id,
                    'position': position,
                    'moved_by': user_id,
                    'timestamp': datetime.utcnow().isoformat()
                }, room=f"campaign_{campaign_id}")

            elif event_type == 'map_change':
                # Handle map changes
                map_data = data.get('map_data', {})

                await self.sio.emit('map_changed', {
                    'map_data': map_data,
                    'changed_by': user_id,
                    'timestamp': datetime.utcnow().isoformat()
                }, room=f"campaign_{campaign_id}")

            logger.info(f"Map event {event_type} processed")

        except Exception as e:
            logger.error(f"Error handling map event: {e}")
            await self.sio.emit('error', {
                'message': 'Failed to process map event'
            }, room=sid)