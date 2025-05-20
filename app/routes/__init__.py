from app.routes.auth import router as auth
from app.routes.characters import router as characters
from app.routes.campaigns import router as campaigns
from app.routes.npcs import router as npcs
from app.routes.compendium import router as compendium
from app.routes.combat import router as combat  # Certifique-se de que este arquivo existe

__all__ = ["auth", "characters", "campaigns", "npcs", "compendium", "combat"]